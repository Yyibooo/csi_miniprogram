import { DeviceSummary, UserProfile } from '../../models/domain'
import { getCurrentUser, getDevices } from '../../utils/api'

Page({
  data: {
    statusBarHeight: 44,
    loading: true,
    loadError: '',
    user: null as UserProfile | null,
    devices: [] as DeviceSummary[],
    avatarText: '',
    avatarUrl: '',
    userName: '',
    accountText: '',
    lastLoginText: '',
    totalDevices: 0,
  },

  onLoad() {
    const system = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: system.statusBarHeight || 44 })
  },

  onShow() {
    this.selectTab()
    this.loadProfile()
  },

  async loadProfile() {
    try {
      const [user, devices] = await Promise.all([getCurrentUser(), getDevices()])
      const nickname = user.nickname || ''
      this.setData({
        user,
        devices,
        loading: false,
        loadError: '',
        avatarText: nickname ? nickname.slice(0, 1) : '',
        avatarUrl: user.avatar_url || '',
        userName: nickname,
        accountText: user.status === 'active' ? '账号正常' : '账号已停用',
        lastLoginText: this.formatDate(user.last_login_at),
        totalDevices: devices.length,
      })
    } catch (error: any) {
      console.error('个人中心加载失败', error)
      const app = getApp<IAppOption>()
      this.setData({
        loading: false,
        loadError: app.globalData.bootstrapError || (error && error.message) || '用户资料加载失败',
        accountText: '',
        userName: '',
        avatarUrl: '',
        avatarText: '',
        devices: [],
        totalDevices: 0,
      })
    }
  },

  onRetry() {
    const app = getApp<IAppOption & { login: () => void }>()
    if (!app.globalData.authReady && typeof app.login === 'function') app.login()
    this.setData({ loading: true, loadError: '' })
    this.loadProfile()
  },

  onTapDeviceManagement() {
    wx.navigateTo({ url: '/pages/device-management/index' })
  },

  formatDate(value: string | null): string {
    if (!value) return '暂无记录'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  selectTab() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar()
      if (tabBar) tabBar.setData({ selected: 1 })
    }
  },
})
