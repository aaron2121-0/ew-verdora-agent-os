import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const copy=fs.readFileSync(new URL("../../../content/handbook/ai_assist_copy.json",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../supabase/migrations/20261114213000_ai_assist_today_first.sql",import.meta.url),"utf8");

test("today_first is quota-limited and agent-scoped",()=>{
  assert.match(ai,/today_first/);
  assert.match(ai,/agent_lead_intelligence_internal/);
  assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
  assert.match(ai,/containsSensitiveOutput/);
  assert.match(ai,/containsMarketingPolicyViolation/);
  assert.match(migration,/daily_limits,today_first/);
});
test("today-first UI is plain-language, bilingual, and safe DOM",()=>{
  assert.match(ui,/renderTodayFirst/);
  assert.match(ui,/createAICard/);
  assert.match(ui,/element\("button"/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
  assert.match(copy,/今天先联系谁/);
  assert.match(copy,/Who to contact first today/);
});
