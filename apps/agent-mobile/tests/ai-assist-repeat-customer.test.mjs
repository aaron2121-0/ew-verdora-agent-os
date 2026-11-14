import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
test("repeat-customer uses only this agent's real won leads",()=>{assert.match(ai,/repeat_customer/);assert.match(ai,/\.eq\("agent_id",agent\.id\)\.eq\("status","won"\)/);assert.match(ai,/fallbackRepeatCustomer/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);});
test("repeat customer UI stays manual",()=>{assert.match(ui,/renderRepeatCustomers/);assert.match(ui,/aiCopyButton/);assert.match(ui,/aiOpenWhatsApp/);assert.doesNotMatch(ui,/innerHTML\s*=/);});
