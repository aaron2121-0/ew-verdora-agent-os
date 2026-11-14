import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const assist=fs.readFileSync(new URL("../public/ai-assist-objection.js",import.meta.url),"utf8");
test("objection helper is quota-limited and policy checked",()=>{assert.match(ai,/objection_replies/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);});
test("objection helper is lazy and manual",()=>{assert.match(phase,/ai-assist-objection\.js/);assert.match(assist,/action:"objection_replies"/);assert.match(assist,/navigator\.clipboard/);assert.match(assist,/wa\.me/);assert.doesNotMatch(assist,/innerHTML\s*=/);});
test("objection helper exposes three plain-language cases",()=>{assert.match(assist,/Too expensive/);assert.match(assist,/Needs time/);assert.match(assist,/Wants same design/);assert.match(assist,/太贵/);});
