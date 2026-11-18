# Production 自动部署设置（Owner 操作）

本 PR 只提供代码；没有部署、读取现有 key、修改 secret 或操作线上数据库。

## 先认识三个流程

| 流程 | 何时运行 | 做什么 |
| --- | --- | --- |
| Production auto-deploy | main 的函数、App、构建输入或部署脚本改变；或手动 Run workflow | 等待 bundle 成功并核对来源 → 更新 loader → production 自动部署有改动的 Edge / Railway Functions → 检查 → 失败自动回滚 |
| Phase 1 Build Railway Bundle（已有流程） | main 的 Agent public/vendor、handbook/KYC 文案、构建脚本、package 或此 workflow 改变；或手动 | 生成 bundle 和来源证明；核对构建输入后普通 push 提交到 main；不部署 |
| Manually reviewed single DB migration | **只有手动**，输入一个 migration 文件名 | 无数据库连接地打印一个 SQL → 检查 production-db 有审核人 → 等待审核 → 执行相同 SHA、相同 SHA256 的那个文件 |

Production 和 migration 共用 `production-deploy` 锁，`cancel-in-progress: false`。GitHub 保证同时最多一个运行，但原生 concurrency 可能替换尚未开始的 pending run，并不保证 FIFO 或每个 commit 都单独运行；部署始终取最新 main，并与上次成功发布比较，补齐被合并的改动。

自动发布与数据库审批使用两个独立的 GitHub Environment：`production` **不设 Required reviewers**，main 合并后自动部署；`production-db` **必须设 Required reviewers**，只有单文件 migration 经过人工核准才执行。两个 Environment 都只允许 main，并各自保存下面的 secrets。

## 一、建立两个 GitHub Environment

1. 打开仓库 `aaron2121-0/ew-verdora-agent-os`。**画面位置：仓库顶部 → Settings。**
2. 左边选 **Environments**，点 **New environment**。**画面位置：Settings 左侧 Code and automation 区域。**
3. 名称填 `production`（全小写），点 **Configure environment**。**画面位置：Environment name 输入框。**
4. **不勾选 Required reviewers**；若之前设过，请移除审核人并保存，让自动部署不用等核准。**画面位置：production → Deployment protection rules。**
5. 在 **Deployment branches and tags** 选择只允许 `main`。**画面位置：production 页中段，新增 Branch rule `main`。**
6. 回到 **Settings → Environments → New environment**，建立 `production-db`。**画面位置：Environment name 输入框。**
7. 在 production-db 勾选 **Required reviewers**，加至少一位 Owner/审核人；建议勾选 **Prevent self-review**，保存。**画面位置：production-db → Deployment protection rules。** migration 预览会检查这个 Environment 确实有审核人，没设置就失败。
8. production-db 也只允许 `main`。**画面位置：production-db → Deployment branches and tags → 新增 Branch rule `main`。** 两份 workflow 本身也拒绝非 main。

如果账户方案不提供 Environment 人工审核功能，不要启用数据库执行；需要先解决 GitHub 方案/保护规则。本代码不会用输入一个 yes 代替人工核准。

## 二、Owner 创建两个 secret，并分别存入两个 Environment

### SUPABASE_ACCESS_TOKEN

1. 打开 Supabase Dashboard，点账户头像 → **Account / Account preferences → Access Tokens**。**画面位置：账户设置，不是项目的 API Keys 页面。**
2. 点 **Generate new token**，名字填 `github-deploy`。**画面位置：Access Tokens 列表右上角。** 选择适当有效期；仅给需要的项目权限（若界面提供）。
3. 自己复制新 token；不要贴到聊天、PR、issue 或截图。**画面位置：创建后只显示一次的 token 弹窗。**
4. 回 GitHub → Settings → Environments → production → **Environment secrets → Add environment secret**。**画面位置：production 页面底部。** Name 填 `SUPABASE_ACCESS_TOKEN`，Value 贴入刚才的 token，保存。
5. 再进入 **Settings → Environments → production-db → Environment secrets → Add environment secret**。**画面位置：production-db 页面底部。** 使用相同 Name `SUPABASE_ACCESS_TOKEN`，由 Owner 自己填入 token 并保存。Environment secrets 不会自动共用，两个环境必须各存一份。

### RAILWAY_TOKEN

1. 打开 Railway 的目标项目。**画面位置：项目页面 → Settings → Tokens。** 项目 ID 应为 `c9d145ac-87ae-4aec-84d8-085cbc5b67eb`。
2. 新建 **Project Token**，环境只选 **production**。**画面位置：Tokens → New token 的环境下拉框。** 环境 ID 应为 `e9d871fd-c95e-4760-a672-31d67932eeac`。不要用全账户 API Token。
3. 自己复制 token。**画面位置：创建完成的 token 弹窗。** 不要截图 token 内容。
4. 回 GitHub 的 production → Environment secrets → **Add environment secret**。**画面位置：与上一个 secret 相同的位置。** Name 填 `RAILWAY_TOKEN`，Value 贴入 Project Token，保存。
5. 再进入 **Settings → Environments → production-db → Environment secrets → Add environment secret**。**画面位置：production-db 页面底部。** 同样新增 `RAILWAY_TOKEN` 并保存；migration 目前只使用 Supabase token，不读取这个 Railway token。

