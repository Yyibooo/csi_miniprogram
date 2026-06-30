/**
 * API 请求工具。
 *
 * 边界说明：
 * - 此模块是小程序与后端之间唯一的通信层
 * - 所有 wx.request 调用集中在此，页面不直接写 wx.request
 * - 修改 BASE_URL 即可切换后端地址
 */

// 开发工具 / 模拟器：127.0.0.1
// 真机调试：改为电脑局域网 IP，如 192.168.101.48
const BASE_URL = 'http://127.0.0.1:8000'

// ── 类型定义（与后端 models.py 对应）──────────────────

export interface DeviceState {
  device_id: string
  monitor_enabled: boolean
  state_text: string
  last_request_id: string | null
  last_source: string | null
  last_update_time: string | null
}

export interface DeviceCommand {
  cmd: string
  enable: boolean
  target: string
  request_id: string
  source: string
  time: string
}

export interface SwitchResponse {
  ok: boolean
  recognized: boolean
  request_id: string
  monitor_enabled: boolean
  state_text: string
  device_state: DeviceState
  reserved_device_command: DeviceCommand
}

export interface HealthResponse {
  ok: boolean
  message: string
  time?: string
}

export interface DeviceStateResponse {
  ok: boolean
  device_state: DeviceState
}

// ── 跌倒告警类型（与后端 FallAlert 模型对应）─────────

export interface FallAlert {
  detected: boolean
  confidence: number
  duration_seconds: number
  timestamp: string | null
  device_id: string
}

export interface FallAlertResponse {
  ok: boolean
  alert: FallAlert | null
}

// ── 通用请求封装 ─────────────────────────────────────

function request<T>(options: WechatMiniprogram.RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: BASE_URL + options.url,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data as T)
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

// ── API 方法 ─────────────────────────────────────────

/** 健康检查：确认后端正在运行 */
export function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>({ url: '/api/health', method: 'GET' })
}

/** 获取当前设备状态 */
export function getDeviceState(): Promise<DeviceStateResponse> {
  return request<DeviceStateResponse>({ url: '/api/device/state', method: 'GET' })
}

/** 发送开关信号 */
export function sendSwitch(
  deviceId: string,
  enable: boolean,
): Promise<SwitchResponse> {
  return request<SwitchResponse>({
    url: '/api/device/switch',
    method: 'POST',
    header: { 'content-type': 'application/json' },
    data: {
      device_id: deviceId,
      enable,
      source: 'wechat_miniprogram',
    },
  })
}

/** 获取最新跌倒告警 */
export function getFallAlert(): Promise<FallAlertResponse> {
  return request<FallAlertResponse>({ url: '/api/device/fall', method: 'GET' })
}
