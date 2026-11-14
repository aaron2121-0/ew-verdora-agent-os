
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateHandbookContent } from "../_shared/handbook-content-validate.mjs";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};
const reply=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});

async function sha256Hex(v:string){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function randomCode(){
  const b=new Uint8Array(32);crypto.getRandomValues(b);
  return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function publicError(error,fallback="operation_failed"){
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
  let b={};try{b=await req.json()}catch{}
  const action=String(b.action||"dashboard");
  // Every action is authenticated AND role-authorized before dispatch.
  const {data:role,error:roleError}=await admin.rpc("owner_role_internal",{p_user_id:uid});
  if(roleError || !["owner","admin"].includes(role))return reply({error:"forbidden"},403);
  const ownerOnly=new Set(["create_agent_invite","create_owner_recovery_link","set_reference_baseline","update_setting","patch_setting","refresh_profit","add_opex","handbook_import","handbook_pending","handbook_update","handbook_review","handbook_bulk_approve","launch_agent_progress","launch_orders","launch_create_order","launch_confirm_payment"]);
  if(ownerOnly.has(action)&&role!=="owner")return reply({error:"forbidden"},403);



  // All handbook mutations are Owner-only. SQL RPCs enforce Owner role again
  // and record the batch-scoped audit event atomically with each mutation.
  if(action==="handbook_import"){
    let parsed;
    try{parsed=validateHandbookContent(b.content)}
    catch(e){return reply({error:"handbook_validation_failed",detail:String(e?.message||"invalid_content").slice(0,180)},422)}
    const {data,error}=await admin.rpc("handbook_import_internal",{
      p_user_id:uid,p_source_version:parsed.source_version,p_entries:parsed.entries
    });
    if(error)return reply({error:publicError(error,"handbook_import_failed")},400);
    return reply({...data,counts:parsed.counts});
  }
  if(action==="handbook_pending"){
    const {data:entries,error}=await admin.from("company_knowledge")
      .select("id,code,kind,section,product_line,sort,title_en,title_zh,body_en,body_zh,key_points_en,key_points_zh,icon_hint,import_batch_id,updated_at")
      .eq("needs_owner_confirm",true).order("updated_at",{ascending:false}).limit(400);
    if(error)return reply({error:"handbook_list_failed"},400);
    const ids=[...new Set((entries||[]).map(row=>row.import_batch_id).filter(Boolean))];
    let batches=[];
    if(ids.length){
      const {data:found,error:batchError}=await admin.from("handbook_import_batches")
        .select("id,source_version,created_at,inserted_count,updated_count,unchanged_count,status")
        .in("id",ids);
      if(batchError)return reply({error:"handbook_list_failed"},400);
      batches=found||[];
    }
    return reply({ok:true,entries:entries||[],batches});
  }
  if(action==="handbook_update"){
    const id=String(b.id||"");
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!uuid.test(id))return reply({error:"invalid_handbook_id"},422);
    const {data,error}=await admin.rpc("handbook_update_internal",{
      p_user_id:uid,p_id:id,
      p_title_en:b.title_en,p_title_zh:b.title_zh,
      p_body_en:b.body_en,p_body_zh:b.body_zh
    });
    if(error)return reply({error:publicError(error,"handbook_update_failed")},400);
    return reply(data);
  }
  if(action==="handbook_review"){
    const id=String(b.id||""),decision=String(b.decision||"");
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!uuid.test(id)||!["approve","reject"].includes(decision))return reply({error:"invalid_handbook_review"},422);
    const {data,error}=await admin.rpc("handbook_review_item_internal",{
      p_user_id:uid,p_id:id,p_decision:decision
    });
    if(error)return reply({error:publicError(error,"handbook_review_failed")},400);
    return reply(data);
  }
  if(action==="handbook_bulk_approve"){
    const id=String(b.batch_id||"");
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
    if(!uuid.test(id))return reply({error:"invalid_handbook_batch"},422);
    if(b.confirm!==true)return reply({error:"confirmation_required"},400);
    const {data,error}=await admin.rpc("handbook_review_batch_internal",{
      p_user_id:uid,p_batch_id:id,p_confirm:true
    });
    if(error)return reply({error:publicError(error,"handbook_batch_review_failed")},400);
    return reply(data);
  }

  if(action==="create_owner_recovery_link"){
    const authCheck=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(authCheck.error)return reply({error:publicError(authCheck.error,"forbidden")},403);
    const code=randomCode();
    const codeHash=await sha256Hex(code);
    const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
    await admin.from("owner_auth_invites")
      .delete()
      .eq("user_id",uid)
      .is("used_at",null);
    const {error}=await admin.from("owner_auth_invites").insert({
      user_id:uid,code_hash:codeHash,expires_at:expiresAt,created_by:uid
    });
    if(error){
      console.error("OWNER_RECOVERY_CREATE_DB",error.code||"",error.details||"",error.hint||"");
      return reply({error:"owner_recovery_create_failed"},400);
    }
    const recoveryUrl="https://owner-mobile-production.up.railway.app/#owner_invite="+encodeURIComponent(code);
    const {error:auditError}=await admin.rpc("owner_audit_action_internal",{p_user_id:uid,p_action:"owner_recovery_created",p_entity_type:"owner_auth_invite",p_entity_id:uid,p_after:{expires_at:expiresAt}});
    if(auditError)return reply({error:"audit_failed"},500);
    return reply({ok:true,expires_at:expiresAt,recovery_url:recoveryUrl});
  }

  if(action==="create_agent_invite"){
    const authCheck=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(authCheck.error)return reply({error:publicError(authCheck.error,"forbidden")},403);
    const email=String(b.email||"").trim().toLowerCase();
    const at=email.indexOf("@"),dot=email.lastIndexOf(".");
    if(at<=0||dot<=at+1||dot>=email.length-1||email.includes(" "))return reply({error:"invalid_email"},400);
    const code=randomCode();
    const codeHash=await sha256Hex(code);
    const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
    await admin.from("agent_auth_invites")
      .delete()
      .eq("email",email)
      .is("used_at",null);
    const {error}=await admin.from("agent_auth_invites").insert({
      email,code_hash:codeHash,expires_at:expiresAt,created_by:uid
    });
    if(error){console.error("INVITE_CREATE_DB",error.code||"",error.details||"",error.hint||"");return reply({error:"invite_create_failed"},400);}
    const inviteUrl="https://agent-mobile-production.up.railway.app/#invite="+encodeURIComponent(code)+"&email="+encodeURIComponent(email);
    const {error:auditError}=await admin.rpc("owner_audit_action_internal",{p_user_id:uid,p_action:"agent_invite_created",p_entity_type:"agent_auth_invite",p_entity_id:email,p_after:{email,expires_at:expiresAt}});
    if(auditError)return reply({error:"audit_failed"},500);
    return reply({ok:true,email,expires_at:expiresAt,invite_url:inviteUrl});
  }
  if(action==="dashboard"){
    const {data,error}=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(error)return reply({error:publicError(error)},403);
    const {data:exceptions}=await admin.rpc("owner_list_exceptions_internal",{p_user_id:uid,p_limit:20});
    return reply({ok:true,role,dashboard:data,exceptions:exceptions||[]});
  }
  if(action==="exceptions"){
    const {data,error}=await admin.rpc("owner_list_exceptions_internal",{p_user_id:uid,p_limit:Number(b.limit||50)});
    if(error)return reply({error:publicError(error)},403);
    return reply({ok:true,exceptions:data||[]});
  }
  if(action==="decide_exception"){
    const {data,error}=await admin.rpc("owner_decide_exception_internal",{
      p_user_id:uid,p_exception_id:String(b.exception_id||""),p_decision:String(b.decision||"")
    });
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,exception:data});
  }
  if(action==="add_opex"){
    const amount=Number(b.amount);
    if(!Number.isFinite(amount))return reply({error:"invalid_amount"},400);
    const {data,error}=await admin.rpc("owner_add_opex_internal",{
      p_user_id:uid,p_date:String(b.date||new Date().toISOString().slice(0,10)),
      p_category:String(b.category||"Other").slice(0,100),p_amount:amount,p_note:b.note?String(b.note).slice(0,500):null
    });
    if(error)return reply({error:publicError(error)},400);
    await admin.rpc("refresh_profit_snapshot_internal",{});
    return reply({ok:true,opex_id:data});
  }
  if(action==="update_setting"||action==="patch_setting"){
    const path=String(b.path||"");
    const {data,error}=await admin.rpc("owner_patch_setting_internal",{
      p_user_id:uid,p_path:path,p_value:b.value
    });
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,setting:data});
  }
  if(action==="refresh_profit"){
    const authCheck=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(authCheck.error)return reply({error:publicError(authCheck.error,"forbidden")},403);
    const {data,error}=await admin.rpc("refresh_profit_snapshot_internal",{});
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,profit:data});
  }
  if(action==="quote_queue"){
    const {data:rows,error}=await admin.rpc("owner_quote_queue_internal",{
      p_user_id:uid,p_limit:Math.min(100,Math.max(1,Number(b.limit)||40))
    });
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
    const decision=String(b.decision||"approve");
    if(!["approve","request_info","reject"].includes(decision))
      return reply({error:"invalid_decision"},400);
    if(decision!=="approve" && Deno.env.get("OWNER_QUOTE_STATUS_ACTIONS_ENABLED")!=="true")
      return reply({error:"feature_not_enabled"},409);
    const {data,error}=await admin.rpc("owner_review_quote_internal",{
      p_user_id:uid,p_request_id:String(b.request_id||""),
      p_decision:decision,p_size:b.size||null,p_density:b.density||null,
      p_premium:b.premium||null,p_complexity:b.complexity||null,
      p_flexibility:String(b.flexibility||"moderate"),p_note:b.note?String(b.note).slice(0,500):null
    });
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,quote_request:data});
  }

  // Launch actions: pending independent Claude review before any production deployment.
  // User JWT + database role are verified before dispatch; these are Owner-only.
  if(action==="launch_agent_progress"){
    const {data:agents,error:ae}=await admin.from("agents")
      .select("id,agent_code,display_name,status,certified_at")
      .eq("is_demo",false).order("created_at",{ascending:false}).limit(200);
    if(ae)return reply({error:"agent_progress_unavailable"},400);
    const ids=(agents||[]).map(a=>a.id);
    if(!ids.length)return reply({ok:true,agents:[]});
    const [mr,pr,er]=await Promise.all([
      admin.from("training_modules").select("id,code").eq("required",true).eq("active",true),
      admin.from("training_progress").select("agent_id,module_id,status").in("agent_id",ids),
      admin.from("training_exam_attempts").select("agent_id,passed,score,status,finished_at").in("agent_id",ids).order("created_at",{ascending:false}).limit(500)
    ]);
    if(mr.error||pr.error||er.error)return reply({error:"agent_progress_unavailable"},400);
    const required=new Set((mr.data||[]).map(m=>m.id));
    const passed=new Map();
    for(const p of pr.data||[]){
      if(p.status==="passed"&&required.has(p.module_id))
        passed.set(p.agent_id,(passed.get(p.agent_id)||0)+1);
    }
    const exams=new Map();
    for(const e of er.data||[]){
      if(!exams.has(e.agent_id))exams.set(e.agent_id,e);
      if(e.passed)exams.set(e.agent_id,{...e,passed:true});
    }
    return reply({ok:true,required_count:required.size,agents:(agents||[]).map(a=>({
      agent_code:a.agent_code,display_name:a.display_name,status:a.status,
      passed_modules:passed.get(a.id)||0,exam_passed:exams.get(a.id)?.passed===true,
      exam_status:exams.get(a.id)?.status||"not_started",certified_at:a.certified_at||null
    }))});
  }
  if(action==="launch_orders"){
    const [qr,orr]=await Promise.all([
      admin.from("quotes").select("id,lead_id,agent_id,selling_price,status,valid_until,created_at")
        .in("status",["approved","sent","accepted"]).order("created_at",{ascending:false}).limit(100),
      admin.from("orders").select("id,order_code,quote_id,agent_id,status,commissionable_revenue,delivery_fee,payment_status,created_at")
        .order("created_at",{ascending:false}).limit(100)
    ]);
    if(qr.error||orr.error)return reply({error:"order_queue_unavailable"},400);
    const orders=orr.data||[],existing=new Set(orders.map(o=>o.quote_id));
    const available=(qr.data||[]).filter(q=>!existing.has(q.id) && (!q.valid_until||new Date(q.valid_until)>new Date()));
    const agentIds=[...new Set([...available.map(q=>q.agent_id),...orders.map(o=>o.agent_id)])];
    const leadIds=[...new Set(available.map(q=>q.lead_id))];
    const [ar,lr]=await Promise.all([
      agentIds.length?admin.from("agents").select("id,agent_code,display_name").in("id",agentIds):Promise.resolve({data:[],error:null}),
      leadIds.length?admin.from("leads").select("id,customer_label").in("id",leadIds):Promise.resolve({data:[],error:null})
    ]);
    if(ar.error||lr.error)return reply({error:"order_queue_unavailable"},400);
    const agentMap=new Map((ar.data||[]).map(v=>[v.id,v]));
    const leadMap=new Map((lr.data||[]).map(v=>[v.id,v]));
    return reply({ok:true,eligible_quotes:available.map(q=>({
      ...q,agent_name:agentMap.get(q.agent_id)?.display_name||agentMap.get(q.agent_id)?.agent_code||"Agent",
      customer_label:leadMap.get(q.lead_id)?.customer_label||"Customer"
    })),orders:orders.map(o=>({
      ...o,agent_name:agentMap.get(o.agent_id)?.display_name||agentMap.get(o.agent_id)?.agent_code||"Agent"
    }))});
  }
  if(action==="launch_create_order"){
    if(b.confirm!==true)return reply({error:"confirmation_required"},400);
    const quoteId=String(b.quote_id||"");
    const code=String(b.order_code||"").trim().toUpperCase();
    const fee=Number(b.delivery_fee);
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!uuid.test(quoteId)||!/^[A-Z0-9][A-Z0-9-]{2,59}$/.test(code)
       ||!Number.isFinite(fee)||fee<0||fee>10000||Math.round(fee*100)!==fee*100)
      return reply({error:"invalid_order_input"},422);
    // Flower selling price is read from the approved quote in the protected RPC.
    // Delivery fee is the separate explicit Owner-entered customer charge.
    const {data:order,error}=await admin.rpc("create_order_from_quote_internal",{
      p_quote_id:quoteId,p_order_code:code,p_delivery_fee:fee
    });
    if(error)return reply({error:publicError(error,"order_creation_failed")},400);
    const {error:audit}=await admin.rpc("owner_audit_action_internal",{
      p_user_id:uid,p_action:"owner_order_created",p_entity_type:"order",p_entity_id:order.id,
      p_after:{order_code:order.order_code,quote_id:order.quote_id,delivery_fee:order.delivery_fee}
    });
    if(audit)return reply({error:"order_created_audit_failed",order_id:order.id},500);
    return reply({ok:true,order:{id:order.id,order_code:order.order_code,status:order.status,
      payment_status:order.payment_status,commissionable_revenue:order.commissionable_revenue,
      delivery_fee:order.delivery_fee}});
  }
  if(action==="launch_confirm_payment"){
    if(b.confirm!==true||b.bank_evidence_checked!==true)
      return reply({error:"confirmation_required"},400);
    const id=String(b.order_id||"");
    const reference=String(b.bank_reference||"").trim().toUpperCase();
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!uuid.test(id)||!/^[A-Z0-9][A-Z0-9_/-]{4,79}$/.test(reference))
      return reply({error:"invalid_payment_reference"},422);
    const {data:order,error:oe}=await admin.from("orders").select("id,status,payment_status,commissionable_revenue,delivery_fee")
      .eq("id",id).maybeSingle();
    if(oe||!order)return reply({error:"order_not_found"},404);
    if(order.payment_status!=="pending"||order.status!=="confirmed")
      return reply({error:"order_not_awaiting_payment"},409);
    // NEVER accept amount from the browser; match exact database amount.
    const due=Number(order.commissionable_revenue)+Number(order.delivery_fee);
    if(!Number.isFinite(due)||due<=0)return reply({error:"invalid_order_total"},400);
    const amount=Math.round(due*100)/100;
    if(Math.abs(amount-due)>0.001)return reply({error:"invalid_order_total"},400);
    const {data:result,error}=await admin.rpc("record_payment_event_internal",{
      p_provider:"manual_owner",p_event_id:id+":"+reference,p_order_id:id,
      p_event_type:"payment_succeeded",p_amount:amount,
      p_payload:{confirmed_by:uid,confirmation_type:"owner_bank_evidence_checked"}
    });
    if(error)return reply({error:publicError(error,"payment_record_failed")},400);
    const {error:audit}=await admin.rpc("owner_audit_action_internal",{
      p_user_id:uid,p_action:"owner_payment_confirmed",p_entity_type:"order",p_entity_id:id,
      p_after:{total:amount,reference_suffix:reference.slice(-4),payment_status:"paid"}
    });
    if(audit)return reply({error:"payment_recorded_audit_failed",order_id:id},500);
    return reply({ok:true,order_id:id,payment_status:"paid",duplicate:result?.duplicate===true});
  }

  if(action==="set_reference_baseline"){
    if(b.confirm_global!==true)return reply({error:"confirmation_required"},400);
    const {data,error}=await admin.rpc("owner_set_reference_baseline_internal",{
      p_user_id:uid,
      p_size:String(b.size||""),
      p_density:String(b.density||""),
      p_premium:String(b.premium||""),
      p_complexity:String(b.complexity||""),
      p_safe_cost:Number(b.safe_cost),
      p_note:b.note?String(b.note).slice(0,500):null
    });
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,baseline:data});
  }
  return reply({error:"unknown_action"},400);
});
