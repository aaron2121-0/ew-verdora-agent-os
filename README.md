# EW VERDORA Agent OS

Commission-agent sales operating system for EW VERDORA.

## Source of truth

- GitHub repository: `aaron2121-0/ew-verdora-agent-os`
- Branch: `main`
- Live database / Edge Functions: Supabase project `vuibesuahnhlafsfraeo`
- Live services: Railway project `c9d145ac-87ae-4aec-84d8-085cbc5b67eb`
- Live review manifest: https://agent-os-core-production.up.railway.app/api/review-manifest

Do **not** rebuild a module just because an AI session does not remember it. Inspect GitHub, the live Supabase project, Railway, and the review manifest first.

## Important repository layout

- `packages/core/` — preserved TypeScript rules engine, AI provider abstraction, bilingual dictionaries, simulations and tests.
- `supabase/functions/owner-session/` — source synced with the live Owner Edge Function.
- `supabase/migrations/20261112_claude_handoff_hardening.sql` — live hardening continuation recorded in source.
- `docs/live/` — current handoff / live-state notes.
- `docs/reference/unapplied-schema-draft/` — **REFERENCE ONLY. DO NOT APPLY AS A MIGRATION.** This draft predates the live Supabase schema and is not the live database source.

## Cost policy

The running system is configured for no extra paid AI/API usage. Paid external AI is hard-disabled in the current live flow; deterministic fallback/manual review is used instead.

## Financial safety

The operating target is company actual net margin >= 50%. Financial permissions, commission, refund, order lifecycle, profit guard and payout rules are deterministic; language models do not decide payouts, tiers or financial approvals.

## Validation

The live continuation has passed repeated database regression tests, including quote/order idempotency, payment replay idempotency, partial/full refunds, commission reversal/clawback, campaign bonus idempotency and manual quote review.

GitHub CI runs TypeScript checking and the preserved core test suite on pushes and pull requests.

## Security

Never commit real API keys, service-role keys, passwords or secrets. `.env.example` contains variable names only.
