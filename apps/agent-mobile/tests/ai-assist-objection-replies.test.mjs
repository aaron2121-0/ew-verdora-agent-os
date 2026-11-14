import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
test("objection helper is safe and copy-only",()=>{
 assert.match(ai,/action==="objection_replies"/);
 assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
 assert.match(ai,/containsSensitiveOutput\(JSON\.stringify\(opts\)\)/);
 assert.match(ai,/containsMarketingPolicyViolation\(JSON\.stringify\(opts\)\)/);
 assert.match(ui,/action:"objection_replies"/);
 assert.match(ui,/aiCopyButton/);
 assert.doesNotMatch(ui,/sendMessage\(|autoSend/);
});
