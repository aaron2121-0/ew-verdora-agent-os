import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
test("today contacts uses own-agent intelligence and manual send",()=>{
 assert.match(ai,/agent_lead_intelligence_internal/);
 assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
 assert.match(ai,/containsSensitiveOutput\(JSON\.stringify\(list\)\)/);
 assert.match(ai,/containsMarketingPolicyViolation\(JSON\.stringify\(list\)\)/);
 assert.match(ui,/action:"today_contacts"/);
 assert.match(ui,/navigator\.clipboard|aiCopyButton/);
 assert.match(ui,/window\.open\("https:\/\/wa\.me/);
});
