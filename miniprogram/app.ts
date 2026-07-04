import { runtimeConfig, TOKEN_STORAGE_KEY } from './config/env'
import { loginWithWechat } from './utils/api'
import { realtimeClient } from './services/realtime'
import { markAuthReady } from './services/auth'

App<IAppOption>({
  globalData: {
    token: '',
    user: null,
    authReady: false,
  },

  onLaunch() {
    this.globalData.token = wx.getStorageSync(TOKEN_STORAGE_KEY) || ''
    if (!runtimeConfig.authEnabled) {
      this.globalData.authReady = true
      markAuthReady(true)
      return
    }
    this.login()
  },

  onShow() {
    if (this.globalData.authReady) realtimeClient.connect()
  },

  onHide() {
    // 小程序进入后台时保留连接，由微信生命周期统一管理。
  },

  login() {
    wx.login({
      success: async ({ code }) => {
        if (!code) return this.finishAuth(false)
        try {
          const response = await loginWithWechat(code)
          wx.setStorageSync(TOKEN_STORAGE_KEY, response.access_token)
          this.globalData.token = response.access_token
          this.globalData.user = response.user
          this.finishAuth(true)
        } catch (error) {
          console.error('微信登录失败', error)
          this.finishAuth(false)
        }
      },
      fail: () => this.finishAuth(false),
    })
  },

  finishAuth(success: boolean) {
    this.globalData.authReady = success
    markAuthReady(success)
    if (success) realtimeClient.connect()
  },
} as IAppOption & Record<string, any>)
