import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const migration=read("supabase/migrations/20261115170000_profit_contribution_floor.sql");
const ownerSession=read("supabase/functions/owner-session/index.ts");
const ownerUi=read("apps/owner-mobile/index.ts");
const agentAi=read("supabase/functions/agent-ai/index.ts");
const quoteIntake=read("supabase/functions/quote-intake/index.ts");

test("hard floor is configurable but never below 50 percent",()=>{
  assert.match(migration,/profit_floor/);
  assert.match(migration,/min_contribution_margin/);
  assert.match(migration,/greatest\(\s*0\.50::numeric/i);
  assert.match(migration,/p_margin<0\.50/);
});

test("quote and order guards use the floor without lowering commission",()=>{
  assert.match(migration,/create or replace function public\.create_quote_internal/i);
  assert.match(migration,/create_order_from_quote_internal\([\s\S]*p_delivery_cost_estimate/i);
  assert.match(migration,/order_profit_floor_failed/);
  assert.match(migration,/v_agent\.commission_rate/);
  assert.doesNotMatch(migration,/update public\.agents set commission_rate/i);
});

test("completed low-margin orders create Owner exceptions instead of blocking history",()=>{
  assert.match(migration,/low_contribution_margin/);
  assert.match(migration,/insert into public\.exceptions/i);
  assert.match(migration,/below_floor/);
  assert.match(migration,/bonus_alloc:=round\(o\.commissionable_revenue\*bonus_pct,2\)/);
});

test("Owner backend exposes floor controls and delivery estimate",()=>{
  assert.match(ownerSession,/profit_floor_overview/);
  assert.match(ownerSession,/set_profit_floor/);
  assert.match(ownerSession,/p_delivery_cost_estimate:deliveryCost/);
  assert.match(ownerUi,/Contribution Margin Floor/);
  assert.match(ownerUi,/launch-delivery-cost/);
  assert.match(ownerUi,/profitFloorQuotes/);
  assert.match(ownerUi,/profitFloorOrders/);
});

test("Agent-facing paths fail closed without leaking financial guard details",()=>{
  assert.match(agentAi,/containsSensitiveOutput/);
  assert.doesNotMatch(agentAi,/profit_floor/);
  assert.doesNotMatch(agentAi,/minimum_contribution_margin_floor/);
  assert.match(quoteIntake,/q\.status!==["']approved["']/);
  assert.match(quoteIntake,/quote_requires_owner_review/);
  assert.doesNotMatch(quoteIntake,/hard_floor_min_selling_price/);
});

test("money functions use dollar-quoted bodies",()=>{
  for(const fn of [
    "owner_set_profit_floor_internal",
    "quote_underwrite_internal",
    "create_quote_internal",
    "create_quote_from_request_internal",
    "create_order_from_quote_internal",
    "record_completed_order_actuals_internal",
    "owner_profit_floor_overview_internal"
  ]){
    const start=migration.indexOf("function "+(fn.startsWith("owner_")||fn.startsWith("quote_")||fn.startsWith("create_")||fn.startsWith("record_")?"public.":"private.")+fn);
    assert.ok(start>=0,"missing "+fn);
  }
  assert.doesNotMatch(migration,/\$function\$/);
  assert.match(migration,/as \$\$/);
});
