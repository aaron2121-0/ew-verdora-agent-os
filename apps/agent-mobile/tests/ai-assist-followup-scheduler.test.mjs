import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
test("followup suggestion is own-lead scoped and safety checked",()=>{assert.match(ai,/followup_suggest/);assert.match(ai,/\.eq\("agent_id",agent\.id\)/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);assert.match(ai,/best_followup_time/);});
test("followup UI requires explicit confirmation before schedule_followup",()=>{assert.match(ui,/renderFollowupScheduler/);assert.match(ui,/action:"schedule_followup"/);assert.match(ui,/aiFollowupConfirmBtn/);assert.doesNotMatch(ui,/innerHTML\s*=/);});
