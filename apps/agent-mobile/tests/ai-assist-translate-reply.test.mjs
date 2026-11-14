import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const assist=fs.readFileSync(new URL("../public/ai-assist-translate.js",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
test("translation helper is agent-owned and manual-send",()=>{
 assert.match(ai,/action==="translate_reply"/);
 assert.match(ai,/\["zh","en","ms"\]/);
 assert.match(ai,/\.eq\("agent_id",agent\.id\)/);
 assert.match(ai,/containsSensitiveOutput\(parsed\.translation\+" "\+parsed\.reply\)/);
 assert.match(ai,/containsMarketingPolicyViolation\(parsed\.translation\+" "\+parsed\.reply\)/);
 assert.match(ui,/import\("\.\/ai-assist-translate\.js"\)/);
 assert.match(assist,/action:"translate_reply"/);
 assert.match(assist,/navigator\.clipboard/);
 assert.match(assist,/window\.open\("https:\/\/wa\.me/);
});
