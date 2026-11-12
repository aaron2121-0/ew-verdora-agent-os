import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const read=p=>fs.readFileSync(p,"utf8");
const perf=read(path.join(root,"public/performance.js"));
const phase=read(path.join(root,"public/phase1.js"));
const app=read(path.join(root,"public/app.js"));
const edge=read(path.join(repoRoot,"supabase/functions/agent-session/index.ts"));
const sql=read(path.join(repoRoot,"supabase/migrations/20261113_phase2_agent_performance_dashboard.sql"));

test("Phase 2 performance UI remains native and safe",()=>{
  for(const src of [perf,phase,app]){
    assert.equal(/\.innerHTML\s*=|insertAdjacentHTML/.test(src),false);
    assert.equal(/from\s+["']react["']|react-dom|jsx-runtime/i.test(src),false);
  }
  assert.match(perf,/element\(/);
});

test("Phase 2 uses five-minute user-scoped frontend cache",()=>{
  assert.match(perf,/const TTL=5\*60\*1000/);
  assert.match(perf,/getUserId\(\)/);
  assert.match(perf,/sessionStorage/);
  assert.match(perf,/sales_dashboard/);
});

test("Phase 2 supports pull refresh and foreground refresh",()=>{
  assert.match(perf,/touchstart/);
  assert.match(perf,/touchmove/);
  assert.match(perf,/touchend/);
  assert.match(perf,/onForeground/);
  assert.match(app,/visibilitychange/);
  assert.match(app,/UI\?\.onForeground/);
});

test("Phase 2 aggregation RPCs are read-only security definers with empty search_path",()=>{
  const defs=(sql.match(/create or replace function public\.(?:agent_leaderboard_internal|agent_sales_dashboard_internal)[\s\S]*?grant execute[\s\S]*?service_role;/gi)||[]);
  assert.equal(defs.length,2);
  for(const def of defs){
    assert.match(def,/stable\s+security definer/i);
    assert.match(def,/set search_path\s*=\s*''/i);
    assert.match(def,/revoke all on function[\s\S]*from public,anon,authenticated/i);
    assert.match(def,/grant execute[\s\S]*service_role/i);
  }
});

test("Leaderboard counts only paid/completed net commissionable revenue",()=>{
  const leader=sql.split("create or replace function public.agent_sales_dashboard_internal")[0];
  assert.match(leader,/payment_status in \('paid','partially_refunded'\) or o\.status='completed'/i);
  assert.match(leader,/payment_status<>'refunded'/i);
  assert.match(leader,/o\.status<>'cancelled'/i);
  assert.match(leader,/a\.is_demo=false/i);
  assert.match(leader,/commissionable_revenue-least\(coalesce\(p\.refunds,0\),o\.commissionable_revenue\)/i);
  assert.match(leader,/order by revenue desc,orders desc,reached_at asc,agent_code asc/i);
});

test("Leaderboard output is aggregate-only and does not expose peer private records",()=>{
  const leader=sql.split("create or replace function public.agent_sales_dashboard_internal")[0];
  assert.match(leader,/'rank',rank,'label',label,'tier',tier,'revenue',revenue,'orders',orders,'is_me'/);
  assert.equal(/customer_label|lead_id|order_code|commission_rate|commission_amount/.test(leader),false);
});

test("Wallet ledger is scoped to requesting agent",()=>{
  assert.match(sql,/from public\.commissions c where c\.agent_id=p_agent_id/i);
  assert.match(sql,/from public\.commission_adjustments a where a\.agent_id=p_agent_id/i);
});

test("agent-session exposes only authenticated sales_dashboard aggregation",()=>{
  assert.match(edge,/action === "sales_dashboard"/);
  assert.match(edge,/agent_sales_dashboard_internal/);
  assert.match(edge,/agent_leaderboard_internal/);
  assert.match(edge,/auth\.getUser\(token\)/);
  assert.match(edge,/cache_ttl_seconds: 300/);
});
