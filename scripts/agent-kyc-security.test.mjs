import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname,resolve } from "node:path";
import {
  validateAgentKyc,KYC_CONSENT_VERSION,registerAgentWithKycGate,
  matchesKycImage,KYC_MAX_BYTES
} from "../supabase/functions/_shared/agent-kyc-validate.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const base={
  consent:true,consent_version:KYC_CONSENT_VERSION,
  legal_name:"Example Test Person",preferred_name:"Test",
  ic_number:"900101-13-1234",phone_whatsapp:"013-8432668",area:"Kuching"
};
const now=new Date("2026-11-14T08:00:00.000Z");

test("requires explicit, versioned PDPA consent",()=>{
  assert.equal(validateAgentKyc({...base,consent:false},now).error,"kyc_consent_required");
  assert.equal(validateAgentKyc({...base,consent_version:"unapproved"},now).error,"kyc_invalid_consent_version");
});
test("rejects malformed and impossible IC dates and minors",()=>{
  assert.equal(validateAgentKyc({...base,ic_number:"900101-13-ABCD"},now).error,"kyc_invalid_ic_format");
  assert.equal(validateAgentKyc({...base,ic_number:"010229-13-1234"},now).error,"kyc_invalid_ic_date");
  assert.equal(validateAgentKyc({...base,ic_number:"090101-13-1234"},now).error,"kyc_underage");
  assert.equal(validateAgentKyc({...base,ic_number:"081115-13-1234"},now).error,"kyc_underage");
  assert.equal(validateAgentKyc({...base,ic_number:"081114-13-1234"},now).ok,true);
  assert.equal(validateAgentKyc({...base,ic_number:"000229-13-1234"},now).ok,true);
});
test("normalizes IC and Malaysian WhatsApp; restricts areas",()=>{
  const valid=validateAgentKyc(base,now);
  assert.equal(valid.ok,true);
  assert.equal(valid.ic_number,"900101131234");
  assert.equal(valid.phone_whatsapp,"60138432668");
  assert.equal(validateAgentKyc({...base,phone_whatsapp:"123456"},now).error,"kyc_invalid_phone");
  assert.equal(validateAgentKyc({...base,area:"Outside whitelist"},now).error,"kyc_invalid_area");
});
test("accepts only JPEG/PNG/WebP magic bytes with matching MIME",()=>{
  assert.equal(matchesKycImage(new Uint8Array([255,216,255,0]),"image/jpeg"),true);
  assert.equal(matchesKycImage(new Uint8Array([137,80,78,71,13,10,26,10]),"image/png"),true);
  assert.equal(matchesKycImage(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]),"image/webp"),true);
  assert.equal(matchesKycImage(new Uint8Array([0,0,0]),"image/jpeg"),false);
  assert.equal(matchesKycImage(new Uint8Array([255,216,255]),"image/png"),false);
  assert.equal(KYC_MAX_BYTES,5242880);
});
test("migration explicitly isolates identity and photo access",()=>{
  const sql=read("supabase/migrations/20261114170000_agent_kyc_private_review.sql");
  assert.match(sql,/create table private\.agent_kyc \(/i);
  assert.match(sql,/ic_number_enc bytea not null/i);
  assert.match(sql,/extensions\.pgp_sym_encrypt\(/i);
  assert.match(sql,/extensions\.hmac\(/i);
  assert.match(sql,/create unique index agent_kyc_ic_hash_unique/i);
  assert.match(sql,/alter table private\.agent_kyc enable row level security/i);
  assert.match(sql,/revoke all on private\.agent_kyc,private\.agent_kyc_upload_tokens from public,anon,authenticated/i);
  assert.match(sql,/values \('agent-kyc','agent-kyc',false,5242880/i);
  assert.match(sql,/v_exam_passed and \(not v_kyc_required or v_kyc_approved\) then/i);
  assert.match(sql,/expires_at>now\(\)/i);
  assert.match(sql,/now\(\)\+interval '60 seconds'/i);
  assert.match(sql,/not exists\(select 1 from storage\.objects/i);
  assert.match(sql,/insert into private\.audit_events\(actor_user_id,actor_type,action,entity_type,entity_id\)/i);
  assert.match(sql,/as restrictive for all to anon,authenticated/i);
  assert.match(sql,/with check \(bucket_id <> 'agent-kyc'\)/i);
});
test("Edge routes keep KYC off AI and use bound, one-use upload tokens",()=>{
  const agent=read("supabase/functions/agent-session/index.ts");
  const owner=read("supabase/functions/owner-session/index.ts");
  const ai=read("supabase/functions/agent-ai/index.ts");
  assert.match(agent,/agent_kyc_consume_upload_internal/);
  assert.match(agent,/p_user_id:uid,p_token_hash:tokenHash/);
  assert.match(agent,/matchesKycImage\(bytes,mime\)/);
  assert.match(agent,/kyc_required: kycRequired && kycRes\.data\?\.kyc_required/);
  assert.match(owner,/owner_kyc_view_internal/);
  assert.match(owner,/createSignedUrl\(data\.ic_front_path,60\)/);
  assert.match(owner,/owner_kyc_delete_ready_internal/);
  assert.match(ai,/preferred_name:String\(p\.preferred_name/);
  assert.match(ai,/text:redact\(instructions\)/);
  assert.doesNotMatch(ai,/from\(["']agent_kyc["']\)/);
});

function mockAgentAdmin() {
  const calls=[];
  const admin={
    rpc:async (action,payload)=>{
      calls.push({action,payload});
      return {data:"00000000-0000-4000-8000-000000000001",error:null};
    },
    from:table=>{
      assert.equal(table,"agents");
      return {
        select:()=>({
          eq:()=>({
            single:async()=>({data:{agent_code:"AG-QA12345"},error:null})
          })
        })
      };
    }
  };
  return {admin,calls};
}

test("flag OFF: legacy register with display_name/language succeeds without IC",async()=>{
  const {admin,calls}=mockAgentAdmin();
  const result=await registerAgentWithKycGate({
    body:{action:"register",display_name:"Old Agent",language:"zh"},
    uid:"00000000-0000-4000-8000-000000000010",admin,kycRequired:false
  });
  assert.equal(result.status,200);
  assert.equal(result.payload.ok,true);
  assert.equal(result.payload.agent_code,"AG-QA12345");
  assert.equal("kyc_status" in result.payload,false);
  assert.deepEqual(calls.map(v=>v.action),["register_agent_internal"]);
  assert.equal(calls[0].payload.p_display_name,"Old Agent");
  assert.equal(calls[0].payload.p_language,"zh");
});

test("flag ON: missing IC returns HTTP 422 without calling any registration RPC",async()=>{
  const {admin,calls}=mockAgentAdmin();
  const {ic_number,...withoutIc}=base;
  const result=await registerAgentWithKycGate({
    body:{...withoutIc,language:"en"},
    uid:"00000000-0000-4000-8000-000000000010",admin,kycRequired:true
  });
  assert.equal(result.status,422);
  assert.equal(result.payload.error,"kyc_invalid_ic_format");
  assert.equal(calls.length,0);
});

test("flag ON: valid IC takes KYC registration path only",async()=>{
  const {admin,calls}=mockAgentAdmin();
  const result=await registerAgentWithKycGate({
    body:{...base,language:"en"},
    uid:"00000000-0000-4000-8000-000000000010",admin,kycRequired:true
  });
  assert.equal(result.status,200);
  assert.equal(result.payload.kyc_status,"draft");
  assert.deepEqual(calls.map(v=>v.action),["agent_kyc_register_internal"]);
});

test("default OFF, certification opt-in, owner-only SQL and merged Owner routes",()=>{
  const sql=read("supabase/migrations/20261114170000_agent_kyc_private_review.sql");
  const agent=read("supabase/functions/agent-session/index.ts");
  const owner=read("supabase/functions/owner-session/index.ts");
  assert.match(sql,/create table if not exists private\.app_settings/);
  assert.match(sql,/values \('AGENT_KYC_REQUIRED',false\)/);
  assert.match(sql,/agent_kyc_required_internal\(\)/);
  assert.match(sql,/v_exam_passed and \(not v_kyc_required or v_kyc_approved\) then/);
  assert.match(agent,/admin\.rpc\("agent_kyc_required_internal"\)/);
  assert.match(agent,/registerAgentWithKycGate\(/);
  assert.match(owner,/if\(action==="launch_confirm_payment"\)/);
  assert.match(owner,/if\(action==="handbook_bulk_approve"\)/);
  for(const functionName of [
    "owner_kyc_list_internal","owner_kyc_view_internal","owner_kyc_review_internal",
    "owner_kyc_delete_ready_internal","owner_kyc_delete_internal"
  ]){
    const start=sql.indexOf("create or replace function public."+functionName);
    assert.ok(start>=0,"missing function "+functionName);
    const finish=sql.indexOf("end $$;",start);
    assert.ok(finish>start,"missing SQL delimiter "+functionName);
    const body=sql.slice(start,finish+7);
    assert.match(body,/where user_id=p_user_id and role='owner'/);
    assert.doesNotMatch(body,/role in\('owner','admin'\)/);
  }
  const ownerOnly=owner.match(/const ownerOnly=new Set\(\[([^\]]+)\]\)/)?.[1]||"";
  for(const action of ["kyc_list","kyc_view","kyc_review","kyc_delete"]){
    assert.ok(ownerOnly.includes('"'+action+'"'),"owner guard missing "+action);
  }
});
