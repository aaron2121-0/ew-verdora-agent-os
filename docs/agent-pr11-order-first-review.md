# PR #11 — Agent order-first onboarding review

## Release gate
This is a **DRAFT** review-only PR, based on the merged PR #10. No migration, Edge Function, Railway loader or production deployment was executed.

## Product priority
- Above the fold: "3 things to earn today" / 「今天赚钱 3 件事」 as real actions from dashboard follow-ups, quote-ready enquiries and available Selling Kits; when \`content/handbook/daily_actions.json\` arrives, the app may read its three approved actions without rebuilding copy manually.
- Second: compact 「我的上手进度」 ring / current-day focus, with 7-day details collapsed. The day titles, tasks, goals, completion messages and four onboarding slides are read from the immutable, Claude-reviewed \`content/handbook/onboarding_7day.json\` and \`ui_microcopy.json\`.
- Daily training is **optional review** and does not change the 7 required modules or certification gate.
- The same reviewed \`ui_microcopy.json\` supplies coach marks, empty states and three AI-suggestion prompts. No new copy was authored for those surfaces.

## Backend / #10 integration
- There is **one** Owner-reviewed handbook API: PR #10 \`agent-session\` action \`handbook\` with required \`section\` filter and \`entries\` result. PR #11's old competing action is discarded. Client fetches only permitted sections. Published-only records remain filtered at the server.
- No PR #11 \`training_modules.handbook_section\` column or provisional product-line mapping. PR #10 alone owns its enum section link. The 7-day focus comes from Owner-reviewed JSON, ordered against the existing required course codes.
- New timestamped migration: \`20261113152000_agent_seven_day_quiz.sql\`, to apply **after PR #10's 1453 / 1459 / 1501 / 1502 migrations**, not before. It holds private quiz attempts/items and server-verified read checkpoints.
- Per-course quiz uses five questions from existing private MCQ bank; wrong answers link to \`related_card_code\` if supplied, otherwise to the first approved card. The server does not return correct indices to the client. Completion writes existing \`training_progress\` via \`record_training_result_internal\`.
- With **zero approved cards** for that day: the server considers reading complete and permits the quiz without a fake reading event. If the handbook database is unavailable/erroring, the server fails closed (not equivalent to zero approved cards).
- With approved cards: the server records \`first_seen_at\` and only accepts \`read_at\` >= 4 seconds after initiation. A fresh Owner content revision invalidates earlier reads by comparing \`company_knowledge.updated_at\`.
- Day 1 CORE-BRAND uses the 10 reviewed questions from `content/handbook/core_brand_questions.json` (`HB-CORE-BRAND-01` through `10`). These must be imported through the existing, approved question importer after Owner authorization; their presence in Git is not proof of production readiness.
- PR #10 does not yet expose approved portfolio photos. The handbook gallery remains safely empty until an authorized Owner-reviewed portfolio service provides approved, short-lived signed URLs. Do not assume public bucket access.

## Assets and QA
- Build embeds exact repository bytes of \`onboarding_7day.json\` and \`ui_microcopy.json\`; optional \`daily_actions.json\` when it exists. A dev-server and mocked E2E route use the same source files. The reviewed JSON files themselves are untouched.
- 360px / 430px, English / 中文, light / dark browser screenshots via Agent UI Motion Validation. Lighthouse mobile performance >=90 and CLS <0.05 gate.
- Motion images are loaded only if the actual \`ew-verdora-content/motion\` assets exist; missing illustration/icons render a clear fallback, not invented product images.
- Review and approve screenshots, published content, quiz questions and Owner security boundary before merging PR #11 or deploying. Loader \`BUNDLE_COMMIT\`, \`BUNDLE_SHA256\` and \`VERSION\` remain untouched until the separate, explicitly approved release.

## No production claims
Automated E2E uses fixtures and mocked auth. The live Supabase CI workflow may fail due to missing QA secrets; do not count it as a live PASS.
