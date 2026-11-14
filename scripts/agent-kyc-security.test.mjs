import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname,resolve } from "node:path";
import {
  validateAgentKyc,KYC_CONSENT_VERSION,
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
  assert.match(sql,/v_exam_passed and v_kyc_approved then/i);
  assert.match(sql,/expires_at>now\(\)/i);
  assert.match(sql,/now\(\)\+interval '60 seconds'/i);
  assert.match(sql,/not exists\(select 1 from storage\.objects/i);
  assert.match(sql,/insert into private\.audit_events\(actor_user_id,actor_type,action,entity_type,entity_id\)/i);
  assert.doesNotMatch(sql,/create policy[\s\S]*on storage\.objects/i);
});
test("Edge routes keep KYC off AI and use bound, one-use upload tokens",()=>{
  const agent=read("supabase/functions/agent-session/index.ts");
  const owner=read("supabase/functions/owner-session/index.ts");
  const ai=read("supabase/functions/agent-ai/index.ts");
  assert.match(agent,/agent_kyc_consume_upload_internal/);
  assert.match(agent,/p_user_id:uid,p_token_hash:tokenHash/);
  assert.match(agent,/matchesKycImage\(bytes,mime\)/);
  assert.match(agent,/kyc_required: kycRes\.data\?\.kyc_required/);
  assert.match(owner,/owner_kyc_view_internal/);
  assert.match(owner,/createSignedUrl\(data\.ic_front_path,60\)/);
  assert.match(owner,/owner_kyc_delete_ready_internal/);
  assert.match(ai,/preferred_name:String\(p\.preferred_name/);
  assert.match(ai,/text:redact\(instructions\)/);
  assert.doesNotMatch(ai,/from\(["']agent_kyc["']\)/);
});
