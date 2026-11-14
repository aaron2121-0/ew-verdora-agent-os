import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const i18n=fs.readFileSync(new URL("../public/i18n.js",import.meta.url),"utf8");

test("today priority uses only the signed-in agent data",()=>{
  assert.match(ai,/action==="today_priority"/);
  assert.match(ai,/p_agent_id:agent\.id/);
  assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
  assert.match(ai,/containsSensitiveOutput/);
  assert.match(ai,/containsMarketingPolicyViolation/);
});

test("today screen keeps sending manual",()=>{
  assert.match(phase,/renderTodayPriorityAssist/);
  assert.match(phase,/navigator\.clipboard\.writeText/);
  assert.match(phase,/https:\/\/wa\.me\/\?text=/);
  assert.doesNotMatch(phase,/innerHTML\s*=/);
});

test("plain-language bilingual copy exists",()=>{
  assert.match(i18n,/Who should I contact first\?/);
  assert.match(i18n,/今天先联系谁？/);
});