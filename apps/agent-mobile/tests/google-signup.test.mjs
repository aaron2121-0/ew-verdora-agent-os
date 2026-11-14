import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const app=read("apps/agent-mobile/public/app.js");
const html=read("apps/agent-mobile/public/index.html");
const agentAuth=read("supabase/functions/agent-auth/index.ts");
const owner=read("supabase/functions/owner-session/index.ts");
const ownerUi=read("apps/owner-mobile/index.ts");
const migration=read("supabase/migrations/20261115090000_agent_signup_toggle.sql");

test("existing Google and invitation sign-in remain intact",()=>{
  assert.match(app,/signInWithOAuth\(\{provider:"google"/);
  assert.match(app,/action:"invite_session"/);
  assert.match(html,/id="googleBtn"/);
  assert.match(html,/id="register"/);
});

test("no Turnstile, captcha challenge, grant, or external gate remains",()=>{
  const combined=[app,html,agentAuth,owner,migration].join("\n");
  assert.doesNotMatch(combined,/turnstile|captcha|agent_google_signup_challenges|agent_google_signup_grants|google_captcha_verify/i);
});

test("signup toggle defaults open and SQL functions use paired dollar quotes",()=>{
  assert.match(migration,/values \('agent_signup\.open', 'true'::jsonb\)/);
  assert.match(migration,/owner_signup_setting_get_internal/);
  assert.match(migration,/owner_signup_setting_set_internal/);
  assert.match(migration,/guard_agent_registration_signup_toggle/);
  assert.match(migration,/owner_cannot_register_as_agent/);
  assert.match(migration,/agent_signup_closed/);
  assert.doesNotMatch(migration,/as \$\s*(?:\n|$)/);
  assert.equal((migration.match(/create or replace function public\.owner_signup_setting_get_internal/g)||[]).length,1);
  assert.equal((migration.match(/create or replace function public\.owner_signup_setting_set_internal/g)||[]).length,1);
});

test("Owner API and UI expose only the simple registration switch",()=>{
  assert.match(owner,/signup_setting_get/);
  assert.match(owner,/signup_setting_set/);
  assert.match(owner,/typeof b\.open!=="boolean"/);
  assert.match(ownerUi,/开放新 Agent 自己用 Google 注册/);
  assert.match(ownerUi,/只能用邀请链接加入/);
  assert.match(ownerUi,/signup_setting_get/);
  assert.match(ownerUi,/signup_setting_set/);
});
