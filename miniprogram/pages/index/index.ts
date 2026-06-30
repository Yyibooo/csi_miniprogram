// CSI 实时监测开关控制页面
import { checkHealth, getDeviceState, sendSwitch } from '../../utils/api'

const DEVICE_ID = 'esp32s3_c_csi_2s_001'

Page({
  data: {
    deviceId: DEVICE_ID,
    monitoring: false,
    statusText: '未知',
    backendStatus: '未连接',
    lastRequestId: '-',
    message: '等待操作',
  },

  onLoad() {
    this.checkBackend()
    this.loadDeviceState()
  },

  /** 健康检查：确认后端是否可达 */
  checkBackend() {
    checkHealth()
      .then(() => {
        this.setData({
          backendStatus: '已连接',
          message: '后端连接成功',
        })
      })
      .catch((err) => {
        console.error('后端健康检查失败:', err)
        this.setData({
          backendStatus: '连接失败',
          message: '请检查后端是否启动',
        })
      })
  },

  /** 读取后端当前设备状态 */
  loadDeviceState() {
    getDeviceState()
      .then((res) => {
        const state = res.device_state
        const enabled = state.monitor_enabled
        this.setData({
          monitoring: enabled,
          statusText: enabled ? '实时监测中' : '休眠中',
          lastRequestId: state.last_request_id || '-',
          message: '状态读取成功',
        })
      })
      .catch((err) => {
        console.error('读取状态失败:', err)
        this.setData({ message: '读取状态失败' })
      })
  },

  /** 开关变化时发送控制信号 */
  onSwitchChange(e: any) {
    const enabled = e.detail.value
    console.log('小程序开关变化:', enabled)

    this.setData({
      monitoring: enabled,
      statusText: enabled ? '正在开启...' : '正在关闭...',
      message: '正在发送开关信号...',
    })

    sendSwitch(DEVICE_ID, enabled)
      .then((res) => {
        console.log('后端识别结果:', res)
        if (res.ok && res.recognized) {
          this.setData({
            monitoring: res.monitor_enabled,
            statusText: res.monitor_enabled ? '实时监测中' : '休眠中',
            lastRequestId: res.request_id,
            message: '后端已识别开关信号',
          })
        } else {
          this.rollbackSwitch(enabled, '后端未识别开关信号')
        }
      })
      .catch((err) => {
        console.error('发送开关失败:', err)
        this.rollbackSwitch(enabled, '发送失败，请检查后端')
      })
  },

  /** 发送失败时回滚开关 UI */
  rollbackSwitch(wasEnabled: boolean, message: string) {
    wx.showToast({ title: '控制失败', icon: 'error' as any })
    this.setData({
      monitoring: !wasEnabled,
      statusText: !wasEnabled ? '实时监测中' : '休眠中',
      message,
    })
  },
})
