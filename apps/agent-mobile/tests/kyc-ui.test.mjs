import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const ui=fs.readFileSync(path.join(root,"public/kyc-ui.js"),"utf8");
const phase=fs.readFileSync(path.join(root,"public/phase1.js"),"utf8");
const app=fs.readFileSync(path.join(root,"public/app.js"),"utf8");
const build=fs.readFileSync(path.join(root,"build-railway-function.mjs"),"utf8");
test("KYC UI keeps sensitive fields out of browser persistence and unsafe DOM sinks",()=>{
  for(const bad of ["innerHTML","localStorage","sessionStorage","indexedDB","console."])assert.equal(ui.includes(bad),false,bad);
  assert.match(ui,/CONSENT_VERSION="v1\.0-2026-11"/);
  assert.match(ui,/canvasCompress/);
  assert.match(ui,/max=1600/);
  assert.match(ui,/kyc_request_delete/);
  assert.match(ui,/confirm:true/);
});
test("Today only exposes verification banner from server kyc_required flag",()=>{
  assert.match(phase,/kyc\.banner\(\)/);
  assert.match(ui,/getData\(\)\?\.kyc_required/);
});
test("KYC upload retries with a fresh 60-second grant without storing the token",()=>{
  assert.match(app,/uploadKyc/);
  assert.match(app,/kyc_upload_url/);
  assert.match(app,/Authorization/);
});
test("Railway bundle includes KYC UI and reviewed onboarding copy",()=>{
  assert.match(build,/"kyc-ui\.js"/);
  assert.match(build,/content\/onboarding\/kyc_copy\.json/);
});
