// Published, reviewed UI copy lives in content/handbook/*.json.
// We serve those exact files from this app; do not create divergent client copy.
export const COURSE_CODES=Object.freeze(["CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"]);
const BASE="/content/handbook/";
let snapshot=null,pending=null;
const fetchJson=async(name,{optional=false}={})=>{
  try{
    const response=await fetch(BASE+name,{cache:"no-cache"});
    if(!response.ok)throw new Error("reviewed_json_unavailable");
    return await response.json();
  }catch(e){if(optional)return null;throw e}
};
export async function loadReviewedContent(){
  if(snapshot)return snapshot;
  if(pending)return pending;
  pending=Promise.all([
    fetchJson("onboarding_7day.json"),fetchJson("ui_microcopy.json"),
    fetchJson("daily_actions.json",{optional:true})
  ]).then(([onboarding,ui,daily])=>{
    if(!Array.isArray(onboarding?.days)||onboarding.days.length!==7||
      !Array.isArray(ui?.tour)||ui.tour.length!==4||
      !Array.isArray(ui?.coach_marks)||!Array.isArray(ui?.empty_states)||
      !Array.isArray(ui?.ai_suggestions))throw new Error("invalid_reviewed_content");
    snapshot={onboarding,ui,daily};return snapshot;
  }).finally(()=>{pending=null});
  return pending;
}
export function reviewed(){return snapshot}
export function localized(row,field,lang){
  if(!row||typeof row!=="object")return "";
  return String(row[field+"_"+(lang==="zh"?"zh":"en")]||"");
}
export function dayForCode(code){
  const day=COURSE_CODES.indexOf(code)+1;
  return day?reviewed()?.onboarding?.days?.find(x=>x.day===day)||null:null;
}
export function sectionFromFocus(focus){
  return ["condolence","opening","bouquet","wedding_event","wholesale"].includes(focus)?
    {section:"product_line",product_line:focus}:
    ["story","service_rule"].includes(focus)?{section:focus,product_line:null}:null;
}
export function marks(screen){
  return reviewed()?.ui?.coach_marks?.filter(x=>x.screen===screen)||[];
}
export function emptyCopy(screen){return reviewed()?.ui?.empty_states?.find(x=>x.screen===screen)||null}
export function suggestions(screen,lang){
  const row=reviewed()?.ui?.ai_suggestions?.find(x=>x.screen===screen);
  const list=row?.[lang==="zh"?"prompts_zh":"prompts_en"];
  return Array.isArray(list)?list.filter(x=>typeof x==="string"&&x.trim()).slice(0,3):[];
}
// Owner/Grok daily_actions.json may be added later without changing application logic.
// The fallback is derived exclusively from existing dashboard data, never a fabricated lead.
export function dailyActions(data={},lang="en"){
  const sourced=reviewed()?.daily;
  if(Array.isArray(sourced?.actions)&&sourced.actions.length>=3){
    const allowed=new Set(["customers","order","today","selling","training"]);
    const result=sourced.actions.slice(0,3).map(row=>({
      key:String(row.code||row.id||""),title:localized(row,"title",lang),
      detail:localized(row,"description",lang)||localized(row,"body",lang),
      target:allowed.has(row.target)?row.target:"customers"
    }));
    if(result.every(r=>r.title))return result;
  }
  const due=Array.isArray(data?.phase1?.due_followups)?data.phase1.due_followups:[];
  const leads=Array.isArray(data?.phase1?.recent_leads)?data.phase1.recent_leads:[];
  const kits=Array.isArray(data?.selling_kits)?data.selling_kits:[];
  const qualified=leads.some(x=>["qualified","quoted"].includes(x.status)||x.quote_id);
  if(lang==="zh")return [
    {key:"find",title:due.length?"跟进逾期客户":"找客户",detail:due.length?due.length+" 位客户等待跟进":"寻找真正有用花需求的客户",target:due.length?"today":"customers"},
    {key:"follow",title:qualified?"申请报价":"跟进客户",detail:qualified?"有合格询盘可以提交正式报价":"先确认日期、预算和用途",target:qualified?"order":"customers"},
    {key:"post",title:"分享一则 Selling Kit",detail:kits.length?"从 "+kits.length+" 份现有 Selling Kit 选择":"尚未有可分享的 Selling Kit",target:"selling"}
  ];
  return [
    {key:"find",title:due.length?"Follow up overdue leads":"Find customers",detail:due.length?due.length+" leads to follow up":"Look for customers with a real occasion",target:due.length?"today":"customers"},
    {key:"follow",title:qualified?"Request a quote":"Follow up",detail:qualified?"Submit an official quote request":"Confirm the occasion, delivery date and budget",target:qualified?"order":"customers"},
    {key:"post",title:"Share one Selling Kit",detail:kits.length?"Choose from "+kits.length+" existing Selling Kits":"No Selling Kits are available yet",target:"selling"}
  ];
}
