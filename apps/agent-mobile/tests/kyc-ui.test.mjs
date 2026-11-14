import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {I18N} from "../public/i18n.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const kyc=read("public/kyc.js");
const app=read("public/app.js");
const phase1=read("public/phase1.js");
const css=read("public/styles.css");
const build=read("build-railway-function.mjs");

test("identity UI never persists or logs IC/photo data",()=>{
  assert.equal(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/i.test(kyc),false);
  assert.equal(/\bconsole\.(log|info|warn|error|debug)\b/.test(kyc),false);
  assert.equal(/innerHTML|insertAdjacentHTML/.test(kyc),false);
  assert.match(kyc,/clearSensitive\(\)/);
  assert.match(kyc,/photoBlob=null/);
  assert.match(kyc,/form\.ic_number=""/);
  assert.equal(/agent-ai/.test(kyc),false);
});

test("identity registration follows the reviewed backend contract",()=>{
  assert.match(kyc,/CONSENT_VERSION="v1\.0-2026-11"/);
  assert.match(kyc,/action:"register"/);
  for(const field of ["legal_name","preferred_name","ic_number","phone_whatsapp","area","consent_version"])assert.match(kyc,new RegExp(field));
  assert.match(kyc,/action:"kyc_upload_url"/);
  assert.match(kyc,/action:"kyc_submit"/);
  assert.match(kyc,/action:"kyc_request_delete",confirm:true/);
});

test("photo flow is camera-first, previews, compresses and refreshes short upload links",()=>{
  assert.match(kyc,/capture:"environment"/);
  assert.match(kyc,/MAX_SIDE=1600/);
  assert.match(kyc,/canvas\.toBlob/);
  assert.match(kyc,/URL\.createObjectURL/);
  assert.match(kyc,/identityRetake/);
  assert.match(kyc,/identityUsePhoto/);
  assert.match(kyc,/attempt<2/);
  assert.match(kyc,/MAX_BYTES=5\*1024\*1024/);
});

test("Today identity card is server-gated and uses safe DOM creation",()=>{
  assert.match(app,/createKycExperience/);
  assert.match(app,/renderTodayTop:\(\)=>identity\.renderTodayCard\(\)/);
  assert.match(phase1,/renderTodayTop/);
  assert.match(kyc,/if\(!d\.kyc_required&&!status\)return null/);
  assert.match(kyc,/element\("section"/);
});

test("identity UI has readable 16px text and 48px+ actions",()=>{
  assert.match(css,/\.identity-flow-body\{font-size:16px/);
  assert.match(css,/\.identity-next\{width:100%;min-height:52px;font-size:17px/);
  assert.match(css,/\.identity-area-btn\{min-height:50px/);
  assert.match(css,/\.identity-preview-actions \.btn\{min-height:50px/);
});

test("identity copy does not expose internal status/API vocabulary",()=>{
  const keys=Object.keys(I18N.en).filter(k=>k.startsWith("identity"));
  assert.ok(keys.length>30);
  assert.deepEqual(keys.sort(),Object.keys(I18N.zh).filter(k=>k.startsWith("identity")).sort());
  const banned=/\bKYC\b|\bdraft\b|\bsubmitted\b|\bapproved\b|\btoken\b|\bAPI\b|\bnull\b/i;
  for(const lang of ["en","zh"])for(const key of keys)assert.equal(banned.test(String(I18N[lang][key])),false,lang+" "+key);
});

test("bundle includes identity code and reviewed onboarding copy",()=>{
  assert.match(build,/"kyc\.js"/);
  assert.match(build,/content\/onboarding\/kyc_copy\.json/);
  assert.match(build,/version:"0\.9\.0-kyc-ui"/);
});
