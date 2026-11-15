import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import {execFileSync} from "node:child_process";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const backend=read("supabase/functions/agent-ai/index.ts");
const migration=read("supabase/migrations/20261115190000_agent_ai_read_tools.sql");
const phase1=read("apps/agent-mobile/public/phase1.js");
const chat=read("apps/agent-mobile/public/ai-chat.js");
const brief=read("apps/agent-mobile/public/ai-daily-brief.js");
const cards=read("apps/agent-mobile/public/ai-read-cards.js");
const build=read("apps/agent-mobile/build-railway-function.mjs");
test("v20 commission and redaction rules are preserved in Phase 1",()=>{
  for(const name of ["function redact(","const RULES=","commissionBrief(","agent_commission_facts_internal","function profileBrief("])
    assert.ok(backend.includes(name),name);
});
test("FREE_ONLY includes only read tools, no write and no model upgrade",()=>{
  assert.match(backend,/AI_PARTNER_FREE_ONLY=true/);
  assert.match(backend,/AI_READ_TOOLS=new Set/);
  assert.doesNotMatch(backend,/AI_READ_TOOLS=new Set\(\[[\s\S]*?"propose_/);
  assert.match(backend,/if\(!AI_READ_TOOLS\.has\(name\)\)/);
  assert.match(backend,/p_agent_id:agentId/);
});
test("existing protected calendar RPC and confidence statuses are mandatory",()=>{
  assert.match(backend,/admin\.rpc\("occasion_list_internal",\{p_user_id:userId,p_role:"agent"\}\)/);
  assert.match(backend,/date_status==="confirmed"\?o\.date_start:o\.estimated_date/);
  assert.match(backend,/约（往年推算），需核实/);
  assert.ok(!migration.includes("CREATE TABLE private.occasions"));
});
test("owner's upcoming occasion strip is not repeated in briefing",()=>{
  assert.match(brief,/Never insert public calendar occasions here/);
  assert.match(backend,/calendar_occurrences:\[\]/);
  assert.match(phase1,/mountOccasionUpcoming\(occasionSlot\)/);
  assert.match(phase1,/import\("\.\/ai-daily-brief\.js"\)/);
});
test("client UI uses lazy modules and no dangerous HTML sinks",()=>{
  assert.match(chat,/import\("\.\/ai-read-cards\.js"\)/);
  assert.match(build,/lazyPartnerJs=new Set/);
  for(const [name,source] of [["chat",chat],["cards",cards],["brief",brief],["phase1",phase1]]){
    assert.doesNotMatch(source,/\.innerHTML\s*=|insertAdjacentHTML/,"unsafe HTML in "+name);
  }
  for(const path of ["apps/agent-mobile/public/ai-chat.js","apps/agent-mobile/public/ai-daily-brief.js","apps/agent-mobile/public/ai-read-cards.js"]){
    execFileSync(process.execPath,["--check",resolve(root,path)]);
  }
});
test("read SQL has strict owner predicates and service-role-only execute",()=>{
  assert.match(migration,/WHERE l\.id=v_lead AND l\.agent_id=p_agent_id/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.agent_ai_read_internal/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.agent_ai_read_internal\(uuid,text,jsonb\) TO service_role/);
  assert.doesNotMatch(migration,/\bUPDATE\s+public\.|\bDELETE\s+FROM\s+public\./i);
});
