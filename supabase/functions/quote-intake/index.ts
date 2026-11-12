
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};
const reply=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});

// Pass through short business messages raised by our own SQL functions; hide raw Postgres/internal errors.
function safeErr(e){
  const m=String(e?.message||"");
  if(/^[a-z][a-z0-9 _-]{2,60}$/i.test(m) && !/(violates|relation|column|constraint|syntax|permission|function|duplicate|null value|schema)/i.test(m)) return m;
  console.error("INTERNAL_ERROR", e?.code||"", m.slice(0,200));
  return "request_failed";
}
const url=Deno.env.get("SUPABASE_URL")||"";
const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")||"";
const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
// Free-tier Google Gemini vision (key in Edge Function secrets). No key = manual review fallback. Paid AI stays disabled.
const geminiKey=Deno.env.get("GEMINI_API_KEY")||"";
const model=(Deno.env.get("GEMINI_MODEL")||"gemini-flash-latest").replace(/[^a-zA-Z0-9.\-]/g,"");
const bucket="agent-references";

function safeResult(row){
  return {
    id:row.id,status:row.status,classification:row.classification,
    budget_version_price:row.budget_version_price,
    budget_version_commitment:row.budget_version_commitment,
    recommended_price:row.recommended_price,
    customer_note_en:row.customer_note_en,customer_note_zh:row.customer_note_zh
  };
}
function parseJsonText(s){
  if(!s)return null;
  try{return JSON.parse(String(s).replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`\s*$/,"").trim())}catch{return null}
}
async function visionAnalyze(imageUrl){
  if(!geminiKey)return null;
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),15000);
  let txt="";
  try{
    const img=await fetch(imageUrl,{signal:ctl.signal});
    if(!img.ok)return null;
    const mime=(img.headers.get("content-type")||"image/jpeg").split(";")[0].trim().toLowerCase();
    if(!["image/jpeg","image/png","image/webp"].includes(mime))return null;
    const bytes=new Uint8Array(await img.arrayBuffer());
    if(bytes.length===0||bytes.length>7*1024*1024)return null; // too large: manual review
    let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
      method:"POST",signal:ctl.signal,
      headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:"Analyze a flower arrangement reference image only for commercial visual classification. Return ONLY JSON with keys size_band, density_band, premium_intensity, complexity_band, flower_flexibility, visual_features. Do not estimate price or cost. Allowed enums: size_band small|medium|large|xl|structure; density_band light|medium|full|very_full; premium_intensity low|medium|high|very_high; complexity_band low|medium|high|special; flower_flexibility flexible|moderate|exact_risk. visual_features is an object of short non-sensitive observations. Do not identify any florist, brand or person. If the image is not a flower arrangement, set complexity_band to special and flower_flexibility to exact_risk."}]},
        contents:[{role:"user",parts:[
          {text:"Classify this floral reference image for EW VERDORA quotation routing."},
          {inline_data:{mime_type:mime,data:btoa(bin)}}
        ]}],
        generationConfig:{maxOutputTokens:1024,temperature:0.2,responseMimeType:"application/json"}
      })
    });
    if(!r.ok){console.error("GEMINI_VISION_STATUS",r.status);return null;}
    const j=await r.json();
    txt=(j?.candidates?.[0]?.content?.parts||[]).map(p=>typeof p.text==="string"&&!p.thought?p.text:"").join("").trim();
  }catch(e){console.error("GEMINI_VISION_ERROR",e?.name||"error");return null;}
  finally{clearTimeout(timer);}
  const o=parseJsonText(txt);
  if(!o)return null;
  const ok={
    size:["small","medium","large","xl","structure"].includes(o.size_band),
    density:["light","medium","full","very_full"].includes(o.density_band),
    premium:["low","medium","high","very_high"].includes(o.premium_intensity),
    complexity:["low","medium","high","special"].includes(o.complexity_band),
    flexibility:["flexible","moderate","exact_risk"].includes(o.flower_flexibility)
  };
  if(Object.values(ok).some(x=>!x))return null;
  return o;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return reply({error:"authentication_required"},401);
  const token=auth.slice(7);
  const userClient=createClient(url,pub,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:ue}=await userClient.auth.getUser(token);
  if(ue||!u.user)return reply({error:"invalid_session"},401);
  const {data:agent}=await admin.from("agents").select("id,status").eq("user_id",u.user.id).maybeSingle();
  if(!agent)return reply({error:"agent_not_registered"},400);
  if(["trainee","restricted","recovery","dormant","suspended"].includes(agent.status))return reply({error:"quote_access_locked"},403);
  let b={};try{b=await req.json()}catch{}
  const action=b.action||"status";

  if(action==="create"){
    const leadId=String(b.lead_id||"");
    const budget=Number(b.customer_budget);
    const commitment=["flex","adapted","reference","exact","project"].includes(b.design_commitment)?b.design_commitment:"adapted";
    if(!leadId||!Number.isFinite(budget)||budget<=0)return reply({error:"invalid_request"},400);
    const {data:lead}=await admin.from("leads").select("id").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if(!lead)return reply({error:"lead_not_found"},404);
    const {data:qr,error}=await admin.from("quote_requests").insert({
      agent_id:agent.id,lead_id:leadId,customer_budget:budget,design_commitment:commitment,
      needed_at:b.needed_at||null,status:"awaiting_reference"
    }).select("*").single();
    if(error)return reply({error: safeErr(error)},400);

    const mime=String(b.content_type||"image/jpeg").toLowerCase();
    const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
    if(!["image/jpeg","image/png","image/webp"].includes(mime))return reply({error:"unsupported_image_type"},400);
    const path=u.user.id+"/"+qr.id+"/reference-"+crypto.randomUUID()+"."+ext;
    const {data:up,error:upErr}=await admin.storage.from(bucket).createSignedUploadUrl(path,{upsert:false});
    if(upErr)return reply({error: safeErr(upErr)},400);
    await admin.from("quote_requests").update({reference_object_path:path,updated_at:new Date().toISOString()}).eq("id",qr.id);
    return reply({ok:true,request_id:qr.id,bucket,path,upload_token:up.token,upload_url:up.signedUrl});
  }

  const requestId=String(b.request_id||"");
  const {data:qr}=await admin.from("quote_requests").select("*").eq("id",requestId).eq("agent_id",agent.id).maybeSingle();
  if(!qr)return reply({error:"request_not_found"},404);

  if(action==="status")return reply({ok:true,quote_request:safeResult(qr)});

  if(action==="accept_option"){
    const option=String(b.option||"budget");
    const created=await admin.rpc("create_quote_from_request_internal",{
      p_agent_id:agent.id,
      p_request_id:qr.id,
      p_option:option
    });
    if(created.error)return reply({error: safeErr(created.error)},400);
    const q=created.data;
    return reply({ok:true,quote:{
      id:q.id,lead_id:q.lead_id,quote_version:q.quote_version,
      selling_price:q.selling_price,design_commitment:q.design_commitment,
      status:q.status,valid_until:q.valid_until,
      commission_rate_locked:q.commission_rate_locked
    }});
  }

  if(action==="analyze"){
    if(!qr.reference_object_path)return reply({error:"reference_missing"},400);
    if(["exact","project"].includes(qr.design_commitment)){
      const {data:row}=await admin.from("quote_requests").update({
        status:"manual_review",classification:"RED",
        customer_note_en:"This request needs manual confirmation before a formal quotation.",
        customer_note_zh:"这个需求需要人工确认后才能正式报价。",
        updated_at:new Date().toISOString()
      }).eq("id",qr.id).select("*").single();
      return reply({ok:true,quote_request:safeResult(row),provider:"rule"});
    }
    if(geminiKey){
      const quota=await admin.rpc("consume_ai_quota_internal",{p_agent_id:agent.id,p_action:"reference_analysis"});
      if(quota.error)return reply({error: safeErr(quota.error)},400);
      if(!quota.data?.allowed)return reply({error:"ai_daily_limit",quota:quota.data},429);
    }
    const {data:signed,error:signErr}=await admin.storage.from(bucket).createSignedUrl(qr.reference_object_path,300);
    if(signErr)return reply({error: safeErr(signErr)},400);
    const analysis=await visionAnalyze(signed.signedUrl);
    if(!analysis){
      const {data:row}=await admin.from("quote_requests").update({
        status:"manual_review",classification:"RED",
        customer_note_en:"We are checking this reference before confirming the quotation.",
        customer_note_zh:"这张参考图需要进一步确认后才能正式报价。",
        updated_at:new Date().toISOString()
      }).eq("id",qr.id).select("*").single();
      return reply({ok:true,quote_request:safeResult(row),provider:"manual_fallback"});
    }
    const {data:row,error:finErr}=await admin.rpc("finalize_quote_request_internal",{
      p_request_id:qr.id,p_size:analysis.size_band,p_density:analysis.density_band,
      p_premium:analysis.premium_intensity,p_complexity:analysis.complexity_band,
      p_flexibility:analysis.flower_flexibility,p_features:(analysis.visual_features&&typeof analysis.visual_features==="object")?analysis.visual_features:{},
      p_provider:"gemini",p_model:model,p_raw:analysis
    });
    if(finErr)return reply({error: safeErr(finErr)},400);
    return reply({ok:true,quote_request:safeResult(row),provider:"gemini"});
  }

  return reply({error:"unknown_action"},400);
});
