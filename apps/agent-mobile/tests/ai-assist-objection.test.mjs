import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const i18n=fs.readFileSync(new URL("../public/i18n.js",import.meta.url),"utf8");

test("objection helper has Gemini, fallback, quota hook and safety",()=>{
  assert.match(ai,/objection_replies/);
  assert.match(ai,/fallbackObjectionReplies/);
  assert.match(ai,/containsSensitiveOutput/);
  assert.match(ai,/containsMarketingPolicyViolation/);
  assert.match(ai,/detectPolicyRisk/);
});

test("three quick objections are available in customer screen",()=>{
  assert.match(phase,/aiObjExpensive/);
  assert.match(phase,/aiObjThink/);
  assert.match(phase,/aiObjExact/);
  assert.match(phase,/action:"objection_replies"/);
  assert.doesNotMatch(phase,/innerHTML\s*=/);
});

test("objection labels are bilingual",()=>{
  assert.match(i18n,/Too expensive/);
  assert.match(i18n,/太贵/);
  assert.match(i18n,/要一样的/);
});
