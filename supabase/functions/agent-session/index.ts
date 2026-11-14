
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateAgentKyc, KYC_MIME_TYPES, KYC_MAX_BYTES, matchesKycImage, registerAgentWithKycGate } from "../_shared/agent-kyc-validate.mjs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}
// Pass through short business messages raised by our own SQL functions; hide raw Postgres/internal errors.
function safeErr(e){
  const m=String(e?.message||"");
  if(/^[a-z][a-z0-9 _-]{2,60}$/i.test(m) && !/(violates|relation|column|constraint|syntax|permission|function|duplicate|null value|schema)/i.test(m)) return m;
  console.error("INTERNAL_ERROR", e?.code||"", m.slice(0,200));
  return "request_failed";
}
// KYC responses never echo SQL details or any personal values.
function kycErr(e) {
  const message=String(e?.message||"");
  const codes=new Set([
    "kyc_auth_required","kyc_consent_required","kyc_invalid_consent_version",
    "kyc_invalid_name","kyc_invalid_language","kyc_invalid_area",
    "kyc_invalid_ic_format","kyc_invalid_ic_date","kyc_underage",
    "kyc_invalid_phone","kyc_duplicate_ic","kyc_already_registered",
    "kyc_configuration_missing","kyc_profile_missing","kyc_upload_not_allowed",
    "kyc_invalid_upload","kyc_upload_token_invalid","kyc_submit_not_allowed",
    "kyc_photo_missing"
  ]);
  return codes.has(message)?message:"kyc_request_failed";
}
async function randomKycToken(){
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  return {token,hash};
}
async function boundedImage(req){
  const reader=req.body?.getReader();
  if(!reader)return null;
  const chunks=[];
  let size=0;
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>KYC_MAX_BYTES){await reader.cancel();return null;}
      chunks.push(value);
    }
    if(!size)return null;
    const out=new Uint8Array(size);let at=0;
    for(const chunk of chunks){out.set(chunk,at);at+=chunk.length;}
    return out;
  }finally{reader.releaseLock();}
}
function clean(v, max = 120) {
  return String(v ?? "").trim().slice(0, max);
}

// Business day is Asia/Kuching (UTC+8, no DST); the database functions use the same zone.
const kuchingToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
// Statuses that may not sell. Must cover every non-selling value of agents.status.
const SELLING_LOCKED = ["trainee", "restricted", "recovery", "dormant", "suspended"];

const LOSS_REASONS = ["too_expensive","think_about_it","no_reply","chose_other","other"];

function customerSegments(lead){
  const status=String(lead?.status||"");
  if(status==="quoted" || lead?.quote_id || ["approved","sent","accepted"].includes(String(lead?.quote_status||""))) return ["quoted"];
  if(status==="follow_up" || lead?.next_followup_at) return ["follow_up"];
  if(["new","qualified"].includes(status)) return ["new"];
  return [];
}
function mergeLeadIntelligence(rows,intelligence){
  const map=new Map((Array.isArray(intelligence)?intelligence:[]).map(x=>[String(x.lead_id),x]));
  return (Array.isArray(rows)?rows:[]).map(lead=>({
    ...lead,
    customer_segments:customerSegments(lead),
    ...(map.get(String(lead.id))||{})
  }));
}
function enrichPhase1(phase1,intelligence){
  if(!phase1||typeof phase1!=="object") return phase1;
  return {
    ...phase1,
    recent_leads:mergeLeadIntelligence(phase1.recent_leads,intelligence),
    due_followups:mergeLeadIntelligence(phase1.due_followups,intelligence)
  };
}


