# Agent 7-day self-onboarding / Owner review contract (PR stage)

## Scope and authoritative state

- Exactly seven existing \`training_modules.code\` values are reused: \`CORE-BRAND\`, \`LEAD-FINDING\`, \`QUALIFY\`, \`REFERENCE\`, \`OBJECTION\`, \`CLOSING\`, \`PAYMENT\`. No new training module or \`skill_code\` is created.
- Progress ring, completion, next-day unlocking are **exclusively** computed from backend \`dashboard.training[].status === "passed"\`. Onboarding completion, handbook reading and 3-question self-checks are **local UI hints**; they cannot grant a certification or open selling access.
- Existing daily practice (5 adaptive MCQs), required course results and the 20-question certification remain unchanged. A true *3-question module-passing assessment* requires an authorized backend action tied to the existing question bank and pass rules; it does not exist in the current \`agent-training\` API. This PR does not fake one.
- Agent-specific \`localStorage\` keys record only modal/tour dismissal and handbook reading; session logout leaves course authority on the server.

## Pending Owner-owned dependencies

The live Supabase project currently has no \`company_knowledge\`, \`portfolio_photos\`, or \`portfolio\` bucket, and no verified \`ew-verdora-content/motion\` files. Nothing may be invented to fill them.

Expected authenticated \`agent-session\` request: \`{"action":"handbook"}\`. Until supported, the UI fails closed and displays an Owner-approval pending message. Expected response shape:

\`\`\`json
{
  "lines": [{
    "id": "condolence",
    "cards": [{"title_en":"","title_zh":"","body_en":"","body_zh":"","active":true,"visible_to_agent":true,"needs_owner_confirm":false}],
    "photos": [{"status":"approved","preview_url":"https://signed-preview-url","signed_url":"https://signed-full-size-url","caption_en":"","caption_zh":""}],
    "scripts": [{"body_en":"","body_zh":"","active":true,"needs_owner_confirm":false}],
    "faqs": [{"question_en":"","question_zh":"","answer_en":"","answer_zh":"","active":true,"needs_owner_confirm":false}],
    "questions": [{"question_en":"","question_zh":"","options_en":["","","",""],"options_zh":["","","",""],"correct_index":0,"active":true,"needs_owner_confirm":false}]
  }],
  "motion_assets": {"onboarding":["four verified image URLs"],"icons":{"condolence":"verified URL"},"celebrate":"verified URL"}
}
\`\`\`

Backend must **filter all private or unapproved rows and create short-lived signed URLs only for approved photos**. Frontend defensively filters \`needs_owner_confirm\`, \`visible_to_agent\`, \`active\`, and photo \`status\`. For a secure MCQ grading/unlocking workflow, protected correct answers must NOT be shipped in handbook JSON: the local 3-question check here is non-certifying. Backend may omit \`questions\` until approved practice checks are ready.

The five business line keys are \`condolence\`, \`opening\`, \`bouquet\`, \`wedding_event\`, \`wholesale\`. For every required training module, a later Owner backend migration can add \`handbook_section\` (one of those five); client falls back to a deterministic mapping until it exists.

Assets in \`ew-verdora-content/motion/onboarding\` and \`motion/icons\` require verified real URLs from the content workflow before release. No guessed filenames or generated replacement images have been committed.

## QA and release gate

- CI: \`npm run check --workspace @ew-verdora/agent-mobile\`; full workspace check; mocked Playwright screenshots at 360px/430px, English/Chinese and dark/light; Lighthouse mobile audit (report includes Performance and CLS).
- Screenshots are attached as GitHub Actions artifact \`ui-motion-responsive\`; review-only generated bundle as \`agent-guide-review-bundle\`.
- **No production deployment in this PR.** After Claude approves content, backend quiz semantics, and screenshots, run \`build-railway-function.mjs\`, commit the generated \`dist/railway-function.ts\`, calculate SHA-256 of the exact committed bytes, then update \`railway-loader.ts\` \`BUNDLE_COMMIT\`, \`BUNDLE_SHA256\`, and \`VERSION\`. Deploy only the small loader through the approved Railway flow, and verify \`/health\`. Do not upload the large bundle directly.
