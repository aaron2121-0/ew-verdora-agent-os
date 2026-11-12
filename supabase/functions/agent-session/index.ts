
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
function clean(v, max = 120) {
  return String(v ?? "").trim().slice(0, max);
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
    if (error) return reply({ error: error.message }, 400);
    const { data: agent } = await admin.from("agents").select("id,agent_code").eq("id", data).single();
    return reply({ ok: true, agent_id: data, agent_code: agent?.agent_code || null });
  }

  const { data: agent, error: agentError } = await admin.from("agents")
    .select("id,agent_code,display_name,status,tier,commission_rate,performance_score,preferred_language,primary_channel")
    .eq("user_id", uid).maybeSingle();
  if (agentError) return reply({ error: agentError.message }, 400);
  if (!agent) return reply({ ok: true, needs_registration: true, user: { email: userData.user.email } });
  await admin.from("agents").update({ last_active_at: new Date().toISOString() }).eq("id", agent.id);

  if (action === "mission") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? String(body.date) : new Date().toISOString().slice(0,10);
    const { data, error } = await admin.rpc("get_or_create_daily_mission_internal", { p_agent_id: agent.id, p_date: date });
    if (error) return reply({ error: error.message }, 400);
    return reply({ ok: true, mission: data });
  }

  if (action === "create_lead") {
    if (["trainee","restricted","dormant","suspended"].includes(agent.status)) return reply({error:"selling_access_locked"},403);
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
    if (error) return reply({ error: error.message }, 400);
    await admin.from("lead_events").insert({ lead_id:data.id, agent_id:agent.id, event_type:"created" });
    return reply({ ok: true, lead: data });
  }

  if (action === "qualify_lead") {
    if (["trainee","restricted","dormant","suspended"].includes(agent.status)) return reply({error:"selling_access_locked"},403);
    const leadId = clean(body.lead_id, 80);
    const { data: ownLead, error: ownErr } = await admin.from("leads").select("id,status").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if (ownErr || !ownLead) return reply({ error:"lead_not_found" },404);
    const { error } = await admin.from("leads").update({ status:"qualified", updated_at:new Date().toISOString() }).eq("id",leadId).eq("agent_id",agent.id);
    if (error) return reply({ error:error.message },400);
    await admin.from("lead_events").insert({ lead_id:leadId, agent_id:agent.id, event_type:"qualified" });
    return reply({ ok:true });
  }

  if (action === "schedule_followup") {
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
    const leadId = clean(body.lead_id,80);
    const { data: ownLead } = await admin.from("leads").select("id").eq("id",leadId).eq("agent_id",agent.id).maybeSingle();
    if (!ownLead) return reply({error:"lead_not_found"},404);
    await admin.from("leads").update({next_followup_at:null,updated_at:new Date().toISOString()}).eq("id",leadId).eq("agent_id",agent.id);
    await admin.from("lead_events").insert({lead_id:leadId,agent_id:agent.id,event_type:"followup_completed"});
    return reply({ok:true});
  }

  const today = new Date().toISOString().slice(0,10);
  const missionReq = admin.rpc("get_or_create_daily_mission_internal", { p_agent_id: agent.id, p_date: today });
  const progressReq = admin.rpc("agent_today_progress_internal", { p_agent_id: agent.id, p_date: today });
  const campaignsReq = admin.rpc("agent_campaigns_internal", { p_agent_id: agent.id });
  const trainingReq = admin.from("training_progress")
    .select("id,status,attempts,best_score,completed_at,training_modules(code,title_en,title_zh,category,pass_score,content_en,content_zh)")
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
    .select("id,status,source,sales_category,budget,next_followup_at,created_at").eq("agent_id", agent.id).order("created_at",{ascending:false}).limit(20);
  const quoteRequestsReq = admin.from("quote_requests")
    .select("id,lead_id,status,budget_version_price,recommended_price,customer_note_en,customer_note_zh,created_at")
    .eq("agent_id", agent.id).order("created_at",{ascending:false}).limit(20);

  const [missionRes, progressRes, trainingRes, kitsRes, playbooksRes, campaignRes, commRes, leadsRes, quoteRequestsRes] = await Promise.all([missionReq, progressReq, trainingReq, kitsReq, playbooksReq, campaignReq, commReq, leadsReq, quoteRequestsReq]);
  const err = missionRes.error || progressRes.error || trainingRes.error || kitsRes.error || playbooksRes.error || campaignRes.error || commRes.error || leadsRes.error || quoteRequestsRes.error;
  if (err) return reply({ error: err.message }, 400);

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
    recent_leads: leadsRes.data || [],
    quote_requests: quoteRequestsRes.data || []
  });
});
