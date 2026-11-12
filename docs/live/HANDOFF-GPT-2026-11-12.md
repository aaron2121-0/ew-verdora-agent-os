# GPT continuation handoff — 2026-11-12

Claude's preserved TypeScript engine remains unchanged in `packages/core`.
The live production system is Supabase + Railway and is a separate implementation.

## Claude snapshot verified
- Bundle HEAD: `17946474a10e08862f34620a54f9aab4c6d0293b`
- 29 tracked files
- Commit `5632b1d`: rule engine, AI provider abstraction, i18n, simulation, tests
- Commit `1794647`: handoff + unapplied SQL reference draft
- The SQL under `docs/reference/unapplied-schema-draft/` is REFERENCE ONLY and must not be applied.

## Live system state
Supabase Edge Functions: `agent-session`, `agent-ai`, `quote-intake`, `owner-session`.
Railway services: `agent-os-core`, `agent-mobile`, `owner-mobile`.
External paid AI is intentionally disabled; deterministic/manual paths are the production fallback.

## Claude HANDOFF findings reviewed by GPT
The live system was checked against Claude's eight open findings.

Fixed in live Supabase:
1. Refund-before-completion / commission-after-full-refund is blocked by the order/payment state machine.
2. Late payment after a refund cannot reset `payment_status` to paid.
3. Partial refunds are accumulated, capped at order total, and adjust commission proportionally.
4. `orders.quote_id` is unique: one quote maps to at most one order.
5. Order-code collisions across different quotes are rejected; same-quote order creation is idempotent.
6. Excess `anon`/`authenticated` table grants were removed; authenticated keeps only policy-controlled reads on selected tables.
7. `private.daily_manager_job`, `private.release_commissions_job`, and `private.sync_campaign_status` are no longer executable by anon/authenticated clients.
8. `owner-session` v5 sanitizes database errors instead of returning raw Postgres messages.

Additional accounting hardening:
- Payment events are replay-idempotent before state validation.
- Full payment amount must match flower revenue + delivery fee (business policy is full payment before proceeding).
- Partial-refund clawbacks for already-paid commission are event-scoped and idempotent.

## Verification
A 100-iteration transaction regression passed after these fixes:
`CLAUDE_HANDOFF_PAYMENT_ORDER_100_PASSED`

The test covered quote→order idempotency, payment amount validation, duplicate payment events,
order transitions, unpaid commission adjustment, partial/full refunds, late payment after refund,
and multiple paid-commission clawbacks.

## Source-of-truth warning
Do not replace live Supabase SQL with the old Claude draft. Reconcile deliberately.
`packages/core` is the preserved deterministic TypeScript implementation; live SQL is the currently running implementation.
