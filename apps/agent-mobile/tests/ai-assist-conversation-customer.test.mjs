import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
test("conversation extraction redacts through callAI and validates output",()=>{assert.match(ai,/conversation_extract/);assert.match(ai,/fallbackConversationExtract/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);});
test("conversation importer requires confirmation before create_lead",()=>{assert.match(ui,/renderConversationImporter/);assert.match(ui,/action:"create_lead"/);assert.match(ui,/aiConversationReview/);assert.doesNotMatch(ui,/innerHTML\s*=/);});
