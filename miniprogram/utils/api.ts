/** API 契约适配层：页面只依赖 domain，不直接依赖 legacy/v1 响应。 */
import { runtimeConfig, TOKEN_STORAGE_KEY } from '../config/env'
import {
  DeviceControlResult,
  DeviceDetail,
  DeviceSummary,
  DetectionState,
  DeviceState,
  FallEvent,
  FallEventStatus,
  NetworkQuality,
  UserProfile,
} from '../models/domain'
import { resetAuth, waitForAuth } from '../services/auth'

const LEGACY_DEVICE_ID = 'esp32s3_c_csi_2s_001'

interface LegacyDeviceState {
  device_id: string
  monitor_enabled: boolean
  state_text: string
  last_update_time: string | null
}

interface LegacyStateResponse {
  ok: boolean
  device_state: LegacyDeviceState
}

interface LegacySwitchResponse {
  ok: boolean
  recognized: boolean
  request_id: string
  monitor_enabled: boolean
  state_text: string
}

interface LegacyFallResponse {
  ok: boolean
  alert: null | {
    detected: boolean
    confidence: number
    duration_seconds: number
    timestamp: string | null
    device_id: string
  }
}

interface ListResponse<T> { items: T[] }

interface RawLoginResponse {
  access_token: string
  expires_in: number
  user: {
    id: number
    nickname: string | null
    avatar_url: string | null
    is_new_user?: boolean
  }
}

interface LoginResponse { access_token: string; expires_in: number; user: UserProfile }

interface RawDeviceSummary {
  device_name: string
  display_name?: string
  location?: string
  state: DeviceState
  detection_state?: DetectionState
  network_quality?: NetworkQuality
  last_seen_at?: string | null
  fault_message?: string | null
}

interface RawDeviceDetail extends RawDeviceSummary {
  enabled?: boolean
  runtime?: {
    state?: DetectionState
    last_status_at?: string | null
  }
  detection?: {
    state?: DetectionState
    session?: string | null
    network_quality?: NetworkQuality
    last_csi_at?: string | null
  }
  fault?: {
    code?: string | null
    message?: string | null
  }
  rssi?: number | null
  network?: { rssi?: number | null }
}

interface RawFallEvent {
  id: number | string
  device_name: string
  display_name?: string
  location?: string
  occurred_at: string
  network_quality?: NetworkQuality
  status?: FallEventStatus
  confidence?: number | null
  duration_seconds?: number | null
}

export interface ApiError extends Error {
  code: string
  statusCode: number
}

function createApiError(message: string, code = 'REQUEST_FAILED', statusCode = 0): ApiError {
  const error = new Error(message) as ApiError
  error.name = 'ApiError'
  error.code = code
  error.statusCode = statusCode
  return error
}

async function request<T>(path: string, options: Partial<WechatMiniprogram.RequestOption> = {}): Promise<T> {
  if (runtimeConfig.authEnabled && path !== '/api/v1/auth/wechat-login') await waitForAuth()
  const token = wx.getStorageSync(TOKEN_STORAGE_KEY) as string
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: `${runtimeConfig.apiBaseUrl}${path}`,
      timeout: runtimeConfig.requestTimeout,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success: (response) => {
        const body = response.data as any
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body as T)
          return
        }
        if (response.statusCode === 401) {
          wx.removeStorageSync(TOKEN_STORAGE_KEY)
          if (resetAuth()) {
            const app = getApp<IAppOption & { login: () => void }>()
            if (typeof app.login === 'function') app.login()
          }
        }
        reject(createApiError((body && body.message) || `请求失败（${response.statusCode}）`, body && body.error, response.statusCode))
      },
      fail: () => reject(createApiError('网络连接失败，请稍后重试', 'NETWORK_ERROR')),
    })
  })
}

