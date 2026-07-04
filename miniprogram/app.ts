import { TOKEN_STORAGE_KEY } from './config/env'
import { getCurrentUser, getDevices, getFallEvents, loginWithWechat } from './utils/api'
import { realtimeClient } from './services/realtime'
import { markAuthReady, resetAuth } from './services/auth'

App<IAppOption>({
  globalData: {
    token: '',
    user: null,
    devices: [],
    fallEvents: [],
    authReady: false,
    bootstrapReady: false,
    bootstrapError: '',
    isNewUser: false,
  },

  onLaunch() {
    this.clearBusinessData()
    this.login()
  },

  onShow() {
    if (this.globalData.authReady) {
      this.bootstrapBusinessData()
      realtimeClient.connect()
    }
  },

  login() {
    if ((this as any)._loginInProgress) return
    ;(this as any)._loginInProgress = true
    realtimeClient.close()
    resetAuth()
    wx.login({
      success: async ({ code }) => {
        if (!code) {
          this.finishAuth(false, '微信登录未返回有效凭证')
          return
        }
        try {
          const response = await loginWithWechat(code)
          wx.setStorageSync(TOKEN_STORAGE_KEY, response.access_token)
          this.globalData.token = response.access_token
          this.globalData.isNewUser = response.user.is_new_user
          this.globalData.authReady = true
          markAuthReady(true)
          await this.bootstrapBusinessData()
          realtimeClient.connect()
        } catch (error: any) {
          const message = (error && error.message) || '微信登录失败'
          this.finishAuth(false, message)
        } finally {
          ;(this as any)._loginInProgress = false
        }
      },
      fail: () => {
        ;(this as any)._loginInProgress = false
        this.finishAuth(false, '无法调用微信登录')
      },
    })
  },

  async bootstrapBusinessData() {
    if (!this.globalData.authReady || (this as any)._bootstrapInProgress) return
    ;(this as any)._bootstrapInProgress = true
    this.globalData.bootstrapReady = false
    this.globalData.bootstrapError = ''
    try {
      const [user, devices, fallEvents] = await Promise.all([
        getCurrentUser(),
        getDevices(),
        getFallEvents(20),
      ])
      this.globalData.user = user
      this.globalData.devices = devices
      this.globalData.fallEvents = fallEvents
      this.globalData.bootstrapReady = true
    } catch (error: any) {
      this.clearBusinessData()
      this.globalData.bootstrapError = (error && error.message) || '业务数据加载失败'
    } finally {
      ;(this as any)._bootstrapInProgress = false
    }
  },

  finishAuth(success: boolean, message = '') {
    this.globalData.authReady = success
    markAuthReady(success)
    if (!success) {
      wx.removeStorageSync(TOKEN_STORAGE_KEY)
      this.globalData.token = ''
      this.globalData.bootstrapError = message
      this.clearBusinessData()
    }
  },

  clearBusinessData() {
    this.globalData.user = null
    this.globalData.devices = []
    this.globalData.fallEvents = []
    this.globalData.bootstrapReady = false
  },
} as IAppOption & Record<string, any>)
