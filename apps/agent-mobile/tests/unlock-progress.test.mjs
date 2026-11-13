import test from "node:test";
import assert from "node:assert/strict";
import {getUnlockProgress,REQUIRED_COURSE_CODES} from "../public/unlock.js";
import {I18N,translate} from "../public/i18n.js";

const rows=(done=[])=>REQUIRED_COURSE_CODES.map(code=>({status:done.includes(code)?"passed":"assigned",training_modules:{code}}));
const data=(done=[],status="trainee",extras={})=>({agent:{status},training:rows(done),...extras});

test("exactly seven required courses; 0/7 targets first unfinished module",()=>{
 const result=getUnlockProgress(data());
 assert.equal(result.total,7);
 assert.equal(result.completed,0);
 assert.equal(result.firstIncompleteCode,"CORE-BRAND");
 assert.equal(result.examStatus,"locked");
});
test("partial completion follows ordered first incomplete code regardless of dashboard row order",()=>{
 const d=data(REQUIRED_COURSE_CODES.slice(0,3));
 d.training.reverse();
 const result=getUnlockProgress(d,{exam_passed:false});
 assert.equal(result.completed,3);
 assert.equal(result.firstIncompleteCode,"REFERENCE");
 assert.equal(result.examStatus,"locked");
});
test("daily practice success is not course completion or exam pass",()=>{
 const d=data([], "trainee",{today_progress:{daily_passed:true,roleplay_score:100}});
 const result=getUnlockProgress(d,{passed:true,score:100,exam_passed:false});
 assert.equal(result.completed,0);
 assert.equal(result.examStatus,"locked");
});
test("seven courses complete: exam awaits certified state; pass wins when confirmed",()=>{
 const d=data(REQUIRED_COURSE_CODES);
 assert.equal(getUnlockProgress(d).examStatus,"checking");
 assert.equal(getUnlockProgress(d,{exam_passed:false}).examStatus,"ready");
 assert.equal(getUnlockProgress(d,{exam_passed:true}).examStatus,"passed");
 assert.equal(getUnlockProgress(d,{exam_passed:true}).firstIncompleteCode,null);
});
test("waived is not passed, matching existing MCQ certification SQL prerequisites",()=>{
 const d=data(REQUIRED_COURSE_CODES);
 d.training[0].status="waived";
 assert.equal(getUnlockProgress(d,{exam_passed:false}).completed,6);
 assert.equal(getUnlockProgress(d,{exam_passed:false}).examStatus,"locked");
});
test("show open recovery tasks, serious unresolved violations and restricted status only when supported",()=>{
 const x=data([],"recovery",{
  recovery_tasks:[{status:"pending",title:"Review required"},{status:"completed",title:"Old task"}],
  violations:[{severity:"serious",status:"open"},{severity:"high",status:"resolved"},{severity:"low",status:"open"}]
 });
 const result=getUnlockProgress(x,{exam_passed:false});
 assert.equal(result.showRecovery,true);
 assert.equal(result.recoveryTasks.length,1);
 assert.equal(result.seriousViolations.length,1);
 assert.equal(getUnlockProgress(data([],"restricted")).showRestriction,true);
 assert.equal(getUnlockProgress(data([],"trainee")).seriousViolations.length,0);
});
test("full EN/ZH parity for unlock copy, incl daily training disclaimer and course CTA",()=>{
 const keys=["companyLogo","unlockProgressTitle","unlockRequiredCourses","unlockCourseCount","unlockOpenNextCourse",
 "unlockExamLocked","unlockExamReady","unlockExamPassed","unlockRecoveryTitle","unlockSeriousViolation",
 "unlockDailyNote","unlockCourseContent","unlockCourseRead"];
 for(const key of keys){assert.ok(I18N.en[key],key+" EN");assert.ok(I18N.zh[key],key+" ZH")}
 assert.match(translate("zh","unlockDailyNote"),/每日练习.*不计入解锁/);
 assert.match(translate("en","unlockCourseCount",{done:3,total:7}),/3\/7/);
});
