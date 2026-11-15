# Phase 1 security review — private schema tables without RLS

Reviewed: 2026-11-15 · Supabase `vuibesuahnhlafsfraeo` · **report only; no RLS modification applied**

## Method and finding

Queried `pg_class.relrowsecurity`, `has_schema_privilege`, `has_table_privilege`, `pg_proc.prosecdef`, and `has_function_privilege` for the 18 ordinary tables in the `private` schema with RLS disabled. Inspected text references from public SQL routines. The platform advisory flags these as critical; that is a defense-in-depth warning, **not evidence of a currently public table read**.

For all 18 tables, **anon SELECT=false, authenticated SELECT=false, anon INSERT/UPDATE/DELETE=false, authenticated INSERT/UPDATE/DELETE=false**. `anon` currently lacks `USAGE` on `private`; `authenticated` has schema `USAGE` but lacks per-table grants. Public `SECURITY DEFINER` routines referencing these tables were checked: none in the searched set grants `EXECUTE` to `anon` or `authenticated`. These routines are intended for verified server-side service-role calls. This is a snapshot, not a full end-to-end exploit proof; dynamic SQL, function chains and Data API exposed schemas still require an explicit security audit.

## Table-by-table findings

| Private table without RLS | anon direct | authenticated direct | Indirect / privileged path (examples) | Defensive RLS recommendation |
|---|---|---|---|---|
| `private.agent_campaign_progress` | No | No | agent_campaigns_internal; refresh_campaign_progress_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.ai_usage_daily` | No | No | consume_ai_quota_internal; ai_usage_summary_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.ai_weekly_plan_cache` | No | No | none found in public function-definition text search (direct service-role app access) | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.audit_events` | No | No | owner_audit_action_internal; owner_review_quote_internal; other privileged internal functions | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.bonus_rules` | No | No | evaluate_bonus_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.financial_rules` | No | No | not found in public function-definition text search | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.fulfilment_history` | No | No | record_completed_order_actuals_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.opex_entries` | No | No | owner_add_opex_internal; refresh_profit_snapshot_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.order_financials` | No | No | record_payment_event_internal; create_order_from_quote_internal; owner_profit_floor_overview_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.payment_events` | No | No | record_payment_event_internal; agent_sales_dashboard_internal; agent_leaderboard_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.profit_snapshots` | No | No | owner_dashboard_internal; refresh_profit_snapshot_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.quote_financials` | No | No | create_quote_internal; create_order_from_quote_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.reference_analysis` | No | No | finalize_quote_request_internal; create_quote_from_request_internal; owner_quote_queue_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.reference_cost_baselines` | No | No | owner_set_reference_baseline_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.system_settings` | No | No | owner_update_setting_internal; consume_ai_quota_internal; agent_commission_facts_internal; others | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.training_questions` | No | No | agent_training_today_internal; agent_training_exam_start_internal; refresh_agent_ai_stats_internal | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.training_review_state` | No | No | not found in public function-definition text search | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |
| `private.user_roles` | No | No | owner_role_internal; owner_signup_setting_get_internal; owner_kyc_*_internal; others | Enable RLS after staging regression validation; retain revocation from PUBLIC/anon/authenticated and ensure only explicitly authorized server-side access |

## Recommended hardening, not executed

1. **Do not run a blind `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` batch in production.** Check all service-role calls, `SECURITY DEFINER` routines and scheduled jobs with integration tests first.
2. Keep `private` outside the Data API exposed schema list; validate via Supabase project API settings. Remove unnecessary `USAGE` on `private` from authenticated after resolving function dependencies.
3. Ensure every `*_internal` RPC has explicit `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, grants only necessary roles, and enforces actor/owner checks inside the routine where appropriate.
4. Roll out RLS table-by-table, prefer default deny for `anon`/`authenticated`, and use dedicated policies for legitimate owner/admin tasks. A service role with BYPASSRLS is not restricted by these policies, so audit edge-function authentication and tool input validation independently.
5. Recheck PostgreSQL default privileges for future routines/tables, inspect `SECURITY DEFINER` `search_path`, and run Supabase security advisors after rollout.
6. Record before/after matrix of tests for owner quotes, KYC, commission settlement, scheduled tasks and AI quota.

Suggested opt-in SQL template, **not run**:

```sql
-- Example only; must validate policies and dependencies on a staging branch first.
ALTER TABLE private.ai_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.ai_usage_daily FROM PUBLIC, anon, authenticated;
-- Repeat per table only after the user approves a specific migration.
```

## Audit SQL (read-only)

```sql
SELECT c.relname,c.relrowsecurity,
  has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
  has_table_privilege('authenticated',c.oid,'SELECT') AS auth_select,
  has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE') AS anon_write,
  has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') AS auth_write
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='private' AND c.relkind='r' AND NOT c.relrowsecurity
ORDER BY c.relname;
```

**Status:** Documentation only. No `ALTER TABLE`, `REVOKE`, `GRANT`, `CREATE POLICY` or `DROP POLICY` was executed in this review.
