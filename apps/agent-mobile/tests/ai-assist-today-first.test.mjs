import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const assist=fs.readFileSync(new URL("../public/ai-assist-today-first.js",import.meta.url),"utf8");

test("today-first uses only signed-in agent intelligence",()=>{
  assert.match(ai,/today_priority/);
  assert.match(ai,/agent_lead_intelligence_internal/);
  assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
  assert.match(ai,/containsSensitiveOutput/);
  assert.match(ai,/containsMarketingPolicyViolation/);
});
test("today-first UI is lazy and manual",()=>{
  assert.match(phase,/ai-assist-today-first\.js/);
  assert.match(assist,/action:"today_priority"/);
  assert.match(assist,/navigator\.clipboard/);
  assert.match(assist,/wa\.me/);
  assert.doesNotMatch(assist,/innerHTML\s*=/);
});
test("today-first lazy copy is bilingual",()=>{
  assert.match(assist,/Who should I contact first/);
  assert.match(assist,/今天先联系谁/);
});
