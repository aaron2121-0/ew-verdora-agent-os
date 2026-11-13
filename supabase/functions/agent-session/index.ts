
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
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

  let body = {};
  try { body = await req.json(); } catch {}
  const action = body.action || "dashboard";

  if (action === "register") {
    const displayName = clean(body.display_name);
    const language = body.language === "zh" ? "zh" : "en";
    if (!displayName) return reply({ error: "display_name_required" }, 400);
    const { data, error } = await admin.rpc("register_agent_internal", {
      p_user_id: uid,
      p_display_name: displayName,
      p_language: language
    });
    if (error) return reply({ error: safeErr(error) }, 400);
    const { data: agent } = await admin.from("agents").select("id,agent_code").eq("id", data).single();
    return reply({ ok: true, agent_id: data, agent_code: agent?.agent_code || null });
  }

  const { data: agent, error: agentError } = await admin.from("agents")
    .select("id,agent_code,display_name,status,tier,commission_rate,performance_score,preferred_language,primary_channel")
    .eq("user_id", uid).maybeSingle();
  if (agentError) return reply({ error: safeErr(agentError) }, 400);
  if (!agent) return reply({ ok: true, needs_registration: true, user: { email: userData.user.email } });
  await admin.from("agents").update({ last_active_at: new Date().toISOString() }).eq("id", agent.id);


  // Handbook is always server-filtered; unpublished Grok imports never reach Agents.
  if (action === "handbook") {
    const section = String(body.section || "");
    const sections = ["story","product_line","service_rule","delivery","script","announcement"];
    if(!sections.includes(section)) return reply({error:"invalid_handbook_section"},400);
    const {data,error}=await admin.from("company_knowledge")
      .select("id,section,title_en,title_zh,body_en,body_zh,sort")
      .eq("section",section).eq("active",true)
      .eq("visible_to_agent",true).eq("needs_owner_confirm",false)
      .order("sort",{ascending:true}).limit(100);
    if(error)return reply({error:"handbook_unavailable"},400);
    return reply({ok:true,section,entries:data||[]});
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

  const [missionRes, progressRes, trainingRes, kitsRes, playbooksRes, campaignRes, commRes, leadsRes, quoteRequestsRes, phase1Res, intelligenceRes] = await Promise.all([missionReq, progressReq, trainingReq, kitsReq, playbooksReq, campaignReq, commReq, leadsReq, quoteRequestsReq, phase1Req, intelligenceReq]);
  const err = missionRes.error || progressRes.error || trainingRes.error || kitsRes.error || playbooksRes.error || campaignRes.error || commRes.error || leadsRes.error || quoteRequestsRes.error || phase1Res.error || intelligenceRes.error;
  if (err) return reply({ error: safeErr(err) }, 400);

  return reply({
    ok: true,
    needs_registration: false,
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
