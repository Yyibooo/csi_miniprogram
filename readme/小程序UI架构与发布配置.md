# 小程序 UI 架构与发布配置

## 1. 前端分层

页面只依赖 `models/domain.ts` 中的统一领域模型，不直接解析后端原始响应。

```text
pages
  ↓
utils/api.ts                 旧版 / 正式版 API 适配
  ↓
config/env.ts                环境、协议、HTTPS/WSS 开关
```

- `protocol: legacy`：兼容当前 FastAPI 的 `/api/device/*` 四接口。
- `protocol: v1`：对应正式文档中的登录、设备、控制和跌倒记录接口。
- `services/realtime.ts`：正式环境启用 WebSocket，包含指数退避重连。
- `services/auth.ts`：页面请求会等待 `wx.login` 换取后端 token 完成。

后端接口字段变化时，优先只修改 `utils/api.ts` 的适配逻辑，不把响应差异扩散到页面。

## 2. 当前开发配置

`miniprogram/config/env.ts` 当前使用：

```text
ACTIVE_ENV = development
protocol = legacy
apiBaseUrl = http://127.0.0.1:8000
authEnabled = false
realtimeEnabled = false
```

此配置可直接连接交接项目中的本地 FastAPI 后端。告警采用轮询；旧后端没有“确认告警”接口，因此确认结果会在本机记录，避免同一条告警重复弹出。

## 3. 正式后端最低契约

切换 `v1` 前，后端至少应稳定提供：

```text
POST  /api/v1/auth/wechat-login
GET   /api/v1/me
GET   /api/v1/devices
GET   /api/v1/devices/{device_name}
POST  /api/v1/devices/{device_name}/control
GET   /api/v1/fall-events
GET   /api/v1/fall-events/{id}
POST  /api/v1/fall-events/{id}/confirm
WSS   /ws/v1/events?token=<access_token>
```

告警确认统一使用动作型 `POST /confirm`，避免微信请求方法兼容差异。设备详情的 RSSI 使用 `network.rssi`；API 适配层会将嵌套响应转换为页面统一字段。

设备、检测和网络质量枚举必须保持：

```text
device.state: online | offline | error
detection_state: idle | starting | running | stopping
network_quality: good | fair | poor | unknown
```

控制接口的 `accepted=true` 只代表命令被后端接受；设备最终状态必须由状态查询或 WebSocket 事件确认。

## 4. 后端上云与小程序发布

发布前执行以下检查：

1. 云端 API 使用已备案域名和有效 HTTPS 证书，不使用裸 IP、HTTP 或自定义 URL 端口。
2. WebSocket 使用 `wss://`，并支持 token 鉴权、心跳、断线重连和重新拉取状态。
3. 在微信公众平台分别配置 request 合法域名和 socket 合法域名。
4. 将 `env.ts` 的生产地址替换为真实地址，并把 `ACTIVE_ENV` 改为 `production`。
5. 生产后端关闭宽泛 CORS、妥善保存 AppSecret；小程序内不得存放 AppSecret、MQTT 地址或 MQTT 密码。
6. 登录只上传 `wx.login()` 的 code；`openid`、`unionid`、`session_key` 由后端获取和保管。
7. 申请并配置用户隐私保护指引、订阅消息模板、昵称头像等必要授权说明。
8. 对真机弱网、离线、token 过期、WebSocket 重连、重复控制和告警确认做回归测试。
9. 上传前运行 `npm run typecheck`，并在微信开发者工具中完成代码质量检查和真机预览。

## 5. 尚待后端提供的能力

- 多设备真实在线状态和最后通信时间。
- 控制命令执行回执与超时错误。
- 累计守护时长、RSSI、CSI 网络质量。
- 告警确认持久化、历史记录和通知发送结果。
- 用户资料、紧急联系人和微信订阅消息状态。

UI 已为以上字段预留状态和展示位置；接口未返回时统一显示“暂无数据”或明确的功能待接入提示，不伪造成功状态。
