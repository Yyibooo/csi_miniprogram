// 个人中心页面
Page({
  data: {
    avatarText: '林',
    userName: '林女士',
    userDesc: '微信用户 · 已守护 28 天',
    onlineDevices: 1,
    totalGuardHours: '672h',
    emergencyContacts: 3,
    wechatBound: true,
    autoNotifyEnabled: true,
    statusBarHeight: 44,
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight || 44 })

    if (typeof this.getTabBar === 'function') {
      this.getTabBar((tabBar: any) => {
        if (tabBar) tabBar.setData({ selected: 1 })
      })
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar((tabBar: any) => {
        if (tabBar) tabBar.setData({ selected: 1 })
      })
    }
  },

  onTapEditProfile() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onTapWechatBind() {
    wx.showToast({ title: '已绑定微信消息提醒', icon: 'success' })
  },

  onTapEmergencyContacts() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onTapDeviceManagement() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onToggleAutoNotify(e: any) {
    this.setData({ autoNotifyEnabled: e.detail.value })
  },
})
