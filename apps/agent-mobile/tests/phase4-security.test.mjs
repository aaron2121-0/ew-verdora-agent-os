import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const read=p=>fs.readFileSync(p,"utf8");

const migration=read(path.join(repoRoot,"supabase/migrations/20261112184154_phase4_customer_intelligence_ai.sql"));
const ai=read(path.join(repoRoot,"supabase/functions/agent-ai/index.ts"));
const session=read(path.join(repoRoot,"supabase/functions/agent-session/index.ts"));
const phase1=read(path.join(root,"public/phase1.js"));
const app=read(path.join(root,"public/app.js"));

test("Loss reasons are constrained to the approved five values",()=>{
  for(const reason of ["too_expensive","think_about_it","no_reply","chose_other","other"]){
    assert.match(migration,new RegExp("\\b"+reason+"\\b"));
    assert.match(session,new RegExp("\\b"+reason+"\\b"));
  }
  assert.match(migration,/leads_loss_reason_check/i);
  assert.match(session,/action === "set_lead_loss"/);
  assert.match(session,/\.eq\("id",leadId\)\.eq\("agent_id",agent\.id\)/);
  assert.match(session,/event_type:"lost"/);
  assert.match(session,/unchanged:true/);
});

test("Customer segments are mutually exclusive and qualified stays under New",()=>{
  assert.match(session,/if\(status==="quoted"[\s\S]*return \["quoted"\]/);
  assert.match(session,/if\(status==="follow_up"[\s\S]*return \["follow_up"\]/);
  assert.match(session,/\["new","qualified"\]\.includes\(status\)[\s\S]*return \["new"\]/);
  assert.match(phase1,/data-customer-segment/);
  assert.match(phase1,/segmentAll/);
  assert.match(phase1,/segmentNew/);
  assert.match(phase1,/segmentFollowUp/);
  assert.match(phase1,/segmentQuoted/);
});

test("Lead intelligence functions are service-role-only security definers",()=>{
  assert.match(migration,/create or replace function public\.agent_lead_intelligence_internal/i);
  assert.match(migration,/security definer\s+set search_path=''/i);
  assert.match(migration,/revoke all on function public\.agent_lead_intelligence_internal\(uuid,integer\) from public,anon,authenticated/i);
  assert.match(migration,/grant execute on function public\.agent_lead_intelligence_internal\(uuid,integer\) to service_role/i);
  for(const field of ["lead_score","lead_score_reason","next_best_action","best_followup_time"]){
    assert.match(migration,new RegExp("'"+field+"'"));
    assert.match(session,new RegExp(field));
  }
  assert.match(migration,/r\.next_followup_at<=now\(\) then now\(\)/i);
});

test("Owner risk and anomaly functions are owner-prefixed and service-role-only",()=>{
  for(const fn of ["owner_agent_churn_risk_internal","owner_agent_anomalies_internal"]){
    assert.match(migration,new RegExp("create or replace function public\\."+fn,"i"));
    assert.match(migration,new RegExp("revoke all on function public\\."+fn.replace(/[.*+?^$()|[\]\\]/g,"\\$&")));
  }
  assert.match(migration,/select role into v_role from private\.user_roles where user_id=p_user_id/i);
  assert.match(migration,/not in\('owner','admin'\) then raise exception 'forbidden'/i);
  assert.match(migration,/where a\.is_demo=false/i);
});

test("Phase 4 AI quotas are added without deleting existing AI quota mechanism",()=>{
  const limits={
    platform_post:15,
    weekly_plan:2,
    profile_setup:3,
    lost_review:20
  };
  for(const [action,limit] of Object.entries(limits)){
    assert.match(migration,new RegExp("\\{daily_limits,"+action+"\\}"));
    assert.match(migration,new RegExp("'"+String(limit)+"'::jsonb"));
  }
  assert.match(ai,/consume_ai_quota_internal/);
  for(const action of Object.keys(limits))assert.match(ai,new RegExp('"'+action+'"'));
});

test("agent-ai retains v11 actions and adds only incremental Phase 4 actions",()=>{
  for(const action of ["chat","chat_history","daily_greeting","roleplay_generate","roleplay_score","daily_content","coach","my_profile","update_notes","feedback"]){
    assert.match(ai,new RegExp('action==="'+action+'"'));
  }
  for(const action of ["platform_post","weekly_plan","profile_setup","lost_review"]){
    assert.match(ai,new RegExp('action==="'+action+'"'));
  }
  assert.match(ai,/profileBrief\(prof\)/);
});

test("platform_post enforces platform-specific safety and does not pass approved price",()=>{
  for(const p of ["facebook_group","instagram","xiaohongshu","whatsapp_status","personal_dm"]){
    assert.match(ai,new RegExp('"'+p+'"'));
  }
  assert.match(ai,/containsMarketingPolicyViolation/);
  assert.match(ai,/stripPriceData/);
  const start=ai.indexOf('if(action==="platform_post")');
  const end=ai.indexOf('if(action==="weekly_plan")',start);
  const block=ai.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.equal(/approved_price_entry/.test(block),false);
  assert.match(block,/fake customer review\/testimonial/);
  assert.match(block,/fake scarcity/);
  assert.match(block,/personal payment/);
});

test("weekly_plan is cached by agent and Kuching week before quota consumption",()=>{
  const cacheIndex=ai.indexOf('if(action==="weekly_plan"){',ai.indexOf('daily_greeting" && prof'));
  const quotaIndex=ai.indexOf("const quotaAction=");
  assert.ok(cacheIndex>=0&&quotaIndex>cacheIndex);
  assert.match(ai,/ai_weekly_plan_cache/);
  assert.match(migration,/primary key\(agent_id,week_start\)/i);
  assert.match(ai,/days\.length===7/);
});

test("profile_setup supports only Instagram and Xiaohongshu",()=>{
  assert.match(ai,/PROFILE_PLATFORMS=new Set\(\["instagram","xiaohongshu"\]\)/);
  assert.match(ai,/action==="profile_setup"/);
  assert.match(ai,/profile_photo_guidance/);
  assert.match(ai,/pinned_content/);
});

test("lost_review is own-lead-only and does not send quote price to AI",()=>{
  const start=ai.indexOf('if(action==="lost_review")');
  const end=ai.indexOf('if(action==="daily_content")',start);
  const block=ai.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(block,/\.eq\("id",leadId\)\.eq\("agent_id",agent\.id\)/);
  assert.match(block,/lead\.status!=="lost"/);
  assert.match(block,/design_commitment/);
  assert.equal(/selling_price|recommended_price|budget_version_price/.test(block),false);
});

test("Minimal frontend hooks show intelligence only when present and remain safe native DOM",()=>{
  assert.match(phase1,/data-phase4-hook/);
  assert.match(phase1,/lead\.lead_score!=null\|\|lead\.next_best_action\|\|lead\.best_followup_time/);
  assert.match(phase1,/action:"set_lead_loss"/);
  assert.equal(/\.innerHTML\s*=|insertAdjacentHTML/.test(phase1),false);
  assert.equal(/from\s+["']react["']|react-dom|jsx-runtime/i.test(phase1),false);
  assert.match(app,/errorInvalidLossReason/);
});
