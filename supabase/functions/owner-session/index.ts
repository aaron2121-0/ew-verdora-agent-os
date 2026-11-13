
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
  const ownerOnly=new Set(["create_agent_invite","create_owner_recovery_link","set_reference_baseline","update_setting","patch_setting","refresh_profit","add_opex","handbook_import","handbook_pending","handbook_review"]);
  if(ownerOnly.has(action)&&role!=="owner")return reply({error:"forbidden"},403);


  // Grok handbook imports are Owner-only and unpublished until explicit review.
  if(action==="handbook_import"){
    let parsed;
    try{parsed=validateHandbookContent(b.content)}
    catch(e){return reply({error:"handbook_validation_failed",detail:String(e?.message||"invalid_content").slice(0,160)},422)}
    const rows=parsed.entries.map(row=>({
      ...row,active:false,visible_to_agent:false,needs_owner_confirm:true,updated_by:uid
    }));
    const {data:created,error}=await admin.from("company_knowledge").insert(rows).select("id");
    if(error||!created||created.length!==rows.length)return reply({error:"handbook_import_failed"},400);
    const ids=created.map(row=>row.id);
    const {error:auditError}=await admin.rpc("owner_audit_action_internal",{
      p_user_id:uid,p_action:"handbook_import_pending",
      p_entity_type:"company_knowledge",p_entity_id:uid,
      p_after:{source:"grok",schema_version:parsed.schema_version,count:ids.length,ids}
    });
    if(auditError){
      await admin.from("company_knowledge").delete().in("id",ids)
        .eq("needs_owner_confirm",true).eq("visible_to_agent",false);
      return reply({error:"audit_failed"},500);
    }
    return reply({ok:true,imported:ids.length,pending_owner_review:true,ids});
  }
  if(action==="handbook_pending"){
    const {data,error}=await admin.from("company_knowledge")
      .select("id,section,title_en,title_zh,body_en,body_zh,sort,updated_at")
      .eq("needs_owner_confirm",true)
      .order("updated_at",{ascending:false}).limit(100);
    if(error)return reply({error:"handbook_list_failed"},400);
    return reply({ok:true,entries:data||[]});
  }
  if(action==="handbook_review"){
    const id=String(b.id||"");
    const decision=String(b.decision||"");
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||
       !["approve","reject"].includes(decision))
      return reply({error:"invalid_handbook_review"},400);
    const {data:before,error:readErr}=await admin.from("company_knowledge")
      .select("id,section,title_en,title_zh,active,visible_to_agent,needs_owner_confirm")
      .eq("id",id).eq("needs_owner_confirm",true).maybeSingle();
    if(readErr)return reply({error:"handbook_review_failed"},400);
    if(!before)return reply({error:"handbook_not_pending"},409);
    const approved=decision==="approve";
    const {data:changed,error:writeErr}=await admin.from("company_knowledge")
      .update({active:approved,visible_to_agent:approved,needs_owner_confirm:false,updated_by:uid,updated_at:new Date().toISOString()})
      .eq("id",id).eq("needs_owner_confirm",true).select("id").maybeSingle();
    if(writeErr)return reply({error:"handbook_review_failed"},400);
    if(!changed)return reply({error:"handbook_not_pending"},409);
    const {error:auditError}=await admin.rpc("owner_audit_action_internal",{
      p_user_id:uid,p_action:"handbook_"+decision,p_entity_type:"company_knowledge",p_entity_id:id,
      p_after:{id,section:before.section,title_en:before.title_en,title_zh:before.title_zh,approved}
    });
    if(auditError){
      await admin.from("company_knowledge").update({
        active:before.active,visible_to_agent:before.visible_to_agent,needs_owner_confirm:true,updated_by:uid
      }).eq("id",id).eq("needs_owner_confirm",false);
      return reply({error:"audit_failed"},500);
    }
    return reply({ok:true,id,decision,visible_to_agent:approved});
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
