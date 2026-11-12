
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store"
};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:cors})}
function clean(v,max=120){return String(v??"").trim().slice(0,max)}
function safeErr(e){
  const m=String(e?.message||"");
  const allowed=[
    "agent_not_found","attempt_not_found","attempt_already_finished","all_questions_answered",
    "question_not_current","duplicate_answer","question_not_served","invalid_answer","questions_remaining",
    "question_bank_not_ready","exam_attempt_not_found","exam_prerequisites_incomplete","exam_bank_not_ready"
  ];
  const found=allowed.find(x=>m.includes(x));
  if(found)return found;
  console.error("TRAINING_INTERNAL_ERROR",e?.code||"",m.slice(0,180));
  return "request_failed";
}
function statusFor(code){
  if(["duplicate_answer","question_not_current","attempt_already_finished","all_questions_answered"].includes(code))return 409;
  if(["attempt_not_found","exam_attempt_not_found","agent_not_found"].includes(code))return 404;
  if(["invalid_answer","question_not_served","questions_remaining","exam_prerequisites_incomplete","question_bank_not_ready","exam_bank_not_ready"].includes(code))return 400;
  return 400;
}
function kuchingToday(){return new Date(Date.now()+8*3600*1000).toISOString().slice(0,10)}
function safeQuestionPayload(value,allowFeedback=false){
  const banned=new Set(["correct_index","option_order","question_id"]);
  const scrub=v=>{
    if(Array.isArray(v))return v.map(scrub);
    if(v&&typeof v==="object"){
      const o={};
      for(const [k,x] of Object.entries(v)){
        if(banned.has(k))continue;
        if(!allowFeedback&&(k==="explanation_en"||k==="explanation_zh"||k==="correct"||k==="timed_out"))continue;
        o[k]=scrub(x);
      }
      return o;
    }
    return v;
  };
  return scrub(value);
}
function int(v){const n=Number(v);return Number.isInteger(n)?n:null}
function uuid(v){const s=clean(v,80);return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)?s:null}

const url=Deno.env.get("SUPABASE_URL")||"";
const pubKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
const secKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const publishable=pubKeys.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
const secret=secKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
if(!url||!publishable||!secret)throw new Error("Supabase environment keys missing");

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return reply({error:"authentication_required"},401);
  const token=auth.slice(7);
  const userClient=createClient(url,publishable,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await userClient.auth.getUser(token);
  if(userError||!userData.user)return reply({error:"invalid_session"},401);

  const {data:agent,error:agentError}=await admin.from("agents").select("id,status").eq("user_id",userData.user.id).maybeSingle();
  if(agentError)return reply({error:"request_failed"},400);
  if(!agent)return reply({error:"agent_not_found"},404);

  let body={};try{body=await req.json()}catch{}
  const action=clean(body.action,40);
  const day=kuchingToday();

  try{
    if(action==="today"){
      const start=body.start===true;
      const {data:existing,error:existingError}=await admin.from("training_daily_attempts")
        .select("id,status").eq("agent_id",agent.id).eq("training_date",day).maybeSingle();
      if(existingError)throw existingError;
      const rpc=(!existing&&!start)?"agent_training_summary_internal":"agent_training_today_internal";
      const {data,error}=await admin.rpc(rpc,{p_agent_id:agent.id,p_date:day});
      if(error)throw error;
      return reply({ok:true,today:safeQuestionPayload(data,false),server_date:day,server_now:new Date().toISOString()});
    }
    if(action==="answer"){
      const position=int(body.position),selected=int(body.selected_index);
      if(position==null||position<1||position>5||selected==null||selected<0||selected>3)return reply({error:"invalid_answer"},400);
      const {data,error}=await admin.rpc("agent_training_answer_internal",{
        p_agent_id:agent.id,p_date:day,p_position:position,p_selected_index:selected
      });
      if(error)throw error;
      return reply({ok:true,answer:safeQuestionPayload(data,true),server_date:day,server_now:new Date().toISOString()});
    }
    if(action==="finish"){
      const {data,error}=await admin.rpc("agent_training_finish_internal",{p_agent_id:agent.id,p_date:day});
      if(error)throw error;
      return reply({ok:true,result:safeQuestionPayload(data,true),server_date:day,server_now:new Date().toISOString()});
    }
    if(action==="exam_start"){
      const {data,error}=await admin.rpc("agent_training_exam_start_internal",{p_agent_id:agent.id});
      if(error)throw error;
      return reply({ok:true,exam:safeQuestionPayload(data,false),server_date:day,server_now:new Date().toISOString()});
    }
    if(action==="exam_answer"){
      const attemptId=uuid(body.attempt_id),position=int(body.position),selected=int(body.selected_index);
      if(!attemptId||position==null||position<1||position>20||selected==null||selected<0||selected>3)return reply({error:"invalid_answer"},400);
      const {data,error}=await admin.rpc("agent_training_exam_answer_internal",{
        p_agent_id:agent.id,p_attempt_id:attemptId,p_position:position,p_selected_index:selected
      });
      if(error)throw error;
      return reply({ok:true,answer:safeQuestionPayload(data,true),server_date:day,server_now:new Date().toISOString()});
    }
    if(action==="exam_finish"){
      const attemptId=uuid(body.attempt_id);
      if(!attemptId)return reply({error:"exam_attempt_not_found"},404);
      const {data,error}=await admin.rpc("agent_training_exam_finish_internal",{p_agent_id:agent.id,p_attempt_id:attemptId});
      if(error)throw error;
      return reply({ok:true,result:safeQuestionPayload(data,true),server_date:day,server_now:new Date().toISOString()});
    }
    return reply({error:"unknown_action"},400);
  }catch(e){
    const code=safeErr(e);
    return reply({error:code},statusFor(code));
  }
});
