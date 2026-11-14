# Owner 身份审核 / Identity Review — PR handoff

**State: REVIEW ONLY. Do not merge or deploy.** Owner front end implemented on feat/owner-kyc-review-ui. As of 14 Nov 2026, main at 09ffd6a (and later b4fe761, which only added KYC copy) has no GPT 1 kyc_* routes. GPT 1's in-progress branch feature/agent-kyc-private-review contains the four actions and was used to align this UI. Integration and deployment remain unverified pending backend merge, migration, and Claude review.

## Owner UI
- Separate Owner-only review screen. List displays preferred_name, area, submitted_at (Asia/Kuching), and masked ic_last4 ONLY. Submitted records sorted first; drafts omitted. No detail or image prefetch.
- On row click, invoke kyc_view once; display sensitive fields with textContent (not HTML). Begin the 60-second timer BEFORE fetching. On expiry, hiding, background tab, focus loss, pagehide, back or logout, abort requests, discard record reference, remove text and clear canvas. Ignore responses that arrive after masking.
- One-click approve; reject must select a reason OR enter a custom explanation ("Other" requires custom text). Delete is shown only when delete_requested_at is present (Agent-requested deletion), and requires two separate confirmations including typing DELETE. Backend must enforce status transitions and retention requirements.
- IC image must be a short-lived signed URL from private Storage bucket agent-kyc, downloaded for in-memory decode with fetch(cache: no-store); MIME whitelist JPEG/PNG/WebP, max 5 MiB. Draw onto canvas; do not use img src, anchors, clipboard, downloadable attachments, object URLs, localStorage or IndexedDB. No KYC data in logs.

## Required owner-session API contract (to be aligned with GPT 1)
All requests: POST /functions/v1/owner-session, authenticated with existing Owner bearer token and publishable key.

| Action | Request body | Success response |
| --- | --- | --- |
| kyc_list | {action:"kyc_list",status:"submitted" or "all",limit:100} | {ok:true,entries:[{agent_id,preferred_name,area,submitted_at,ic_last4,status}]} |
| kyc_view | {action:"kyc_view",agent_id:"UUID"} | {ok:true,kyc:{agent_id,legal_name,preferred_name,ic_number,date_of_birth,phone_whatsapp,area,status,submitted_at,consent_version,consent_at,reviewed_at,reject_reason},photo_signed_url:"https://PROJECT.supabase.co/storage/v1/object/sign/agent-kyc/AGENT_ID/UUID.jpg?token=SHORT_LIVED",delete_requested_at:"ISO or null"}} |
| kyc_review | {action:"kyc_review",agent_id:"UUID",decision:"approve" or "reject",reason:null or "required when rejected"} | {ok:true,...} |
| kyc_delete | {action:"kyc_delete",agent_id:"UUID",confirm:true} | {ok:true,...} |

GPT 1 currently returns entries from kyc_list; photo_signed_url lives INSIDE the kyc object; rejection uses reason, and deletion is allowed only following the Agent deletion request (delete_requested_at). The frontend accepts list alias items/records and detail aliases record/entry. The UI fetches submitted and all status lists separately (up to 100 rows each) so newer approved records do not evict older pending records. Backend should add stable server-side pagination if more than 100 pending. kyc_view MUST return exactly the requested agent_id; do not leak encrypted IC ciphertext or secret keys.

## Backend security gates — GPT 1 responsibilities
1. Re-check authenticated session and Owner role for EVERY KYC action (not only UI). Anon 401, unauthorized Agent/non-Owner 403. Never expose private.agent_kyc directly via PostgREST or make the Storage bucket public.
2. Decrypt IC number only after authorization and log redacted audit metadata, without IC plaintext, signed photo URLs, raw JWTs, tokens or photos. Do not echo low-level errors.
3. Review only submitted records, require nonempty rejection reason server-side, write reviewed_by/reviewed_at, and atomically audit status change. Ensure concurrency-safe transitions.
4. Delete only with explicit confirmation and only when approved retention schedule/legal hold permits; remove row and private object with a reliable backend workflow, retaining lawful audit evidence.
5. ALL KYC API responses MUST include Cache-Control: private, no-store, max-age=0; Pragma: no-cache; Referrer-Policy: no-referrer; X-Content-Type-Options: nosniff. Signed photo URL TTL should be <=60s, and Storage/CDN photo response must be uncached. Current GPT 1 branch owner-session reply() does not include these headers. This blocks production approval. Restrict all signed URLs to private bucket paths and audit reads.

**Important privacy limitation:** Rendering a photo always transfers its bytes to browser memory. This UI does not intentionally persist, download to a file, or cache the photo, but browser/OS/CDN storage, DevTools, screenshots and screen-recording cannot be absolutely prevented by a webpage. Backend no-store headers, signed-link TTL, Owner access controls and personnel policies remain necessary.

## GPT 1 branch review blockers found
- Backend owner_kyc_list_internal currently SELECTs legal_name and agent_code in its list response even though the UI only displays preferred_name/area/time/last4. Remove extra fields for minimisation.
- Backend owner_kyc_delete_ready_internal in migration 20261114170000_agent_kyc_private_review.sql appears to use a single dollar sign as its PL/pgSQL body delimiter instead of a properly paired double-dollar delimiter. Verify and fix SQL before applying the migration.
- KYC route authorization currently permits both owner and admin, while UI exposes this only to owner. Claude/Owner should confirm whether admin access to plaintext IC is intentionally authorized; otherwise tighten backend roles.
- Backend photo-signed URL expires after 60 seconds (good), but private Storage/CDN response caching needs verification.

## Verification / release gate
- Run: node --test apps/owner-mobile/tests/owner-kyc.test.mjs; run existing repo tests/typecheck and unchanged CI.
- Owner/Agent/anon KYC 200/403/401 matrix for all four actions; verify KYC list fields only and submitted-first sort.
- No details fetched until click; test normal/late (>60s) image response, expiry at 60 seconds, switch rows, browser blur/tab hide, back, logout, and token/session loss. No photo or sensitive text reappears after hide.
- Test malformed/mismatched agent_id, invalid public/foreign signed URL, wrong MIME, >5 MiB, expired signature, 403 and unavailable endpoint: all fail closed, no sensitive error details.
- Verify approve once, required reject reason, server-side status race prevention, two-step delete, private Storage object removal and retention/audit.
- Verify response/cache headers and browser Network/Cache behavior in staging. Capture 360px and 430px bilingual light/dark screenshots with **synthetic non-PII records only**; no real ID images, IC numbers, bearer tokens or signed links in test artifacts.
- **No production migration, Railway Function upload, Edge Function deployment or merging is authorized by this PR.**
