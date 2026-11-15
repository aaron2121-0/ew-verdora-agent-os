
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateHandbookContent } from "../_shared/handbook-content-validate.mjs";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store",
  "Referrer-Policy":"no-referrer"
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
  if(m.includes("order_profit_floor_failed")) return "order_profit_floor_failed";
  if(m.includes("invalid profit floor")) return "invalid_profit_floor";
  if(m.includes("invalid value")) return "invalid_value";
  if(m.includes("invalid")) return "invalid_request";
  return fallback;
}
// KYC errors are an allowlist; never log or echo database details or identity data.
function kycError(e){
 const m=String(e?.message||"");
 return new Set(["forbidden","kyc_profile_missing","kyc_not_submitted",
   "kyc_invalid_status","kyc_invalid_decision","kyc_reject_reason_required",
   "kyc_configuration_missing","kyc_delete_request_required","kyc_reject_reason_invalid"]).has(m)?m:"kyc_operation_failed";
}
const kycUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  const ownerOnly=new Set(["create_agent_invite","create_owner_recovery_link","set_reference_baseline","update_setting","patch_setting","refresh_profit","add_opex","handbook_import","handbook_pending","handbook_update","handbook_review","handbook_bulk_approve","launch_agent_progress","launch_orders","launch_create_order","launch_confirm_payment","launch_complete_order","commission_payable_list","commission_mark_paid","kyc_list","kyc_view","kyc_review","kyc_delete","portfolio_upload_url","portfolio_list","portfolio_review","owner_daily_brief","owner_agent_reminder","set_profit_floor"]);
  if(ownerOnly.has(action)&&role!=="owner")return reply({error:"forbidden"},403);



  // [D1] Owner-only bank payout confirmation. Never infer a transfer from the button click.
  if(action==="commission_payable_list"){
    const {data:commissions,error:ce}=await admin.from("commissions")
      .select("id,agent_id,order_id,amount,status,payable_at")
      .eq("status","payable").order("payable_at",{ascending:true}).limit(500);
    if(ce)return reply({error:"commission_list_unavailable"},500);
    const rows=commissions||[];
    const agentIds=[...new Set(rows.map(c=>c.agent_id))];
    const orderIds=[...new Set(rows.map(c=>c.order_id).filter(Boolean))];
    const [ar,orr]=await Promise.all([
      agentIds.length?admin.from("agents").select("id,display_name,agent_code").in("id",agentIds):Promise.resolve({data:[],error:null}),
      orderIds.length?admin.from("orders").select("id,order_code").in("id",orderIds):Promise.resolve({data:[],error:null})
    ]);
    if(ar.error||orr.error)return reply({error:"commission_list_unavailable"},500);
    const names=new Map((ar.data||[]).map(a=>[a.id,a]));
    const codes=new Map((orr.data||[]).map(o=>[o.id,o.order_code]));
    return reply({ok:true,commissions:rows.map(c=>({
      ...c,agent_name:names.get(c.agent_id)?.display_name||names.get(c.agent_id)?.agent_code||"Agent",
      agent_code:names.get(c.agent_id)?.agent_code||"",order_code:codes.get(c.order_id)||"—"
    }))});
  }
  if(action==="commission_mark_paid"){
    if(b.confirm!==true||b.transfer_checked!==true)
      return reply({error:"confirmation_required"},422);
    const ids=b.commission_ids;
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!Array.isArray(ids)||ids.length<1||ids.length>100
       ||ids.some(x=>typeof x!=="string"||!uuid.test(x))
       ||new Set(ids).size!==ids.length)return reply({error:"invalid_commission_selection"},422);
    const reference=String(b.payment_reference||"").trim().toUpperCase();
    if(!/^[A-Z0-9][A-Z0-9_/-]{4,79}$/.test(reference))
      return reply({error:"invalid_payment_reference"},422);
    // One atomic RPC locks every selected commission, pays only 'payable', and audits.
    const {data:result,error}=await admin.rpc("owner_mark_commissions_paid_internal",{
      p_user_id:uid,p_commission_ids:ids,p_payment_reference:reference
    });
    if(error){
      const known=["commission_not_payable","commissions_not_found","mixed_agent_selection",
        "invalid_commission_selection","invalid_payment_reference","forbidden"];
      const code=known.find(x=>String(error.message||"").includes(x))||"commission_payout_failed";
      return reply({error:code},code==="forbidden"?403:409);
    }
    return reply(result||{ok:true});
  }

  // [D2] Private image library; only the authenticated Owner can upload and review.
  if(action==="portfolio_upload_url"){
    const mime=String(b.mime_type||"").toLowerCase();
    const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    if(!types[mime]||!Number.isInteger(b.file_size)||b.file_size<1||b.file_size>5242880)
      return reply({error:"invalid_portfolio_file"},422);
    const path=uid+"/"+crypto.randomUUID()+"."+types[mime];
    const {data:upload,error:ue}=await admin.storage.from("portfolio").createSignedUploadUrl(path);
    if(ue||!upload?.token)return reply({error:"portfolio_upload_unavailable"},500);
    const {data:photo,error:pe}=await admin.from("portfolio_photos")
      .insert({source:"upload",source_id:path,storage_path:path,product_line:"unknown",
        caption_en:"",caption_zh:"",status:"pending_review"})
      .select("id").single();
    if(pe)return reply({error:"portfolio_record_unavailable"},500);
    return reply({ok:true,id:photo.id,path,upload_token:upload.token,bucket:"portfolio"});
  }
  if(action==="portfolio_list"){
    const {data:rows,error}=await admin.from("portfolio_photos")
      .select("id,source,product_line,storage_path,caption_en,caption_zh,ai_confidence,status,sort,created_at,approved_at")
      .order("created_at",{ascending:false}).limit(120);
    if(error)return reply({error:"portfolio_list_unavailable"},500);
    const images=await Promise.all((rows||[]).map(async row=>{
      const {data:link,error:le}=await admin.storage.from("portfolio")
        .createSignedUrl(row.storage_path,3600);
      return {...row,image_url:le?null:link?.signedUrl||null};
    }));
    return reply({ok:true,photos:images});
  }
  if(action==="portfolio_review"){
    const id=String(b.id||"");
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const decision=String(b.decision||"");
    if(!uuid.test(id)||!["analyse","approve","reject","edit"].includes(decision))
      return reply({error:"invalid_portfolio_review"},422);
    const {data:photo,error:pe}=await admin.from("portfolio_photos")
      .select("id,source,storage_path,status,caption_en,caption_zh,product_line").eq("id",id).maybeSingle();
    if(pe||!photo)return reply({error:"portfolio_not_found"},404);
    if(photo.source!=="upload"||!photo.storage_path.startsWith(uid+"/"))
      return reply({error:"portfolio_not_owned"},403);
    if(decision==="analyse"){
      if(photo.status!=="pending_review")return reply({error:"portfolio_already_reviewed"},409);
      const {data:file,error:fe}=await admin.storage.from("portfolio").download(photo.storage_path);
      if(fe||!file)return reply({error:"portfolio_file_missing"},404);
      if(file.size<1||file.size>5242880)return reply({error:"invalid_portfolio_file"},422);
      const ext=photo.storage_path.split(".").pop()?.toLowerCase();
      const mime=ext==="jpg"?"image/jpeg":ext==="png"?"image/png":ext==="webp"?"image/webp":"";
      const bytes=new Uint8Array(await file.arrayBuffer());
      const valid=(ext==="jpg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)
        ||(ext==="png"&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)
        ||(ext==="webp"&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"
           &&String.fromCharCode(...bytes.slice(8,12))==="WEBP");
      if(!valid||!mime)return reply({error:"invalid_portfolio_file"},422);
      const key=Deno.env.get("GEMINI_API_KEY")||"";
      const model=(Deno.env.get("GEMINI_MODEL")||"gemini-flash-latest").replace(/[^a-zA-Z0-9.\-]/g,"");
      let caption=null;
      if(key){
        const {error:limitError}=await admin.rpc("owner_reserve_portfolio_caption_internal",{p_user_id:uid});
        if(limitError)return reply({error:String(limitError.message||"").includes("daily_limit")
          ?"portfolio_caption_daily_limit":"portfolio_ai_unavailable"},429);
        let encoded="";
        for(let i=0;i<bytes.length;i+=32768)encoded+=String.fromCharCode(...bytes.subarray(i,i+32768));
        const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),10000);
        try{
          const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
            method:"POST",signal:ctl.signal,
            headers:{"Content-Type":"application/json","x-goog-api-key":key},
            body:JSON.stringify({
              systemInstruction:{parts:[{text:"You write factual captions for EW VERDORA photographs. Never invent flower type, price, availability, customer details, exact replicas, discounts, testimonials, suppliers or business guarantees. Do not include prices, contact details, or identifying people. Return ONLY a JSON object: product_line (condolence, opening, bouquet, wedding_event, wholesale, unknown), caption_zh (natural Malaysian Chinese, <=130 characters), caption_en (natural English, <=240 characters), confidence (0..1). Base all claims only on visible image details. If uncertain use unknown."}]},
              contents:[{role:"user",parts:[{text:"Describe this real floral work for an Owner approval queue, with safe Chinese and English captions."},{inline_data:{mime_type:mime,data:btoa(encoded)}}]}],
              generationConfig:{responseMimeType:"application/json",temperature:0.3,maxOutputTokens:400}
            })
          });
          if(response.ok){
            const result=await response.json();
            const raw=(result?.candidates?.[0]?.content?.parts||[]).map(x=>x.text||"").join("");
            const parsed=JSON.parse(raw);
            const lines=new Set(["condolence","opening","bouquet","wedding_event","wholesale","unknown"]);
            const en=String(parsed.caption_en||"").slice(0,240),zh=String(parsed.caption_zh||"").slice(0,130);
            const policyRisk=/\bRM\s*\d|\b(price|discount|cost|supplier|guaranteed|identical)\b|价钱|价格|折扣|成本|一模一样|一定有货|\b\+?60\d{8,11}\b|@/i;
            if(lines.has(parsed.product_line)&&en.length>8&&zh.length>5
               &&!policyRisk.test(en+" "+zh)){
              caption={product_line:parsed.product_line,caption_en:en,caption_zh:zh,
                ai_confidence:Math.min(1,Math.max(0,Number(parsed.confidence)||0))};
            }
          }
        }catch(e){console.error("portfolio_caption_unavailable",String(e).slice(0,80))}
        finally{clearTimeout(timer)}
      }
      if(!caption)caption={product_line:"unknown",
        caption_zh:"EW VERDORA 真实花艺作品，具体款式和可订情况请先确认。",
        caption_en:"An EW VERDORA floral design reference. Please confirm current options before ordering.",
        ai_confidence:null};
      const {error:saveErr}=await admin.from("portfolio_photos").update(caption)
        .eq("id",id).eq("status","pending_review");
      if(saveErr)return reply({error:"portfolio_save_failed"},500);
      return reply({ok:true,photo:{id,...caption,status:"pending_review"},
        provider:key&&caption.ai_confidence!==null?"gemini":"template"});
    }
    const lines=new Set(["condolence","opening","bouquet","wedding_event","wholesale","unknown"]);
    if(decision==="edit"||decision==="approve"){
      const updates={};
      if(b.caption_en!==undefined)updates.caption_en=String(b.caption_en||"").trim().slice(0,240);
      if(b.caption_zh!==undefined)updates.caption_zh=String(b.caption_zh||"").trim().slice(0,130);
      if(b.product_line!==undefined){
        if(!lines.has(b.product_line))return reply({error:"invalid_product_line"},422);
        updates.product_line=b.product_line;
      }
      const en=updates.caption_en??photo.caption_en,zh=updates.caption_zh??photo.caption_zh;
      if(!en||!zh||/\bRM\s*\d|\b(price|discount|cost)\b|价钱|价格|折扣/i.test(en+" "+zh))
        return reply({error:"portfolio_caption_requires_review"},422);
      if(decision==="edit")updates.status="pending_review";
      else{updates.status="approved";updates.approved_by=uid;updates.approved_at=new Date().toISOString()}
      const {data:saved,error:se}=await admin.from("portfolio_photos")
        .update(updates).eq("id",id).select("id,status,caption_en,caption_zh,product_line").single();
      if(se)return reply({error:"portfolio_save_failed"},500);
      return reply({ok:true,photo:saved});
    }
    const {error:re}=await admin.from("portfolio_photos").update({status:"hidden",approved_by:null,approved_at:null})
      .eq("id",id);
    if(re)return reply({error:"portfolio_save_failed"},500);
    return reply({ok:true,photo:{id,status:"hidden"}});
  }

  // [D4] Cached daily Owner summary: personal customer details never sent to Gemini.
  if(action==="owner_daily_brief"){
    const {data:claim,error:claimError}=await admin.rpc("owner_daily_brief_claim_internal",{p_user_id:uid});
    if(claimError)return reply({error:"daily_brief_unavailable"},503);
    if(claim?.claimed!==true){
      if(claim?.status==="ready"&&claim?.payload)return reply({...claim.payload,cached:true});
      return reply({ok:true,pending:true,message_zh:"今天的情况正在整理，请按刷新。",message_en:"Today's summary is being prepared. Tap refresh."});
    }
    const money=v=>"RM "+(Math.round(Number(v||0)*100)/100).toFixed(2);
    const n=v=>Number.isFinite(Number(v))?Number(v):0;
    try{
      const [dashboard,ar,modules,progress,commissions,exceptions,quotes]=await Promise.all([
        admin.rpc("owner_dashboard_internal",{p_user_id:uid}),
        admin.from("agents").select("id,status").eq("is_demo",false).limit(500),
        admin.from("training_modules").select("id").eq("required",true).eq("active",true).limit(100),
        admin.from("training_progress").select("agent_id,module_id,status").limit(5000),
        admin.from("commissions").select("amount").eq("status","payable").limit(1000),
        admin.rpc("owner_list_exceptions_internal",{p_user_id:uid,p_limit:100}),
        admin.from("quote_requests").select("id",{count:"exact",head:true}).eq("status","manual_review")
      ]);
      if(dashboard.error||ar.error||modules.error||progress.error||commissions.error||
         exceptions.error||quotes.error)throw Error("brief_data_unavailable");
      const d=dashboard.data||{};
      const activeIds=new Set((ar.data||[]).map(x=>x.id));
      const requiredIds=new Set((modules.data||[]).map(x=>x.id));
      const allProgress=(progress.data||[]).filter(p=>activeIds.has(p.agent_id)&&requiredIds.has(p.module_id));
      const passed=allProgress.filter(p=>p.status==="passed");
      const passedIds=new Set(passed.map(x=>x.agent_id+"-"+x.module_id));
      const startedIds=new Set(allProgress.filter(p=>["in_progress","passed","failed"].includes(p.status)).map(x=>x.agent_id));
      const agents=ar.data||[];
      const pending=commissions.data||[];
      const snapshot={
        orders:n(d.orders_today),
        revenue:Math.max(0,n(d.revenue_today)),
        payable_count:pending.length,
        payable_amount:pending.reduce((sum,c)=>sum+Math.max(0,n(c.amount)),0),
        agent_count:agents.length,
        agents_not_started:agents.filter(a=>!startedIds.has(a.id)).length,
        modules_passed:passedIds.size,
        modules_required:requiredIds.size*agents.length,
        issues:(exceptions.data||[]).length,
        quotes:n(quotes.count)
      };
      const adviceFallback=snapshot.issues>0||snapshot.quotes>0
       ?{zh:"建议先处理待确认的报价和需要你决定的问题。",en:"Start with quotes and issues that need your decision."}
       :snapshot.agents_not_started>0
       ?{zh:"建议先提醒还没上课的代理完成第一课。",en:"Start by encouraging agents who have not begun their first lesson."}
       :snapshot.payable_count>0
       ?{zh:"建议先核对待付佣金与实际银行转账记录。",en:"Start by checking payable commissions against actual bank transfers."}
       :{zh:"建议先检查今天的询问与代理跟进进度。",en:"Start by checking today's enquiries and Agent follow-ups."};
      let advice=adviceFallback,provider="template";
      const key=Deno.env.get("GEMINI_API_KEY")||"";
      const model=(Deno.env.get("GEMINI_MODEL")||"gemini-flash-latest").replace(/[^a-zA-Z0-9.\-]/g,"");
      if(key){
        const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
        try{
          const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
            method:"POST",signal:ctl.signal,
            headers:{"Content-Type":"application/json","x-goog-api-key":key},
            body:JSON.stringify({
              systemInstruction:{parts:[{text:"You assist an EW VERDORA flower-sales Owner. Input is only aggregate numbers, not personal customer data. Return JSON with exactly two short fields zh (natural Malaysian Chinese), en (natural English). Suggest one practical action based on the metrics. Do not mention ANY numbers, prices, names, contact details, promises, employee identity, commission rates, suppliers, or personal data. No invented facts. Be friendly and direct."}]},
              contents:[{role:"user",parts:[{text:JSON.stringify(snapshot)}]}],
              generationConfig:{responseMimeType:"application/json",temperature:0.2,maxOutputTokens:150}
            })
          });
          if(response.ok){
            const raw=(await response.json())?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
            const suggestion=JSON.parse(raw);
            const zh=String(suggestion.zh||"").trim(),en=String(suggestion.en||"").trim();
            if(zh.length>=10&&zh.length<=120&&en.length>=12&&en.length<=180
               &&!/[0-9０-９]|RM|@|\\+60|佣金比例|内部成本|supplier|margin|price/i.test(zh+" "+en)){
              advice={zh,en};provider="gemini";
            }
          }
        }catch{ /* No AI response: keep safe fallback. */ }
        finally{clearTimeout(timer)}
      }
      // Numbers are rendered deterministically from real database values, never AI prose.
      const summary_zh=[
        "今天有 "+snapshot.orders+" 单，营业额 "+money(snapshot.revenue)+"。",
        "目前 "+snapshot.payable_count+" 笔佣金可付，总计 "+money(snapshot.payable_amount)+"。",
        "代理上课已通过 "+snapshot.modules_passed+"/"+snapshot.modules_required+" 个必修课次；"+snapshot.agents_not_started+" 人还没开始。",
        "有 "+snapshot.issues+" 个需要处理的问题，"+snapshot.quotes+" 笔报价等你审核。",
        advice.zh
      ];
      const summary_en=[
        "Today: "+snapshot.orders+" orders, "+money(snapshot.revenue)+" in revenue.",
        snapshot.payable_count+" payable commission entries total "+money(snapshot.payable_amount)+".",
        snapshot.modules_passed+"/"+snapshot.modules_required+" required course completions; "+snapshot.agents_not_started+" agents have not started.",
        snapshot.issues+" outstanding issues and "+snapshot.quotes+" quotes await review.",
        advice.en
      ];
      const payload={ok:true,date:claim.date,summary_zh,summary_en,
        snapshot,provider};
      const {data:saved,error:saveErr}=await admin.rpc("owner_daily_brief_finish_internal",{
        p_user_id:uid,p_claim_token:claim.claim_token,p_payload:payload
      });
      if(saveErr||saved!==true)return reply({error:"daily_brief_cache_failed"},503);
      return reply({...payload,cached:false});
    }catch{
      return reply({error:"daily_brief_data_unavailable"},503);
    }
  }

  // [D5] Only Owner prepares a training reminder. Never send messages automatically.
  if(action==="owner_agent_reminder"){
    const id=String(b.agent_id||"");
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!uuid.test(id))return reply({error:"invalid_agent_id"},422);
    const [a,m,pr]=await Promise.all([
      admin.from("agents").select("id,display_name,status").eq("id",id).eq("is_demo",false).maybeSingle(),
      admin.from("training_modules").select("id").eq("required",true).eq("active",true),
      admin.from("training_progress").select("module_id,status").eq("agent_id",id)
    ]);
    if(a.error||m.error||pr.error)return reply({error:"training_reminder_unavailable"},500);
    if(!a.data)return reply({error:"agent_not_found"},404);
    const required=new Set((m.data||[]).map(x=>x.id));
    const passed=new Set((pr.data||[]).filter(x=>x.status==="passed"&&required.has(x.module_id)).map(x=>x.module_id));
    const total=required.size,done=passed.size,remaining=Math.max(0,total-done);
    if(!total)return reply({error:"training_not_ready"},409);
    const started=(pr.data||[]).some(x=>["in_progress","passed","failed"].includes(x.status));
    const fallback={zh:remaining
      ?"今天有空的话，先打开 EW VERDORA Agent 的「学习」完成一课就好 😊"
      :"你的必修课都完成了，下一步可以看看认证考试和帐号资格 😊",
      en:remaining
      ?"When you have a moment today, open Learning in EW VERDORA Agent and try one lesson 😊"
      :"Your required lessons are complete! You can check the certification exam and account eligibility next 😊"};
    let advice=fallback,provider="template";
    const key=Deno.env.get("GEMINI_API_KEY")||"";
    const model=(Deno.env.get("GEMINI_MODEL")||"gemini-flash-latest").replace(/[^a-zA-Z0-9.\-]/g,"");
    if(key){
      const {data:permitted,error:limitError}=await admin.rpc("owner_reserve_agent_reminder_internal",{p_user_id:uid});
      if(!limitError&&permitted===true){
        const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
        try{
          const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
            method:"POST",signal:ctl.signal,
            headers:{"Content-Type":"application/json","x-goog-api-key":key},
            body:JSON.stringify({
              systemInstruction:{parts:[{text:"Write a single genuinely friendly WhatsApp sentence from Owner to an EW VERDORA Agent. No pressure or blame. Return JSON with keys zh (natural Malaysia Chinese) and en (plain English). Do not write quantities, prices, names, phone numbers, IC, personal details, commissions, exam guarantees, or guarantees of order access. Simply suggest starting or continuing one lesson in the app, or checking the certification process if lessons are complete. No extra text."}]},
              contents:[{role:"user",parts:[{text:JSON.stringify({started,remaining,total,restricted:a.data.status==="restricted"})}]}],
              generationConfig:{responseMimeType:"application/json",temperature:0.45,maxOutputTokens:170}
            })
          });
          if(response.ok){
            const raw=(await response.json())?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
            const parsed=JSON.parse(raw);
            const zh=String(parsed.zh||"").trim(),en=String(parsed.en||"").trim();
            if(zh.length>=10&&zh.length<=110&&en.length>=14&&en.length<=170
              &&!/[0-9０-９]|RM|@|\\+60|一模一样|保证接单|guaranteed|price|cost|supplier|commission/i.test(zh+" "+en)){
              advice={zh,en};provider="gemini";
            }
          }
        }catch{ /* Friendly human-readable fallback remains available. */ }
        finally{clearTimeout(timer)}
      }
    }
    const introZh=remaining
      ?(started?"嗨，你已经完成 "+done+"/"+total+" 课，还剩 "+remaining+" 课。":"嗨，必修课共 "+total+" 课，你还没开始。")
      :"嗨，你已经完成全部 "+total+" 课。";
    const introEn=remaining
      ?(started?"Hi, you have finished "+done+"/"+total+" lessons, with "+remaining+" to go.":"Hi, you have "+total+" required lessons and have not started yet.")
      :"Hi, you have completed all "+total+" required lessons.";
    const restrictionZh=a.data.status==="restricted"?"账号状态还需要 Owner 另外处理。":"";
    const restrictionEn=a.data.status==="restricted"?"Your account access needs a separate Owner review.":"";
    return reply({ok:true,agent_name:a.data.display_name||"Agent",passed:done,required:total,
      reminder_zh:[introZh,advice.zh,restrictionZh].filter(Boolean).join(" "),
      reminder_en:[introEn,advice.en,restrictionEn].filter(Boolean).join(" "),
      provider});
  }

  if(action==="signup_setting_get"){
    const {data,error}=await admin.rpc("owner_signup_setting_get_internal",{p_user_id:uid});
    if(error)return reply({error:publicError(error,"forbidden")},403);
    return reply({ok:true,open:Boolean(data?.open)});
  }
  if(action==="signup_setting_set"){
    if(typeof b.open!=="boolean")return reply({error:"invalid_value"},400);
    const {data,error}=await admin.rpc("owner_signup_setting_set_internal",{p_user_id:uid,p_open:b.open});
    if(error)return reply({error:publicError(error)},403);
    return reply({ok:true,open:Boolean(data?.open)});
  }

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
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  if(action==="kyc_list"){
    const status=String(b.status||"all");
    if(!["all","draft","submitted","approved","rejected"].includes(status))
      return reply({error:"kyc_invalid_status"},422);
    const {data,error}=await admin.rpc("owner_kyc_list_internal",{
      p_user_id:uid,p_status:status,p_limit:Math.min(100,Math.max(1,Number(b.limit)||50))
    });
    if(error)return reply({error:kycError(error)},403);
    return reply({ok:true,entries:data||[]});
  }
  if(action==="kyc_view"){
    const id=String(b.agent_id||"");
    if(!kycUUID.test(id))return reply({error:"kyc_invalid_agent"},422);
    // Decrypt and audit in the same privileged transaction.
    const {data,error}=await admin.rpc("owner_kyc_view_internal",{
      p_user_id:uid,p_agent_id:id
    });
    if(error)return reply({error:kycError(error)},403);
    let photo_signed_url=null;
    if(data.ic_front_path){
      const signed=await admin.storage.from("agent-kyc")
        .createSignedUrl(data.ic_front_path,60);
      if(signed.error||!signed.data?.signedUrl)
        return reply({error:"kyc_photo_url_failed"},500);
      photo_signed_url=signed.data.signedUrl;
    }
    const {ic_front_path,...details}=data;
    return reply({ok:true,kyc:{...details,photo_signed_url,photo_url_expires_in:60}});
  }
  if(action==="kyc_review"){
    const id=String(b.agent_id||"");
    const decision=String(b.decision||"");
    const reason=typeof b.reason==="string"?b.reason.trim():"";
    if(!kycUUID.test(id))return reply({error:"kyc_invalid_agent"},422);
    if(!["approve","reject"].includes(decision))return reply({error:"kyc_invalid_decision"},422);
    if(decision==="reject" && reason.length<3)return reply({error:"kyc_reject_reason_required"},422);
    if(decision==="reject" && (/[0-9]{6}-?[0-9]{2}-?[0-9]{4}/.test(reason) || /agent-kyc|https?:/i.test(reason)))
      return reply({error:"kyc_reject_reason_invalid"},422);
    const {data,error}=await admin.rpc("owner_kyc_review_internal",{
      p_user_id:uid,p_agent_id:id,p_decision:decision,p_reason:reason||null
    });
    if(error)return reply({error:kycError(error)},422);
    return reply({ok:true,review:data});
  }
  if(action==="kyc_delete"){
    const id=String(b.agent_id||"");
    if(!kycUUID.test(id))return reply({error:"kyc_invalid_agent"},422);
    if(b.confirm!==true)return reply({error:"confirmation_required"},400);
    const {error:readyErr}=await admin.rpc("owner_kyc_delete_ready_internal",{
      p_user_id:uid,p_agent_id:id
    });
    if(readyErr)return reply({error:kycError(readyErr)},403);
    // Delete ALL files under this agent's isolated prefix, including superseded
    // uploads, before dropping the encrypted DB record. Do not log file paths.
    const storage=admin.storage.from("agent-kyc");
    for(let pass=0;pass<100;pass++){
      const {data:files,error:listError}=await storage.list(id,{
        limit:100,offset:0,sortBy:{column:"name",order:"asc"}
      });
      if(listError)return reply({error:"kyc_photo_delete_failed"},500);
      const paths=(files||[]).filter(x=>typeof x.name==="string" && x.id)
        .map(x=>id+"/"+x.name);
      if(paths.length===0)break;
      const {error:removeError}=await storage.remove(paths);
      if(removeError)return reply({error:"kyc_photo_delete_failed"},500);
      if(pass===99)return reply({error:"kyc_photo_delete_incomplete"},500);
    }
    const {error}=await admin.rpc("owner_kyc_delete_internal",{
      p_user_id:uid,p_agent_id:id
    });
    if(error)return reply({error:kycError(error)},409);
    return reply({ok:true,deleted:true});
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
  if(action==="profit_floor_overview"){
    const {data,error}=await admin.rpc("owner_profit_floor_overview_internal",{
      p_user_id:uid,p_limit:Math.min(100,Math.max(1,Number(b.limit)||20))
    });
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,profit_floor:data});
  }
  if(action==="set_profit_floor"){
    if(b.confirm!==true)return reply({error:"confirmation_required"},422);
    const margin=Number(b.min_contribution_margin);
    if(!Number.isFinite(margin)||margin<0.50||margin>0.80)
      return reply({error:"invalid_profit_floor"},422);
    const {data,error}=await admin.rpc("owner_set_profit_floor_internal",{
      p_user_id:uid,p_margin:margin
    });
    if(error)return reply({error:publicError(error)},400);
    return reply({ok:true,profit_floor:data});
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
      id:a.id,agent_code:a.agent_code,display_name:a.display_name,status:a.status,
      passed_modules:passed.get(a.id)||0,exam_passed:exams.get(a.id)?.passed===true,
      exam_status:exams.get(a.id)?.status||"not_started",certified_at:a.certified_at||null
    }))});
  }
  if(action==="launch_orders"){
    const [qr,orr]=await Promise.all([
      admin.from("quotes").select("id,lead_id,agent_id,selling_price,status,valid_until,created_at")
        .in("status",["approved","sent","accepted"]).order("created_at",{ascending:false}).limit(100),
      admin.from("orders").select("id,order_code,quote_id,agent_id,status,commissionable_revenue,delivery_fee,payment_status,completed_at,created_at")
        .order("created_at",{ascending:false}).limit(100)
    ]);
    if(qr.error||orr.error)return reply({error:"order_queue_unavailable"},400);
    const orders=orr.data||[],existing=new Set(orders.map(o=>o.quote_id));
    const available=(qr.data||[]).filter(q=>!existing.has(q.id) && (!q.valid_until||new Date(q.valid_until)>new Date()));
    const agentIds=[...new Set([...available.map(q=>q.agent_id),...orders.map(o=>o.agent_id)])];
    const leadIds=[...new Set(available.map(q=>q.lead_id))];
    const completedIds=orders.filter(o=>o.status==="completed").map(o=>o.id);
    const [ar,lr,cr]=await Promise.all([
      agentIds.length?admin.from("agents").select("id,agent_code,display_name").in("id",agentIds):Promise.resolve({data:[],error:null}),
      leadIds.length?admin.from("leads").select("id,customer_label").in("id",leadIds):Promise.resolve({data:[],error:null}),
      completedIds.length?admin.from("commissions").select("order_id,amount,status,payable_at").in("order_id",completedIds):Promise.resolve({data:[],error:null})
    ]);
    if(ar.error||lr.error||cr.error)return reply({error:"order_queue_unavailable"},400);
    const commissionMap=new Map((cr.data||[]).map(v=>[v.order_id,v]));
    const agentMap=new Map((ar.data||[]).map(v=>[v.id,v]));
    const leadMap=new Map((lr.data||[]).map(v=>[v.id,v]));
    return reply({ok:true,eligible_quotes:available.map(q=>({
      ...q,agent_name:agentMap.get(q.agent_id)?.display_name||agentMap.get(q.agent_id)?.agent_code||"Agent",
      customer_label:leadMap.get(q.lead_id)?.customer_label||"Customer"
    })),orders:orders.map(o=>({
      ...o,agent_name:agentMap.get(o.agent_id)?.display_name||agentMap.get(o.agent_id)?.agent_code||"Agent",
      commission_amount:commissionMap.get(o.id)?.amount??null,
      commission_status:commissionMap.get(o.id)?.status??null,
      commission_payable_at:commissionMap.get(o.id)?.payable_at??null
    }))});
  }
  if(action==="launch_create_order"){
    if(b.confirm!==true)return reply({error:"confirmation_required"},400);
    const quoteId=String(b.quote_id||"");
    const code=String(b.order_code||"").trim().toUpperCase();
    const fee=Number(b.delivery_fee);
    const deliveryCost=Number(b.delivery_cost_estimate);
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!uuid.test(quoteId)||!/^[A-Z0-9][A-Z0-9-]{2,59}$/.test(code)
       ||!Number.isFinite(fee)||fee<0||fee>10000||Math.round(fee*100)!==fee*100
       ||!Number.isFinite(deliveryCost)||deliveryCost<0||deliveryCost>10000
       ||Math.round(deliveryCost*100)!==deliveryCost*100)
      return reply({error:"invalid_order_input"},422);
    // Flower selling price is protected by the quote guard. Delivery gets its own
    // Owner-entered cost estimate so the full order can be checked before payment.
    const {data:order,error}=await admin.rpc("create_order_from_quote_internal",{
      p_quote_id:quoteId,p_order_code:code,p_delivery_fee:fee,
      p_delivery_cost_estimate:deliveryCost
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

  if(action==="launch_complete_order"){
    if(b.confirm!==true)return reply({error:"confirmation_required"},400);
    const id=String(b.order_id||"");
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const costs=["production_cost","delivery_cost","payment_cost","refund_cost","risk_cost"];
    const amounts={};
    for(const key of costs){
      const value=b[key]===undefined?0:b[key];
      if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>100000)
        return reply({error:"invalid_"+key},422);
      amounts[key]=value;
    }
    if(!uuid.test(id)||!["internal","external"].includes(b.fulfilment_type)
      ||typeof b.qc_pass!=="boolean"||typeof b.rework!=="boolean")
      return reply({error:"invalid_completion_input"},422);
    if(b.qc_pass!==true)return reply({error:"qc_not_passed"},409);
    // One database transaction: walk the official order state machine to
    // completed, record actual costs, accrue commission, and audit. Any failure
    // rolls back everything; a second call fails with order_already_completed.
    const {data:result,error}=await admin.rpc("owner_complete_order_internal",{
      p_user_id:uid,p_order_id:id,p_production_cost:amounts.production_cost,
      p_payment_cost:amounts.payment_cost,p_delivery_cost:amounts.delivery_cost,
      p_refund_cost:amounts.refund_cost,p_risk_cost:amounts.risk_cost,
      p_fulfilment_type:b.fulfilment_type,p_qc_pass:true,p_rework:b.rework
    });
    if(error){
      const m=String(error.message||"");
      const known=["order_not_found","order_not_paid","order_already_completed","order_not_ready_for_completion","qc_not_passed","forbidden"].find(k=>m.includes(k));
      return reply({error:known||"order_completion_failed"},known==="order_not_found"?404:409);
    }
    return reply({ok:true,order_id:id,result});
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