不需要数据库密码、service role key、Vault 内容或 GEMINI_API_KEY。流程不会读写 Supabase Vault、修改任何平台 secret 或 `private.app_settings` / `AGENT_KYC_REQUIRED`。

## 三、允许 bot 普通提交，但不要降低 main 保护

1. 检查 Settings → Actions → General 的组织/仓库策略允许该 workflow 使用所声明的写入权限。**画面位置：页面底部 Workflow permissions。** 顶层默认仍然是只读；只有 production 的 `loader-commit` job 和已有 bundle 的提交 job 需要 `contents: write`。部署 job 只额外申请 `deployments: write` 用来记录回滚 SHA。
2. 若 main 的 branch rules 不允许 Actions bot 普通提交，流程会在部署前失败。**画面位置：Settings → Rules → Rulesets（或 Branches）。** 请按团队政策处理，不要为此允许 force push，不要把本 PR 当成绕过审核的授权。
3. 不需要为了开此 Draft PR 改这些设置；合并前再由 Owner 配置。

## 四、首次启用：提供可信回滚基准

1. 找出**确实已在线上正常运行**的完整 40 位 Git commit SHA，里面必须包含当时的 Edge 源码、owner-mobile/index.ts 和准确的 railway-loader.ts（含可访问的 bundle SHA 与正确 SHA256）。**画面位置：GitHub → Commits → 对应提交 → 复制完整 SHA。** 不要直接假定“当前 main = 当前线上”。
2. 若仓库历史里没有完整对应当前线上版本的 commit，先由 Owner 人工整理一个可信基准；流程会拒绝猜测。基准必须是 main 的祖先。
3. 合并后，在 GitHub **Actions → Phase 1 Build Railway Bundle** 查看构建是否成功。**画面位置：最近一次 main run 的绿色结果。** 必要时手动 Run workflow，分支 main。
4. 打开 **Actions → Production auto-deploy → Run workflow**，选 main，`baseline_sha` 填可信基准 SHA。**画面位置：右上角 Run workflow 展开区。**
5. 先看 loader job；它只固定 bundle 的完整 commit SHA、文件 SHA256、package.json 的 version，使用 `github-actions[bot]` 普通提交。**画面位置：run → loader-commit → Job summary。** 本 PR 给原本缺少 version 的 Agent package 补上与现有 loader 相同的 `1.0.1`；以后发布版本由维护者在 package.json 明确递增。
6. 查看自动运行的 **deploy job**，确认 SHA、改动和回滚基准。**画面位置：run 页 → deploy → Job summary。** production 不设审核人，不需要点击 Review deployments。 首次发布还会对线上 version、bundle 标记、Agent 首页 HTTP 200 和未登录 401 做基准检查，失败就不部署。首次人工基准可能早于 Google 按钮的 HTML fallback，因此首次基准及它的回滚只检查首页 HTTP 200；新发布必须包含规定文字。
7. 成功后 GitHub Deployment 的 SHA 就是之后的自动回滚基准，后续手动触发不用再填 baseline。**画面位置：仓库 Deployments → production，以及 run 的 Job summary。**

## 五、每次发布的行为

- 等已有 bundle Action **成功完成**，再核对 `build-provenance.json` 的来源 SHA、构建输入与内容 hash。即使 bundle bytes 没变，也保留来源证明。
- prepare 可以接纳只有 Edge/Owner 等非构建输入的更新；若构建输入已变或 loader 的 push 时 main 前进，则停止，不强推。bundle job 只在逐项确认构建输入完全相同后，才把生成的提交 rebase 到较新的非前端改动上；绝不把旧 bundle 接到不同的前端输入。
- 自动提交使用 GitHub 提供的 GITHUB_TOKEN；这种 push 不会再次触发 push workflow，另有 loader bot 标记作为防循环保险。正常的后续人工 merge 不会被跳过。
- Edge 比较上次成功发布与新发布，部署改过的 function。`_shared` 递归追踪两版的相对 import；间接引用、移除引用也计入。无法静态确认的 import 保守重发该 function。config.toml 改变则重发全部。始终使用官方 Supabase CLI `--remote=<project-ref> --no-verify-jwt --use-api --yes`（v3 使用 --remote，不使用旧版 --project-ref）。
- 删除整个 Edge Function 会在任何部署前拒绝，要求单独审核；新建的 function 若发布失败，回滚会删除这次新增的那个远端 function。
- Railway 仅更新改过的 App；明确 project、production environment 与 service ID。先检查原始文件及官方 CLI 的更严格 base64 start-command 96KB 上限。只使用 `functions link` / `functions push`；不创建新服务、不改 variables。
- Railway push 返回仅表示已排队；流程继续轮询新 deployment，必须达到 `SUCCESS`，再运行 HTTP 检查。
- 检查 Agent `/health` 的 version 与 bundle 标记、Owner `/health` 的 `ok: true`、三个 Edge POST 均为 **401**（403 也不算通过）、Agent 首页 HTML 含 `Continue with Google`。请求无登录信息；不输出响应正文。
- 部署或检查失败时，重新部署上个成功 SHA 的已尝试资源，再验证回滚后的健康状态；发布 job 仍是失败。回滚某项失败仍会尝试其余项，并在 summary 明确报红。
- 回滚不会把 main 倒退，也不产生新的“成功”基准。修好后重新触发，仍从最后成功发布比较。
- runner 被强制终止、GitHub/平台不可用或 token 失效时，任何 CI 都无法保证回滚完成。不要手动取消执行中的发布；必要时 Owner 用 summary 的基准 SHA 人工恢复。上线后也避免从 Dashboard 并行手工部署同一服务。

