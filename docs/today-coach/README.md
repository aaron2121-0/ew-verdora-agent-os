# 今天页手机验收截图

所有截图尺寸为 **390 × 844**，由本地浏览器测试生成，**不是线上账户或真实 AI 请求的截图**。

- `390x844-empty.png`：空 dashboard 的诚实空状态。没有补入 Gemini 的示范名称、连胜天数或固定建议。
- `390x844-fixture.png`：标有「离线验收 / 离线测试 AI」的 API 合约 fixture，用来检查真实资料接口的呈现。生产页面只使用现有 `api.agent` / `api.ai` 回传；fixture 不会打包进 App。

本地重现：先安装仓库依赖并运行 `node apps/agent-mobile/build-railway-function.mjs`，再执行：

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_PATH=/usr/bin/chromium \
node apps/agent-mobile/tests/today-coach-browser.mjs
```

使用标准可解析的 Playwright 安装时，可以省略 `PLAYWRIGHT_MODULE`；使用 Playwright 自带 Chromium 时，可以省略 `CHROME_PATH`。

浏览器测试只连接随机本机端口。Supabase SDK、dashboard 与 AI 回应均在本机模拟，不读取任何 key，不连接 Supabase/Railway，不执行部署。

本轮浏览器验收通过 **81 项断言**：五个分页与键盘导航、实际 API action 与参数、六种结果回填、对练生成和评分、周计划、fallback 回传不冒充 AI、恶意 HTML 只显示为文字、390px 无横向溢出、真实记录增加触发 celebrate、reduced-motion 不触发 celebrate 且关闭页面动画。

设计来源：`aaron2121-0/ew-verdora-content` commit `c5a3b9f20e62567930317f12cb2e5b6868de570e`，`motion/preview.html#coach` 及 `motion-dist/coach.*`、`home-today.*`、`celebrate.*`。本次以原生 DOM adapter 安全重建结构，不挂载含预设示范资料的 coach renderer。

界面只接受 Gemini provider 的 AI 正文；没有销售连续天数资料就隐藏连续天数。结果回填的「成交了」只记录客户反馈，不能替代正式订单/付款确认。晚上复盘按真实日期取周计划的明天；周日不会回绕显示旧周一。

额外回归检查覆盖：复制下一句话只含客户可见 message，不混入内部 why；三个异议回复各有独立复制按钮；对练生成/评分期间的互斥控件；生成新题清空旧答案与旧评分；延迟保存跟进期间切换分页后仍刷新 dashboard，且不会把旧建议塞进新分页。

## 测试与限制

- `npm run check --workspace @ew-verdora/agent-mobile`：全部 125 项 `.test.mjs` 单元/源码测试通过（包含 main 新增的 PWA 测试）；构建 bundle 为 591217 bytes，低于 900KB。Today 按需 JS 为 8710 bytes gzip，原有首屏 150KB 上限没有放宽。
- 新手机浏览器验收：81 项断言通过，截图见上方；API 皆为本地模拟，不代表已验收线上 Gemini 可用性。
- 旧 `e2e-motion.mjs` 的功能、安全、认证和手册检查通过，但最终 Lighthouse 的 Performance ≥90 门槛在当前环境未通过：Performance 88、Accessibility 96、Best Practices 93、CLS 0.01987。受控 main 对照的 Performance 也是 88；未降低门槛，未把此检查标为通过。
- 需要线上登录或 secrets 的 `live-*` 测试未运行；没有部署、修改 Railway loader pin 或访问 key。
