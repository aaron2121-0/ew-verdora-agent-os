# EW VERDORA Occasion Calendar — backend / UI integration contract

Status: code in feature/occasion-backend; database migrations are FILES ONLY and have not been applied to Supabase. Do not enable UI calls until migration + seed + Edge deployments have been reviewed.

## Ownership and source of truth

- UI developer (Gemini) owns all pages, components, CSS and i18n asset edits.
- Backend owns public.occasions, public.occasion_verifications, the Owner approval RPC and the two Edge Function actions sets.
- SQL migration: supabase/migrations/20261115193000_occasion_calendar.sql
- SQL seed: supabase/migrations/20261115193001_occasion_seed.sql
- Core Zod / types / functions: packages/core/src/occasion/index.ts
- New Edge helper: supabase/functions/_shared/occasion-ai.mjs
- Existing service actions extended: supabase/functions/agent-ai/index.ts and owner-session/index.ts
- Region calendar time zone: Asia/Kuching, UTC+08:00. Date-only values always use YYYY-MM-DD.

Do not infer a confirmed date from historical data. Confirmed school/university dates require a specific, Owner-approved verification. Event text and source URLs are not instructions to AI.

## TypeScript and core contract

Import from packages/core/src/occasion/index.ts in code that can resolve the workspace path, or configure a stable alias in the UI build. No frontend files are modified in this PR.

Exports:

- occasionSchema, occasionVerificationSchema (Zod v3)
- Occasion, OccasionVerification, OccasionCategory, OccasionDateStatus, OccasionDemand, OccasionVerificationStatus
- todayKuching(now?: Date): string
- displayDate(occasion): string | null (not_found always null; otherwise date_start then estimated_date)
- promoStart(occasion): string | null (displayDate less order_lead_days)
- promoWindow(occasion): {start:string,end:string} | null (inclusive endpoints)
- canLockStock(occasion): {allowed:true,reason:null} | {allowed:false,reason:'occasion.stock_lock.unconfirmed'|'occasion.stock_lock.date_missing'}
- getUrgent(occasions, today?): Occasion[] (high demand, promo window includes today, nearest first, at most 3)
- getTopOccasions30d(occasions, today?): Occasion[] (within 0–30 days inclusive, high demand and confirmed priority, at most 3)

The returned stock-lock reason is an i18n key, not a user-visible message. Suggested strings for Gemini to add to UI dictionaries:
- occasion.stock_lock.unconfirmed: zh=场合日期尚未确认，暂不能锁货; en=Event date is unconfirmed; stock cannot be locked.
- occasion.stock_lock.date_missing: zh=缺少确认日期，暂不能锁货; en=Confirmed start date is missing.

No new backend code modifies apps/agent-mobile/public/i18n.js.

## Data model

public.occasions fields:
id uuid, date_start date|null, date_end date|null, estimated_date date|null,
name_zh text, name_en text, category, location_or_audience text,
flower_demand (high|medium|low), typical_products text[],
order_lead_days int, recurrence (fixed|lunar|variable),
date_status (confirmed|pattern|not_found), confidence (high|medium|low),
past_2024 text|null, past_2025 text|null, source_url text|null,
evidence text|null, verified_by uuid|null, verified_at timestamptz|null,
created_at timestamptz, updated_at timestamptz.

public.occasion_verifications fields:
id uuid, occasion_id uuid, submitted_by uuid (auth.users.id, NOT agents.id),
proposed_date_start date, proposed_date_end date|null, proof_url text,
note text|null, status (pending|approved|rejected),
reviewed_by uuid|null, reviewed_at timestamptz|null, created_at timestamptz.

Database constraints:
- confirmed => date_start non-null AND confidence high
- pattern => estimated_date non-null
- high confidence => confirmed only
- not_found may have neither date_start nor estimated_date
- date_end requires date_start and may not precede it
- graduation confirmed => matching Owner-approved verification, verified_by and verified_at

## Agent: list upcoming occasions (Supabase authenticated client)

Once Supabase session is established, use the existing Supabase client and the public table:

~~~ts
const result = await supabase.from('occasions')
  .select('*').order('date_start', { ascending: true, nullsFirst: false });
~~~

RLS allows a registered Agent read-only access. A user with a valid login but without an Agent or Owner role gets no occasion records.

Do not filter only date_start at database level: pattern records have estimated_date but no date_start. Parse records with occasionSchema and order/display with the core pure functions.

## Agent: submit a proposed graduation date

Input JSON fields:
- occasion_id: UUID of existing occasion
- submitted_by: auth.uid() (current auth.users.id)
- proposed_date_start: YYYY-MM-DD
- proposed_date_end: YYYY-MM-DD or null
- proof_url: publicly verifiable HTTPS page containing the ceremony date
- note: evidence excerpt and context, or null
Do NOT send a status; default is pending. Do NOT send reviewed_by or reviewed_at.

~~~ts
const result = await supabase.from('occasion_verifications').insert({
  occasion_id: occasionId,
  submitted_by: user.id,
  proposed_date_start: '2026-12-12',
  proposed_date_end: null,
  proof_url: 'https://example.edu.my/actual-announcement',
  note: 'Actual quoted date sentence from verified announcement',
}).select('id,occasion_id,status,created_at').single();
~~~

The example URL is instructional only; NEVER import it as a real source record.

Agents may SELECT only their own submissions. Agents cannot update or delete them, cannot approve and cannot update occasions.

## Owner: review queue

