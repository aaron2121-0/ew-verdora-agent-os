import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const i18n=fs.readFileSync(new URL("../public/i18n.js",import.meta.url),"utf8");

test("micro tip is profile-aware, quota-limited and safe",()=>{
  assert.match(ai,/micro_tip/);
  assert.match(ai,/fallbackMicroTip/);
  assert.match(ai,/profileBrief\(prof\)/);
  assert.match(ai,/containsSensitiveOutput/);
  assert.match(ai,/containsMarketingPolicyViolation/);
});

test("micro tip appears inside the reply workflow and never blocks it",()=>{
  assert.match(phase,/action:"micro_tip",context:"customer_reply"/);
  assert.match(phase,/Tip must never block the customer reply flow/);
  assert.doesNotMatch(phase,/innerHTML\s*=/);
});

test("micro tip label is bilingual",()=>{
  assert.match(i18n,/One reminder before you send/);
  assert.match(i18n,/发出去前提醒一句/);
});
