# Rules for Gemini CLI in this repository

You are one of several engineers working on EW VERDORA Agent OS at the same time. Follow these rules in every session.

1. Work only on branch `gemini-ai-plus`. Never push to, merge into, or rebase `main`.
2. You may only create or change:
   - `supabase/functions/agent-ai-plus/`
   - new migrations whose file name contains `ai_plus`
   - `tests/ai-plus/`
   - `docs/gemini/`
   Do not modify any other file, especially `supabase/functions/agent-ai`, `agent-session`, `quote-intake`, `owner-*`, and everything under `apps/`.
3. Follow the patterns in `supabase/functions/agent-ai/index.ts` and `supabase/migrations/`: auth with `auth.getUser`, `safeErr`, `redact`, sensitive-output filter, `consume_ai_quota_internal`, and merge into `ai_policy` with `jsonb_set` (never replace the whole value).
4. The task is in `docs/gemini/AI_PLUS_TASK.md`. Do one Stage at a time: write code, run tests, commit, push to `gemini-ai-plus`, then STOP and wait for the owner.
5. Never deploy (`supabase db push`, `supabase functions deploy`) unless the owner explicitly writes "可以部署" in this session.
6. Never write keys, passwords, tokens or customer personal data into any file, commit message or log.
7. Reply to the owner in Chinese, short and clear: what you did, test results, what is next.
