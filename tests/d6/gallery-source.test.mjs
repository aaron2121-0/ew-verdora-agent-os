import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(path)=>readFileSync(new URL("../../apps/agent-mobile/public/"+path,import.meta.url),"utf8");
const d6=file("d6-motion.js"),phase=file("phase1.js"),css=file("d6-motion.css");
test("D6 gallery consumes D2 signed_url, caption_zh/en and product_line",()=>{
  for(const field of ["signed_url","caption_zh","caption_en","product_line"])assert.ok(d6.includes(field),field);
  assert.match(phase,/action:"portfolio_list"/);
});
test("gallery uses owned lightbox and never invokes vendor gallery or demo placeholders",()=>{
  assert.doesNotMatch(d6,/\.mountGallery\s*\(/);
  assert.doesNotMatch(d6,/GALLERY_DEFAULT|gallerySlotNote|photoNotice|Signature Bouquet Showcase|定制手捧花束展示位/);
  assert.match(d6,/d6-photo-dialog/);
  assert.match(d6,/还没有作品照片，老板上传后就会出现在这里/);
});
test("gallery is safe for motion preferences and image loading",()=>{
  assert.match(d6,/loading=i===0\?"eager":"lazy"/);
  assert.match(d6,/isReduced\(\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(d6,/aria-label/);
});
