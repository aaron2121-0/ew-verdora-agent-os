import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const assist=fs.readFileSync(new URL("../public/ai-assist-objection.js",import.meta.url),"utf8");
test("micro tip is quota-limited and safety checked",()=>{assert.match(ai,/micro_tip/);assert.match(ai,/fallbackMicroTip/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);});
test("micro coaching is lazy and never blocks reply",()=>{assert.match(phase,/\.t\(/);assert.match(assist,/action:"micro_tip"/);assert.match(assist,/catch\{\}/);assert.doesNotMatch(assist,/score|exam/i);});
