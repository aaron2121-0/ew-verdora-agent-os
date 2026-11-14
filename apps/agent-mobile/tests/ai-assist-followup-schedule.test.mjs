import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
test("follow-up suggestion is agent-owned and requires confirmation",()=>{
 assert.match(ai,/action==="followup_schedule"/);
 assert.match(ai,/action==="followup_confirm"/);
 assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
 assert.match(ai,/containsSensitiveOutput\(JSON\.stringify\(parsed\)\)/);
 assert.match(ai,/containsMarketingPolicyViolation\(JSON\.stringify\(parsed\)\)/);
 assert.match(ui,/action:"followup_confirm"/);
 assert.match(ui,/aiConfirmFollowup/);
});
