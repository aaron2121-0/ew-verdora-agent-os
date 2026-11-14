# EW VERDORA Agent OS — Launch Gate (2026-11-14)

## Environment
- Repo: `aaron2121-0/ew-verdora-agent-os` — `main`
- Supabase: `vuibesuahnhlafsfraeo`
- Agent: https://agent-mobile-production.up.railway.app
- Owner: https://owner-mobile-production.up.railway.app

## Completed
- `owner-session` upgraded from v19 to **v20 ACTIVE** using main source. Supabase deployment packaging required rewriting the shared validator import path to a local bundled file; function business/authorization logic unchanged.
- `owner-mobile` updated from previous Railway deployment `d90ff850` to **`dcb871d2-50a9-483f-8b12-b7709cd5ea54`**, status SUCCESS.
- External GET health checks: Owner and Agent returned `ok:true`.
- External anonymous POST to `owner-session`: HTTP 401.
- Cleaned all `agents.is_demo = true` and specifically `QA-QUIZ-1114`, plus `@example.com` Auth users and invite records. Rechecked zero remaining; five non-demo agents preserved.

## Not yet verified / blockers
- Authorized **temporary Agent JWT => Owner 403** not yet tested; 401 alone does not prove role isolation.
- Seven required courses, certification to `agents.status=active`, lead, quote, Owner approval, order, payment, commission **not yet completed as one real E2E run**.
- Owner frontend has a Manual Quote Review action but no visible Order Creation or Payment Confirmation workflow.
- Per-Agent course and certification progress is not presented on Owner Mobile.
- No production payment/role-sensitive patch without Claude review.
- No KYC, Google registration, or handbook import in today's launch scope.

## No-go rule
Do not claim that real agents can complete order and payment processing entirely through these two websites until the missing steps have been implemented, Claude-reviewed (where permission/payment is touched), deployed, and E2E-tested.

## Owner manual quote step
Open Owner Mobile -> **Manual Quote Review** -> inspect Agent/customer/reference -> confirm classification -> **确认分类 / Quote** -> confirm dialog.

## Rollback reference
- Owner Edge Function former v17 code re-deployed as v19 before this release.
- Owner Railway former deployment `d90ff850`.
