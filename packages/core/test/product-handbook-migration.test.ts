import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { test } from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261113145300_product_handbook.sql", import.meta.url),
  "utf8",
);

test("phase A defines all requested handbook and portfolio enums", () => {
  for (const value of ["story", "product_line", "service_rule", "delivery", "script", "announcement"]) {
    assert.ok(migration.includes("'" + value + "'"), value);
  }
  for (const value of ["facebook", "upload", "export_zip", "condolence", "opening", "bouquet", "wedding_event", "wholesale", "unknown", "pending_review", "approved", "hidden"]) {
    assert.ok(migration.includes("'" + value + "'"), value);
  }
});

test("phase A tables and portfolio bucket default to service-only private access", () => {
  assert.match(migration, /alter table public\.company_knowledge enable row level security/i);
  assert.match(migration, /alter table public\.portfolio_photos enable row level security/i);
  assert.match(migration, /revoke all on table public\.company_knowledge,public\.portfolio_photos from public,anon,authenticated/i);
  assert.match(migration, /grant select,insert,update,delete on table public\.company_knowledge,public\.portfolio_photos to service_role/i);
  assert.doesNotMatch(migration, /create\s+policy\s/i);
  assert.match(migration, /values \('portfolio','portfolio',false\)/i);
  assert.match(migration, /status public\.portfolio_status not null default 'pending_review'/i);
  assert.match(migration, /source_id text not null unique/i);
  assert.match(migration, /check \(ai_confidence between 0 and 1\)/i);
});

test("phase A seeds five product lines, the three requested scripts, and no invented prices", () => {
  const seeds = migration.slice(migration.indexOf("insert into public.company_knowledge\n"));
  const knownProductTitles = ["Condolence", "Grand Opening", "Bouquet", "Wedding / Event", "Wholesale"];
  for (const name of knownProductTitles) {
    assert.ok(seeds.includes("'product_line','" + name + "'"), name);
  }
  for (const name of [
    "If asked about a negative Google review",
    "If asked whether flowers will be fresh",
    "If asked to replicate a reference photo",
  ]) {
    assert.ok(seeds.includes("'script','" + name + "'"), name);
  }
  const ids = [...seeds.matchAll(/'a0000000-0000-4000-8000-0000000000[0-9]{2}'/g)];
  assert.equal(ids.length, 20);
  assert.match(seeds, /Ask for current price/);
  assert.doesNotMatch(seeds, /\bRM\s?\d|\bcommission\b|\bprofit\s+margin\b|\bTIN\b/i);
});

test("every unconfirmed address and hour is hidden and disabled by default", () => {
  for (const suffix of ["17", "18", "19", "20"]) {
    const id = "a0000000-0000-4000-8000-0000000000" + suffix;
    const start = migration.indexOf("'" + id + "'");
    assert.ok(start >= 0, id);
    const next = migration.indexOf("\n('a0000000-", start + 1);
    const row = migration.slice(start, next >= 0 ? next : migration.indexOf("\non conflict (id)", start));
    assert.match(row, /,false,false,true\)\s*,?\s*$/);
  }
});