## 六、数据库：一次只执行一个文件

1. Actions → **Manually reviewed single DB migration → Run workflow**，选 main。**画面位置：Actions 左侧工作流列表和右上角 Run workflow。**
2. 输入 `supabase/migrations/` 里的完整文件名，例如 `20261114000000_add_example.sql`，**不含目录**。**画面位置：migration_file 输入框。** 这是格式示例，不是仓库里应执行的文件。
3. 展开 **preview → Dry-run**，逐行阅读 SQL，确认文件 SHA256。**画面位置：preview job 日志及 summary。** 这里没有数据库连接，不是数据库端试执行，不证明依赖、锁或语法一定成立。
4. 审核人看完 SQL 后，从 **Review deployments → production-db** 核准。**画面位置：run 等待横幅。** apply 固定相同 GitHub SHA 并复核 SQL hash，才通过官方 Supabase Management API 执行那一个文件。
5. 查看 apply summary。**画面位置：apply job 结果。** 一次显式 transaction，不自动更新或修复 migration history；永远不运行 `supabase db push` / `migration up`。

此通道保守拒绝敏感标识、动态/过程 SQL（包括 DO、创建 function/procedure）、外部 I/O 和事务控制语句；这些 migration 要另外人工审核与执行。也不适用于必须 transaction 外执行的 SQL。检查有意偏严格，注释触发也拒绝。不要改写 SQL 来绕过限制。

若请求超时，状态可能未知，**先人工确认数据库结果再决定是否重试**；不要盲目重复执行。

## 官方支持调查（2026-11-14）

**可以正式自动更新 Railway Function 源码。** 官方 CLI 已有 `railway functions link --function <service-id> --path <file>` 和 `railway functions push --path <file>`；官方 Functions 文件也明确提到 push 与 IaC `fn`。本 PR 不需要非公开 GraphQL mutation、逆向编码或 dashboard 自动化。

- [Railway CLI functions：link / push 与参数](https://docs.railway.com/cli/functions)
- [Railway Functions：源码、96KB、版本与 IaC](https://docs.railway.com/functions)
- [Railway API：Project Token 只限一个项目环境](https://docs.railway.com/integrations/api)
- [Railway CLI：CI 中使用 RAILWAY_TOKEN](https://docs.railway.com/guides/cli)
- [Supabase Edge Functions CI/CD](https://supabase.com/docs/guides/functions/cicd-workflow)
- [Supabase Management API：Run SQL query](https://supabase.com/docs/reference/api/introduction)

锁定官方 Railway CLI `5.74.0`、Supabase CLI `3.1.0`；升级需单独审核。SQL query Management API 当前官方标记 Beta / experimental，升级或接口变化会使手动 migration job 安全失败；它不会退回 db push。

## 验证范围

离线验证命令：`python3 -m unittest discover -s scripts/deploy -p 'test_*.py' -v`。覆盖真实临时 Git 仓库中的 bot 单文件提交与 immutable bundle pin、loader pin/版本注入拒绝、共享模组间接与旧版引用、删 function 拒绝、缺少基准拒绝、失败部署不能成为基准、严格 401 与健康页面检查、migration 路径/敏感 SQL 拒绝、部分部署失败后的资源回滚、缺少审核人阻止 migration、单文件事务请求与响应不打印。共 13 项离线测试。

同时用 actionlint 检查 workflow；实际下载官方 Railway CLI `5.74.0`，以及 Supabase CLI `3.1.0`，只运行 `--help` 核对参数，未登录或连接 Railway 项目。没有运行 act 的联网部署；GitHub Environment、真实 token 权限、bot 的 main 写入政策、Supabase/Railway 实际部署、真实 smoke 与线上回滚只能等 Owner 设好保护和 secrets 后验收。本 PR 不执行这些操作。
