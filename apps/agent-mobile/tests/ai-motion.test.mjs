
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {contextTips,adaptToProfile} from "../public/ai-ui.js";
import {I18N} from "../public/i18n.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=name=>fs.readFileSync(path.join(root,"public",name),"utf8");
test("AI context tips respect Kuching time and real due counts",()=>{
 const date=new Date("2026-11-12T18:00:00Z"); // 02:00 Kuching
 const tips=contextTips({phase1:{due_followups:[{id:1},{id:2}]}},date);
 assert.equal(tips[0].key,"aiTipDue");
 assert.equal(tips[0].params.count,2);
 assert.ok(tips.some(x=>x.key==="aiTipNight"));
});
test("AI profile preferences never force emoji",()=>{
 assert.equal(adaptToProfile({writing_style:"formal",emoji_preference:"none"}).emoji,false);
 assert.equal(adaptToProfile({writing_style:"formal"}).style,"formal");
});
test("AI localization has the same keys for both languages",()=>{
 assert.deepEqual(Object.keys(I18N.en).sort(),Object.keys(I18N.zh).sort());
});
test("new AI files never inject untrusted HTML",()=>{
 for(const file of ["motion.js","ai-ui.js","ai-chat.js"]){
  const s=read(file);
  assert.doesNotMatch(s,/\b(?:innerHTML|insertAdjacentHTML|outerHTML|document\.write)\b/,file);
  assert.doesNotMatch(s,/\bonclick\s*=/i,file);
 }
});
test("Railway bundle packages fonts, AI scripts, self-hosted SDK and both health routes",()=>{
 const build=fs.readFileSync(path.join(root,"build-railway-function.mjs"),"utf8");
 for(const token of ["motion.js","ai-ui.js","ai-chat.js","fonts/inter-latin.woff2","fonts/noto-app-subset.woff2","/api/health","150*1024","350*1024"]){
  assert.ok(build.includes(token),token);
 }
 assert.doesNotMatch(build,/cdn\.jsdelivr\.net/);
});
