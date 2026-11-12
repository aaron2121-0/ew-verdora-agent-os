import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";
import {I18N,translate} from "../public/i18n.js";
import {kuchingDateKey,kuchingLocalToIso,KUCHING_TZ} from "../public/date.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const read=p=>fs.readFileSync(p,"utf8");
const publicFiles=["app.js","phase1.js","order.js","date.js","draft.js","components.js","icons.js","i18n.js"];
const source=Object.fromEntries(publicFiles.map(n=>[n,read(path.join(root,"public",n))]));

test("Phase 1 bilingual dictionaries have exact parity",()=>{
  assert.deepEqual(Object.keys(I18N.zh).sort(),Object.keys(I18N.en).sort());
  for(const key of ["navToday","navCustomers","navOrder","navTraining","navPerformance","moneyCardTitle","wizardTitle","quoteMessageTemplate"]){
    assert.notEqual(translate("en",key),key);
    assert.notEqual(translate("zh",key),key);
  }
});

test("All Phase 1 DOM i18n keys exist",()=>{
  const html=read(path.join(root,"public/index.html"));
  const keys=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(x=>x[1]);
  for(const key of keys){
    assert.ok(Object.hasOwn(I18N.en,key),"missing EN "+key);
    assert.ok(Object.hasOwn(I18N.zh,key),"missing ZH "+key);
  }
});

test("Phase 1 untrusted rendering has no innerHTML sinks",()=>{
  for(const name of ["app.js","phase1.js","order.js"]){
    assert.equal(/\.innerHTML\s*=/.test(source[name]),false,name+" innerHTML");
    assert.equal(/insertAdjacentHTML/.test(source[name]),false,name+" insertAdjacentHTML");
  }
  assert.match(source["phase1.js"],/element\(/);
  assert.match(source["order.js"],/element\(/);
});

test("Phase 1 HTML contains no inline event handlers or inline scripts",()=>{
  const html=read(path.join(root,"public/index.html"));
  assert.equal(/\son[a-z]+\s*=/i.test(html),false);
  assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),false);
});

test("Access Link invite+email flow is preserved",()=>{
  assert.match(source["app.js"],/hash\.get\("invite"\)/);
  assert.match(source["app.js"],/hash\.get\("email"\)/);
  assert.match(source["app.js"],/action:"invite_session"/);
});

test("Kuching utilities define business date independently of device timezone",()=>{
  assert.equal(KUCHING_TZ,"Asia/Kuching");
  assert.equal(kuchingDateKey("2026-11-30T16:30:00Z"),"2026-12-01");
  assert.equal(kuchingDateKey("2026-11-30T15:59:59Z"),"2026-11-30");
  assert.equal(kuchingLocalToIso("2026-12-01","00:30"),"2026-11-30T16:30:00.000Z");
});

test("Order draft survives locally and reference image uses IndexedDB",()=>{
  assert.match(source["draft.js"],/localStorage/);
  assert.match(source["draft.js"],/indexedDB/);
  assert.match(source["draft.js"],/draft_files/);
  assert.match(source["order.js"],/loadOrderDraft/);
  assert.match(source["order.js"],/loadOrderReference/);
});

test("WhatsApp messages are URL encoded and official quote is server-derived",()=>{
  assert.match(source["order.js"],/https:\/\/wa\.me\/\?text=/);
  assert.match(source["order.js"],/encodeURIComponent\(message\)/);
  assert.match(source["order.js"],/accept_option/);
  assert.equal(/baseBudget\s*\*|budget\s*\*\s*0\./.test(source["order.js"]),false);
});

test("Locked recovery status is blocked in UI and quote backend",()=>{
  assert.match(source["phase1.js"],/restricted","recovery","dormant","suspended/);
  const quote=read(path.join(repoRoot,"supabase/functions/quote-intake/index.ts"));
  assert.match(quote,/\["trainee","restricted","recovery","dormant","suspended"\]/);
  assert.match(quote,/403/);
});

test("Phase 1 overview RPC is read-only security definer with empty search_path",()=>{
  const sql=read(path.join(repoRoot,"supabase/migrations/20261113_phase1_agent_mobile_overview.sql"));
  assert.match(sql,/stable\s+security definer/i);
  assert.match(sql,/set search_path\s*=\s*''/i);
  assert.match(sql,/revoke all on function/i);
  assert.match(sql,/grant execute[\s\S]*service_role/i);
});

test("No service key or secret is present in Agent frontend",()=>{
  const joined=publicFiles.map(n=>source[n]).join("\n");
  assert.equal(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET|service_role/i.test(joined),false);
  assert.equal(/sk-[A-Za-z0-9_-]{8,}/.test(joined),false);
});

test("Phase 1 JS payload remains below 150KB gzip",()=>{
  const gz=zlib.gzipSync(publicFiles.map(n=>source[n]).join("\n"));
  assert.ok(gz.length<=150*1024,"gzip JS is "+gz.length);
});

test("Phase 1 stays native JS and does not import React prototype code",()=>{
  const joined=publicFiles.map(n=>source[n]).join("\n");
  assert.equal(/from\s+["']react["']|react-dom|jsx-runtime/i.test(joined),false);
});
