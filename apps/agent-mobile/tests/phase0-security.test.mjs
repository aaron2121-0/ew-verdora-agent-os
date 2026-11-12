import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";
import {escapeHtml} from "../public/components.js";
import {I18N,translate} from "../public/i18n.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const read=p=>fs.readFileSync(p,"utf8");

test("escapeHtml neutralises the exact customer-name XSS payload",()=>{
  const input='<img src=x onerror=alert(1)>';
  const escaped=escapeHtml(input);
  assert.equal(escaped,"&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(escaped.includes("<img"),false);
});

test("Agent HTML has external CSS/modules and no inline event handlers",()=>{
  const html=read(path.join(root,"public/index.html"));
  assert.equal(/<style\b/i.test(html),false);
  assert.equal(/\son[a-z]+\s*=/i.test(html),false);
  assert.match(html,/href="\/styles\.css"/);
  assert.match(html,/type="module" src="\/app\.js"/);
});

test("Agent app never writes untrusted data through innerHTML",()=>{
  const app=read(path.join(root,"public/app.js"));
  assert.equal(/\.innerHTML\s*=/.test(app),false);
  assert.equal(/insertAdjacentHTML/.test(app),false);
  assert.match(app,/textContent/);
});

test("Agent server ships restrictive CSP and no unsafe-inline scripts",()=>{
  const server=read(path.join(root,"server.ts"));
  assert.match(server,/Content-Security-Policy/);
  assert.match(server,/script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.equal(/script-src[^\n]*unsafe-inline/.test(server),false);
  assert.match(server,/object-src 'none'/);
  assert.match(server,/frame-ancestors 'none'/);
});

test("i18n contains the same required UI keys in English and Chinese",()=>{
  const en=Object.keys(I18N.en).sort();
  const zh=Object.keys(I18N.zh).sort();
  assert.deepEqual(zh,en);
  for(const key of ["loginTitle","registerTitle","today","newLead","sellingKit","wallet","genericError"]){
    assert.notEqual(translate("en",key),key);
    assert.notEqual(translate("zh",key),key);
  }
});

test("Agent JS payload stays below 150KB gzip",()=>{
  const files=["app.js","i18n.js","icons.js","components.js"].map(n=>read(path.join(root,"public",n)));
  const gz=zlib.gzipSync(files.join("\n"));
  assert.ok(gz.length<=150*1024,`gzip JS is ${gz.length} bytes`);
});

test("Owner source has CSP and escapes DB text before innerHTML",()=>{
  const owner=read(path.join(repoRoot,"apps/owner-mobile/index.ts"));
  assert.match(owner,/Content-Security-Policy/);
  assert.match(owner,/const escapeHtml=/);
  assert.match(owner,/safeImageUrl/);
  assert.match(owner,/escapeHtml\(e\.summary\)/);
  assert.match(owner,/escapeHtml\(q\.design_commitment\)/);
  assert.match(owner,/escapeHtml\(q\.status\)/);
  assert.match(owner,/escapeHtml\(q\.id\)/);
  assert.equal(/src='"\+q\.image_url/.test(owner),false);
  assert.match(owner,/Asia\/Kuching/);
  assert.match(owner,/kuchingDate\(\)/);
  assert.match(owner,/kuchingDateTime\(j\.expires_at\)/);
  assert.equal(/textContent=e\?\.message/.test(owner),false);
  assert.equal(/textContent=e\.message/.test(owner),false);
  assert.match(owner,/textContent=friendlyError\(m\)/);
});
