# Owner V2 Phase A — Rollback-only production DB integration test

Date: 2026-11-13 (Asia/Kuching)
Database: Supabase project `vuibesuahnhlafsfraeo`

## Procedure
- Read all three Phase A migrations from `owner-v2`.
- Used one `BEGIN; SET LOCAL statement_timeout = '30000ms'; ... ROLLBACK;` SQL execution on production database.
- Migrations were created **inside the transaction**, with disposable agent/lead/quote data and a temporary admin role drawn from a previously unassigned auth user.
- Used `owner_review_quote_internal` and `owner_role_internal` directly; HTTP auth tests intentionally deferred until authorized production deployment.
- Returned each result from a TEMP TABLE within the transaction.

## Results (8/8 passed)
| Test | Observed | Result |
|---|---|---|
| Owner and admin roles | both recognized | PASS |
| Approve with no active reference cost baseline | status `manual_review`, classification `RED` | PASS |
| Request info | status `needs_info`, one audit event | PASS |
| Reject | status `rejected`, one audit event | PASS |
| Non-`manual_review` | `quote not pending review` exception | PASS |
| Admin patch AI settings | SQLSTATE `42501` | PASS |
| No-role role check | SQLSTATE `42501` | PASS |
| No-role quote review | SQLSTATE `42501` | PASS |

## Independent post-ROLLBACK verification
- New owner-v2 functions present: **0**
- Test agents and test leads: **0**
- Quote requests: **0**
- Test quote audit events: **0**
- Role counts: only the original Owner role remained
- `quote_requests_status_check` constraint returned to its original status list, without `needs_info` or `rejected`

No schema migrations, Edge Functions, or Railway deployments were applied.

## Launch gates
- Run HTTP 403 smoke matrix immediately after deploying owner-session, with Agent and role-less tokens. **Rollback immediately if any unauthorized call succeeds**.
- Verify Agent app renders `needs_info` and `rejected` via the separate Agent engineering work.
- Confirm migrations execute successfully as committed before deployment. Deploy only after owner authorizes the deployment window, in order: three migrations → owner-session → Railway owner-mobile.
