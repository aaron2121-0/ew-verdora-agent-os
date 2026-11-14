# Owner 身份审核 / Identity Review — PR handoff

**State: REVIEW ONLY. Do not merge or deploy.** Owner front end implemented on feat/owner-kyc-review-ui. As of 14 Nov 2026, main at 09ffd6a has none of GPT 1's kyc_* routes. End-to-end KYC integration cannot be claimed until GPT 1's migration and endpoints exist and Claude reviews the contract.

## Owner UI
- Separate Owner-only review screen. List displays preferred_name, area, submitted_at (Asia/Kuching), and masked ic_last4 ONLY. Submitted records sorted first; drafts omitted. No detail or image prefetch.
- On row click, invoke kyc_view once; display sensitive fields with textContent (not HTML). Begin the 60-second timer BEFORE fetching. On expiry, hiding, background tab, focus loss, pagehide, back or logout, abort requests, discard record reference, remove text and clear canvas. Ignore responses that arrive after masking.
- One-click approve; reject must select a reason or fill an "Other" explanation. Delete requires two separate confirmations, including typing DELETE. Backend must enforce status transitions and retention requirements.
- IC image must be a short-lived signed URL from private Storage bucket agent-kyc, downloaded for in-memory decode with fetch(cache: no-store); MIME whitelist JPEG/PNG/WebP, max 5 MiB. Draw onto canvas; do not use img src, anchors, clipboard, downloadable attachments, object URLs, localStorage or IndexedDB. No KYC data in logs.

## Required owner-session API contract (to be aligned with GPT 1)
All requests: POST /functions/v1/owner-session, authenticated with existing Owner bearer token and publishable key.

| Action | Request body | Success response |
| --- | --- | --- |
| kyc_list | {action:"kyc_list"} | {ok:true,items:[{agent_id,preferred_name,area,submitted_at,ic_last4,status}]} |
| kyc_view | {action:"kyc_view",agent_id:"UUID"} | {ok:true,kyc:{agent_id,legal_name,preferred_name,ic_number,date_of_birth,phone_whatsapp,area,status,submitted_at,consent_version,consent_at,reviewed_at,reject_reason},ic_front_signed_url:"https://PROJECT.supabase.co/storage/v1/object/sign/agent-kyc/AGENT_ID/UUID.jpg?token=SHORT_LIVED"} |
| kyc_review | {action:"kyc_review",agent_id:"UUID",decision:"approve" or "reject",reject_reason:null or "required when rejected"} | {ok:true,...} |
| kyc_delete | {action:"kyc_delete",agent_id:"UUID",confirm:true} | {ok:true,...} |

The frontend currently accepts list response aliases entries/records and detail aliases record/entry for compatibility, but the canonical contract above is preferred. If GPT 1 uses a different decision enum or field shape, update and re-test before merge. List API MUST NOT return decrypted full IC or signed URLs. kyc_view MUST return exactly the requested agent_id; must not leak encrypted IC ciphertext or secret keys.

## Backend security gates — GPT 1 responsibilities
1. Re-check authenticated session and Owner role for EVERY KYC action (not only UI). Anon 401, unauthorized Agent/non-Owner 403. Never expose private.agent_kyc directly via PostgREST or make the Storage bucket public.
2. Decrypt IC number only after authorization and log redacted audit metadata, without IC plaintext, signed photo URLs, raw JWTs, tokens or photos. Do not echo low-level errors.
3. Review only submitted records, require nonempty rejection reason server-side, write reviewed_by/reviewed_at, and atomically audit status change. Ensure concurrency-safe transitions.
4. Delete only with explicit confirmation and only when approved retention schedule/legal hold permits; remove row and private object with a reliable backend workflow, retaining lawful audit evidence.
5. ALL KYC API responses MUST include Cache-Control: private, no-store, max-age=0; Pragma: no-cache; Referrer-Policy: no-referrer; X-Content-Type-Options: nosniff. Signed photo URL TTL should be <=60s, and Storage/CDN photo response must be uncached. Current owner-session reply() does not include these headers. Restrict all signed URLs to private bucket paths and audit reads.

**Important privacy limitation:** Rendering a photo always transfers its bytes to browser memory. This UI does not intentionally persist, download to a file, or cache the photo, but browser/OS/CDN storage, DevTools, screenshots and screen-recording cannot be absolutely prevented by a webpage. Backend no-store headers, signed-link TTL, Owner access controls and personnel policies remain necessary.

## Verification / release gate
- Run: node --test apps/owner-mobile/tests/owner-kyc.test.mjs; run existing repo tests/typecheck and unchanged CI.
- Owner/Agent/anon KYC 200/403/401 matrix for all four actions; verify KYC list fields only and submitted-first sort.
- No details fetched until click; test normal/late (>60s) image response, expiry at 60 seconds, switch rows, browser blur/tab hide, back, logout, and token/session loss. No photo or sensitive text reappears after hide.
- Test malformed/mismatched agent_id, invalid public/foreign signed URL, wrong MIME, >5 MiB, expired signature, 403 and unavailable endpoint: all fail closed, no sensitive error details.
- Verify approve once, required reject reason, server-side status race prevention, two-step delete, private Storage object removal and retention/audit.
- Verify response/cache headers and browser Network/Cache behavior in staging. Capture 360px and 430px bilingual light/dark screenshots with **synthetic non-PII records only**; no real ID images, IC numbers, bearer tokens or signed links in test artifacts.
- **No production migration, Railway Function upload, Edge Function deployment or merging is authorized by this PR.**
