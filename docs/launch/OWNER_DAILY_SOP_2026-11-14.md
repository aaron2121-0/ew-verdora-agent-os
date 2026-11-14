# Owner Daily Operations — 14 November 2026

Production URL: https://owner-mobile-production.up.railway.app

## 1. 审核报价 / Manual Quote Review — Available

1. 用已获授权的 **Owner Recovery Link** 登录 Owner 网页。
2. 在首页找到 **Manual Quote Review** 卡片，查看待审核笔数。
3. 逐项查看客户需求、Agent、预算、参考图及分类说明。
4. 确认分类下拉选项（size / density / premium / complexity），必要时填写备注。
5. 按 **「确认分类 / Quote」**，再按弹窗确认；系统会由官方规则计算报价。不可在此自行改佣金或利润规则。
6. 审核后重新查看列表是否移除该项目；需要进一步确认的项目要和 Agent 跟进。

## 2. 确认付款 / Payment Confirmation — BLOCKED

截至本次上线检查，现行 **Owner Mobile 没有订单列表／确认付款按钮**；当前 `owner-session` 对外 action 亦未暴露 payment confirmation。数据库有 `record_payment_event_internal`，但它不是已验证的 Owner 人工确认入口。

**不能**以 `Add OPEX`、`Manual Quote Review`、`Global Reference Cost Baseline` 代替确认付款，也不能直接修改数据库 `orders.payment_status`。此项必须先完成有认证、Owner 权限、审计和幂等防重的前后端实现，并由 Claude 审核后部署。

## 3. 看代理进度 / Agent Progress — Aggregate available; per-Agent unavailable

1. 登录 Owner 首页。
2. 查看 **Company Health**、**Active Agents** 和 **Dormant** 指标，掌握整体情况。
3. 当前页面未发现可进入每个 Agent 的 **7 门课程／认证考试进度** 的明细入口。不能声称已可逐人审核。
4. 逐人训练进度功能需要另行开发、权限审查、部署与验收。

## 4. 发新 Agent 邀请 / Agent Access Link — Available

1. Owner 首页找到 **Agent Access Link**。
2. 输入新 Agent 的正确 Email，按 **Create one-time Agent link**。
3. 按 **Copy link**，通过私聊发给本人。不要公开转发或将邀请码放入日志。
4. Agent 先完成必修课程、小测验、认证考试，获得系统解锁后才能接单。

## 5. 当日异常检查 / Exceptions

查看 Owner 首页 **Serious Exceptions**；未经核实不要随意点击 Freeze 或 Dismiss。

**Operational rule:** 在付款与订单闭环尚未经过真实验收前，不可把系统标为 end-to-end production-ready。
