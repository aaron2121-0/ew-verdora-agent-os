# EW VERDORA — Handbook `module_cards` patch / Claude review handoff

**Status (2026-11-13):** review only. Do not auto-merge, deploy, run migrations, or re-import banks in production.

## Why this is a follow-up instead of an edit to PR #10

PR #9 and PR #10 were already merged into `main` by other activity while this fix was being prepared. This follow-up supplies one missing endpoint without changing the Claude-reviewed handbook JSON, the transaction-safe Owner import/review code, or any compensation/profit rules.

## New Agent API contract

`POST agent-session { "action": "module_cards", "module_code": "QUALIFY" }`

- Bearer authentication and a registered Agent are required, using the existing `agent-session` gate.
- A required **active** course must exist in `training_modules`. Invalid code returns 400, missing/inactive course returns 404.
- The server resolves `training_modules.handbook_section` and selects only entries with `kind='card'`, `active=true`, `visible_to_agent=true`, `needs_owner_confirm=false`, matching `section`. Ordered by `sort`.
- Success is `{ "ok":true,"module_code":"QUALIFY","card_codes":["..."] }`. When a course has no approved cards, `card_codes=[]` (normal; do not synthesize content).
- Database failures return generic 503 (no raw SQL or internal errors). Browser clients never query `company_knowledge` directly.

**Important cross-PR compatibility:** In the already-merged PR #10 migration `training_modules.handbook_section` is `public.handbook_section` (values such as `story`, `product_line`, `service_rule`). Draft PR #11 currently defines this column as `text` with **product-line** values and selects `company_knowledge.product_line = training_modules.handbook_section`; that is incompatible. Claude must reconcile the schema in PR #11 **before** applying its course-quiz migration or deploying the quiz endpoints. This follow-up does not alter per-course MCQ unlocking or grading.

## Approved source assets / deferred bank import

Do not edit `content/handbook/handbook_content.json` (20 cards, 15 scripts, 12 FAQs).
The Owner approved three MCQ JSON source files:

1. `content/handbook/training_questions_handbook.json` — 30 daily questions.
2. `content/handbook/exam_questions_2.json` — 20 exam questions.
3. `content/handbook/core_brand_questions.json` — 10 daily questions, codes `HB-CORE-BRAND-01` to `HB-CORE-BRAND-10`, **existing** `skill_code=QUALIFY` as reviewed; do not rewrite the questions or add an unsupported skill code.

Only at an explicitly authorized deployment gate, and only after inspecting live state, the approved import commands are:

```sh
node scripts/training-bank-import.mjs content/handbook/training_questions_handbook.json --apply
node scripts/training-bank-import.mjs content/handbook/exam_questions_2.json --apply
node scripts/training-bank-import.mjs content/handbook/core_brand_questions.json --apply
```

**Live read-only check observed 2026-11-13:** handbook migrations were ALREADY present under live versions `20261113074708`, `20261113074750`, `20261113074839`, `20261113074904`. The three MCQ source versions were ALREADY recorded in `private.training_questions`, with `is_test=false`: 40 daily and 20 exam active questions. Another 36 daily and 20 exam are existing `phase3-test-v1` rows with `is_test=true`. Thus **the requested production target of 40 non-test exam questions is not currently met**; these three approved files alone account for 20 non-test exam questions, not 40. Do not silently claim the target is satisfied or fabricate missing questions. Stop for Owner/Claude source review if 40 active non-test exam questions remain a hard deployment gate.

Observed handbook content remains Phase A seed-only (20 `kind=seed`, 16 visible, 4 hidden/unconfirmed). The 47-entry reviewed handbook JSON must be explicitly imported as pending, then Owner-reviewed; it must NOT auto-publish.

## Verification

- `node --test apps/agent-mobile/tests/module-cards.test.mjs`
- GitHub Product Handbook Supplement QA (new PR): existing reviewed content hash + PostgreSQL 16 rollback import tests + module_cards approval-only tests.
- After Claude approves and any required deployments occur: authenticated Agent 200; invalid/no-role 401/404; pending/hidden never returned, no-card empty; direct client writes denied; Owner actions gated.
