# QA P0 — Regression gate and isolated production demo fixtures

## Scope and check

- Exactly one required GitHub Actions job: `qa-regression`.
- Trigger: `pull_request` to main or `push` to main, plus manual dispatch.
- QA credentials are read only by the integration step for main pushes and same-repository PRs. Fork PRs receive no credentials; `pull_request_target` is forbidden.
- No App, Edge Function, migration, Railway or Supabase configuration changes are in scope. No deployment or merging performed by QA.

## GitHub repository Secrets (values never printed)

- `SUPABASE_URL`: assigned Supabase project origin.
- `SUPABASE_PUBLISHABLE_KEY`: public/publishable key used alongside test-user JWTs.
- `SUPABASE_QA_SECRET_KEY`: dedicated revocable backend QA key, *not* the general production secret. Treat this as a service-role-level key and rotate it if exposed.

The QA integration script fails closed if any secret is missing.

## Disposable identity lifecycle

`scripts/qa/run-isolated-integration.mjs` creates unique `@example.com` identities per CI run:
- `qa-agent-a`, `qa-agent-b`, `qa-no-role`, `qa-owner`, each suffixed with a random run identifier.
- Auth sessions obtained via `agent-auth` one-use invites; no actual email is sent.
- Two Agent rows inserted atomically with `is_demo=true`; the tests do not reassign or modify any existing Agent.
- QA Owner role assigned to the disposable owner identity via the existing restricted `assign_owner_internal` service-role RPC. Owner invitation generated and redeemed once; replay must fail.
- The code never logs access tokens, invitation codes, publishable keys, QA secret keys, or email addresses.
- For five forbidden selling statuses, only the freshly created Agent A row is updated; its `active` state is restored in `finally` before deletion.
- A disposable lead is created under Agent B to test Agent A data isolation. Other business tables are only queried.
- Child Agent rows and Auth identities are deleted using exact IDs, with post-cleanup verification. Auth deletion cascades test-only dependent records.
- Each run publishes `qa-results/fixture-manifest.json` listing all created/deleted test IDs, results, any cleanup errors, and an explicit cleanup completeness flag.
- Never delete records by prefix, status, or date; exact IDs only. If cleanup fails the CI result is red and manual investigation is required.

**Caution:** Cancellation or runner crash can interrupt in-process `finally`. Concurrency cancellation is disabled for this workflow, but ungraceful infrastructure failures remain possible. The manifest can be used for investigation; do not assume an absent manifest means cleanup succeeded.

## Known temporary Owner HTML exception

Exactly two locations in `apps/owner-mobile/index.ts` are temporarily allowed:
- Line 33: exceptions HTML markup with dynamic values passed through `escapeHtml()`.
- Line 34: quotation queue markup using local `esc=escapeHtml`.

This is a strict, line-anchored exemption for **Owner Phase A only**. Moving or changing those lines without preserving the escaping is a failing check. At **Owner Phase B**, both occurrences must be removed; pass `QA_OWNER_PHASE_B_COMPLETE=true` or include the explicit completion marker in the Owner implementation to expire the allowlist. Every new `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` occurrence remains blocking. Temporary exception is **not** a general XSS exemption.

## Test contract and limits

- Reuse the existing core and Phase 0–3 source tests without modifying their files.
- Public read-only smoke tests cover Agent, Owner and unauthenticated Edge endpoint behavior.
- Isolated authenticated tests cover disposable Agent and Owner invites and replay, Agent/non-role access to Owner actions, direct RLS reads, own dashboard/training, status lock 403s, and daily MCQ duplicate/timeouts.
- Additional AI actions `platform_post`, `weekly_plan`, `profile_setup`, `lost_review` activate after their implementation merges.
- Owner `needs_info` and `rejected` activate on owner-v2 merge.
- Future public quote/tracking contracts activate when endpoint source is added.
- Gemini vision `manual_fallback` is currently checked at the source-contract level. Reproducing a provider outage against production is not attempted or faked.

## Approved security exceptions

- Policy-free RLS: `agent_ai_profile`, `ai_chat_messages`, `ai_feedback_events`.
- `private.is_owner()` may be callable by authenticated only so long as it checks `auth.uid()` and stays unchanged.
- `pg_net` public: accepted, no migration.
- Leaked Password Protection: not applicable to passwordless sign-in.

These are future security-audit policy exceptions, not P0 database configuration changes.