function legacySummary(state: LegacyDeviceState): DeviceSummary {
  return {
    device_name: LEGACY_DEVICE_ID,
    display_name: '客厅监测设备',
    location: '客厅',
    state: 'online',
    detection_state: state.monitor_enabled ? 'running' : 'idle',
    network_quality: 'unknown',
    last_seen_at: state.last_update_time,
    fault_message: null,
  }
}

export function checkHealth(): Promise<{ ok: boolean; message: string; time?: string }> {
  return request(runtimeConfig.protocol === 'legacy' ? '/api/health' : '/api/v1/health')
}

export async function loginWithWechat(code: string): Promise<LoginResponse> {
  const response = await request<RawLoginResponse>('/api/v1/auth/wechat-login', { method: 'POST', data: { code } })
  return {
    access_token: response.access_token,
    expires_in: response.expires_in,
    user: {
      id: response.user.id,
      nickname: response.user.nickname || '微信用户',
      avatar_url: response.user.avatar_url || '',
      phone: null,
      status: 'active',
      last_login_at: null,
    },
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  if (runtimeConfig.protocol === 'legacy') {
    return { id: null, nickname: '微信用户', avatar_url: '', phone: null, status: 'active', last_login_at: null }
  }
  const user = await request<UserProfile>('/api/v1/me')
  return {
    id: user.id,
    nickname: user.nickname || '微信用户',
    avatar_url: user.avatar_url || '',
    phone: user.phone || null,
    status: user.status || 'active',
    last_login_at: user.last_login_at || null,
  }
}

export async function getDevices(): Promise<DeviceSummary[]> {
  if (runtimeConfig.protocol === 'legacy') {
    const response = await request<LegacyStateResponse>('/api/device/state')
    return [legacySummary(response.device_state)]
  }
  const response = await request<ListResponse<RawDeviceSummary>>('/api/v1/devices')
  return response.items.map(normalizeDeviceSummary)
}

export async function getDeviceDetail(deviceName: string): Promise<DeviceDetail> {
  if (runtimeConfig.protocol === 'legacy') {
    const response = await request<LegacyStateResponse>('/api/device/state')
    const item = legacySummary(response.device_state)
    return {
      ...item,
      enabled: true,
      runtime: { state: item.detection_state, last_status_at: item.last_seen_at },
      detection: { state: item.detection_state, session: null, network_quality: item.network_quality, last_csi_at: null },
      fault: { code: null, message: null },
      rssi: null,
    }
  }
  const response = await request<RawDeviceDetail>(`/api/v1/devices/${encodeURIComponent(deviceName)}`)
  return normalizeDeviceDetail(response)
}

export async function controlDevice(deviceName: string, action: 'start' | 'stop'): Promise<DeviceControlResult> {
  if (runtimeConfig.protocol === 'legacy') {
    const response = await request<LegacySwitchResponse>('/api/device/switch', {
      method: 'POST',
      data: { device_id: deviceName, enable: action === 'start', source: 'wechat_miniprogram' },
    })
    return {
      accepted: response.ok && response.recognized,
      device_name: deviceName,
      action,
      control_state: 'published',
      session: null,
      message: '控制命令已发送，等待设备确认',
    }
  }
  return request<DeviceControlResult>(`/api/v1/devices/${encodeURIComponent(deviceName)}/control`, {
    method: 'POST',
    header: { 'Idempotency-Key': createRequestId() },
    data: { action },
  })
}

export async function getFallEvents(limit = 20): Promise<FallEvent[]> {
  if (runtimeConfig.protocol === 'legacy') {
    const response = await request<LegacyFallResponse>('/api/device/fall')
    const alert = response.alert
    if (!alert || !alert.detected) return []
    const occurredAt = alert.timestamp || new Date().toISOString()
    return [{
      id: `legacy-${occurredAt}`,
      device_name: alert.device_id,
      display_name: '客厅监测设备',
      location: '客厅',
      occurred_at: occurredAt,
      network_quality: 'unknown',
      status: 'pending',
      confidence: alert.confidence,
      duration_seconds: alert.duration_seconds,
    }]
  }
  const response = await request<ListResponse<RawFallEvent>>(`/api/v1/fall-events?limit=${limit}`)
  return response.items.map(normalizeFallEvent)
}

export async function getFallEvent(id: number | string): Promise<FallEvent> {
  if (runtimeConfig.protocol === 'legacy') {
    const events = await getFallEvents(20)
    const event = events.find((item) => String(item.id) === String(id))
    if (!event) throw createApiError('未找到这条告警记录', 'FALL_EVENT_NOT_FOUND', 404)
    return event
  }
  const response = await request<RawFallEvent>(`/api/v1/fall-events/${encodeURIComponent(String(id))}`)
  return normalizeFallEvent(response)
}

export async function confirmFallEvent(id: number | string): Promise<{ success: boolean }> {
  if (runtimeConfig.protocol === 'legacy') return { success: true }
  // wx.request 的项目类型契约不包含 PATCH；正式后端提供动作型 POST，避免运行时兼容风险。
  return request(`/api/v1/fall-events/${encodeURIComponent(String(id))}/confirm`, {
    method: 'POST',
    data: { status: 'confirmed' },
  })
}

export function qualityText(quality: NetworkQuality): string {
  return { good: '信号良好', fair: '信号一般', poor: '信号较差', unknown: '暂无数据' }[quality]
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

function normalizeDeviceSummary(raw: RawDeviceSummary): DeviceSummary {
  return {
    device_name: raw.device_name,
    display_name: raw.display_name || raw.device_name,
    location: raw.location || '',
    state: raw.state || 'offline',
    detection_state: raw.detection_state || 'idle',
    network_quality: raw.network_quality || 'unknown',
    last_seen_at: raw.last_seen_at || null,
    fault_message: raw.fault_message || null,
  }
}

function normalizeDeviceDetail(raw: RawDeviceDetail): DeviceDetail {
  const detectionState = raw.detection_state ||
    (raw.detection && raw.detection.state) ||
    (raw.runtime && raw.runtime.state) ||
    'idle'
  const networkQuality = raw.network_quality ||
    (raw.detection && raw.detection.network_quality) ||
    'unknown'
  const lastSeenAt = raw.last_seen_at ||
    (raw.runtime && raw.runtime.last_status_at) ||
    null
  const rssi = raw.rssi != null
    ? raw.rssi
    : raw.network && raw.network.rssi != null
      ? raw.network.rssi
      : null
  return {
    device_name: raw.device_name,
    display_name: raw.display_name || raw.device_name,
    location: raw.location || '',
    state: raw.state || 'offline',
    detection_state: detectionState,
    network_quality: networkQuality,
    last_seen_at: lastSeenAt,
    fault_message: raw.fault_message || (raw.fault && raw.fault.message) || null,
    enabled: raw.enabled !== false,
    runtime: {
      state: (raw.runtime && raw.runtime.state) || detectionState,
      last_status_at: (raw.runtime && raw.runtime.last_status_at) || lastSeenAt,
    },
    detection: {
      state: (raw.detection && raw.detection.state) || detectionState,
      session: (raw.detection && raw.detection.session) || null,
      network_quality: (raw.detection && raw.detection.network_quality) || networkQuality,
      last_csi_at: (raw.detection && raw.detection.last_csi_at) || null,
    },
    fault: {
      code: (raw.fault && raw.fault.code) || null,
      message: (raw.fault && raw.fault.message) || null,
    },
    rssi,
  }
}

function normalizeFallEvent(raw: RawFallEvent): FallEvent {
  return {
    id: raw.id,
    device_name: raw.device_name,
    display_name: raw.display_name || raw.device_name,
    location: raw.location || '',
    occurred_at: raw.occurred_at,
    network_quality: raw.network_quality || 'unknown',
    status: raw.status || 'pending',
    confidence: raw.confidence == null ? null : raw.confidence,
    duration_seconds: raw.duration_seconds == null ? null : raw.duration_seconds,
  }
}