Owner can list pending verifications using existing authenticated Supabase client:
~~~ts
const result = await supabase.from('occasion_verifications')
  .select('id,occasion_id,submitted_by,proposed_date_start,proposed_date_end,proof_url,note,status,created_at')
  .eq('status', 'pending').order('created_at', { ascending: true });
~~~

Owner must open the proof_url and confirm the actual ceremony day (not the article publication date). For school graduation distinguish senior/junior separately.

## Owner: approve or reject (Owner session Edge action)

POST /functions/v1/owner-session
Headers: Authorization: Bearer <authenticated-access-token>; Content-Type: application/json

Approve request:
~~~json
{"action":"occasion_review","verification_id":"<uuid>","decision":"approve"}
~~~

Reject request:
~~~json
{"action":"occasion_review","verification_id":"<uuid>","decision":"reject","reason":"Date refers to article publication, not graduation"}
~~~

Success HTTP 200:
~~~json
{"ok":true,"verification":{"id":"<uuid>","occasion_id":"<uuid>","status":"approved","date_start":"2026-12-12","date_end":null}}
~~~

On approval, owner-session calls owner_review_occasion_verification_internal using its service_role client AFTER validating the Owner JWT/role. The SQL function uses a transaction, row lock, audit log and updates:
- verification status approved, reviewed_by and reviewed_at
- occasion date_start/date_end, date_status confirmed, confidence high, verified_by/at, proof URL, evidence and updated_at

On rejection, occasion remains unchanged, verification status rejected, and reason is recorded.

RPC is not directly callable by anon or authenticated; only service_role. Do not send a direct browser RPC call. Any direct Owner table update attempting to confirm a graduation without matching approved evidence fails.

Error response: {"error":"<safe_code>"}.
- 401 authentication_required / invalid_session
- 403 forbidden / occasion_forbidden
- 404 occasion_verification_not_found / occasion_not_found
- 409 occasion_already_reviewed
- 422 occasion_invalid_verification / occasion_invalid_decision / occasion_reject_reason_required
- 500 occasion_review_failed (unknown DB errors never disclosed)

## Agent or Owner: AI helper actions

POST /functions/v1/agent-ai with the existing Agent or Owner Bearer token.

Only the four following new actions allow an Owner without an Agent profile; every existing agent-ai action remains Agent-only.

1. occasion_copy: {"action":"occasion_copy","occasion_id":"<uuid>","platform":"whatsapp"|"facebook"|"xiaohongshu"}
   => {"ok":true,"occasion_id":"<uuid>","platform":"whatsapp","date_status":"pattern","editable":true,"provider":"gemini"|"fallback","content":{"zh":"...","en":"...","ms":"..."}}
   The server adds exact / estimated / unconfirmed date labels. The provider cannot claim a date.

2. school_inquiry: {"action":"school_inquiry","school_name":"Chung Hua Middle School No.3"}
   => {"ok":true,"editable":true,"school_name":"...","provider":"gemini"|"fallback","content":{"zh":"...","en":"...","ms":"..."}}

3. daily_tasks: {"action":"daily_tasks"}
   => {"ok":true,"today":"YYYY-MM-DD","editable":true,"provider":"gemini"|"fallback","tasks":[{"occasion_id":"<uuid>"|null,"date_status":"confirmed"|"pattern"|null,"display_date":"YYYY-MM-DD"|null,"task_zh":"...","task_en":"...","task_ms":"..."}]}.
   Exactly three tasks; generic compliant fallback tasks fill any empty urgent slots.

4. top_occasions_30d: {"action":"top_occasions_30d"}
   => {"ok":true,"period_start":"YYYY-MM-DD","period_end":"YYYY-MM-DD","items":[{"id":"<uuid>","name_zh":"...","name_en":"...","date_status":"...","display_date":"YYYY-MM-DD","flower_demand":"high","can_lock_stock":false}]}.
   This is deterministic, not an AI model call.

AI actions produce drafts for HUMAN review only. No automatic sending, discounts, price changes or availability commitments. Existing Agent AI quota is consumed by the first three actions only when the Gemini API key is configured, mapped to existing platform_post/coach/weekly_plan quota buckets; top_occasions_30d uses no AI model. An Owner without Agent identity can access these four actions, but cannot access existing Agent-only functions.

AI error codes: authentication_required/invalid_session (401), forbidden (403), occasion_invalid_id, occasion_invalid_platform, occasion_invalid_school (400), occasion_not_found (404), quota_check_failed/occasion_request_failed (500), daily_limit (429). Never expose Postgres raw messages.

## Local verification and deployment (not executed in AI environment)

1. Check feature branch and code review; do not merge before approval.
2. Run npm ci, npm run typecheck, npm test, npm run test:kyc, npm run check.
3. Review/rehearse RLS and SQL review RPC in a transaction on a nonproduction database, rollback.
4. Apply migration 20261115193000_occasion_calendar.sql through the normal reviewed deployment process.
5. Apply seed 20261115193001_occasion_seed.sql (idempotent: ON CONFLICT DO NOTHING).
6. Deploy owner-session (Owner review action), then agent-ai with _shared/occasion-ai.mjs.
7. Confirm an Agent can read occasions + insert own pending verification; Agent cannot update it or review others.
8. Confirm authenticated non-Agent/non-Owner cannot read; Owner can view/review.
9. Verify approve -> confirmed/high/verified metadata; reject -> no change to occasion; repeat review -> 409.
10. Verify confirmed fixed public holidays, pattern school dates and explicit Chinese No.3 low-confidence disclaimer.
11. Only then integrate Gemini's UI; do not enable bulk stock locks for estimated school dates.

Do NOT connect to Supabase or execute these migrations as part of this PR.
