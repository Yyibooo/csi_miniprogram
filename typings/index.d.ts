/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    token: string
    user: import('../miniprogram/models/domain').UserProfile | null
    authReady: boolean
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}
