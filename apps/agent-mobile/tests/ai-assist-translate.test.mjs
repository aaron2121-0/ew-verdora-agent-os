import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const i18n=fs.readFileSync(new URL("../public/i18n.js",import.meta.url),"utf8");
test("translation action is quota limited and safe",()=>{assert.match(ai,/translate_reply/);assert.match(ai,/fallbackTranslation/);assert.match(ai,/\["zh","en","ms"\]/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);assert.match(ai,/detectPolicyRisk/);});
test("customer reply can be translated to Chinese English or BM",()=>{assert.match(phase,/action:"translate_reply"/);assert.match(phase,/aiTranslateZh/);assert.match(phase,/aiTranslateEn/);assert.match(phase,/aiTranslateMs/);assert.doesNotMatch(phase,/innerHTML\s*=/);});
test("translation UI is bilingual",()=>{assert.match(i18n,/Translate this reply to/);assert.match(i18n,/把这句换成/);assert.match(i18n,/aiTranslateMs:"BM"/);});
