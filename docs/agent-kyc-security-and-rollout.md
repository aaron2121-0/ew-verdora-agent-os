# Agent KYC: security, API and rollout contract

STATUS: Code review PR only. Do not deploy Edge Functions or apply the migration until Claude has reviewed and Owner has approved. Changes do not alter commission, bonus, tier, payout or profit-guard calculations.

## Dependencies before staged testing

The migration at supabase/migrations/20261114170000_agent_kyc_private_review.sql requires two separate random 32+-character **Supabase Vault** secrets named agent_kyc_encryption_key and agent_kyc_hash_key. An authorized administrator must provision them using the secure Supabase UI, never GitHub or a SQL migration containing literal keys. pgcrypto uses AES-256 PGP symmetric encryption; an HMAC-SHA256 digest of normalized NRIC provides unique matching without storing an easily enumerated unkeyed hash. Registration fails closed with kyc_configuration_missing if either key is missing. Have a controlled key backup and an explicit re-encryption/re-hashing plan before rotation.

## Agent API

JWT-authenticated POST requests to the agent-session Edge Function:

- action=register: legal_name, preferred_name, ic_number (YYMMDD-PB-#### or 12 digits), phone_whatsapp (Malaysian mobile), area, consent=true, consent_version=v1.0-2026-11, optional language=en/zh. Preferred name, NOT legal name, becomes public display_name. Validates real date, >=18, phone and approved area. Errors: kyc_consent_required, kyc_invalid_consent_version, kyc_invalid_name, kyc_invalid_ic_format, kyc_invalid_ic_date, kyc_underage, kyc_invalid_phone, kyc_invalid_area, kyc_duplicate_ic (409), kyc_configuration_missing, kyc_already_registered.
- action=kyc_status: only status, reject_reason, ic_last4, kyc_required and delete_requested.
- action=kyc_upload_url with content_type=image/jpeg, image/png or image/webp: returns method POST, upload_url, object_path, expires_in=60. The user must POST raw image bytes to the returned URL with the same Agent's Bearer access token and matching Content-Type header. Normal Supabase API key requirements remain applicable.
- action=kyc_submit with object_path: verifies a consumed one-time upload grant AND that the object exists in the private bucket. Then submits for review; removes superseded photo if present.
- action=kyc_request_delete with confirm=true: records an audited deletion request. Pending requests block fresh upload grants and submit.

Native Supabase signed upload URLs are valid for TWO HOURS. Therefore the upload_url above is a custom, short-lived, JWT-and-token-gated Edge URL, not a native Storage signed URL. Each 256-bit random token is stored hashed, scoped to one Agent, one new UUID object path and exact MIME, and atomically consumed once within 60 seconds. The service role alone writes to the private agent-kyc Storage bucket. Maximum payload: 5 MiB. Magic bytes and declared MIME must match. Object paths are agent UUID / random UUID .jpg; the Content-Type is the actual JPEG/PNG/WebP type. No public access policies are created.

Existing Agents without KYC receive kyc_required=true in dashboard; training remains available. Existing Agents may call register again to establish the missing private KYC record. New registrants require KYC fields from the outset, so front-end form work must be coordinated before deploying.

## Owner API

JWT-authenticated POST requests to owner-session; Owner/Admin roles enforced again within SQL RPCs.

- kyc_list: status filter draft/submitted/approved/rejected/all, limit up to 100. Queue includes preferred name, area, agent code, last four NRIC digits, status and timestamps; never full NRIC, legal name or photo.
- kyc_view: agent_id. SQL decrypts and creates one audit row (actor, action=kyc_view, entity_type=agent, entity_id=agent ID, created_at) IN THE SAME TRANSACTION. Edge then issues a private photo read URL valid for 60 seconds. The response is no-store; do not persist in analytics or client storage. Do not preload these requests.
- kyc_review: agent_id, decision=approve or reject, reason required for reject (at least three characters). Only submitted KYC may be reviewed. Approval calls refresh_agent_certification_internal.
- kyc_delete: agent_id and confirm=true, only after Agent requested deletion. First checks authorization and request, then deletes all files under this Agent's private prefix (including superseded photos), then deletes encrypted NRIC, HMAC, personal data and grants; historical audit remains. An already-active Agent is reset to trainee, but training history and commercial tiers remain unchanged. If Storage cleanup fails, keep DB record and report failure for retry.

## Certification and privacy boundaries

The only changed condition in refresh_agent_certification_internal is additionally requiring private.agent_kyc.status=approved for progression into active. Training scores, exams, recovery tasks, violations, tier/commission/bonus/profit logic are otherwise unchanged. Legacy Agents already active without KYC are not automatically downgraded; decide a documented migration/grace period before rollout.

All KYC fields are in an unexposed private schema with RLS enabled and no anon/authenticated privileges. Storage bucket is nonpublic, with image MIME and 5 MiB limits. Audit records contain only action/actor/time/Agent ID, NEVER NRIC, legal name, DOB, phone, or object path in before_state/after_state. Agent AI receives only preferred-name identity; generated prompts are redacted for NRIC and photo references. Free-text regex is not a replacement for keeping KYC endpoints entirely out of AI flows.

This code is NOT a claim of full PDPA legal compliance. Before rollout, obtain legal review and publish a consent notice matching version v1.0-2026-11 describing collection purposes, recipients, retention, access/correction and erasure mechanism, possible transfers, contacts and refusal consequences. Define retention for rejected/draft records and expired upload grants, plus backup erasure and audit retention; deleting live data may not delete backups. Establish key-rotation and incident response procedures.

## Tests and acceptance gate

Offline checks: npm run test:kyc; npm run check. Offline suite tests consent, valid/invalid IC dates and leap years, exact 18th birthday, phone, area, content magic bytes, and security invariants in migration/Edge code.

Integration tests MUST run against disposable staging AFTER approval of the PR and installation of Vault test keys. They have not been executed against production and cannot be claimed as passing here:

1. Verify anon and authenticated SELECT on private.agent_kyc fails, and unauthenticated Storage list/download/upload to agent-kyc are denied.
2. Register test Agents A and B. A obtains scoped upload URL; B's JWT with A's token is rejected. An expired or replayed token is rejected. The URL cannot target another Agent's path.
3. Duplicate normalized IC with or without hyphens is rejected. Invalid dates, underage birthdate, invalid phone, area or absent consent return exact codes. Confirm rejected registration makes no residual Agent/identity row.
4. Only true JPEG/PNG/WebP <=5 MiB are accepted. Reject mismatched MIME, >5 MiB and unconsumed path. Submitting before upload fails.
5. An ordinary Agent cannot list, view, review or delete others' KYC. Owner list never returns full IC. Every successful Owner detailed view audits exactly actor+timestamp+Agent ID, produces a 60-second photo link and never logs personal data. Reject without reason is denied.
6. Completion of training and final exam cannot upgrade trainee when KYC is missing or unapproved; approval unlocks only when all existing training/recovery/violation checks pass.
7. Agent requests deletion. Owner confirms. Verify all private bucket photos and encrypted/hashes erased; audit rows retained; previously active Agent becomes trainee; no upload race leaves orphaned files.

Claude: specifically review Vault privileges, custom upload broker, consent notice/retention, old-active-Agent migration policy, Frontend compatibility and race handling. Deploy only in a separate, explicitly approved change.


## Nov 14 rollout correction — shared opt-in KYC switch

- `private.app_settings.setting_key='AGENT_KYC_REQUIRED'` starts **false** and is readable only by a privileged RPC. Both registration and SQL certification use `agent_kyc_required_internal()` as the same source of truth.
- **OFF:** the exact old `display_name` + `language` Agent registration uses `register_agent_internal`; no IC, photo, phone or PDPA consent required. Certification still checks seven required modules, passed exam, open recovery and severe violations as before.
- **ON:** new registration requires full KYC and missing IC returns 422. A passed exam can unlock selling only after KYC has been approved as well as all existing training / violations / recovery checks.
- If the shared flag RPC errors, the Edge Function returns 503 rather than silently bypassing policy. Apply the reviewed migration before the Edge Function at a later authorized release.
- All five Owner KYC SQL RPCs require `role='owner'` (not admin); the `owner-session` KYC actions have a second owner-only guard.
- The original Owner `launch_*` actions and handbook batch UUID fix must remain intact when syncing PR #15 with main.
- **No deployment, migration execution, or PR merge** is authorized by this change.
