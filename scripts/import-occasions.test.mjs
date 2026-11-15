import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseCSV, parseOccasionsCSV, importOccasions, REQUIRED_HEADERS } from "./import-occasions.mjs";

// Fictional test data only; never a shipping occasion seed.
const base = {
  date_start: "2026-12-01", date_end: "2026-12-02", estimated_date: "",
  name_zh: "测试场合", name_en: "Fictional test occasion", category: "event",
  location_or_audience: "Test only", flower_demand: "medium", typical_products: '["测试花束","A, B"]',
  order_lead_days: "21", recurrence: "variable", date_status: "confirmed", confidence: "high",
  past_2024: "", past_2025: "", source_url: "https://example.com/proof", evidence: 'Line 1\nLine 2, "quoted"',
  needs_owner_confirm: "true",
};
const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
const csv = (records, headers = REQUIRED_HEADERS) => headers.join(",") + "\r\n" + records.map(record => headers.map(key => quote(record[key] ?? "")).join(",")).join("\r\n") + "\r\n";

test("parses BOM, CRLF, quoted commas, escaped quotes and multiline cells", () => {
  const records = parseOccasionsCSV("\uFEFF" + csv([base]));
  assert.equal(records[0].evidence, base.evidence);
  assert.deepEqual(records[0].typical_products, ["测试花束", "A, B"]);
  assert.equal(records[0].order_lead_days, 21);
  assert.equal(parseCSV('a,b\n"a\r\nb","c"\n')[1][0], "a\r\nb");
});

test("keeps imported dates unconfirmed when Owner confirmation is required", () => {
  const [record] = parseOccasionsCSV(csv([{ ...base, verified_by: "00000000-0000-4000-8000-000000000001", verified_at: "2026-11-15T00:00:00Z" }], [...REQUIRED_HEADERS, "verified_by", "verified_at"]));
  assert.equal(record.needs_owner_confirm, true);
  assert.equal(record.date_status, "pattern");
  assert.equal(record.estimated_date, "2026-12-01");
  assert.equal(record.date_start, null);
  assert.equal(record.date_end, null);
  assert.equal(record.confidence, "medium");
  assert.equal("verified_by" in record, false);
  assert.equal("verified_at" in record, false);
});

test("retains false plus confirmed for explicit authenticated Owner apply attestation", () => {
  const [record] = parseOccasionsCSV(csv([{ ...base, needs_owner_confirm: "false" }]));
  assert.equal(record.date_status, "confirmed");
  assert.equal(record.needs_owner_confirm, false);
  assert.equal(record.date_start, "2026-12-01");
});

test("rejects malformed CSV and inconsistent row widths", () => {
  for (const malformed of ['a,b\n"unclosed,b', 'a,b\n"quoted"oops,b', 'a,b\na"b,c', "a,b\na,b,c"]) {
    assert.throws(() => malformed.startsWith("a,b\na,b") ? parseOccasionsCSV(malformed) : parseCSV(malformed), /CSV|header/i);
  }
  assert.throws(() => parseOccasionsCSV(csv([base]).replace(/\r\n$/, ",extra\r\n")), /columns|列/i);
});

test("requires exact field names, rejects duplicate, unknown and missing headers", () => {
  assert.throws(() => parseOccasionsCSV(csv([base], [...REQUIRED_HEADERS, "category"])), /duplicate.*header/i);
  assert.throws(() => parseOccasionsCSV(csv([base], [...REQUIRED_HEADERS, "title"])), /unknown.*header/i);
  assert.throws(() => parseOccasionsCSV(csv([base], REQUIRED_HEADERS.filter(key => key !== "name_zh"))), /missing.*name_zh/i);
});

