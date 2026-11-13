# EW VERDORA — Agent 产品手册 / FB 作品导入：阶段 A 交给 Claude 审核

> 截止：2026-11-13。**仅提交代码，未执行 production migration、未部署、未合并 main。** Claude 审核通过后才能考虑应用本 migration；阶段 B/C 必须另行实施并分别审核。

## 交付与范围

- `supabase/migrations/20261113145300_product_handbook.sql`：4 个专用 enum，`company_knowledge` / `portfolio_photos`，两表 RLS + 拒绝客户端权限，私有 `portfolio` bucket。
- `packages/core/test/product-handbook-migration.test.ts`：在现有 `npm test` / `npm run check` 中对结构、资料和默认隔离进行静态回归测试。
- `scripts/test-product-handbook-phase-a.sql`：**迁移完成后才运行**的数据库权限验证，断言 service_role 具备读写基础权限而 anon/authenticated 无表访问。
- 本阶段没有改动佣金、等级、奖金、财务利润保护、Agent/Owner Edge Functions。

## 种子资料（仅依据 Owner 本轮已确认描述）

总计 20 条：品牌故事 ×1；五大业务线 ×5（Condolence、Grand Opening、Bouquet、Wedding/Event、Wholesale）；配送与自取 ×2；沟通/当下价格/图片参考/不造假/预订确认 ×5；Google 负评、鲜度、照图制作的诚实话术 ×3；待确认公告 ×4。

- 5 条业务线逐条描述适用场合、业务内容与常见问题，不推测任何价格、交付保证或实时库存。
- 9 个配送地区照 Owner 原话保留，明确需视库存与排期。
- 空运直采、自有 e-Dagang Net、e-Permit、农业许可、DOA 与古晋机场清关，只作为已确认的供应链流程；不夸大为绝对质量保证。
- 任何 Agent 不应得到：公司注册号、TIN、利润率目标、技术架构、Google 差评原文；这些信息不在手册可见种子里。

## 待确认内容 — 强制双重隐藏

| 项目 | 记录的待核实资料 | 数据状态 |
| --- | --- | --- |
| 门市 | Third Floor, CityONE Megamall, Jalan Song, Kuching | `needs_owner_confirm=true`、`active=false`、`visible_to_agent=false` |
| 办公室 | No.49, Level 2, Taman Wan Alwi, 93350 Kuching | 同上 |
| 营业时间 | 09:00–17:00 | 同上 |
| 花圈 24/7 咨询 | 是否属实尚未确认 | 同上 |

自取地址未确认；**严禁**将上述候选地址当成已确认的顾客自取地点。

## 权限与审查重点

1. `public.company_knowledge` / `public.portfolio_photos` 均启用 RLS；无 anon/authenticated 的表权限和 RLS 客户端政策。即使 Agent 试图使用 Supabase SDK 直接查询/修改，也不能读取或写入这些表。
2. `storage.buckets` 的 `portfolio` 为 `public=false`，不新建任何 `storage.objects` 客户端访问 policy。必须保持 `storage.objects` 的其他政策不覆盖 `portfolio`；迁移后 SQL 测试目前要求无 Storage objects policies。不能直接使用公共文件 URL。
3. `portfolio_photos.status` 默认 `pending_review`，并有 `approved_by/approved_at` 一致性约束。未来 `approved` 操作必须同时填入两项；隐藏时应清空两项并由 audit 记录历史。
4. 阶段 C 的 Edge Function 必须在使用 service_role 前独立验证 Owner 身份；**仅**以 service_role 存取表还不等于 Owner 已授权。Agent handbook API 过滤 `active=true AND visible_to_agent=true AND needs_owner_confirm=false`；照片严格只过滤 `status='approved'`。
5. `portfolio_photos.ai_confidence` 允许 NULL（尚未跑 AI），否则强制 0–1；source_id/storage_path 各自唯一；FB/API 未获得授权前绝不能创建任何真实照片数据。
6. 本阶段 **不能**宣称 Agent 看不到 pending/hidden 的 API 端到端验收已通过：API 只在阶段 C 交付。此时可确认的只是 DB schema 与角色授权设计。

## Claude 检查与批准顺序

1. 检查 migration 和内容，尤其名称、待确认字段、表权限、Storage policy 兼容性、`approved_by/approved_at`。
2. 查看 PR CI：`npm run check` 必须 PASS；本轮未在本地执行 Supabase migration，也未对 live schema 进行写操作。
3. 审核通过后，**先重新核对 main 与 live migration 历史**，避免多人并行提交产生版本号冲突；按已有部署流程执行 migration。
4. migration ACTIVE 后运行 `scripts/test-product-handbook-phase-a.sql`，确认 PASS；异常停下，不继续下一阶段。
5. 仅经 Claude 批准才可进入阶段 B（`portfolio-import`、export_zip 备援、Meta token 设置文档），再单独审核；阶段 C（Agent/Owner API、AI prompt、端到端负例测试）最后实施。

## 明确未完成（按阶段边界）

- **B**：不抓 FB 照片，不要求 Owner 在聊天贴 Access Token，不创建 `portfolio-import`，不解析 ZIP，不修改 Supabase Secrets。
- **C**：不修改 `agent-session` / `owner-session` / `agent-ai`，不生成 signed URL，不更改 system prompt。
- 不合并、不部署，等待 Claude 阶段 A 审核。
