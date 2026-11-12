# Task: agent-ai-plus (AI sales-assist for agents)

Goal: practical, human AI help that prepares work for agents so they sell more. AI prepares; the agent reviews and taps send. Nothing is ever auto-sent to customers.

## Files to produce
- `supabase/functions/agent-ai-plus/index.ts` – one Deno Edge Function, import only `npm:@supabase/supabase-js@2`
- `supabase/migrations/<timestamp>_ai_plus.sql`
- `tests/ai-plus/contract.md` – example request/response, error codes and test cases for every action

## Hard rules
- Env only: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEYS / SUPABASE_ANON_KEY, SUPABASE_SECRET_KEYS / SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, GEMINI_MODEL (default `gemini-flash-latest`). No secrets in code.
- Gemini via REST `generateContent` with header `x-goog-api-key`, 12s timeout. Any failure, 429 or invalid JSON → deterministic template, never an error to the user.
- Auth: `Authorization: Bearer`, `auth.getUser`, load agent by user_id. Not registered → 400 `agent_not_registered`.
- Selling-locked statuses (trainee, restricted, recovery, dormant, suspended): customer-contact features → 403 `selling_access_locked`. Voice and photo features still allowed.
- Only short error codes to the client; details via console.error.
- Privacy: never send customer names, phones or emails to Gemini. Use `{customer}` in prompts and substitute the stored label after generation. Strip emails/phones from free text first.
- Output filter: if AI output mentions suppliers, external florists, cost, margin, profit, personal bank account, "transfer to me", non-system discounts, "100% same", fake reviews, fake scarcity, or any price number not supplied by the system → use the template.
- Quotas: call `public.consume_ai_quota_internal(p_agent_id, p_action)` before each Gemini call; `allowed=false` → 429 `daily_limit`. Migration merges limits into `private.system_settings` key `ai_policy` with jsonb_set: followup_drafts 3, reactivation_drafts 2, referral_drafts 3, voice_lead 20, photo_caption 10, addon_suggest 30.
- CORS origin `https://agent-mobile-production.up.railway.app`, methods POST, OPTIONS.
- All dates and "today" in Asia/Kuching. Reply in the agent's preferred_language.

## Existing schema (read only)
agents(id, user_id, status, tier, preferred_language, is_demo, display_name);
leads(id, agent_id, source, customer_label, occasion, sales_category, budget, delivery_date, delivery_time, status new|qualified|quoted|follow_up|won|lost|archived, loss_reason, next_followup_at, created_at, updated_at);
quotes(id, lead_id, agent_id, selling_price, design_commitment, status, created_at);
orders(id, quote_id, agent_id, status confirmed|paid|producing|qc_pending|qc_pass|delivering|completed|cancelled|exception, payment_status, completed_at, created_at);
lead_events(lead_id, agent_id, event_type, metadata, created_at);
agent_ai_profile(agent_id, summary_en, summary_zh, strengths, weaknesses, writing_style, agent_notes);
selling_kits(code, title_en, title_zh, content_en, content_zh, active).

## New schema (migration)
- `public.ai_drafts(id uuid pk, agent_id fk agents on delete cascade, lead_id fk leads on delete set null, kind in followup|reactivation|referral, draft_date date, body text ≤1500, reason text, status pending|sent|dismissed|snoozed default pending, provider text, created_at, unique(agent_id, lead_id, kind, draft_date))`
- `public.approved_addons(code pk, name_en, name_zh, name_ms, occasions text[], pitch_en, pitch_zh, pitch_ms, active boolean default true)` – seed 6 generic examples with active=false.
- RLS enabled on both, no policies, revoke all from anon/authenticated.
- Helpers (security definer, `set search_path = ''`, execute only for service_role):
  - `ai_plus_followup_candidates(p_agent_id, p_date)` – own leads with next_followup_at before end of p_date (Kuching), status not won/lost/archived, max 5, with occasion, budget, delivery_date, latest quote status, days since last event.
  - `ai_plus_reactivation_candidates(p_agent_id, p_date)` – own won leads whose delivery_date month-day falls in the next 7 days in a previous year, occasion birthday/anniversary/wedding/opening/corporate, not drafted this year, max 5.
  - `ai_plus_referral_candidates(p_agent_id, p_date)` – own orders completed 1–3 days before p_date, not drafted, max 5.

## Actions (POST {action, ...})
1. `drafts_today` → `{drafts:[{id, kind, lead_id, customer_label, body, reason, provider}]}` – once per agent per day, cached in ai_drafts; one Gemini call per kind; short warm WhatsApp messages in the agent's writing style; no prices, no pressure. Referral: thank and kindly ask if they know anyone who needs flowers; never ask for or write reviews.
2. `draft_update {id, status: sent|dismissed|snoozed}` → `{ok}` – own drafts only; "sent" inserts lead_events `ai_draft_sent`.
3. `voice_lead {audio_base64, mime_type audio/webm|ogg|mp4|mpeg, ≤60s/2MB}` → `{transcript, fields:{occasion, sales_category, budget, delivery_date, delivery_time, notes}, confidence}` – resolve 明天/星期六/tomorrow in Kuching time; never create the lead.
4. `photo_caption {image_base64, mime_type image/jpeg|png|webp, ≤5MB, occasion?}` → `{captions:{facebook, instagram, xiaohongshu, whatsapp_status}, hashtags}` – only what is visible, no prices, warm premium Kuching voice.
5. `addon_suggest {occasion, budget?}` → `{suggestions:[{code, name, pitch}]}` – ONLY active approved_addons for that occasion; Gemini only rewrites the pitch; empty list if none.

## Tests (in contract.md, and run what you can locally)
Another agent's draft id → 404; selling-locked → 403 for drafts; no GEMINI_API_KEY → template; quota exceeded → 429; output with a price or "personal account" → template; voice/photo oversize → 400.

## Stages (stop after each)
1. Migration + `drafts_today` + `draft_update`.
2. `voice_lead` + `photo_caption`.
3. `addon_suggest` + contract tests + short README section in this file (deploy: `npx supabase db push`, `npx supabase functions deploy agent-ai-plus --no-verify-jwt`; rollback steps).
