import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const order=fs.readFileSync(new URL("../public/order.js",import.meta.url),"utf8");
test("micro coach personalises without scoring or changing eligibility",()=>{assert.match(ai,/micro_tip/);assert.match(ai,/profileBrief\(prof\)/);assert.match(ai,/fallbackMicroTip/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);assert.doesNotMatch(ai,/micro_tip[\s\S]{0,500}certification.*pass/i);});
test("micro tips appear in real reply and quote work",()=>{assert.match(phase,/renderMicroTip\("reply"/);assert.match(order,/quoteMicroCoach/);assert.match(order,/context:"quote"/);assert.doesNotMatch(phase,/innerHTML\s*=/);assert.doesNotMatch(order,/innerHTML\s*=/);});
