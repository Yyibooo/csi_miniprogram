/**
 * 唯一环境入口。
 *
 * 发布前只在这里切换 ACTIVE_ENV，并在微信公众平台配置对应 HTTPS/WSS 合法域名。
 * 页面和业务服务禁止硬编码服务器地址。
 */

export type AppEnvironment = 'development' | 'production'
export type ApiProtocol = 'legacy' | 'v1'

export interface RuntimeConfig {
  apiBaseUrl: string
  wsBaseUrl: string
  protocol: ApiProtocol
  authEnabled: boolean
  realtimeEnabled: boolean
  requestTimeout: number
}

const ACTIVE_ENV: AppEnvironment = 'development'

const environments: Record<AppEnvironment, RuntimeConfig> = {
  development: {
    apiBaseUrl: 'http://127.0.0.1:8000',
    wsBaseUrl: '',
    protocol: 'legacy',
    authEnabled: false,
    realtimeEnabled: false,
    requestTimeout: 10000,
  },
  production: {
    // 发布前替换为已备案且已加入小程序合法域名的 HTTPS/WSS 地址。
    apiBaseUrl: 'https://api.example.com',
    wsBaseUrl: 'wss://api.example.com/ws/v1/events',
    protocol: 'v1',
    authEnabled: true,
    realtimeEnabled: true,
    requestTimeout: 10000,
  },
}

export const runtimeConfig = environments[ACTIVE_ENV]
export const TOKEN_STORAGE_KEY = 'access_token'

