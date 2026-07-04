/**
 * 后端地址的唯一配置入口。
 * 联调时填写 Flask 服务地址；正式发布时替换为 HTTPS/WSS 域名。
 */
export type AppEnvironment = 'development' | 'production'

export interface RuntimeConfig {
  apiBaseUrl: string
  wsBaseUrl: string
  requestTimeout: number
}

const ACTIVE_ENV: AppEnvironment = 'development'

const environments: Record<AppEnvironment, RuntimeConfig> = {
  development: {
    // 示例：http://192.168.1.20:5000
    apiBaseUrl: '',
    // 示例：ws://192.168.1.20:5000/ws/v1/events
    wsBaseUrl: '',
    requestTimeout: 10000,
  },
  production: {
    // 示例：https://api.example.com
    apiBaseUrl: '',
    // 示例：wss://api.example.com/ws/v1/events
    wsBaseUrl: '',
    requestTimeout: 10000,
  },
}

export const runtimeConfig = environments[ACTIVE_ENV]
export const TOKEN_STORAGE_KEY = 'access_token'
