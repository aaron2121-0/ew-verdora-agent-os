# Claude session handoff — 2026-11-12

## What this repository snapshot is
Work produced in one Claude session, preserved as-is. GitHub was not linked
to the session, so nothing here has been pushed to
`aaron2121-0/ew-verdora-agent-os`. Push this commit history there (or merge
`packages/core` into the canonical repository) to make it permanent.

## Contents
- `packages/core/src` — deterministic rule engine in strict TypeScript:
  rules config (zod, versioned), commission + quote lock + idempotent ledger,
  tier (grace / recovery), bonus (stack groups, profit-pending), profit guard
  (order contribution + company mode), KPI + funnel diagnosis, audit ladder,
  lifecycle / exam grading / dormancy, daily mission, agent-safe visibility.
- `packages/core/src/ai` — provider abstraction (OpenAI, Anthropic, mock),
  roleplay scoring, sales coach with policy guardrails, enquiry classification.
- `packages/core/src/i18n` — EN / 中文 dictionaries with key parity.
- `packages/core/src/sim` — seeded 10-agent / 50-enquiry simulation.
- `packages/core/test` — 46 tests (`npm test`), all passing at commit time
  on Node 22 with zod 3.25, TypeScript 6.0, tsx 4.23.
- `docs/reference/unapplied-schema-draft` — SQL draft, never applied.

Not written in this session: README, ARCHITECTURE.md, BUSINESS_RULES.md,
seed data, any web app, any deployment.

## Relationship to the live system
The live Supabase schema, Edge Functions and Railway services were built
outside this session. Their rule logic lives in SQL functions and uses
numeric ringgit; this package uses integer sen and basis points. The two are
independent implementations and have not been reconciled.

## Live change made by Claude (not in any source repository yet)
Supabase Edge Function `owner-session`, version 3 → 4. In the
`refresh_profit` action, two lines were added before the RPC call:

    const authCheck=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(authCheck.error)return reply({error:authCheck.error.message},403);

Reason: any authenticated Agent could call `refresh_profit` and receive the
company profit snapshot. Not yet verified with a real Agent token. Whoever
owns the Edge Function source must copy this change in, or the next deploy
from source will undo it.

## Open review findings (not fixed)
1. Refund before completion: order can still complete and accrue commission
   (`transition_order_internal`, `accrue_commission_internal` ignore
   `payment_status`).
2. Late `payment_succeeded` after a refund resets `payment_status` to `paid`;
   cancelled orders can be marked paid.
3. Partial refunds are treated as full; refund and payment amounts are never
   validated against the order.
4. `orders.quote_id` has no unique index: one quote can create several orders.
5. `create_order_from_quote_internal`: order-code collision returns another
   quote's order and still marks this quote accepted / lead won.
6. Excess grants: `anon` has all privileges on `campaigns`,
   `channel_playbooks`, `commission_adjustments`, `lead_events`,
   `quote_requests`; `authenticated` has write grants on three of them.
7. `private.daily_manager_job`, `release_commissions_job`,
   `sync_campaign_status` are executable by `anon` / `authenticated`.
8. `owner-session` returns raw Postgres error text to clients.

Not reviewed: `agent-session`, `agent-ai`, `quote-intake`, Railway services.
