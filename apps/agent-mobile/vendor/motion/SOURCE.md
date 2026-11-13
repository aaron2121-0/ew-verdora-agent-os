# Vendored motion pack

Source: github.com/aaron2121-0/ew-verdora-content (private), folder `motion-dist/`, commit a9d654c (Gemini AI Studio).
Reviewed by Claude 2026-11-13: no photos, no prices, no external URLs, Kuching locations, EN/ZH via setLang.

Not served yet: files here are NOT in build-railway-function.mjs `names`, so they are not bundled.
Integration notes (GPT 2):
- Copy only the components you mount into `public/` and add each .js/.css to `names` (the build only picks up svg/png/webp/gif/json automatically).
- Core set (home-today, cards, feedback, celebrate, ai-orb, transitions, tokens, i18n + icons/onboarding SVGs) is ~117 KB raw. `ai-demos.*` (~43 KB) is a demo; ship it only when wiring the real AI features.
- When feeding real server data, escape every value placed in HTML attributes (ids, keys) as well as text; the demo only escapes text.
- To update: re-sync from ew-verdora-content and bump the commit above.