test("validates real dates, ranges, enums, integers, booleans, URLs and product arrays", () => {
  for (const patch of [
    { date_start: "2026-02-30" }, { date_start: "2026-2-1" }, { date_end: "2026-11-01" },
    { date_start: "", date_end: "2026-12-02" }, { category: "other" }, { confidence: "certain" },
    { flower_demand: "huge" }, { recurrence: "weekly" }, { date_status: "approved" },
    { order_lead_days: "1.5" }, { order_lead_days: "-1" }, { order_lead_days: "366" },
    { needs_owner_confirm: "yes" }, { needs_owner_confirm: "" }, { source_url: "javascript:alert(1)" },
    { source_url: "https://user:pass@example.com" }, { typical_products: "rose|lily" },
    { typical_products: '["rose",1]' }, { name_zh: " " },
  ]) assert.throws(() => parseOccasionsCSV(csv([{ ...base, ...patch }])), undefined, JSON.stringify(patch));
  assert.equal(parseOccasionsCSV(csv([{ ...base, date_start: "2028-02-29", date_end: "2028-02-29" }]))[0].estimated_date, "2028-02-29");
});

test("rejects duplicate IDs and duplicate occasion identities before import", () => {
  assert.throws(() => parseOccasionsCSV(csv([base, { ...base }])), /duplicate.*occasion/i);
  const id = "00000000-0000-4000-8000-000000000001";
  assert.throws(() => parseOccasionsCSV(csv([{ ...base, id }, { ...base, id, name_en: "Other" }], [...REQUIRED_HEADERS, "id"])), /duplicate.*id/i);
});

test("bounds the entire import to one nonempty atomic batch of at most 200", async () => {
  assert.throws(() => parseOccasionsCSV(REQUIRED_HEADERS.join(",") + "\n"), /empty|records/i);
  const records = Array.from({ length: 201 }, (_, i) => ({ ...base, name_en: "Test " + i }));
  assert.throws(() => parseOccasionsCSV(csv(records)), /200/);
  let called = false;
  await assert.rejects(importOccasions([], { accessToken: "test", supabaseUrl: "https://example.supabase.co", fetchImpl: async () => { called = true; } }), /empty|records/i);
  assert.equal(called, false);
});

test("apply uses only the Owner session route with bearer authorization and no redirects", async () => {
  const records = parseOccasionsCSV(csv([base]));
  const calls = [];
  const result = await importOccasions(records, {
    accessToken: "fictional-test-token", supabaseUrl: "https://example.supabase.co/",
    fetchImpl: async (url, options) => { calls.push({ url, options }); return Response.json({ imported: 1 }); },
  });
  assert.equal(result.imported, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.supabase.co/functions/v1/owner-session");
  assert.equal(calls[0].options.headers.Authorization, "Bearer fictional-test-token");
  assert.equal(calls[0].options.redirect, "error");
  assert.deepEqual(JSON.parse(calls[0].options.body), { action: "occasion_import", records });
});

test("apply does not leak server response content or tokens on errors", async () => {
  const records = parseOccasionsCSV(csv([base]));
  await assert.rejects(importOccasions(records, { accessToken: "fictional-test-token", supabaseUrl: "http://example.com", fetchImpl: () => assert.fail("must reject before network") }), /https/i);
  await assert.rejects(importOccasions(records, { accessToken: "fictional-test-token", supabaseUrl: "https://example.supabase.co", fetchImpl: async () => Response.json({ error: "fictional-test-token" }, { status: 403 }) }), error => error.message.includes("403") && !error.message.includes("fictional-test-token"));
});

test("CLI defaults to dry-run without credentials and requires explicit apply", () => {
  const folder = mkdtempSync(join(tmpdir(), "occasion-import-test-"));
  try {
    const file = join(folder, "test.csv"); writeFileSync(file, csv([base]));
    const env = { PATH: process.env.PATH };
    const dry = spawnSync(process.execPath, ["scripts/import-occasions.mjs", file], { encoding: "utf8", env });
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(JSON.parse(dry.stdout).dry_run, true);
    assert.equal(JSON.parse(dry.stdout).dates_to_confirm, 0);
    const apply = spawnSync(process.execPath, ["scripts/import-occasions.mjs", file, "--apply"], { encoding: "utf8", env });
    assert.equal(apply.status, 1);
    assert.match(apply.stderr, /OWNER_ACCESS_TOKEN/);
    const conflict = spawnSync(process.execPath, ["scripts/import-occasions.mjs", file, "--apply", "--dry-run"], { encoding: "utf8", env });
    assert.equal(conflict.status, 1);
    assert.match(conflict.stderr, /together|同时/);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
