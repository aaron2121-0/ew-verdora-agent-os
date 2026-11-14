import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const source=readFileSync(fileURLToPath(new URL("../index.ts",import.meta.url)),"utf8");
const tick=String.fromCharCode(96);
const js=source.split("const JS=String.raw"+tick)[1]?.split(tick+";\nconst CSP=")[0];
assert.ok(js,"embedded Owner UI script must exist");
const kyc=js.slice(js.indexOf("const KYC_VIEW_MS="),js.indexOf("async function refresh(){"));
assert.ok(kyc.length>4000,"KYC code must be present");

test("embedded JavaScript parses and the KYC page has controls",()=>{
  assert.doesNotThrow(()=>new Script(js));
  for(const id of ["kycOpen","kycPage","kycQueue","kycDetail","kycCanvas","kycApprove","kycReject","kycDelete","kycRejectCode","kycRejectNote","kycMasked"])
    assert.ok(source.includes('id="'+id+'"'),id+" missing");
});
test("list uses only four UI fields plus agent id and status internally",()=>{
  const list=kyc.slice(kyc.indexOf("async function refreshKycList()"),kyc.indexOf("function kycSignedPhotoUrl("));
  const used=[...list.matchAll(/\brow\.([a-z_]+)\b/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(used)].sort(),["agent_id","area","ic_last4","preferred_name","status","submitted_at"]);
  assert.match(list,/kycStatusOrder\(a\.status\)-kycStatusOrder\(b\.status\)/);
  assert.doesNotMatch(list,/innerHTML|JSON\.stringify\(row\)/);
});
test("detail read is click-only, backend has all four action names",()=>{
  assert.match(kyc,/button\.addEventListener\("click",\(\)=>openKycView/);
  assert.match(kyc,/record\.photo_signed_url/);
  assert.match(kyc,/kycActive\.photoShown=photoShown/);
  assert.match(kyc,/decision==="approve"&&!selected\.photoShown/);
  for(const action of ["kyc_list","kyc_view","kyc_review","kyc_delete"])
    assert.ok(kyc.includes('action:"'+action+'"'));
  assert.match(js,/j\.role!=="owner"/);
});
test("60-second expiry aborts requests and clears canvas pixels",()=>{
  assert.match(kyc,/const KYC_VIEW_MS=60000/);
  assert.match(kyc,/setTimeout\(\(\)=>maskKyc\(/);
  assert.match(kyc,/kycAbort\.abort\(\)/);
  assert.match(kyc,/kycListAbort\.abort\(\)/);
  assert.match(kyc,/canvas\.width=0;canvas\.height=0/);
  for(const event of ["visibilitychange","blur","pagehide"])assert.ok(kyc.includes('"'+event+'"'));
  assert.match(kyc,/if\(seq!==kycSeq\|\|signal\.aborted\)return/);
});
test("photo URL is strictly restricted to signed, private Supabase bucket",()=>{
  const fn=kyc.slice(kyc.indexOf("function kycSignedPhotoUrl("),kyc.indexOf("async function drawKycPhoto("));
  const valueGood="https://example.supabase.co/storage/v1/object/sign/agent-kyc/a/photo.jpg?token=t";
  const check=value=>runInNewContext(fn+"; kycSignedPhotoUrl(value)",{CFG:{url:"https://example.supabase.co"},URL,value});
  assert.equal(check(valueGood),valueGood);
  for(const url of [
    "https://evil.example/storage/v1/object/sign/agent-kyc/a/photo.jpg?token=t",
    "http://example.supabase.co/storage/v1/object/sign/agent-kyc/a/photo.jpg?token=t",
    "https://example.supabase.co/storage/v1/object/public/agent-kyc/a/photo.jpg",
    "https://example.supabase.co/storage/v1/object/sign/other/a/photo.jpg?token=t",
    "https://example.supabase.co/storage/v1/object/sign/agent-kyc/a/photo.jpg"
  ])assert.equal(check(url),null,url);
  assert.match(kyc,/fetch\(url,\{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer",signal\}\)/);
  assert.match(kyc,/createImageBitmap\(blob\)/);
  assert.match(kyc,/ctx\.drawImage\(bitmap/);
  assert.doesNotMatch(kyc,/localStorage|sessionStorage|indexedDB|toDataURL|toBlob|createObjectURL|download\s*=/i);
});
test("rejection requires a reason and deletion requires two confirmations",()=>{
  assert.match(kyc,/code==="other"&&!note/);
  assert.match(kyc,/!code&&!note/);
  assert.match(kyc,/,decision,reason\}/);
  assert.match(kyc,/if\(!confirm\(/);
  assert.match(kyc,/prompt\("输入 DELETE/);
  assert.match(kyc,/confirm:true/);
  assert.match(kyc,/deleteRequested:Boolean\(record\.delete_requested_at\)/);
});

test("latest launch cards survive KYC integration",()=>{
  for(const marker of ["launchOrdersCard","launchProgressCard","refreshLaunchPanels","launch_complete_order"])
    assert.ok(source.includes(marker),marker+" must be preserved");
});
test("Owner sees plain-language rejection reasons and pending count",()=>{
  assert.match(source,/身份审核（读取中）/);
  assert.match(source,/人等你看/);
  assert.match(source,/照片有点模糊/);
  assert.match(source,/资料和身份证对不上/);
  assert.match(source,/照片没有拍完整/);
});
