# 场合日历使用与移植说明

来源：[ew-verdora-content d33f8b6](https://github.com/aaron2121-0/ew-verdora-content/tree/d33f8b6ffc8b416523f12413d0ef6d393605458a/src/features/occasions)。本实现使用原生 ES module、CSS、SVG；没有引入 React、Tailwind 或 motion runtime。

## Agent 怎么用

1. 登录后，“今天”上方的「近期用花机会」显示未来推广窗及仍在推广期的真实场合。最多显示三张卡，更多场合从日历查看。
2. 每个古晋日期、每个登录账号分别记录已展示的提醒。全屏提醒一次最多三个，支持跳过动态、关闭、查看详情；手动「播放提醒」可重看。未展示的项目不会被提前标记。减少动态效果开启时显示静态 SVG。
3. 「场合日历」有月历、清单、动态场景三页。月历是周日开始的 42 格；点日期查看当天场合，再点场合查看推广期、产品、证据与官方来源。
4. `confirmed` 表示 Owner 已核实；`pattern` 只是规律推算；`not_found` 尚未找到日期。后两者不能锁货或正式采购。
5. 通过「帮忙核实日期」提交起止日期、资料链接与说明。提交只产生 `pending`，不会改变场合状态；Owner 核准后才成为 `confirmed`。返回前台或刷新时会重新读取审核结果。
6. 「检查备货资格」只检查日期状态，不会建立订单或真正锁货。后续仍走既有报价与订单流程。

数据库尚未准备好或 API 失败时会显示可重试的友善状态；没有资料就显示空状态，绝不载入来源仓库的假 seed。

## Owner 怎么核实

Owner 工作台的「场合日历」只向真实 Owner 角色显示。可搜寻、按日期状态筛选、新增、编辑，并查看 Agent 的核实申请及历史结果。

核对学校、活动主办方或政府正式公告后，勾选已经核实日期，再核准申请或保存 `confirmed` 场合。Owner 身份与核实时间由服务器写入，不能由 CSV 或浏览器伪造。两个人同时审核或资料已改动时，旧申请不能覆盖较新的结果；可拒绝旧申请并请 Agent 重新提交。

## 六类场合的联系重点

| 类型 | 日期确认与联系重点 |
| --- | --- |
| graduation 毕业 | 向校方确认正式日期，先了解取花/送花区域，再走正式报价。 |
| festival 大众节日 | 提前联系有同意接收资讯的旧客户，核对实际制作与配送容量。 |
| cultural 文化节日 | 农历、伊历日期未正式确认时保留 `pattern`；尊重文化与宗教语境。 |
| business 商务 | 核对机构名称、贺词、收件时间与摆放地点。 |
| wedding 婚礼 | 确认婚期、场地、色系与报价，未核实前不锁花材。 |
| event 活动 | 核对主办方正式时间表、数量、入场与撤场安排。 |

沿用来源手册的原则：只用官方定价，不自行承诺折扣或「100% 一样」复刻；尊重 PDPA；客户联系与任何草稿都由 Agent 自己审核后手动发送。本移植没有新增群发、预测或自动采购。

## 真实 CSV 导入

仓库的 `supabase/seed/202611150002_occasions_seed.sql` 故意为空。来源的 25 条示范 seed 没有复制。

先在本地执行（默认就是 dry-run，不读凭证、不联网）：

```sh
node scripts/import-occasions.mjs /path/to/real-occasions.csv
node scripts/import-occasions.mjs --help
```

CSV 为 UTF-8，可带 BOM。必需列名准确如下（顺序可调整）：

```text
date_start,date_end,estimated_date,name_zh,name_en,category,location_or_audience,flower_demand,typical_products,order_lead_days,recurrence,date_status,confidence,past_2024,past_2025,source_url,evidence,needs_owner_confirm
```

也接受 Occasion 的 `id,verified_by,verified_at,created_at,updated_at` 列；除 `id` 用于更新外，其他审计资料会丢弃，由服务器重写。`typical_products` 使用 JSON 字符串数组，CSV 内的双引号要加倍；空的可选日期/链接为 null；`needs_owner_confirm` 只能是 `true` 或 `false`。

- `true`：即使文件写 confirmed，仍改为 pattern 或 not_found，清除核实身份与正式日期，保留估计日期给 Owner 核实。
- `false` 且 confirmed：只有 Owner 后续明确执行 `--apply` 才代表本人已核实；dry-run 的 `dates_to_confirm` 会显示这类记录的数量。不能把未经核实的行标 false。
- 一份文件限 1–200 行、2 MiB，以一次 Owner API 请求原子导入；其中任何一行失败，整批不写入。重跑无 id 的行会新增，不会自动猜测重复场合。

未来由 Owner 自己决定执行 `--apply` 时，脚本只调用现有 owner-session 的 `occasion_import`；需要 Owner 登录 access token 和 Supabase URL，网关需要时才提供 publishable key。不要把这些值写进 CSV、代码、命令历史或 PR。**本次没有执行 --apply，也没有读取或设置线上凭证。**

## 移植范围和暂未实现

实际执行 registry 后是 **100 个场景、100 个启用、10 组各 10 个**。全部十组图形已移植；每组懒加载，沿用 `logoMotion` 的 tween 时钟，支持播放、暂停、seek 与销毁。动态库每次只挂一个场景，避免同时跑 100 个。

没有移植 React 组件、Tailwind、来源独立的 agent-ai、四个可选 AI action、证明截图上传、100 格同时播放的画廊、v2 预测/复盘。核实支持官方证明链接与文字。既有 agent-ai、RULES、redact 逻辑保持原样。客户端不直接访问数据表。

## 本地验证

```sh
npm install --ignore-scripts
npm run check --workspace @ew-verdora/agent-mobile
npm run check
node --test scripts/import-occasions.test.mjs scripts/owner-occasions.test.mjs tests/occasions/backend.test.mjs
```

使用**全新的本机临时** `occasion_test` PostgreSQL（测试会建立并删除测试 schema/角色，禁止使用线上连接）：

```sh
OCCASION_TEST_DATABASE_URL=postgresql://postgres:local-test@127.0.0.1:5432/occasion_test \
node --test tests/occasions/*.test.mjs
```

安装 Playwright 浏览器后（也可用 PLAYWRIGHT_MODULE 指向现有安装）：

```sh
npx playwright install chromium webkit
node apps/agent-mobile/tests/e2e-occasions.mjs
BROWSER=webkit node apps/agent-mobile/tests/e2e-occasions.mjs
node --import tsx scripts/owner-occasions.browser.mjs
```

Agent 浏览器测试只访问本机，使用明确标为测试的数据，验证 CSP、懒加载、月历、提醒、核实、空状态、错误重试、单场景与清理，输出 390×844 截图到 `docs/occasion-calendar/`。Owner 测试拦截全部网络，检查核准必需勾选、XSS 文本安全和普通操作员无法读取场合资料。

migration 只是代码交付，未套用；Edge Functions 未部署；Railway 与 railway-loader.ts 未修改。上线要由 Owner 另行安排数据库与 session 函数更新。已知无关的 “Agent Motion Live Supabase QA” 不列入这次验收。

## 本次验证记录

以合入 main `77428ea` 后的代码验证：Agent `npm run check` 83 项通过；仓库 typecheck、50 项核心测试、6 项利润底线测试、10 项 KYC 测试通过；后端/本机 PostgreSQL 6 项（含真实并发审核）、CSV/Owner 16 项通过；actionlint 通过。390×844 Chromium 与 WebKit 各验证九组流程，Owner 与 operator 浏览器流程通过。

构建实测：首屏 JS gzip **155,644 B（152.00 KiB，限制 156 KiB）**；场合功能全部懒加载 JS gzip **49,351 B（48.19 KiB）**、CSS gzip **1,952 B**。已有 Logo 引擎继续复用，既有 Logo 懒加载包仍由原本 44 KiB 上限单独检查。完整 Function 构建文件 **775,867 B（757.68 KiB）**；生成文件只用于验证，没有提交到 PR，也没有发布。
