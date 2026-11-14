import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const intake=fs.readFileSync(new URL("../public/ai-assist-intake.js",import.meta.url),"utf8");

test("lead intake is quota limited and redacted through shared AI path",()=>{
  assert.match(ai,/lead_intake_parse/);
  assert.match(ai,/customer_text_required/);
  assert.match(ai,/callAI\(/);
  assert.match(ai,/containsSensitiveOutput/);
  assert.match(ai,/containsMarketingPolicyViolation/);
  assert.match(ai,/provider:"fallback"/);
});

test("customer screen exposes paste-chat flow without innerHTML",()=>{
  assert.match(phase,/renderAIIntake/);
  assert.match(phase,/action:"lead_intake_parse"/);
  assert.match(phase,/action:"create_lead"/);
  assert.doesNotMatch(phase,/innerHTML\s*=/);
});

test("intake copy is bilingual",()=>{
  assert.match(i18n,/aiIntakeTitle:"Paste customer chat"/);
  assert.match(i18n,/aiIntakeTitle:"贴客人的聊天"/);
});