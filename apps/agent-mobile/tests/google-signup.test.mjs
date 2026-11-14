import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {googleText,oauthReturnError} from "../public/google-auth.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const app=read("apps/agent-mobile/public/app.js");
const html=read("apps/agent-mobile/public/index.html");
const agentAuth=read("supabase/functions/agent-auth/index.ts");
const owner=read("supabase/functions/owner-session/index.ts");
const migration=read("supabase/migrations/20261114170000_agent_google_signup_gate.sql");
const bundle=read("apps/agent-mobile/build-railway-function.mjs");
const server=read("apps/agent-mobile/server.ts");

test("OAuth cancellation and failures have explicit bilingual messages",()=>{
  assert.equal(oauthReturnError("?error=access_denied&error_description=User+denied"),"googleCancelled");
  assert.equal(oauthReturnError("?error=server_error"),"googleFailed");
  assert.equal(oauthReturnError("?code=an-auth-code"),null);
  for(const lang of ["zh","en"]){
    for(const key of ["googleContinue","googleCancelled","googleFailed","googleSessionFailed",
      "inviteOnlyTitle","ownerBlockedBody","captchaBlockedTitle"])
      assert.notEqual(googleText(lang,key),key);
  }
  assert.match(googleText("zh","inviteOnlyTitle"),/邀请/);
  assert.match(googleText("en","ownerBlockedTitle"),/Owner/);
});

test("real Supabase PKCE flow and old invite link remain present",()=>{
  assert.match(app,/flowType:"pkce"/);
  assert.match(app,/detectSessionInUrl:false/);
  assert.match(app,/exchangeCodeForSession\(code\)/);
  assert.match(app,/auth\.signOut\(\)/);
  assert.match(app,/action:"invite_session"/);
  assert.match(app,/const inviteCode=hash\.get\("invite"\)/);
  assert.match(app,/google_signup_route/);
  assert.match(app,/captchaBlocked/);
  assert.match(html,/id="googleLoginBtn"/);
  assert.match(html,/id="signupBlocked"/);
  assert.match(html,/id="ownerBlocked"/);
  assert.match(html,/id="register"/);
});

test("Google captcha has a real server-side, single-use proof",()=>{
  assert.match(agentAuth,/turnstile\/v0\/siteverify/);
  assert.match(agentAuth,/result\.hostname !== "agent-mobile-production\.up\.railway\.app"/);
  assert.match(agentAuth,/result\.action !== "google_signup"/);
  assert.match(agentAuth,/agent_signup_challenge_create_internal/);
  assert.match(agentAuth,/agent_signup_challenge_consume_internal/);
  assert.match(migration,/nonce_hash text primary key/);
  assert.match(migration,/used_at is null and expires_at>now\(\)/);
  assert.match(migration,/agent_google_signup_grants/);
  assert.match(migration,/raise exception 'captcha_required'/);
  assert.match(migration,/raise exception 'agent_signup_closed'/);
  assert.match(migration,/from auth\.identities/);
  assert.match(migration,/used_at is not null/);
});

test("Owner-only signup switch defaults off and changes are audited",()=>{
  assert.match(migration,/values \('agent_signup\.open', 'false'::jsonb\)/);
  assert.match(migration,/v_role is distinct from 'owner'/);
  assert.match(migration,/agent_signup_setting_changed/);
  assert.match(migration,/private\.audit_events/);
  assert.match(owner,/signup_setting_get/);
  assert.match(owner,/signup_setting_set/);
  assert.match(owner,/typeof b\.open!=="boolean"/);
  assert.match(migration,/revoke all on function public\.owner_signup_setting_set_internal/);
  assert.match(migration,/grant execute on function public\.agent_signup_route_internal\(uuid\) to service_role/);
});

test("public site key only, CSP scoped to Turnstile (Google uses top-level redirect)",()=>{
  for(const source of [bundle,server]){
    assert.match(source,/turnstileSiteKey:Bun\.env\.TURNSTILE_SITE_KEY/);
    assert.match(source,/script-src 'self' https:\/\/challenges\.cloudflare\.com/);
    assert.match(source,/frame-src https:\/\/challenges\.cloudflare\.com/);
    assert.match(source,/connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co https:\/\/challenges\.cloudflare\.com/);
    assert.doesNotMatch(source,/accounts\.google\.com/);
    assert.doesNotMatch(source,/TURNSTILE_SECRET_KEY/);
  }
  assert.match(bundle,/"google-auth\.js"/);
  assert.doesNotMatch(read("apps/agent-mobile/public/google-auth.js"),/TURNSTILE_SECRET_KEY/);
  assert.match(agentAuth,/Deno\.env\.get\("TURNSTILE_SECRET_KEY"\)/);
});