const url = Deno.env.get("SUPABASE_URL") || "";
const pubKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const secKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const publishable = pubKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
const secret = secKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (!url || !publishable || !secret) throw new Error("Supabase environment keys missing");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return reply({ error: "authentication_required" }, 401);
  const token = auth.slice(7);

  const userClient = createClient(url, publishable, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return reply({ error: "invalid_session" }, 401);
  const uid = userData.user.id;
  // Shared DB flag, also used by the certification SQL; never silently bypass it.
  const {data:kycRequired,error:kycFlagError}=await admin.rpc("agent_kyc_required_internal");
  if(kycFlagError||typeof kycRequired!=="boolean")
    return reply({error:"kyc_feature_config_unavailable"},503);

  // Custom, one-use signed upload endpoint. Supabase Storage's own signed
  // upload URLs last 2 hours, and cannot meet our required 60-second TTL.
  // JWT + bound one-use 60s token are checked before the service-role upload.
  const uploadToken=new URL(req.url).searchParams.get("kyc_upload");
  if(uploadToken!==null){
    if(!/^[a-f0-9]{64}$/.test(uploadToken))return reply({error:"kyc_upload_token_invalid"},403);
    const mime=String(req.headers.get("content-type")||"").toLowerCase();
    if(!KYC_MIME_TYPES.includes(mime))return reply({error:"kyc_invalid_upload"},415);
    const declared=Number(req.headers.get("content-length")||"0");
    if(declared>KYC_MAX_BYTES)return reply({error:"kyc_file_too_large"},413);
    const bytes=await boundedImage(req);
    if(!bytes)return reply({error:"kyc_file_too_large_or_empty"},413);
    if(!matchesKycImage(bytes,mime))return reply({error:"kyc_invalid_image_signature"},415);
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(uploadToken));
    const tokenHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    const {data:grant,error:grantError}=await admin.rpc("agent_kyc_consume_upload_internal",{
      p_user_id:uid,p_token_hash:tokenHash
    });
    if(grantError||!grant||grant.content_type!==mime)
      return reply({error:grantError?kycErr(grantError):"kyc_invalid_upload"},403);
    // Never upsert, disclose paths through logs, or permit cross-agent paths.
    const {error:putError}=await admin.storage.from("agent-kyc").upload(
      grant.path,bytes,{contentType:mime,upsert:false,cacheControl:"0"}
    );
    if(putError)return reply({error:"kyc_upload_failed"},500);
    // A deletion request might race an in-flight upload. Delete this object
    // rather than leave a new orphan after the Owner has purged the prefix.
    const {data:afterUpload,error:afterUploadErr}=await admin.rpc(
      "agent_kyc_status_internal",{p_user_id:uid}
    );
    if(afterUploadErr || afterUpload?.delete_requested || !afterUpload?.status){
      await admin.storage.from("agent-kyc").remove([grant.path]);
      return reply({error:"kyc_upload_revoked"},409);
    }
    return reply({ok:true,uploaded:true});
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const action = body.action || "dashboard";

  if (action === "register") {
    const result=await registerAgentWithKycGate({
      body,uid,admin,kycRequired,cleanName:clean,
      safeLegacyError:safeErr,safeKycError:kycErr
    });
    return reply(result.payload,result.status);
  }

  const { data: agent, error: agentError } = await admin.from("agents")
    .select("id,agent_code,display_name,status,tier,commission_rate,performance_score,preferred_language,primary_channel")
    .eq("user_id", uid).maybeSingle();
  if (agentError) return reply({ error: safeErr(agentError) }, 400);
  if (!agent) return reply({ ok: true, needs_registration: true, kyc_required: kycRequired, user: { email: userData.user.email } });
  await admin.from("agents").update({ last_active_at: new Date().toISOString() }).eq("id", agent.id);

  if(action==="kyc_status"){
    const {data,error}=await admin.rpc("agent_kyc_status_internal",{p_user_id:uid});
    if(error)return reply({error:kycErr(error)},400);
    return reply({ok:true,...data,kyc_required:kycRequired && data?.kyc_required!==false});
  }
  if(action==="kyc_upload_url"){
    if(!KYC_MIME_TYPES.includes(body.content_type))return reply({error:"kyc_invalid_upload"},422);
    const {token,hash}=await randomKycToken();
    const path=agent.id+"/"+crypto.randomUUID()+".jpg";
    const {error}=await admin.rpc("agent_kyc_issue_upload_internal",{
      p_user_id:uid,p_token_hash:hash,p_object_path:path,p_content_type:body.content_type
    });
    if(error)return reply({error:kycErr(error)},403);
    return reply({
      ok:true,method:"POST",content_type:body.content_type,
      upload_url:url.replace(/\/$/,"")+"/functions/v1/agent-session?kyc_upload="+encodeURIComponent(token),
      object_path:path,expires_in:60
    });
  }
  if(action==="kyc_submit"){
    const path=String(body.object_path||"");
    const {data,error}=await admin.rpc("agent_kyc_submit_internal",{
      p_user_id:uid,p_object_path:path
    });
    if(error)return reply({error:kycErr(error)},422);
    // Remove the superseded photo; do not reveal storage paths in responses.
    if(data?.old_path && data.old_path!==path)
      await admin.storage.from("agent-kyc").remove([data.old_path]);
    return reply({ok:true,status:"submitted"});
  }
  if(action==="kyc_request_delete"){
    if(body.confirm!==true)return reply({error:"confirmation_required"},400);
    const {error}=await admin.rpc("agent_kyc_request_delete_internal",{p_user_id:uid});
    if(error)return reply({error:kycErr(error)},422);
    return reply({ok:true,delete_requested:true});
  }


  // Handbook is always server-filtered; unpublished Grok imports never reach Agents.
  if (action === "handbook") {
    const section = String(body.section || "");
    const productLine = String(body.product_line || "");
    const sections = ["story","product_line","service_rule","delivery","script","announcement","faq"];
    const lines = ["condolence","opening","bouquet","wedding_event","wholesale"];
    if(!section&&!productLine) return reply({error:"handbook_filter_required"},400);
    if(section&&!sections.includes(section)) return reply({error:"invalid_handbook_section"},400);
    if(productLine&&!lines.includes(productLine)) return reply({error:"invalid_product_line"},400);
    let query=admin.from("company_knowledge")
      .select("id,code,kind,section,product_line,sort,title_en,title_zh,body_en,body_zh,key_points_en,key_points_zh,icon_hint")
      .eq("active",true).eq("visible_to_agent",true).eq("needs_owner_confirm",false);
    if(section)query=query.eq("section",section);
    if(productLine)query=query.eq("product_line",productLine);
    const {data,error}=await query.order("sort",{ascending:true}).limit(200);
    if(error)return reply({error:"handbook_unavailable"},400);
    return reply({ok:true,section:section||null,product_line:productLine||null,entries:data||[]});
  }

  if (action === "phase1_overview") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? String(body.date) : kuchingToday();
    const [overviewRes,intelRes] = await Promise.all([
      admin.rpc("agent_phase1_overview_internal", { p_agent_id: agent.id, p_date: date }),
      admin.rpc("agent_lead_intelligence_internal", { p_agent_id: agent.id, p_limit: 50 })
    ]);
    const error=overviewRes.error||intelRes.error;
    if (error) return reply({ error: safeErr(error) }, 400);
    return reply({ ok: true, phase1: enrichPhase1(overviewRes.data,intelRes.data||[]) });
  }

  if (action === "sales_dashboard") {
    const rawMonth = String(body.month || "");
    const month = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth + "-01" : kuchingToday().slice(0,7) + "-01";
    const [dashboardRes, leaderboardRes] = await Promise.all([
      admin.rpc("agent_sales_dashboard_internal", { p_agent_id: agent.id, p_month: month }),
      admin.rpc("agent_leaderboard_internal", { p_agent_id: agent.id, p_month: month })
    ]);
    const error = dashboardRes.error || leaderboardRes.error;
    if (error) return reply({ error: safeErr(error) }, 400);
    return reply({
      ok: true,
      cache_ttl_seconds: 300,
      sales_dashboard: {
        ...(dashboardRes.data || {}),
        leaderboard: leaderboardRes.data || { top: [], me: null, team_count: 0 }
      }
    });
  }

  if (action === "mission") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? String(body.date) : kuchingToday();
    const { data, error } = await admin.rpc("get_or_create_daily_mission_internal", { p_agent_id: agent.id, p_date: date });
    if (error) return reply({ error: safeErr(error) }, 400);
    return reply({ ok: true, mission: data });
  }

  if (action === "create_lead") {
    if (SELLING_LOCKED.includes(agent.status)) return reply({error:"selling_access_locked"},403);
    const source = clean(body.source, 40) || "other";
    const allowed = ["instagram","facebook","threads","xiaohongshu","whatsapp","personal_network","referral","previous_customer","corporate_outreach","other"];
    if (!allowed.includes(source)) return reply({ error: "invalid_source" }, 400);
    const budget = body.budget == null || body.budget === "" ? null : Number(body.budget);
    if (budget != null && (!Number.isFinite(budget) || budget < 0 || budget > 1000000)) return reply({ error: "invalid_budget" }, 400);
    const { data, error } = await admin.from("leads").insert({
      agent_id: agent.id,
      source,
      customer_label: clean(body.customer_label) || null,
      occasion: clean(body.occasion) || null,
      budget,
      delivery_date: body.delivery_date || null,
      delivery_time: body.delivery_time || null,
      status: "new"
    }).select("id,status,created_at").single();
    if (error) return reply({ error: safeErr(error) }, 400);
    await admin.from("lead_events").insert({ lead_id:data.id, agent_id:agent.id, event_type:"created" });
    return reply({ ok: true, lead: data });
  }

  if (action === "qualify_lead") {
    if (SELLING_LOCKED.includes(agent.status)) return reply({error:"selling_access_locked"},403);
    const leadId = clean(body.lead_id, 80);
    const { data: ownLead, error: ownErr } = await admin.from("leads").select("id,status").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if (ownErr || !ownLead) return reply({ error:"lead_not_found" },404);
    const { error } = await admin.from("leads").update({ status:"qualified", updated_at:new Date().toISOString() }).eq("id",leadId).eq("agent_id",agent.id);
    if (error) return reply({ error: safeErr(error) },400);
    await admin.from("lead_events").insert({ lead_id:leadId, agent_id:agent.id, event_type:"qualified" });
    return reply({ ok:true });
  }

  if (action === "schedule_followup") {
    if (SELLING_LOCKED.includes(agent.status)) return reply({error:"selling_access_locked"},403);
    const leadId = clean(body.lead_id,80);
    const at = new Date(String(body.followup_at||""));
    if (!Number.isFinite(at.getTime())) return reply({error:"invalid_followup_time"},400);
    const { data: ownLead } = await admin.from("leads").select("id").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if (!ownLead) return reply({error:"lead_not_found"},404);
    await admin.from("leads").update({status:"follow_up",next_followup_at:at.toISOString(),updated_at:new Date().toISOString()}).eq("id",leadId).eq("agent_id",agent.id);
    await admin.from("lead_events").insert({lead_id:leadId,agent_id:agent.id,event_type:"followup_due",metadata:{scheduled_for:at.toISOString()}});
    return reply({ok:true});
  }

  if (action === "complete_followup") {
    if (SELLING_LOCKED.includes(agent.status)) return reply({error:"selling_access_locked"},403);
    const leadId = clean(body.lead_id,80);
    const { data: ownLead } = await admin.from("leads").select("id").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if (!ownLead) return reply({error:"lead_not_found"},404);
    await admin.from("leads").update({next_followup_at:null,updated_at:new Date().toISOString()}).eq("id",leadId).eq("agent_id",agent.id);
    await admin.from("lead_events").insert({lead_id:leadId,agent_id:agent.id,event_type:"followup_completed"});
    return reply({ok:true});
  }


  if (action === "set_lead_loss") {
    if (SELLING_LOCKED.includes(agent.status)) return reply({error:"selling_access_locked"},403);
    const leadId=clean(body.lead_id,80);
    const reason=String(body.loss_reason||"").toLowerCase();
    if(!LOSS_REASONS.includes(reason)) return reply({error:"invalid_loss_reason"},400);
    const {data:ownLead,error:ownErr}=await admin.from("leads")
      .select("id,status,loss_reason").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if(ownErr||!ownLead) return reply({error:"lead_not_found"},404);
    if(["won","archived"].includes(String(ownLead.status))) return reply({error:"lead_cannot_be_lost"},409);
    if(ownLead.status==="lost" && ownLead.loss_reason===reason){
      return reply({ok:true,lead_id:leadId,status:"lost",loss_reason:reason,unchanged:true});
    }
    const previousReason=ownLead.loss_reason||null;

    const {error:updateErr}=await admin.from("leads").update({
      status:"lost",
      loss_reason:reason,
      next_followup_at:null,
      updated_at:new Date().toISOString()
    }).eq("id",leadId).eq("agent_id",agent.id);
    if(updateErr) return reply({error:safeErr(updateErr)},400);

    await admin.from("lead_events").insert({
      lead_id:leadId,
      agent_id:agent.id,
      event_type:"lost",
      metadata:{reason,previous_reason:previousReason}
    });
    return reply({ok:true,lead_id:leadId,status:"lost",loss_reason:reason});
  }

  const today = kuchingToday();
  const missionReq = admin.rpc("get_or_create_daily_mission_internal", { p_agent_id: agent.id, p_date: today });
  const progressReq = admin.rpc("agent_today_progress_internal", { p_agent_id: agent.id, p_date: today });
  const campaignsReq = admin.rpc("agent_campaigns_internal", { p_agent_id: agent.id });
  const trainingReq = admin.from("training_progress")
    .select("id,status,attempts,best_score,completed_at,training_modules(code,title_en,title_zh,category,pass_score,content_en,content_zh,handbook_section)")
    .eq("agent_id", agent.id);
  const kitsReq = admin.from("selling_kits")
    .select("code,category,title_en,title_zh,content_en,content_zh,target_personas,recommended_channels")
    .eq("active", true);
  const playbooksReq = admin.from("channel_playbooks")
    .select("code,title_en,title_zh,content_en,content_zh").eq("active",true);
  const campaignReq = admin.rpc("agent_campaigns_internal",{p_agent_id:agent.id});
  const commReq = admin.from("commissions")
    .select("amount,status,earned_at,paid_at").eq("agent_id", agent.id).order("created_at",{ascending:false}).limit(20);
  const leadsReq = admin.from("leads")
    .select("id,status,source,customer_label,occasion,sales_category,budget,delivery_date,delivery_time,loss_reason,next_followup_at,created_at,updated_at")
    .eq("agent_id", agent.id).order("created_at",{ascending:false}).limit(50);
  const quoteRequestsReq = admin.from("quote_requests")
    .select("id,lead_id,status,budget_version_price,recommended_price,customer_note_en,customer_note_zh,created_at")
    .eq("agent_id", agent.id).order("created_at",{ascending:false}).limit(20);
  const phase1Req = admin.rpc("agent_phase1_overview_internal", { p_agent_id: agent.id, p_date: today });
  const intelligenceReq = admin.rpc("agent_lead_intelligence_internal",{p_agent_id:agent.id,p_limit:50});
  const kycReq = kycRequired
    ?admin.rpc("agent_kyc_status_internal",{p_user_id:uid})
    :Promise.resolve({data:{status:null,kyc_required:false},error:null});

  const [missionRes, progressRes, trainingRes, kitsRes, playbooksRes, campaignRes, commRes, leadsRes, quoteRequestsRes, phase1Res, intelligenceRes, kycRes] = await Promise.all([missionReq, progressReq, trainingReq, kitsReq, playbooksReq, campaignReq, commReq, leadsReq, quoteRequestsReq, phase1Req, intelligenceReq, kycReq]);
  const err = missionRes.error || progressRes.error || trainingRes.error || kitsRes.error || playbooksRes.error || campaignRes.error || commRes.error || leadsRes.error || quoteRequestsRes.error || phase1Res.error || intelligenceRes.error || kycRes.error;
  if (err) return reply({ error: safeErr(err) }, 400);

  return reply({
    ok: true,
    needs_registration: false,
    kyc_required: kycRequired && kycRes.data?.kyc_required !== false,
    kyc_status: kycRes.data?.status || null,
    agent,
    mission: missionRes.data,
    today_progress: progressRes.data || {orders:0,qualified_leads:0,quotes:0,followups:0},
    training: trainingRes.data || [],
    selling_kits: kitsRes.data || [],
    channel_playbooks: playbooksRes.data || [],
    campaigns: campaignRes.data || [],
    commissions: commRes.data || [],
    recent_leads: mergeLeadIntelligence(leadsRes.data||[],intelligenceRes.data||[]),
    quote_requests: quoteRequestsRes.data || [],
    phase1: enrichPhase1(phase1Res.data||null,intelligenceRes.data||[])
  });
});
