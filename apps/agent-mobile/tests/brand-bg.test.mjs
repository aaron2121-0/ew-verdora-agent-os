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

test("reviewed motion-pack-v1 files are present and contain no network/eval code",()=>{
  for(const name of assets){
    const source=fs.readFileSync(path.join(vendorRoot,name),"utf8");
    assert.doesNotMatch(source,/\beval\s*\(/i,name);
    assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/i,name);
  }
});

test("login and Today mount only the local brand background",()=>{
  assert.match(html,/\/vendor\/motion-pack-v1\/brand-bg\.css/);
  assert.match(html,/\/vendor\/motion-pack-v1\/brand-bg\.js/);
  assert.match(app,/setBrandBackground\(\$\("login"\),"tr",20261114\)/);
  assert.match(phase,/mountBrandBg\?\.\(page,\{placement:"tr",seed:20261115\}\)/);
  assert.match(phase,/if\(next!=="today"\)window\.VerdoraMotion\?\.brandBg\?\.destroy/);
  assert.match(css,/--bg-opacity:\.032/);
});

test("bundle guards the Railway limit and reduced-motion comes from reviewed assets",()=>{
  assert.match(build,/Railway bundle exceeds 900KB/);
  assert.match(build,/motionPackAll/);
  assert.match(read("vendor/motion-pack-v1/brand-bg.css"),/prefers-reduced-motion:reduce/);
  assert.match(read("vendor/motion-pack-v1/ai-orb.css"),/prefers-reduced-motion:reduce/);
});
