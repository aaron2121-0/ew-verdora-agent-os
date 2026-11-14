# iPhone「今天」页绿屏：版本对照与防护方案

**结论：本次 Playwright WebKit 26.0 没有重现现场绿屏，不能据此认定哪个 commit 是根因，也不能宣布现场问题已经修好。** 以下 PR 是保留花徽与 network-first 的防护方案和回归测试；仍需发生问题的 iPhone / iOS 版本验证。没有部署或修改 release pin。

## 原始 bundle 对照

所有截图均为 390×844 CSS 像素，使用 iPhone 13 参数（mobile、touch、3× device scale；截图 scale=css）和 `e2e-motion.mjs` 的同一套假登录/Agent dashboard。不是线上账户数据，也不是实体 iPhone 截图。

| 标记 | 原始 bundle commit | 截图 | 本环境结果 |
| --- | --- | --- | --- |
| 1.1.0 | e13005c5801044ad4d1b8703a07e6985566d2f35 | [1.1.0.png](1.1.0.png) | 任务卡与内容可见 |
| 1.1.1 | ab076edbdcb17675ea1dc629b2d1ad0cbe8d30ad | [1.1.1.png](1.1.1.png) | 任务卡与内容可见，未重现绿屏 |
| 1.1.2 | 606e069d49d41834710612716b9e412fb3cb932c | [1.1.2.png](1.1.2.png) | 任务卡与内容可见，未重现绿屏 |
| 防护方案 | 本 PR 源码本地构建 | [fixed.png](fixed.png) | 任务卡可见，完整花徽图片在固定按钮内 |

历史版本直接读取 Git 中的 `dist/railway-function.ts`，解析 ASSETS/TYPES/CSP，解压后原样服务；没有拿当前源码重打旧版本。唯一替换是同一个测试 Supabase SDK 与假 API。测试通过本机临时 HTTPS 证书运行，保持 bundle 原有 CSP（包括 upgrade-insecure-requests）。临时证书只用于本机测试，不读取任何平台 key。

控制变量覆盖：全新浏览器 context；1.1.0 缓存预热后依次升级；idle / thinking / speaking；另做了深色模式、高像素倍率的探查。`webkit-results.json` 保留各版本 console warning/error、pageerror、可见性结果与 service worker 状态。共同出现的 404 是仓库中不存在的可选 `content/handbook/daily_actions.json`；另有未使用 onboarding 图片 preload 的警告。没有观测到可归因于三个 commit 的 JS 异常。

## 对三个改动能确认什么

- `d49fff3` 引入 SVG `<use>`、filter、overflow-visible 及子节点动效。它增加了 Safari 绘制风险，但**未取得它导致现场绿屏的重现证据**。
- `bc22c33` 改成异步装饰模块；防护方案补上实例身份检查，避免退出/重建之后旧 Promise 挂载到错误实例。不能据此把现场绿屏归因于该 commit。
- `76c1faf` 的 network-first 在本地受控 WebKit 中能取得变更后的静态资源；模拟网络连接失败时能返回缓存，`/config` 不会被缓存。保留这项行为，不把它回退为 cache-first。

## 防护方案

使用项目已有的 `icons/brand-192.png` 花徽，在固定尺寸、`overflow:hidden` / paint containment 的按钮中绘制；保留按钮的状态和现有动效、reduced-motion 行为，不挂载新的 SVG 子节点动效。原先两个装饰模块 URL 均保留兼容入口，避免旧缓存客户端请求这些 URL 时仍收到高复杂度 SVG renderer。装饰模块失败不阻止 dashboard。

任务期间 main 已到 `7d14e20`（1.1.3）。本 PR 已同步它并保留 loader 的 1.1.3 pin；仅按本任务要求恢复 network-first/v2，并将新装饰模块加入纯静态缓存白名单。没有数据库、后端或认证行为变更。

## 新 E2E

`today-visible.mjs` 由原 `e2e-motion.mjs` 与新增 WebKit 测试共用：

1. 登录后必须看到「今天赚钱 3 件事」/英文标题、三个任务和非空任务内容。
2. 检查祖先透明度、元素命中与截图里的文字对比；仅 DOM 存在不算通过。
3. 将标题隐藏或染成与背景相同颜色的负向控制，必须使同一断言失败。
4. 防护方案还检查完整花徽尺寸、无 SVG 图层，以及装饰子节点被强制放大到 5000px 时不能遮住今天页。
5. 验证 network-first、网络失败时的公共静态缓存回退，以及配置/API 不缓存。

`.github/workflows/ios-today.yml` 在相关 push / PR 自动跑 WebKit，仅 contents:read，无 secrets，无部署。截图与日志作为 artifact 上传。

本地复现（已安装 Playwright 与 WebKit、仓库依赖）：

```sh
node apps/agent-mobile/build-railway-function.mjs
node apps/agent-mobile/tests/ios-today.mjs --compare-releases
```

`--compare-releases` 需要 Git 历史中的三个发布 commit；CI 默认只验当前构建。可通过 `PLAYWRIGHT_MODULE` 指定 Playwright 模块路径、`IOS_REPORT_DIR` 指定输出目录。Playwright 安装与系统依赖由运行环境管理，不属于产品源码。

验证：117 项 Agent `.test.mjs` 测试通过；WebKit 版本对照、花徽/防遮挡、network-first、负向控制通过；workflow actionlint 与 git diff --check 通过。真实故障设备的 iOS/Safari 版本及现场复现仍待确认，不能用这些本地结果替代真机验收。
