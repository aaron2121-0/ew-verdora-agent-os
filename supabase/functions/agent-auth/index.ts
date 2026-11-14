
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://agent-mobile-production.up.railway.app";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Vary": "Origin"
};
const reply = (d:any, s=200) => new Response(JSON.stringify(d), { status:s, headers:cors });
const enc = new TextEncoder();

async function sha256Hex(v:string) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(v));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function validEmail(v:string) {
  const at=v.indexOf("@"), dot=v.lastIndexOf(".");
  return at>0 && dot>at+1 && dot<v.length-1 && !v.includes(" ");
}
function validCode(v:string) {
  return /^[a-f0-9]{64}$/i.test(v);
}

const url = Deno.env.get("SUPABASE_URL") || "";
const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default
  || Deno.env.get("SUPABASE_ANON_KEY") || "";
const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default
  || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function findUserByEmail(admin:any, email:string) {
  for (let page=1; page<=10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage:1000 });
    if (error) throw error;
    const user = data.users.find((u:any) => String(u.email || "").toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  if (req.method !== "POST") return reply({ error:"method_not_allowed" }, 405);

  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return reply({ error:"forbidden_origin" }, 403);
  if (!url || !pub || !sec) return reply({ error:"server_config_error" }, 500);

  let body:any = {};
  try { body = await req.json(); } catch {}
  const admin = createClient(url, sec, { auth:{ persistSession:false, autoRefreshToken:false } });
  const publicClient = createClient(url, pub, { auth:{ persistSession:false, autoRefreshToken:false } });

  // This check is mandatory before OUR Google button initiates OAuth.
  // Supabase Auth's built-in captchaToken option does not apply to signInWithOAuth.
  if (body.action === "google_captcha_verify") {
    const token = typeof body.token === "string" ? body.token : "";
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
    if (!secret) return reply({ error:"captcha_unavailable" }, 503);
    if (!token || token.length > 2048) return reply({ error:"captcha_required" }, 400);
    try {
      const form = new FormData();
      form.append("secret", secret);
      form.append("response", token);
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
        method:"POST",body:form,signal:AbortSignal.timeout(8000)
      });
      if (!verification.ok) return reply({ error:"captcha_unavailable" }, 503);
      const result = await verification.json();
      if (result.success !== true || result.hostname !== "agent-mobile-production.up.railway.app"
          || result.action !== "google_signup") {
        return reply({ error:"captcha_failed" }, 400);
      }
      return reply({ ok:true });
    } catch {
      return reply({ error:"captcha_unavailable" }, 503);
    }
  }

  if (body.action === "google_signup_route") {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return reply({ error:"authentication_required" }, 401);
    const { data:verified, error:authError } = await publicClient.auth.getUser(auth.slice(7));
    if (authError || !verified.user) return reply({ error:"invalid_session" }, 401);
    const {data,error} = await admin.rpc("agent_signup_route_internal",{
      p_user_id:verified.user.id
    });
    if (error || !data || typeof data.route!=="string")return reply({error:"signup_route_failed"},503);
    return reply({ok:true,route:data.route});
  }

  if (body.action !== "invite_session") return reply({ error:"unknown_action" }, 400);

  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  if (!validEmail(email) || !validCode(code)) return reply({ error:"invalid_or_expired_access_link" }, 400);

  const codeHash = await sha256Hex(code);

  // Atomically consume first. A simultaneous/replayed request can never succeed twice.
  const { data:consumed, error:consumeError } = await admin.rpc("consume_agent_auth_invite_internal", {
    p_email: email,
    p_code_hash: codeHash
  });
  if (consumeError) {
    console.error("AGENT_INVITE_CONSUME", consumeError.code || "", consumeError.message || "");
    return reply({ error:"access_link_failed" }, 500);
  }
  if (!consumed || consumed.length !== 1) return reply({ error:"invalid_or_expired_access_link" }, 400);

  try {
    let user = await findUserByEmail(admin, email);
    if (!user) {
      const { data:created, error:createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true
      });
      if (createError || !created.user) throw createError || new Error("user_create_failed");
      user = created.user;
    }

    // Owner identities must never be converted into Agent identities by an invite link.
    const ownerProbe = await admin.rpc("owner_dashboard_internal", { p_user_id:user.id });
    if (!ownerProbe.error) return reply({ error:"owner_email_not_allowed" }, 403);

    const { data:linkData, error:linkError } = await admin.auth.admin.generateLink({
      type:"magiclink",
      email
    });
    if (linkError) throw linkError;
    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error("token_generation_failed");

    const { data:verified, error:verifyError } = await publicClient.auth.verifyOtp({
      token_hash: tokenHash,
      type:"email"
    });
    if (verifyError || !verified.session) throw verifyError || new Error("session_generation_failed");

    return reply({
      ok:true,
      access_token:verified.session.access_token,
      refresh_token:verified.session.refresh_token,
      expires_in:verified.session.expires_in,
      token_type:verified.session.token_type,
      user_id:verified.user?.id || user.id
    });
  } catch (e:any) {
    console.error("AGENT_AUTH_SESSION", e?.message || e);
    return reply({ error:"access_link_failed" }, 500);
  }
});
