import assert from "node:assert/strict";
// DOM visibility alone cannot catch a compositor painting green over visible text.
// Also check hit testing and the contrast of actual heading pixels in the capture.
export async function assertTodayUsable(page,{timeout=15000}={}){
 const card=page.locator("#todayPage .earning-actions");
 await card.waitFor({state:"visible",timeout});
 const heading=card.locator(".vd-ht-title");await heading.waitFor({state:"visible",timeout});
 assert.match(await heading.textContent(),/今天赚钱 3 件事|3 Money-Making Actions Today/);
 assert.equal(await card.locator(".vd-ht-item-title").count(),3,"three actual tasks must be rendered");
 for(const task of await card.locator(".vd-ht-item-title").all())assert.ok((await task.textContent()).trim(),"task content must not be empty");
 await heading.scrollIntoViewIfNeeded();
 const visible=await heading.evaluate(el=>{
  const b=el.getBoundingClientRect();
  for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==="none"||s.visibility==="hidden"||Number(s.opacity)<.1)return false}
  const hit=document.elementFromPoint(Math.min(innerWidth-1,b.left+b.width/2),Math.min(innerHeight-1,b.top+b.height/2));
  return b.width>100&&b.height>10&&Boolean(hit&&(hit===el||el.contains(hit)));
 });
 assert.ok(visible,"Today heading must be visible and unobscured, not just present in the DOM");
 const shot=await page.screenshot({scale:"css"}),box=await heading.boundingBox();
 const contrast=await page.evaluate(async({base64,box})=>{
  const image=new Image();image.src="data:image/png;base64,"+base64;await image.decode();
  const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(Math.ceil(box.x)+2,Math.ceil(box.y)+2,Math.max(1,Math.floor(box.width)-4),Math.max(1,Math.floor(box.height)-4)).data;
  let min=255,max=0;for(let i=0;i<pixels.length;i+=4){const l=(pixels[i]+pixels[i+1]+pixels[i+2])/3;min=Math.min(min,l);max=Math.max(max,l)}
  return max-min;
 },{base64:shot.toString("base64"),box});
 assert.ok(contrast>70,"Today heading pixels must contain readable text contrast; possible green-screen paint failure");
}
