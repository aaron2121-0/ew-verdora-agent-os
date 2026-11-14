import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const order=fs.readFileSync(new URL("../public/order.js",import.meta.url),"utf8");
const i18n=fs.readFileSync(new URL("../public/i18n.js",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");

test("conversation organiser is wired safely",()=>{
  assert.match(order,/action:"conversation_extract"/);
  assert.match(order,/element\("textarea"/);
  assert.doesNotMatch(order,/innerHTML\s*=/);
  assert.match(ai,/if\(action==="conversation_extract"\)/);
  assert.match(ai,/containsSensitiveOutput\(allText\)/);
  assert.match(ai,/containsMarketingPolicyViolation\(allText\)/);
  assert.match(ai,/redact\(m\.text\)|redact\(input\)/);
  assert.match(i18n,/aiConversationButton:"Organise for me"/);
  assert.match(i18n,/aiConversationButton:"帮我整理"/);
});
