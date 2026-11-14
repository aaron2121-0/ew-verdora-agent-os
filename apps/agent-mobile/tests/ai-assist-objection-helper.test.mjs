import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const ai=fs.readFileSync(new URL("../../../supabase/functions/agent-ai/index.ts",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const copy=fs.readFileSync(new URL("../../../content/handbook/ai_assist_copy.json",import.meta.url),"utf8");
test("objection helper has quota, fallback and both safety gates",()=>{assert.match(ai,/objection_helper/);assert.match(ai,/fallbackObjections/);assert.match(ai,/containsSensitiveOutput/);assert.match(ai,/containsMarketingPolicyViolation/);});
test("objection helper gives manual copy or WhatsApp choices without auto-send",()=>{assert.match(ui,/renderObjectionHelper/);assert.match(ui,/aiCopyButton/);assert.match(ui,/wa\.me\/\?text=/);assert.doesNotMatch(ui,/innerHTML\s*=/);assert.match(copy,/客人这样说，我怎么回/);});
