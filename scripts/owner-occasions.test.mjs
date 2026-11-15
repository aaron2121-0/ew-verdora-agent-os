import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

class Node {
  constructor(tag = "div") { this.tagName = tag; this.children = []; this.value = ""; this.checked = false; this.disabled = false; this.events = {}; this.text = ""; this.attributes = {}; this.style = {}; this.classes = new Set(); this.classList = { add: key => this.classes.add(key), remove: key => this.classes.delete(key), contains: key => this.classes.has(key), toggle: (key, state) => state ? this.classes.add(key) : this.classes.delete(key) }; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(""); }
  set innerHTML(value) { throw Error("User data must never enter innerHTML"); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.text = ""; this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, fn) { this.events[key] = fn; }
  focus() {}
  scrollIntoView() {}
  async fire(key) { return this.events[key]?.({ preventDefault() {} }); }
}
const descendants = root => [root, ...root.children.flatMap(descendants)];
const find = (root, predicate) => descendants(root).find(predicate);
const fixture = {
  id: "00000000-0000-4000-8000-000000000001", name_zh: "测试场合", name_en: "Test occasion", category: "event",
  flower_demand: "high", recurrence: "fixed", date_status: "pattern", confidence: "medium", estimated_date: "2026-12-01",
  date_start: null, date_end: null, location_or_audience: "Test only", typical_products: ["Rose"], order_lead_days: 21,
  past_2024: null, past_2025: null, source_url: null, evidence: null,
};
function setup(response = { occasions: [fixture], verifications: [] }) {
  const source = readFileSync(new URL("../apps/owner-mobile/index.ts", import.meta.url), "utf8");
  const start = source.indexOf("// BEGIN OWNER OCCASIONS");
  const end = source.indexOf("// END OWNER OCCASIONS");
  assert.ok(start >= 0 && end > start, "Native Owner occasion implementation exists");
  const nodes = new Map(), calls = [];
  const $ = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  const context = vm.createContext({ document: { createElement: tag => new Node(tag) }, $, URL, Intl, Date, Number, String, Array, Object, Map, Set, JSON, Error,
    window: { confirm: () => true }, session: { access_token: "test" },
    call: async body => { calls.push(body); return response; },
  });
  vm.runInContext(source.slice(start, end), context);
  return { context, $, calls, set: code => vm.runInContext(code, context), response };
}

test("Owner controls stay hidden and never call the API without Owner role", async () => {
  const env = setup();
  await assert.rejects(env.context.refreshOwnerOccasions(), /owner_required/);
  assert.equal(env.calls.length, 0);
  assert.equal(env.$("ownerOccasionsCard").classList.contains("hidden"), true);
});

test("native list renders user text safely and filters by category, status and month", async () => {
  const env = setup({ occasions: [{ ...fixture, name_zh: '<img src=x onerror="alert(1)">' }, { ...fixture, id: "00000000-0000-4000-8000-000000000002", category: "wedding", estimated_date: "2027-01-04" }], verifications: [] });
  env.set("ownerOccasionRole=true");
  await env.context.refreshOwnerOccasions();
  assert.match(env.$("occasionList").textContent, /<img src=x/);
  assert.equal(find(env.$("occasionList"), node => node.tagName === "img"), undefined);
  env.$("occasionCategoryFilter").value = "wedding";
  await env.$("occasionCategoryFilter").fire("change");
  assert.equal(env.$("occasionList").children.length, 1);
  assert.doesNotMatch(env.$("occasionList").textContent, /<img/);
  env.$("occasionMonthFilter").value = "2026-12";
  await env.$("occasionMonthFilter").fire("change");
  assert.match(env.$("occasionList").textContent, /没有符合/);
});

test("review queue requires explicit date confirmation, renders proof safely and sends approved/rejected", async () => {
  const verification = { id: "00000000-0000-4000-8000-000000000003", occasion_id: fixture.id, status: "pending", proposed_date_start: "2026-12-08", proposed_date_end: "2026-12-09", note: "<script>bad()</script>", proof_url: "javascript:alert(1)" };
  const env = setup({ occasions: [fixture], verifications: [verification] });
  env.set("ownerOccasionRole=true"); await env.context.refreshOwnerOccasions();
  assert.match(env.$("occasionVerificationQueue").textContent, /2026-12-08/);
  assert.equal(find(env.$("occasionVerificationQueue"), node => node.tagName === "a"), undefined);
  let approve = find(env.$("occasionVerificationQueue"), node => node.tagName === "button" && node.textContent.includes("核准"));
  await approve.fire("click");
  assert.equal(env.calls.length, 1);
  find(env.$("occasionVerificationQueue"), node => node.type === "checkbox").checked = true;
  await approve.fire("click");
  assert.equal(env.calls[1].action, "occasion_verification_review");
  assert.equal(env.calls[1].decision, "approved");
  const reject = find(env.$("occasionVerificationQueue"), node => node.tagName === "button" && node.textContent.includes("退回"));
  await reject.fire("click");
  assert.equal(env.calls.at(-2).decision, "rejected");
});

test("upsert requires real dates and a fresh Owner checkbox; sends source field names", async () => {
  const env = setup(); env.set("ownerOccasionRole=true");
  env.context.openOwnerOccasionForm({ ...fixture, date_status: "confirmed", date_start: "2026-12-01", date_end: "2026-12-02" });
  const form = find(env.$("occasionFormHost"), node => node.tagName === "form");
  const field = name => find(form, node => node.name === name);
  await form.fire("submit"); assert.equal(env.calls.length, 0);
  field("confirm").checked = true;
  field("date_end").value = "2026-11-01";
  await form.fire("submit"); assert.equal(env.calls.length, 0);
  field("date_end").value = "2026-12-03";
  await form.fire("submit");
  const payload = env.calls[0];
  assert.equal(payload.action, "occasion_upsert");
  assert.equal(payload.id, fixture.id);
  assert.equal(payload.confirm, true);
  assert.equal(payload.occasion.date_end, "2026-12-03");
  assert.deepEqual(JSON.parse(JSON.stringify(payload.occasion.typical_products)), ["Rose"]);
  assert.equal("verified_by" in payload.occasion, false);
});

test("sign-out reset discards occasion data, forms and permissions", async () => {
  const env = setup(); env.set("ownerOccasionRole=true");
  await env.context.refreshOwnerOccasions(); env.context.openOwnerOccasionForm(fixture);
  env.context.clearOwnerOccasions();
  assert.equal(env.$("occasionList").textContent, "");
  assert.equal(env.$("occasionFormHost").children.length, 0);
  await assert.rejects(env.context.refreshOwnerOccasions(), /owner_required/);
});
