import { createClient } from "npm:@supabase/supabase-js@2";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};
const reply=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});
function publicError(error:any,fallback="operation_failed"){
  const m=String(error?.message||"").toLowerCase();
  if(m.includes("forbidden")) return "forbidden";
  if(m.includes("owner required")) return "owner_required";
  if(m.includes("not found")) return "not_found";
  if(m.includes("invalid amount")) return "invalid_amount";
  if(m.includes("invalid decision")) return "invalid_decision";
  if(m.includes("setting not editable")) return "setting_not_editable";
  if(m.includes("invalid value")) return "invalid_value";
  if(m.includes("invalid")) return "invalid_request";
  return fallback;
}
const url=Deno.env.get("SUPABASE_URL")||"";
const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")||"";
const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return reply({error:"authentication_required"},401);
  const userClient=createClient(url,pub,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:ue}=await userClient.auth.getUser(auth.slice(7));
  if(ue||!u.user)return reply({error:"invalid_session"},401);
  const uid=u.user.id;
  let b:any={};try{b=await req.json()}catch{}
  const action=b.action||"dashboard";

  if(action==="dashboard"){
    const {data,error}=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(error)return reply({error:publicError(error)},403);
    const {data:exceptions}=await admin.rpc("owner_list_exceptions_internal",{p_user_id:uid,p_limit:20});
    return reply({ok:true,dashboard:data,exceptions:exceptions||[]});
  }
  if(action==="exceptions"){
    const {data,error}=await admin.rpc("owner_list_exceptions_internal",{p_user_id:uid,p_limit:Number(b.limit||50)});
    if(error)return reply({error:publicError(error)},403);
    return reply({ok:true,exceptions:data||[]});
  }
  if(action==="decide_exception"){
    const {data,error}=await admin.rpc("owner_decide_exception_internal",{p_user_id:uid,p_exception_id:String(b.exception_id||""),p_decision:String(b.decision||"")});
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,exception:data});
  }
  if(action==="add_opex"){
    const amount=Number(b.amount);
    if(!Number.isFinite(amount))return reply({error:"invalid_amount"},400);
    const {data,error}=await admin.rpc("owner_add_opex_internal",{p_user_id:uid,p_date:String(b.date||new Date().toISOString().slice(0,10)),p_category:String(b.category||"Other").slice(0,100),p_amount:amount,p_note:b.note?String(b.note).slice(0,500):null});
    if(error)return reply({error:publicError(error)},400);
    await admin.rpc("refresh_profit_snapshot_internal",{});
    return reply({ok:true,opex_id:data});
  }
  if(action==="update_setting"){
    const {data,error}=await admin.rpc("owner_update_setting_internal",{p_user_id:uid,p_key:String(b.key||""),p_value:b.value||{}});
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,value:data});
  }
  if(action==="refresh_profit"){
    const authCheck=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(authCheck.error)return reply({error:publicError(authCheck.error,"forbidden")},403);
    const {data,error}=await admin.rpc("refresh_profit_snapshot_internal",{});
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,profit:data});
  }
  if(action==="quote_queue"){
    const authCheck=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(authCheck.error)return reply({error:publicError(authCheck.error,"forbidden")},403);
    const {data:rows,error}=await admin.from("quote_requests").select("id,agent_id,lead_id,reference_object_path,customer_budget,design_commitment,needed_at,status,classification,created_at").in("status",["manual_review","analysis_pending"]).order("created_at",{ascending:true}).limit(30);
    if(error)return reply({error:publicError(error)},400);
    const queue=[];
    for(const row of rows||[]){
      let image_url=null;
      if(row.reference_object_path){
        const signed=await admin.storage.from("agent-references").createSignedUrl(row.reference_object_path,600);
        image_url=signed.data?.signedUrl||null;
      }
      queue.push({...row,image_url});
    }
    return reply({ok:true,queue});
  }
  if(action==="review_quote"){
    const size=String(b.size||""); const density=String(b.density||"");
    const premium=String(b.premium||""); const complexity=String(b.complexity||"");
    const safeCost=Number(b.safe_cost);
    if(!Number.isFinite(safeCost)||safeCost<0)return reply({error:"invalid_safe_cost"},400);
    const baseline=await admin.rpc("owner_set_reference_baseline_internal",{p_user_id:uid,p_size:size,p_density:density,p_premium:premium,p_complexity:complexity,p_safe_cost:safeCost,p_note:b.note?String(b.note).slice(0,500):"manual quote review"});
    if(baseline.error)return reply({error:publicError(baseline.error)},403);
    const finalized=await admin.rpc("finalize_quote_request_internal",{p_request_id:String(b.request_id||""),p_size:size,p_density:density,p_premium:premium,p_complexity:complexity,p_flexibility:String(b.flexibility||"moderate"),p_features:{manual_review:true},p_provider:"owner_manual",p_model:"none",p_raw:{manual_review:true,safe_cost:safeCost}});
    if(finalized.error)return reply({error:publicError(finalized.error)},400);
    const row=finalized.data;
    return reply({ok:true,quote_request:{id:row.id,status:row.status,classification:row.classification,budget_version_price:row.budget_version_price,budget_version_commitment:row.budget_version_commitment,recommended_price:row.recommended_price,customer_note_en:row.customer_note_en,customer_note_zh:row.customer_note_zh}});
  }
  if(action==="set_reference_baseline"){
    const {data,error}=await admin.rpc("owner_set_reference_baseline_internal",{p_user_id:uid,p_size:String(b.size||""),p_density:String(b.density||""),p_premium:String(b.premium||""),p_complexity:String(b.complexity||""),p_safe_cost:Number(b.safe_cost),p_note:b.note?String(b.note).slice(0,500):null});
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,baseline:data});
  }
  return reply({error:"unknown_action"},400);
});
