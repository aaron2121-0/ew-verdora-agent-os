import { ROLEPLAY_CATEGORIES, type RoleplayCategory, type Rules } from '../config/rules';

export const AGENT_STATUSES = ['REGISTERED','PROFILE_COMPLETE','IN_TRAINING','EXAM_READY','RETRAINING','ACTIVE','RESTRICTED','DORMANT','FROZEN'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type LifecycleEvent = 'PROFILE_SUBMITTED'|'TRAINING_STARTED'|'CORE_TRAINING_COMPLETED'|'EXAM_PASSED'|'EXAM_FAILED'|'RETRAINING_COMPLETED'|'RESTRICTION_APPLIED'|'RECOVERY_COMPLETED'|'WENT_DORMANT'|'OWNER_FROZE'|'OWNER_UNFROZE';
const OWNER_ONLY: ReadonlySet<LifecycleEvent> = new Set(['OWNER_FROZE','OWNER_UNFROZE']);
const TRANSITIONS: Record<AgentStatus, Partial<Record<LifecycleEvent, AgentStatus>>> = {
REGISTERED:{PROFILE_SUBMITTED:'PROFILE_COMPLETE'},PROFILE_COMPLETE:{TRAINING_STARTED:'IN_TRAINING'},IN_TRAINING:{CORE_TRAINING_COMPLETED:'EXAM_READY'},EXAM_READY:{EXAM_PASSED:'ACTIVE',EXAM_FAILED:'RETRAINING'},RETRAINING:{RETRAINING_COMPLETED:'EXAM_READY'},ACTIVE:{RESTRICTION_APPLIED:'RESTRICTED',WENT_DORMANT:'DORMANT',OWNER_FROZE:'FROZEN'},RESTRICTED:{RECOVERY_COMPLETED:'ACTIVE',OWNER_FROZE:'FROZEN'},DORMANT:{RECOVERY_COMPLETED:'ACTIVE',OWNER_FROZE:'FROZEN'},FROZEN:{OWNER_UNFROZE:'ACTIVE'}};
export type Actor='SYSTEM'|'OWNER'|'AGENT';
export function transition(status:AgentStatus,event:LifecycleEvent,actor:Actor):AgentStatus{if(OWNER_ONLY.has(event)&&actor!=='OWNER')throw new Error(`${event} requires OWNER`);if(!OWNER_ONLY.has(event)&&actor==='AGENT'&&event!=='PROFILE_SUBMITTED'&&event!=='TRAINING_STARTED')throw new Error(`${event} cannot be triggered by an Agent`);const next=TRANSITIONS[status][event];if(!next)throw new Error(`Invalid transition: ${status} + ${event}`);return next;}
export function canSell(status:AgentStatus):boolean{return status==='ACTIVE';}
export type RoleplayScores=Record<RoleplayCategory,number>;
export interface ExamResult{total:number;passed:boolean;event:'EXAM_PASSED'|'EXAM_FAILED';weakCategories:RoleplayCategory[];assignedModules:string[];ruleVersion:string;}
export function gradeExam(raw:RoleplayScores,rules:Rules):ExamResult{const c=rules.certification;let total=0;const weak:RoleplayCategory[]=[];for(const cat of ROLEPLAY_CATEGORIES){const v=raw[cat];const score=Math.min(c.categoryMax,Math.max(0,Number.isFinite(v)?v:0));total+=score;if(score<=c.weakCategoryScore)weak.push(cat);}const passed=total>=c.passScore;return{total,passed,event:passed?'EXAM_PASSED':'EXAM_FAILED',weakCategories:weak,assignedModules:weak.map(w=>c.categoryModules[w]).filter((m):m is string=>Boolean(m)),ruleVersion:rules.version};}
export type DormancyStage='NONE'|'RESTART_MISSION'|'RECOVERY_MISSION'|'REACTIVATION_TRAINING'|'DORMANT';
export function dormancyStage(daysInactive:number,rules:Rules):DormancyStage{const d=rules.dormancy;if(daysInactive>=d.dormantDays)return'DORMANT';if(daysInactive>=d.reactivationTrainingDays)return'REACTIVATION_TRAINING';if(daysInactive>=d.recoveryMissionDays)return'RECOVERY_MISSION';if(daysInactive>=d.restartMissionDays)return'RESTART_MISSION';return'NONE';}
export function applyDormancy(status:AgentStatus,daysInactive:number,rules:Rules):{status:AgentStatus;stage:DormancyStage}{const stage=dormancyStage(daysInactive,rules);if(stage==='DORMANT'&&status==='ACTIVE')return{status:transition(status,'WENT_DORMANT','SYSTEM'),stage};return{status,stage};}
