import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const build=read("build-railway-function.mjs");
const html=read("public/index.html");
const app=read("public/app.js");
const phase=read("public/phase1.js");
const css=read("public/styles.css");
const vendorRoot=path.join(root,"vendor","motion-pack-v1");
const assets=["brand-bg.js","brand-bg.css","ai-orb.js","ai-orb.css","icons/logo.svg"];

test("reviewed motion-pack-v1 files contain no eval or network code",()=>{
  for(const name of assets){
    const source=fs.readFileSync(path.join(vendorRoot,name),"utf8");
    assert.doesNotMatch(source,/\beval\s*\(/i,name);
    assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/i,name);
  }
});

test("brand motion is local, lazy and used on Login and Today",()=>{
  assert.match(html,/\/vendor\/motion-pack-v1\/brand-bg\.css/);
  assert.doesNotMatch(html,/<script[^>]+brand-bg\.js/);
  assert.match(app,/import\("\/vendor\/motion-pack-v1\/brand-bg\.js"\)/);
  assert.match(app,/mountBrandBg\(\$\("login"\),\{placement:"tr",seed:20261114\}\)/);
  assert.match(phase,/__verdoraMountBrandBg\?\.\(page,\{placement:"tr",seed:20261115\}\)/);
  assert.match(css,/--bg-opacity:\.032/);
});

test("build keeps original initial-JS cap and separately budgets lazy brand motion",()=>{
  assert.match(build,/if\(jsBytes>150\*1024\)/);
  assert.match(build,/brandJsBytes>4\*1024/);
  assert.match(build,/Railway bundle exceeds 900KB/);
  assert.match(build,/version:"0\.9\.0"/);
  assert.match(read("vendor/motion-pack-v1/brand-bg.css"),/prefers-reduced-motion:reduce/);
});
