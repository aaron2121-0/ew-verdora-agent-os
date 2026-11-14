import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const here=resolve(fileURLToPath(new URL(".",import.meta.url)),"../public");
const read=name=>readFileSync(resolve(here,name),"utf8");
test("manifest includes two exact PNG icon sizes",()=>{
 const m=JSON.parse(read("manifest.json"));
 assert.equal(m.name,"EW VERDORA Agent");
 assert.equal(m.display,"standalone");
 assert.deepEqual(m.icons.map(i=>i.sizes),["192x192","512x512"]);
 for(const item of m.icons){
  assert.equal(item.type,"image/png");
  const file=resolve(here,item.src.slice(1));
  assert.ok(existsSync(file),"icon must exist: "+file);
  const bytes=readFileSync(file);
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  const [w,h]=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  assert.equal(w,Number(item.sizes.split("x")[0]));
  assert.equal(h,w);
 }
});
test("cache is static-only and never takes over API or navigation",()=>{
 const sw=read("service-worker.js");
 assert.match(sw,/request\.mode==="navigate"/);
 assert.match(sw,/url\.search/);
 for(const x of ["/config","/api/","/functions/","/rest/","/auth/","/storage/"])
  assert.ok(sw.includes(x),x+" must be excluded");
 assert.match(sw,/STATIC_FILES\.has\(url\.pathname\)/);
 assert.doesNotMatch(sw,/cache\.put\(.*(?:auth|getSession|user)/i);
});
test("install guidance is optional and dismissible",()=>{
 const source=read("pwa-install.js");
 assert.match(source,/localStorage\.setItem\(KEY/);
 assert.match(source,/window\.matchMedia\("\(display-mode: standalone\)"\)/);
 assert.match(source,/Android|android/i);
 assert.match(source,/Safari/);
});
test("Railway bundle explicitly packages PWA assets",()=>{
 const bundle=readFileSync(resolve(here,"../build-railway-function.mjs"),"utf8");
 for(const file of ["manifest.json","service-worker.js","pwa-install.js",
  "icons/brand-192.png","icons/brand-512.png"])assert.ok(bundle.includes(file),file);
 assert.match(bundle,/\/service-worker\.js/);
});
