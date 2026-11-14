# Agent 网站 Google 自行注册 / 登录：Owner 设置说明

> 这份 PR **只有代码，没有部署**。等 Claude 审核、合并后，才按顺序配置与部署。Google Client Secret、Turnstile Secret、Owner access token **只在各自后台填写，绝对不要发到聊天、GitHub PR、截图或前端**。

## 1. Google Cloud：建立 OAuth 客户端

1. 打开 [Google Cloud Console](https://console.cloud.google.com/) → 选择或新建 Project。
2. 进入 **Google Auth Platform**（部分界面仍叫 APIs & Services → OAuth consent screen），先设置 App name、support email 和用户类型。若设为 Testing，必须把实际测试 Google 邮箱加入 Test users；面向公众使用时按提示发布到 Production。
3. 进入 **Clients → Create client → OAuth client ID**，Application type 选择 **Web application**。
4. **Authorized redirect URIs** 填入这条（完全一致，包括 `https`）：

   `https://vuibesuahnhlafsfraeo.supabase.co/auth/v1/callback`

   这是 Google 回到 **Supabase Auth** 的地址，**不是 Railway 首页**。
5. 保存后会获得 **Client ID** 和 **Client Secret**，仅在下一步填写。不要提交到仓库。

使用 Google 基本登录（openid/email/profile）一般无须开启付费 Google Cloud API 或建立 Billing account；控制台仍可能因地区/帐号要求验证身份，请以实际画面为准。

## 2. Supabase：启用 Google

1. 打开 [Supabase Project](https://supabase.com/dashboard/project/vuibesuahnhlafsfraeo)。
2. **Authentication → Providers → Google**，启用。
3. 将上一段的 **Client ID** 和 **Client Secret** 分别填入对应字段并保存。不要在聊天中提供。
4. **Authentication → URL Configuration → Redirect URLs** 加入：

   `https://agent-mobile-production.up.railway.app/`

   前端 `signInWithOAuth({ provider:'google', options:{ redirectTo: location.origin+'/' } })` 使用这个地址回跳。无需将 Railway 域名作为 Google 的 callback URI。

## 3. Cloudflare Turnstile（免费）

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Turnstile** → Add widget。
2. Domain/Hostname 填 `agent-mobile-production.up.railway.app`，选择合适 Widget 模式，建立后分别取得 **Site Key** 与 **Secret Key**。
3. 将 **Site Key** 配置在 Railway Agent Mobile 环境变数：`TURNSTILE_SITE_KEY`。Site Key 可公开（通过 `/config` 提供给浏览器），**不是 Secret**。
4. 将 **Secret Key** 填入 **Supabase → Authentication → Settings → Bot and Abuse Protection → CAPTCHA（Cloudflare Turnstile）**。
5. **同一个 Secret Key** 另存入 Supabase Edge Functions 的机密环境变数：`TURNSTILE_SECRET_KEY`。这一步非常重要：Supabase Auth 的内置 `captchaToken` 不会自动保护 `signInWithOAuth`；这份实现还要用 `agent-auth` 服务端向 Cloudflare `siteverify` 验证 Google 按钮的 token，发放一次性证明。
6. Secret 绝不能出现在 `/config`、前端 JS、日志或 PR。

Cloudflare Turnstile 的 Free 方案支持此用途，通常不需要绑信用卡。Google 基本 OAuth 与 Supabase Free Auth 在免费用量内也无需另外付费。**但现有 Railway 托管、超出免费额度或账户政策产生的费用不在此保证范围**。

## 4. Claude 审核通过后的部署顺序（现在不要做）

1. 将 `supabase/migrations/20261114170000_agent_google_signup_gate.sql` 经迁移流程应用到目标 Supabase（缺失时默认 **关闭**；迁移落地值为 `false`）。
2. 配好 Google Provider、Redirect URL、Turnstile Site/Secret Keys；重新部署 `agent-auth` 和 `owner-session` 两个函数。
3. 最后按现有 Railway bundle/loader 流程部署 `agent-mobile`，**不要绕过版本/校验流程直接部署**。
4. Owner 用现有合法 Owner session 访问 `owner-session`，读取或调整开关。请求 body：
   - 读取：`{"action":"signup_setting_get"}`
   - 开放：`{"action":"signup_setting_set","open":true}`
   - 关闭：`{"action":"signup_setting_set","open":false}`

   这两个 action 只允许 **Owner**（不是 Agent、未授权用户，也不是普通 admin）。写入有 `private.audit_events` 记录；默认保持关闭，先验收后再开放。

## 5. 登录 / 权限行为

- 新 Google 帐号：Turnstile → 服务端一次性验证 → Google OAuth PKCE → Supabase code exchange → Owner/Agent/注册开关检查 → 注册表单或被拦截页面。
- 新 Google 帐号，注册关闭：即使尝试直接调用既有 `agent-session register`，数据库触发器也拒绝（`agent_signup_closed`）。
- 注册开放但缺少有效 Turnstile 证明：无法进注册表单，直接调用注册 RPC 也被触发器拒绝（`captcha_required`）。
- 已有 Agent：直接首页；Owner：提示使用 Owner 后台；已消费的邀请链接：保持原有 `#invite=...&email=...` 流程，开放开关关闭也可完成邀请注册。
- Google 回跳失败或取消：页面有中文/英文可重试提示；OAuth session 保存在 Supabase JS 客户端，下次登录正常恢复。

## 6. CSP 域名为何新增

| 指令 | 新增域名 | 用途 |
| --- | --- | --- |
| `script-src` | `https://challenges.cloudflare.com` | 下载 Turnstile 官方 JS |
| `frame-src` | `https://challenges.cloudflare.com` | 承载 Turnstile challenge iframe |
| `connect-src` | `https://challenges.cloudflare.com` | 浏览器中的 Turnstile challenge 通讯 |

原本的 `https://*.supabase.co` 是 Supabase Auth/Functions 所需，保留不改。**不需要**把 `accounts.google.com`、`googleapis.com` 或 `gstatic.com` 额外加进本站 CSP：Google 登录是顶层网页导航，Google 的资源由 Google 页面自己加载，不是我们的内嵌 script/frame。后端 Cloudflare siteverify 请求不受浏览器 CSP 限制。

## 7. 手工验收表（等待 Owner 配置后执行）

1. `signup_setting_get` 初始 `open:false`；无 Owner 身份调用 get/set → 403；set true/false → 数据库更改 + audit。
2. 关闭时：新 Google user →「目前只接受邀请注册」；直接调用 `agent-session register` → 拒绝。
3. 开启时：Turnstile 成功 + Google 首次登录 → 注册入口；绕开 Turnstile 直接访问 OAuth → 不可注册，直接调用 register → 拒绝。
4. `#invite` 链接可使用；已有 Agent Google 登录 → 首页；Owner Google 登录 → Owner 提示，不可注册。
5. 登出、再次 Google 登录、刷新页面、切换中英文，session 与状态正确。
6. Google OAuth 取消、失败、过期验证码、无 Turnstile Key、无网络 → 明确提示且不会放行。

**注意**：没有真实 Google Client ID/Secret、Turnstile keys 和手工试用帐号时，不能声称端到端生产验收 PASS。本 PR 附带的自动测试属于源码/逻辑测试，不会更改生产 Supabase、Railway 或 Owner 开关。
