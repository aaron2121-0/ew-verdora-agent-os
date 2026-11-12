# P0 QA regression — scope and safety

Status: P0 only. No deployment or DB writes are part of this branch.

## Required check
GitHub Actions job name: `qa-regression`. The repository owner must make this exact check required in branch protection/ruleset. This workflow never pushes to main.

## Fixture requirements
GitHub Secrets (never in files or logs):
- `QA_AGENT_A_TOKEN`, `QA_AGENT_B_TOKEN`: dedicated, current, distinct **is_demo=true** agents
- `QA_OWNER_TOKEN`: isolated owner test account only
- `QA_NO_ROLE_TOKEN`: identity with no application role
- `QA_AGENT_A_ID`, `QA_AGENT_B_ID`: their Agent UUIDs

GitHub Variable `QA_DEMO_FIXTURES_VERIFIED=true` only after a human checks the identities against the database. Tokens must not be real Agent, Owner, customer or order credentials. A missing fixture fails closed, not reported as green.

The authenticated P0 suite intentionally performs **read-only** actions. It does not redeem invites, start formal exams, create leads, request quotes, spend AI quota, or change settings in production. Invitations, duplicate submissions, timeout, sales-lock variants, refunds and action-side effects require an isolated test backend or approved dedicated test data with documented cleanup; **not yet exercised** by this P0 iteration. Never report them passed based solely on source assertions.

## Required future fixture runner
Before enabling mutating tests, implement a fixture allocator with run-scoped `is_demo=true` identities, recorded created IDs, a cleanup step running even after errors, a verification query checking zero residual test rows, and a cleanup manifest in the CI artifact. HTTP calls across Edge Functions cannot be rolled back by one SQL transaction. Refuse unsafe runs when cleanup cannot be proven.

## Feature contracts
- AI partner: platform_post, weekly_plan, profile_setup, lost_review (activate once source branch merges)
- Quote vision: Gemini unavailable/invalid response must fall back to manual review
- Owner v2: needs_info and rejected (activate when merged)
- Public quote/tracking: 404 invalid token, expired links and no internal fields (activate when endpoints exist)

## Current known scanner blocker
`apps/owner-mobile/index.ts` contains an `innerHTML` write near line 34. The requested strict scanner reports it. Do **not** weaken the scanner to conceal this result; assign to Owner UI engineer to replace with safe DOM node assembly.

## Design-approved security exceptions
The three public RLS tables `agent_ai_profile`, `ai_chat_messages`, `ai_feedback_events` intentionally have no client policies. `private.is_owner()` execute for authenticated is approved provided its body remains identity-scoped. `pg_net` in public is risk-accepted; leaked-password protection is not applicable to passwordless login. These are P1/P2 audit specifications only, not changes in P0.
