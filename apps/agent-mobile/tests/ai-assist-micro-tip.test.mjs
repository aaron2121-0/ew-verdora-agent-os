import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const assist=fs.readFileSync(new URL("../public/ai-assist-micro.js",import.meta.url),"utf8");
const order=fs.readFileSync(new URL("../public/order.js",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
test("micro coaching is embedded in work and not scoring",()=>{
 assert.match(ai,/action==="micro_tip"/);
 assert.match(ai,/containsSensitiveOutput\(parsed\.tip\)/);
 assert.match(ai,/containsMarketingPolicyViolation\(parsed\.tip\)/);
 assert.match(phase,/import\("\.\/ai-assist-micro\.js"\)/);
 assert.match(assist,/context:"reply"/);
 assert.match(order,/ai-assist-micro\.js/);
 assert.match(assist,/official quote/);
 assert.doesNotMatch(phase,/micro.*score/i);
 assert.doesNotMatch(order,/micro.*exam/i);
});
