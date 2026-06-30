// CSI 跌倒检测 — 监测页面
import { checkHealth, getDeviceState, sendSwitch, getFallAlert } from '../../utils/api'

const DEVICE_ID = 'esp32s3_c_csi_2s_001'

Page({
  data: {
    deviceId: DEVICE_ID,
    monitoring: false,
    backendStatus: '未连接',

    // 告警状态
    isAlert: false,
    alertConfidence: 0,
    alertDuration: 0,
    alertTimestamp: '',

    // 仪表盘
    gaugeProgress: 0.85,
    gaugeColor: '#1aa879',

    // 摘要数据（占位）
    signalQuality: 98,
    signalStatusText: '优',
    guardHours: '08:26',

    // 设备
    deviceName: '客厅监测设备',
    deviceModel: 'CSI-01',
    lastSyncText: '最近同步 1 秒前',

    message: '等待连接',
    statusBarHeight: 44,
    _pollingTimer: null as any,
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight || 44 })
    this.checkBackend()
    this.loadDeviceState()

    // Skyline 自定义 tabBar
    if (typeof this.getTabBar === 'function') {
      this.getTabBar((tabBar: any) => {
        if (tabBar) tabBar.setData({ selected: 0 })
      })
    }
  },

  onShow() {
    this.startPolling()
    if (typeof this.getTabBar === 'function') {
      this.getTabBar((tabBar: any) => {
        if (tabBar) tabBar.setData({ selected: 0 })
      })
    }
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  // ── 后端连接 ──────────────────────────

  checkBackend() {
    checkHealth()
      .then(() => {
        this.setData({ backendStatus: '已连接', message: '后端连接成功' })
      })
      .catch((err: any) => {
        console.error('后端健康检查失败:', err)
        this.setData({ backendStatus: '连接失败', message: '请检查后端是否启动' })
      })
  },

  loadDeviceState() {
    getDeviceState()
      .then((res) => {
        const state = res.device_state
        const enabled = state.monitor_enabled
        this.setData({
          monitoring: enabled,
          message: '状态读取成功',
        })
      })
      .catch((err: any) => {
        console.error('读取状态失败:', err)
        this.setData({ message: '读取状态失败' })
      })
  },

  // ── 跌倒告警轮询 ──────────────────────

  startPolling() {
    this.stopPolling()
    const timer = setInterval(() => { this.checkFallAlert() }, 2000)
    ;(this as any).data._pollingTimer = timer
  },

  stopPolling() {
    const timer = (this as any).data._pollingTimer
    if (timer) {
      clearInterval(timer)
      ;(this as any).data._pollingTimer = null
    }
  },

  checkFallAlert() {
    getFallAlert()
      .then((res) => {
        if (res.alert && res.alert.detected) {
          this.setData({
            isAlert: true,
            alertConfidence: Math.round(res.alert.confidence * 100),
            alertDuration: Math.round(res.alert.duration_seconds),
            alertTimestamp: res.alert.timestamp || '',
            gaugeProgress: 1,
            gaugeColor: '#ed5d55',
          })
        } else if (this.data.isAlert) {
          // 仅在告警清除时才重置（避免频繁 setData）
          this.setData({
            isAlert: false,
            alertConfidence: 0,
            alertDuration: 0,
            alertTimestamp: '',
            gaugeProgress: 0.85,
            gaugeColor: '#1aa879',
          })
        }
      })
      .catch((err: any) => {
        console.error('Fall alert polling error:', err)
      })
  },

  onConfirmSafe() {
    this.setData({
      isAlert: false,
      alertConfidence: 0,
      alertDuration: 0,
      alertTimestamp: '',
      gaugeProgress: 0.85,
      gaugeColor: '#1aa879',
    })
    wx.showToast({ title: '已确认安全', icon: 'success' })
  },

  onContactFamily() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  // ── 开关控制（保留原有逻辑）───────────

  onSwitchChange(e: any) {
    const enabled = e.detail.value
    this.setData({
      monitoring: enabled,
      message: '正在发送开关信号...',
    })

    sendSwitch(DEVICE_ID, enabled)
      .then((res) => {
        if (res.ok && res.recognized) {
          this.setData({
            monitoring: res.monitor_enabled,
            message: '后端已识别开关信号',
          })
        } else {
          this.rollbackSwitch(enabled, '后端未识别开关信号')
        }
      })
      .catch((err: any) => {
        console.error('发送开关失败:', err)
        this.rollbackSwitch(enabled, '发送失败，请检查后端')
      })
  },

  /** 发送失败时回滚开关 UI */
  rollbackSwitch(wasEnabled: boolean, msg: string) {
    wx.showToast({ title: '控制失败', icon: 'error' as any })
    this.setData({
      monitoring: !wasEnabled,
      message: msg,
    })
  },
})
