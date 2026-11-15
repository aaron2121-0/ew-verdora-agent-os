#!/usr/bin/env node
/**
 * node scripts/import-occasions.mjs <occasions.csv> [--dry-run | --apply]
 *
 * UTF-8 CSV, exact case-sensitive OccasionInput headers plus needs_owner_confirm.
 * Header order is flexible. Blank nullable fields become null. typical_products
 * is a JSON string array in a quoted CSV cell (double embedded CSV quotes).
 * needs_owner_confirm accepts only true/false. Optional exact Occasion columns:
 * id, verified_by, verified_at, created_at, updated_at. Audit/verification columns
 * are discarded; they never authorize confirmation. needs_owner_confirm=true
 * becomes pattern/not_found for in-app Owner review. false + confirmed means
 * --apply explicitly attests those dates as the authenticated Owner; the server
 * stamps verification using the real Owner identity/time. Review dates_to_confirm
 * in dry-run output before applying. A dry-run never confirms any date.
 * No database access. Default dry-run never reads credentials or calls a network.
 * --apply requires OWNER_ACCESS_TOKEN and SUPABASE_URL; SUPABASE_PUBLISHABLE_KEY
 * is optional for gateways that require apikey. Use only a publishable key here.
 * One file is one atomic Owner API request, with 1..200 rows and <=2 MiB of CSV.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_HEADERS = Object.freeze([
  "date_start", "date_end", "estimated_date", "name_zh", "name_en", "category",
  "location_or_audience", "flower_demand", "typical_products", "order_lead_days",
  "recurrence", "date_status", "confidence", "past_2024", "past_2025", "source_url",
  "evidence", "needs_owner_confirm",
]);
const OPTIONAL_HEADERS = ["id", "verified_by", "verified_at", "created_at", "updated_at"];
const MAX_BYTES = 2 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = message => { throw new Error(message); };

export function parseCSV(input) {
  if (typeof input !== "string") fail("CSV must be UTF-8 text");
  const source = input.replace(/^\uFEFF/, "");
  if (!source) return [];
  const rows = [];
  let row = [], cell = "", quoted = false, closed = false, start = true;
  const field = () => { row.push(cell); cell = ""; closed = false; start = true; };
  const record = () => { field(); rows.push(row); row = []; };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += char;
      continue;
    }
    if (char === ",") { field(); continue; }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      record(); continue;
    }
    if (closed) fail("Malformed CSV: unexpected text after a closing quote");
    if (char === '"') {
      if (!start) fail("Malformed CSV: quote inside an unquoted field");
      quoted = true; start = false; continue;
    }
    start = false; cell += char;
  }
  if (quoted) fail("Malformed CSV: unclosed quoted field");
  if (cell !== "" || row.length || closed) record();
  return rows;
}

function text(value, field, max, required = false) {
  if (value !== null && value !== undefined && typeof value !== "string") fail(field + " must be text");
  const result = String(value ?? "").trim();
  if (required && !result) fail(field + " is required");
  if (result.length > max || /\u0000/.test(result)) fail(field + " is too long or contains a null character");
  return result;
}
function date(value, field) {
  const result = text(value, field, 10);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || result < "0001-01-01") fail(field + " requires YYYY-MM-DD");
  const parsed = new Date(result + "T00:00:00Z");
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== result) fail(field + " is not a real date");
  return result;
}
function choice(value, field, allowed) {
  const result = text(value, field, 40, true);
  if (!allowed.includes(result)) fail(field + " must be one of " + allowed.join(", "));
  return result;
}
function webURL(value, field) {
  const result = text(value, field, 2048);
  if (!result) return null;
  try {
    const url = new URL(result);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || /\s/.test(result)) throw Error();
  } catch { fail(field + " requires an http(s) URL without credentials or whitespace"); }
  return result;
}

function normalizeRecord(source, index) {
  const label = "Row " + (index + 2) + ": ";
  if (!source || typeof source !== "object" || Array.isArray(source)) fail(label + "record must be an object");
  const nullable = (key, max) => text(source[key], label + key, max) || null;
  const record = {
    date_start: date(source.date_start, label + "date_start"),
    date_end: date(source.date_end, label + "date_end"),
    estimated_date: date(source.estimated_date, label + "estimated_date"),
    name_zh: text(source.name_zh, label + "name_zh", 240, true),
    name_en: text(source.name_en, label + "name_en", 240, true),
    category: choice(source.category, label + "category", ["graduation", "festival", "cultural", "business", "wedding", "event"]),
    location_or_audience: text(source.location_or_audience, label + "location_or_audience", 500),
    flower_demand: choice(source.flower_demand, label + "flower_demand", ["high", "medium", "low"]),
    typical_products: [],
    order_lead_days: 0,
    recurrence: choice(source.recurrence, label + "recurrence", ["fixed", "lunar", "variable"]),
    date_status: choice(source.date_status, label + "date_status", ["confirmed", "pattern", "not_found"]),
    confidence: choice(source.confidence, label + "confidence", ["high", "medium", "low"]),
    past_2024: nullable("past_2024", 1000), past_2025: nullable("past_2025", 1000),
    source_url: webURL(source.source_url, label + "source_url"), evidence: nullable("evidence", 10000),
    needs_owner_confirm: false,
  };
  let products;
  try { products = typeof source.typical_products === "string" ? JSON.parse(source.typical_products) : source.typical_products; }
  catch { fail(label + "typical_products must be a JSON string array"); }
  if (!Array.isArray(products) || products.length > 40) fail(label + "typical_products must be a JSON string array with at most 40 products");
  record.typical_products = products.map((product, i) => text(product, label + "typical_products[" + i + "]", 120, true));
  const lead = String(source.order_lead_days ?? "").trim();
  if (!/^\d+$/.test(lead) || Number(lead) > 365) fail(label + "order_lead_days must be an integer from 0 to 365");
  record.order_lead_days = Number(lead);
  const needs = source.needs_owner_confirm;
  if (needs !== true && needs !== false && needs !== "true" && needs !== "false") fail(label + "needs_owner_confirm must be true or false");
  record.needs_owner_confirm = needs === true || needs === "true";
  if (record.date_end && (!record.date_start || record.date_end < record.date_start)) fail(label + "date_end requires date_start and cannot precede it");
  if (record.date_status === "confirmed" && !record.date_start) fail(label + "confirmed requires date_start");
  const id = text(source.id, label + "id", 36);
  if (id) { if (!uuid.test(id)) fail(label + "id requires a UUID"); record.id = id; }
  // Imported verification metadata is discarded. Only explicit Owner apply can
  // attest false+confirmed rows; rows requiring confirmation stay unconfirmed.
  if (record.needs_owner_confirm) {
    record.estimated_date ||= record.date_start;
    record.date_start = null; record.date_end = null;
    record.date_status = record.estimated_date ? "pattern" : "not_found";
    record.confidence = record.estimated_date ? "medium" : "low";
  }
  return record;
}

function validateRecords(records) {
  if (!Array.isArray(records) || !records.length || records.length > 200) fail("Import requires 1..200 records; empty files are not imported");
  const normalized = records.map(normalizeRecord);
  const ids = new Set(), identities = new Set();
  const canonical = value => String(value ?? "").normalize("NFKC").toLowerCase().trim();
  for (const record of normalized) {
    if (record.id && ids.has(record.id.toLowerCase())) fail("Duplicate occasion id: " + record.id);
    if (record.id) ids.add(record.id.toLowerCase());
    const identity = JSON.stringify([record.name_zh, record.name_en, record.category, record.location_or_audience, record.date_start || record.estimated_date].map(canonical));
    if (identities.has(identity)) fail("Duplicate occasion identity: " + record.name_en);
    identities.add(identity);
  }
  return normalized;
}

export function parseOccasionsCSV(input) {
  if (Buffer.byteLength(input, "utf8") > MAX_BYTES) fail("CSV exceeds 2 MiB");
  const [headers, ...rows] = parseCSV(input);
  if (!headers) fail("CSV is empty; records are required");
  const seen = new Set();
  for (const key of headers) {
    if (seen.has(key)) fail("Duplicate CSV header: " + key);
    seen.add(key);
    if (![...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].includes(key)) fail("Unknown CSV header: " + key);
  }
  for (const key of REQUIRED_HEADERS) if (!seen.has(key)) fail("Missing CSV header: " + key);
  const records = rows.map((row, index) => {
    if (row.length !== headers.length) fail("CSV row " + (index + 2) + " has " + row.length + " columns; expected " + headers.length);
    return Object.fromEntries(headers.map((header, i) => [header, row[i]]));
  });
  return validateRecords(records);
}

export async function importOccasions(records, { accessToken, supabaseUrl, publishableKey, fetchImpl = fetch } = {}) {
  const normalized = validateRecords(records);
  if (!accessToken || typeof accessToken !== "string" || /\s/.test(accessToken)) fail("OWNER_ACCESS_TOKEN is required with --apply (Owner session access token)");
  let url;
  try {
    url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password || !["", "/"].includes(url.pathname) || url.search || url.hash) throw Error();
  } catch { fail("SUPABASE_URL must be an https origin without credentials, path or query"); }
  const body = JSON.stringify({ action: "occasion_import", records: normalized });
  if (Buffer.byteLength(body, "utf8") > MAX_BYTES) fail("Import request exceeds 2 MiB");
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + accessToken };
  if (publishableKey) headers.apikey = publishableKey;
  let response;
  try {
    response = await fetchImpl(url.origin + "/functions/v1/owner-session", {
      method: "POST", headers, body, redirect: "error", signal: AbortSignal.timeout(30000),
    });
  } catch { fail("Owner import request failed; no automatic retry. Check the result before retrying."); }
  if (!response.ok) fail("Owner import rejected (HTTP " + response.status + "); no automatic retry.");
  let result;
  try { result = await response.json(); } catch { fail("Owner import returned an invalid response; check the result before retrying."); }
  if (!Number.isInteger(result?.imported) || result.imported !== normalized.length) fail("Owner import count did not match; check the result before retrying.");
  return { imported: result.imported };
}

async function main(argv) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
    console.log("Usage: node scripts/import-occasions.mjs <occasions.csv> [--dry-run | --apply]\nRequired CSV headers (any order):\n" + REQUIRED_HEADERS.join(",") + "\nOptional: " + OPTIONAL_HEADERS.join(",") + "\ntypical_products: JSON string array; needs_owner_confirm: true/false.\ntrue keeps dates unconfirmed; false+confirmed means --apply attests those dates as the Owner.\nReview dates_to_confirm in dry-run output before applying. Verification metadata is ignored.\n--apply: OWNER_ACCESS_TOKEN, SUPABASE_URL; optional SUPABASE_PUBLISHABLE_KEY.");
    return;
  }
  let file = null, apply = false, explicitDryRun = false;
  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") explicitDryRun = true;
    else if (arg.startsWith("-") || file) fail("Unexpected argument: " + arg);
    else file = arg;
  }
  if (!file) fail("Usage: node scripts/import-occasions.mjs <occasions.csv> [--dry-run | --apply]");
  if (apply && explicitDryRun) fail("--apply and --dry-run cannot be used together");
  const records = parseOccasionsCSV(readFileSync(file, "utf8"));
  const result = apply ? await importOccasions(records, {
    accessToken: process.env.OWNER_ACCESS_TOKEN, supabaseUrl: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  }) : null;
  console.log(JSON.stringify({ ok: true, dry_run: !apply, records: records.length, needs_owner_confirm: records.filter(record => record.needs_owner_confirm).length, dates_to_confirm: records.filter(record => !record.needs_owner_confirm && record.date_status === "confirmed").length, ...(result || {}) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error("OCCASION_IMPORT_INVALID: " + error.message); process.exitCode = 1; });
}
