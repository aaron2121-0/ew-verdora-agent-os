import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(path)=>readFileSync(new URL("../../apps/agent-mobile/public/"+path,import.meta.url),"utf8");
const d6=file("d6-motion.js"),phase=file("phase1.js"),css=file("d6-motion.css");
test("D6 gallery consumes D2 signed_url, caption_zh/en and product_line",()=>{
  for(const field of ["image_url","caption_zh","caption_en","product_line"])assert.ok(d6.includes(field),field);
  assert.match(phase,/action:"portfolio_list"/);
});
test("gallery uses owned lightbox and never invokes vendor gallery or demo placeholders",()=>{
  assert.doesNotMatch(d6,/\.mountGallery\s*\(/);
  assert.doesNotMatch(d6,/GALLERY_DEFAULT|gallerySlotNote|photoNotice|Signature Bouquet Showcase|定制手捧花束展示位/);
  assert.match(d6,/d6-photo-dialog/);
  assert.match(d6,/还没有作品照片，老板上传后就会出现在这里/);
});
test("gallery is safe for motion preferences and image loading",()=>{
  assert.match(d6,/img\.loading="lazy"/);
  assert.match(d6,/isReduced\(\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(d6,/aria-label/);
});

test("D2 returns server-approved photos without client status flags",()=>{
  assert.match(d6,/Array\.isArray\(response\?\.photos\)\?response\.photos:\[\]/);
  assert.doesNotMatch(d6,/x\.approved===true|x\.is_approved===true|x\.signed_url/);
  assert.match(d6,/photoUrl\(x\.image_url\)/);
  assert.doesNotMatch(phase,/d\.portfolio_gallery|d\.approved_gallery/);
});
test("No Gemini demo-gallery source can be loaded by the shipped app",()=>{
  const vendor=file("motion-vendor.js");
  const build=readFileSync(new URL("../../apps/agent-mobile/build-railway-function.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(vendor,/import\("\.\/ew-verdora-content\/motion\/gallery\.js"\)/);
  assert.doesNotMatch(build,/"ew-verdora-content\/motion\/gallery\.js"/);
});
