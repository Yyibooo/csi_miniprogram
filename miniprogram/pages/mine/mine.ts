import { DeviceSummary, UserProfile } from '../../models/domain'
import { getCurrentUser, getDevices } from '../../utils/api'

Page({
  data: {
    statusBarHeight: 44,
    loading: true,
    user: null as UserProfile | null,
    devices: [] as DeviceSummary[],
    avatarText: '微',
    avatarUrl: '',
    userName: '微信用户',
    accountText: '账号正常',
    lastLoginText: '暂无记录',
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
      const nickname = user.nickname || '微信用户'
      this.setData({
        user,
        devices,
        loading: false,
        avatarText: nickname.slice(0, 1),
        avatarUrl: user.avatar_url || '',
        userName: nickname,
        accountText: user.status === 'active' ? '账号正常' : '账号状态异常',
        lastLoginText: this.formatDate(user.last_login_at),
        totalDevices: devices.length,
      })
    } catch (error) {
      console.error('个人中心加载失败', error)
      this.setData({ loading: false, accountText: '资料暂不可用' })
    }
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
