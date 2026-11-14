
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
    "question_bank_not_ready","module_question_bank_not_ready","card_view_too_short","handbook_not_ready","must_read_handbook_first","previous_module_incomplete","exam_attempt_not_found","exam_prerequisites_incomplete","exam_bank_not_ready"
  ];
  const found=allowed.find(x=>m.includes(x));
  if(found)return found;
  console.error("TRAINING_INTERNAL_ERROR",e?.code||"",m.slice(0,180));
  return "request_failed";
}
function statusFor(code){
  if(["duplicate_answer","question_not_current","attempt_already_finished","all_questions_answered"].includes(code))return 409;
  if(["attempt_not_found","exam_attempt_not_found","agent_not_found"].includes(code))return 404;
  if(["invalid_answer","question_not_served","questions_remaining","exam_prerequisites_incomplete","question_bank_not_ready","module_question_bank_not_ready","card_view_too_short","handbook_not_ready","must_read_handbook_first","exam_bank_not_ready"].includes(code))return 400;
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


const COURSE_CODES=["CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"];

// Focus is taken from the seven Owner-reviewed days, not another
// training_modules.handbook_section field. PR #10 owns that field.
const DAY_FOCUS={
  "CORE-BRAND":"story","LEAD-FINDING":"condolence","QUALIFY":"opening",
  "REFERENCE":"bouquet","OBJECTION":"wedding_event","CLOSING":"wholesale","PAYMENT":"service_rule"
};
async function requiredReadState(admin,agentId,moduleCode){
  const {data:module,error:moduleError}=await admin.from("training_modules")
    .select("code,required,active").eq("code",moduleCode)
    .eq("required",true).eq("active",true).maybeSingle();
  if(moduleError||!module)throw new Error("invalid_module");
  const focus=DAY_FOCUS[moduleCode],productLine=["condolence","opening","bouquet","wedding_event","wholesale"].includes(focus);
  let query=admin.from("company_knowledge").select("code,updated_at,sort")
    .eq("section",productLine?"product_line":focus).eq("kind","card")
    .eq("active",true).eq("visible_to_agent",true)
    .eq("needs_owner_confirm",false);
  if(productLine)query=query.eq("product_line",focus);
  const {data:cards,error:cardsError}=await query.order("sort",{ascending:true});
  if(cardsError)throw new Error("handbook_not_ready");
  const required=(cards||[]).filter(x=>x.code).map(x=>({code:x.code,updated_at:x.updated_at}));
  // No approved cards is not a training dead-end: quiz is immediately available.
  if(!required.length)return {required:[],read:[],remaining:[],ready_for_quiz:true};
  const codes=required.map(x=>x.code);
  const {data:reads,error:readError}=await admin.from("training_module_reads")
    .select("card_code,read_at").eq("agent_id",agentId).eq("module_code",moduleCode)
    .in("card_code",codes);
  if(readError)throw readError;
  const published=new Map(required.map(x=>[x.code,Date.parse(x.updated_at||"")||0]));
  const readSet=new Set((reads||[]).filter(r=>r.read_at&&Date.parse(r.read_at)>=published.get(r.card_code)).map(r=>r.card_code));
  return {required:codes,read:codes.filter(x=>readSet.has(x)),remaining:codes.filter(x=>!readSet.has(x)),
    ready_for_quiz:codes.every(x=>readSet.has(x))};
}

function shuffle(list){
  const a=[...list];
  for(let i=a.length-1;i>0;i--){
    const b=new Uint32Array(1);crypto.getRandomValues(b);
    const j=b[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function questionForClient(q,item){
  return {
    position:item.position,question_en:q.question_en,question_zh:q.question_zh,
    options_en:item.option_order.map(n=>q.options_en[n]),
    options_zh:item.option_order.map(n=>q.options_zh[n])
  };
}

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


    if(action==="module_read"){
      const code=clean(body.module_code,40);
      if(!COURSE_CODES.includes(code))return reply({error:"invalid_module"},400);
      const phase=clean(body.phase||"status",20);
      if(!["status","start","complete"].includes(phase))return reply({error:"invalid_phase"},400);
      const cardCode=clean(body.card_code,80);
      const before=await requiredReadState(admin,agent.id,code);
      if(phase!=="status"){
        if(!before.required.includes(cardCode))return reply({error:"invalid_card_code"},400);
        const {data:allProgress,error:progressError}=await admin.from("training_progress")
          .select("status,training_modules(code)").eq("agent_id",agent.id);
        if(progressError)throw progressError;
        const progress=new Map((allProgress||[]).map(x=>[x.training_modules?.code,x.status]));
        const first=COURSE_CODES.find(x=>progress.get(x)!=="passed");
        if(code!==first&&progress.get(code)!=="passed")return reply({error:"previous_module_incomplete"},403);
        if(phase==="start"){
          const {data:existing,error:e}=await admin.from("training_module_reads")
            .select("card_code").eq("agent_id",agent.id).eq("module_code",code)
            .eq("card_code",cardCode).maybeSingle();
          if(e)throw e;
          if(!existing){
            const {error:insertError}=await admin.from("training_module_reads")
              .insert({agent_id:agent.id,module_code:code,card_code:cardCode});
            if(insertError&&!String(insertError.code||"").includes("23505"))throw insertError;
          }
        }else if(phase==="complete"){
          const {data:seen,error:e}=await admin.from("training_module_reads")
            .select("first_seen_at,read_at").eq("agent_id",agent.id).eq("module_code",code)
            .eq("card_code",cardCode).maybeSingle();
          if(e)throw e;
          if(!seen||Date.now()-Date.parse(seen.first_seen_at)<4000)
            return reply({error:"card_view_too_short"},409);
          const {error:updateError}=await admin.from("training_module_reads")
            .update({read_at:new Date().toISOString()}).eq("agent_id",agent.id)
            .eq("module_code",code).eq("card_code",cardCode);
          if(updateError)throw updateError;
        }
      }
      const latest=phase==="status"?before:await requiredReadState(admin,agent.id,code);
      return reply({ok:true,module_code:code,required_card_codes:latest.required,
        read_card_codes:latest.read,remaining_card_codes:latest.remaining,
        ready_for_quiz:latest.ready_for_quiz,no_approved_cards:latest.required.length===0});
    }

    if(action==="module_quiz_start"){
      const code=clean(body.module_code,40);
      if(!COURSE_CODES.includes(code))return reply({error:"invalid_module"},400);
      const {data:module,error:modError}=await admin.from("training_modules")
        .select("id,code,required,active,pass_score")
        .eq("code",code).eq("required",true).eq("active",true).maybeSingle();
      if(modError||!module)return reply({error:"invalid_module"},400);
      const {data:allProgress,error:progressError}=await admin.from("training_progress")
        .select("status,training_modules(code)")
        .eq("agent_id",agent.id);
      if(progressError)throw progressError;
      const progress=new Map((allProgress||[]).map(x=>[x.training_modules?.code,x.status]));
      if(progress.get(code)==="passed")return reply({ok:true,passed:true});
      const pending=COURSE_CODES.find(x=>progress.get(x)!=="passed");
      if(pending!==code)return reply({error:"previous_module_incomplete"},403);
      const reading=await requiredReadState(admin,agent.id,code);
      if(reading.remaining.length)
        return reply({error:"must_read_handbook_first",remaining_count:reading.remaining.length},403);

      let {data:attempt,error:attemptError}=await admin.from("training_module_quiz_attempts")
        .select("id,status,attempt_no,module_code,score,passed")
        .eq("agent_id",agent.id).eq("module_code",code).eq("status","active").maybeSingle();
      if(attemptError)throw attemptError;
      if(!attempt){
        // The bank remains private. CORE-BRAND uses tagged questions with one
        // of the existing six skill codes, never a new skill_code.
        const {data:pool,error:poolError}=await admin.rpc("agent_module_quiz_pool_internal",{
          p_agent_id:agent.id,p_module_code:code
        });
        if(poolError)throw poolError;
        const selected=shuffle(pool||[]).slice(0,5);
        if(selected.length<5)return reply({error:"module_question_bank_not_ready"},400);
        const {data:latest,error:latestError}=await admin.from("training_module_quiz_attempts")
          .select("attempt_no").eq("agent_id",agent.id).eq("module_code",code)
          .order("attempt_no",{ascending:false}).limit(1);
        if(latestError)throw latestError;
        const attemptNo=Number(latest?.[0]?.attempt_no||0)+1;
        const {data:newAttempt,error:createError}=await admin.from("training_module_quiz_attempts")
          .insert({agent_id:agent.id,module_code:code,attempt_no:attemptNo})
          .select("id,status,attempt_no,module_code,score,passed").single();
        if(createError)throw createError;
        attempt=newAttempt;
        const items=selected.map((q,i)=>({
          attempt_id:attempt.id,agent_id:agent.id,position:i+1,
          question_id:q.id,option_order:shuffle([0,1,2,3])
        }));
        const {error:itemsError}=await admin.from("training_module_quiz_items").insert(items);
        if(itemsError)throw itemsError;
      }
      const {data:items,error:itemsError}=await admin.from("training_module_quiz_items")
        .select("position,question_id,option_order,answered_at,is_correct")
        .eq("attempt_id",attempt.id).eq("agent_id",agent.id)
        .order("position",{ascending:true});
      if(itemsError)throw itemsError;
      const first=(items||[]).find(x=>!x.answered_at);
      if(!first)return reply({error:"quiz_needs_recovery"},409);
      const {data:q,error:qError}=await admin.rpc("agent_module_quiz_question_internal",{
        p_agent_id:agent.id,p_question_id:first.question_id
      });
      if(qError)throw qError;
      return reply({ok:true,quiz:{attempt_id:attempt.id,module_code:code,completed:false,question:questionForClient(q,first)}});
    }

    if(action==="module_quiz_answer"){
      const attemptId=uuid(body.attempt_id),position=int(body.position),selected=int(body.selected_index);
      if(!attemptId||position==null||position<1||position>5||selected==null||selected<0||selected>3)
        return reply({error:"invalid_answer"},400);
      const {data:attempt,error:attemptError}=await admin.from("training_module_quiz_attempts")
        .select("id,module_code,status,score,passed").eq("id",attemptId)
        .eq("agent_id",agent.id).maybeSingle();
      if(attemptError)throw attemptError;
      if(!attempt)return reply({error:"attempt_not_found"},404);
      if(attempt.status!=="active")return reply({error:"attempt_already_finished"},409);
      const {data:items,error:itemsError}=await admin.from("training_module_quiz_items")
        .select("id,position,question_id,option_order,answered_at,is_correct")
        .eq("agent_id",agent.id).eq("attempt_id",attemptId)
        .order("position",{ascending:true});
      if(itemsError)throw itemsError;
      const current=(items||[]).find(x=>!x.answered_at);
      if(!current||current.position!==position)return reply({error:"question_not_current"},409);
      const {data:q,error:qError}=await admin.rpc("agent_module_quiz_question_internal",{
        p_agent_id:agent.id,p_question_id:current.question_id
      });
      if(qError)throw qError;
      const correct=current.option_order[selected]===q.correct_index;
      const {data:updated,error:updateError}=await admin.from("training_module_quiz_items")
        .update({selected_index:selected,is_correct:correct,answered_at:new Date().toISOString()})
        .eq("id",current.id).eq("agent_id",agent.id).is("answered_at",null)
        .select("id").maybeSingle();
      if(updateError)throw updateError;
      if(!updated)return reply({error:"duplicate_answer"},409);
      const feedback={correct,explanation_en:q.explanation_en,explanation_zh:q.explanation_zh,related_card_code:q.related_card_code||null};
      if(position===5){
        const right=(items||[]).filter(x=>x.answered_at&&x.is_correct).length+(correct?1:0);
        const score=Math.round(right/5*100*100)/100;
        // The existing training_progress row and certification are updated by
        // the same server-owned RPC as the current MCQ certification flow.
        const {data:record,error:recordError}=await admin.rpc("record_training_result_internal",{
          p_agent_id:agent.id,p_module_code:attempt.module_code,p_score:score
        });
        if(recordError)throw recordError;
        const {error:finishError}=await admin.from("training_module_quiz_attempts")
          .update({status:"completed",score,passed:record?.passed===true,completed_at:new Date().toISOString()})
          .eq("id",attempt.id).eq("agent_id",agent.id).eq("status","active");
        if(finishError)throw finishError;
        return reply({ok:true,...feedback,quiz:{attempt_id:attempt.id,completed:true,score,passed:record?.passed===true}});
      }
      const next=(items||[]).find(x=>x.position===position+1);
      if(!next)return reply({error:"quiz_needs_recovery"},409);
      const {data:nextQ,error:nextError}=await admin.rpc("agent_module_quiz_question_internal",{
        p_agent_id:agent.id,p_question_id:next.question_id
      });
      if(nextError)throw nextError;
      return reply({ok:true,...feedback,quiz:{
        attempt_id:attempt.id,module_code:attempt.module_code,completed:false,
        question:questionForClient(nextQ,next)
      }});
    }
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
