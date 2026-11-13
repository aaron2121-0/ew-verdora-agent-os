import test from "node:test";
import assert from "node:assert/strict";
import {PRODUCT_LINES,COURSE_TO_LINE,roadmapState} from "../public/guide.js";
import {REQUIRED_COURSE_CODES} from "../public/unlock.js";

const sample=()=>({training:REQUIRED_COURSE_CODES.map(code=>({status:"assigned",training_modules:{code}}))});
test("roadmap reuses exactly seven existing required courses",()=>{
 const rows=roadmapState(sample());
 assert.deepEqual(rows.map(x=>x.code),REQUIRED_COURSE_CODES);
 assert.equal(new Set(rows.map(x=>x.code)).size,7);
 assert.equal(PRODUCT_LINES.length,5);
 assert.ok(rows.every(x=>PRODUCT_LINES.includes(COURSE_TO_LINE[x.code])));
});
test("only authoritative passed status advances the roadmap",()=>{
 const data=sample();
 assert.equal(roadmapState(data).filter(x=>x.unlocked).length,1);
 data.training[0].status="passed";
 assert.equal(roadmapState(data).filter(x=>x.unlocked).length,2);
 assert.equal(roadmapState(data)[1].completed,1);
 data.training[0].status="failed";
 assert.equal(roadmapState(data).filter(x=>x.unlocked).length,1);
});
test("later days stay locked behind an incomplete earlier course",()=>{
 const data=sample();data.training[0].status="passed";data.training[1].status="passed";
 data.training[3].status="passed";
 const rows=roadmapState(data);
 assert.equal(rows[3].passed,true);
 assert.equal(rows[3].unlocked,false);
 assert.equal(rows[4].unlocked,false);
});
