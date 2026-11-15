import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { MOTION_PRESET_LIST, MOTION_REGISTRY, SCENE_GROUPS, matchSceneForOccasion } from "../public/occasion-registry.js";
import { renderOccasionScene } from "../public/occasion-scenes.js";

const families = {
  graduation: ["graduation", "GraduationSceneGroup"], kindergarten: ["kindergarten", "KindergartenSceneGroup"],
  opening: ["opening", "OpeningSceneGroup"], condolence: ["condolence", "CondolenceSceneGroup"],
  wedding: ["wedding", "WeddingSceneGroup"], mothers_day: ["mothersDay", "MothersDaySceneGroup"],
  valentines: ["valentines", "ValentinesSceneGroup"], festival: ["festival", "FestivalSceneGroup"],
  corporate: ["corporate", "CorporateSceneGroup"], daily: ["daily", "DailySceneGroup"],
};

test("executed native registry has 100 enabled presets, 10 per group, complete labels and original durations", () => {
  assert.equal(MOTION_PRESET_LIST.length, 100);
  assert.equal(Object.keys(MOTION_REGISTRY).length, 100);
  assert.equal(MOTION_PRESET_LIST.filter(preset => preset.enabled_in_v1).length, 100);
  assert.equal(SCENE_GROUPS.length, 10);
  for (const group of SCENE_GROUPS) {
    const presets = MOTION_PRESET_LIST.filter(preset => preset.group === group.id);
    assert.equal(presets.length, 10, group.id);
    assert.deepEqual(presets.map(preset => preset.indexInGroup), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  for (const preset of MOTION_PRESET_LIST) {
    assert.equal(preset.restrained, preset.group === "condolence", preset.id);
    assert.ok(preset.duration >= 1500 && preset.duration <= 3000);
    for (const field of ["name_zh", "name_en", "occasion_zh", "occasion_en", "trigger_zh", "trigger_en", "logoRole_zh", "logoRole_en"]) assert.ok(preset[field], `${preset.id}:${field}`);
  }
  assert.equal(MOTION_REGISTRY["grad-01"].name_en, "Graduation Cap Toss & Bouquet");
  assert.equal(MOTION_REGISTRY["grad-01"].duration, 2500);
  assert.equal(MOTION_REGISTRY["daily-04"].duration, 2000);
});

test("all 100 presets produce distinct native SVG scenes with changing choreography", async () => {
  const fingerprints = new Set();
  for (const [group, [file, exportName]] of Object.entries(families)) {
    const module = await import(`../public/occasion-scene-${file}.js`);
    const render = module[exportName];
    const groupFingerprints = new Set();
    for (const preset of MOTION_PRESET_LIST.filter(item => item.group === group)) {
      const beginning = JSON.stringify(render({ index: preset.indexInGroup, t: 0 }));
      const hero = JSON.stringify(render({ index: preset.indexInGroup, t: 0.68 }));
      assert.notEqual(beginning, hero, `${preset.id} must animate its own scene`);
      assert.doesNotMatch(hero, /NaN|Infinity|undefined/);
      groupFingerprints.add(hero);
      fingerprints.add(hero);
    }
    assert.equal(groupFingerprints.size, 10, group);
  }
  assert.equal(fingerprints.size, 100);
});

test("name and category matching works for real imported IDs, including solemn cultural occasions", () => {
  for (const [name, expected] of [
    ["Christmas 2027", "fest-02"], ["Chinese New Year", "fest-01"], ["Chap Goh Mei", "fest-06"],
    ["Qixi Festival", "val-04"], ["Wesak Day", "cond-09"], ["清明节", "cond-01"],
    ["Hari Gawai Dayak", "fest-04"], ["Mother's Day", "mom-01"], ["Father's Day", "corp-01"],
    ["International Nurses Day", "corp-03"], ["Swinburne Convocation", "grad-04"], ["UNIMAS Convocation", "grad-05"],
  ]) assert.equal(matchSceneForOccasion({ id: "real-imported-id", name_en: name, category: "festival" }).id, expected, name);
  assert.equal(matchSceneForOccasion({ category: "wedding" }).group, "wedding");
  assert.equal(matchSceneForOccasion({ category: "business" }).id, "open-02");
  assert.equal(matchSceneForOccasion({ name_zh: "幼儿园毕业典礼", category: "graduation" }).group, "kindergarten");
  assert.equal(matchSceneForOccasion({ id: "11111111-0005-4000-8000-000000000005", name_en: "Qingming" }).group, "condolence");
});

test("scene modules avoid framework/runtime dependencies, markup injection, new animation clocks, and condolence confetti", async () => {
  const files = ["occasion-rules.js", "occasion-registry.js", "occasion-scenes.js", "occasion-scene-dom.js", "occasion-scene-math.js", "occasion-scene-logo.js", ...Object.values(families).map(([file]) => `occasion-scene-${file}.js`)];
  for (const file of files) {
    const source = await fs.readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\s*(?:=|\()/, file);
    assert.doesNotMatch(source, /\brequestAnimationFrame\s*\(/, file);
    assert.doesNotMatch(source, /(?:from|import\()\s*["'](?:react|react-dom|motion|framer-motion|tailwind)/, file);
    assert.doesNotMatch(source, /SEED_OCCASIONS|seedPreviewData/, file);
  }
  const solemn = await fs.readFile(new URL("../public/occasion-scene-condolence.js", import.meta.url), "utf8");
  assert.doesNotMatch(solemn, /confetti|particle|burst|bounce|arcJump|bellCurve/i);
});

// A small DOM fixture exercises native patching and lifecycle with a deterministic
// logoMotion adapter. No timers or separate animation clock drive SVG progress.
class Events {
  listeners = new Map();
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn(event); }
}
class Element extends Events {
  constructor(doc, tag, text = null) { super(); this.ownerDocument = doc; this.localName = tag; this.nodeType = text == null ? 1 : 3; this.childNodes = []; this.attributes = new Map(); this.textContent = text || ""; }
  get lastChild() { return this.childNodes.at(-1); }
  appendChild(child) { child.parentNode = this; this.childNodes.push(child); return child; }
  replaceChild(next, child) { this.childNodes[this.childNodes.indexOf(child)] = next; next.parentNode = this; child.parentNode = null; }
  replaceChildren(...children) { for (const child of this.childNodes) child.parentNode = null; this.childNodes = []; children.forEach(child => this.appendChild(child)); }
  remove() { if (this.parentNode) { const parent = this.parentNode; parent.childNodes.splice(parent.childNodes.indexOf(this), 1); this.parentNode = null; } }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}
class Document extends Events {
  hidden = false;
  constructor() { super(); this.head = new Element(this, "head"); }
  createElement(tag) { return new Element(this, tag); }
  createElementNS(namespace, tag) { const node = new Element(this, tag); node.namespaceURI = namespace; return node; }
  createTextNode(text) { return new Element(this, "#text", text); }
  querySelector() { return this.head.childNodes.find(node => node.attributes.has("data-occasion-motion")); }
}
function fixture(reduced = false) {
  const doc = new Document(), host = doc.createElement("div"), media = new Events();
  media.matches = reduced;
  const definitions = new Map(), calls = [];
  const engine = {
    mount(host) { return host.__vl ||= { svg: doc.createElementNS("http://www.w3.org/2000/svg", "svg") }; },
    reg(id, glow, duration, fn) { definitions.set(id, { duration, fn }); },
    play(host, id, options) {
      const definition = definitions.get(id);
      let tween, resolve;
      definition.fn({ svg: host.__vl.svg, glow() {}, tween(duration, fn) { tween = fn; } });
      const control = {
        options, duration: definition.duration, finished: new Promise(done => { resolve = done; }),
        seek(ms) { tween(ms / definition.duration); }, resume() { this.resumed = true; },
        cancel() { this.canceled = true; resolve(); }, finish() { tween(1); resolve(); },
      };
      calls.push(control); tween(0); return control;
    },
  };
  const original = globalThis.window;
  globalThis.window = { matchMedia: () => media, VerdoraMotion: { logoMotion: engine } };
  return { doc, host, media, calls, restore() { if (original === undefined) delete globalThis.window; else globalThis.window = original; } };
}

test("playback uses engine duration/seek, SVG patches reuse nodes, cancel and destroy release lifecycle state", async () => {
  const fx = fixture();
  let completed = 0;
  try {
    const player = await renderOccasionScene(fx.host, { sceneId: "grad-01", lang: "en", onComplete: () => completed++ });
    const root = fx.host.childNodes[0], svg = root.childNodes[0], artwork = svg.childNodes[0];
    assert.equal(svg.getAttribute("viewBox"), "0 0 280 200");
    assert.equal(svg.getAttribute("aria-label"), "Graduation Cap Toss & Bouquet");
    assert.equal(fx.calls[0].duration, 2500);
    assert.equal(fx.calls[0].resumed, true);
    player.seek(0.5);
    assert.equal(fx.calls[0].canceled, true);
    assert.equal(player.progress, 0.5);
    assert.equal(svg.childNodes[0], artwork, "reuse the existing SVG DOM tree");
    player.play();
    assert.equal(player.progress, 0.5, "resume from the paused scene position");
    fx.calls[1].finish();
    await Promise.resolve();
    assert.equal(completed, 1);
    assert.equal(player.playing, false);
    player.play();
    assert.equal(player.progress, 0, "finished scenes replay from start");
    player.cancel();
    await Promise.resolve();
    assert.equal(completed, 1, "cancel never signals successful completion");
    player.destroy();
    assert.equal(fx.host.childNodes.length, 0);
    assert.equal(fx.doc.listeners.get("visibilitychange").size, 0);
    assert.equal(fx.media.listeners.get("change").size, 0);
  } finally { fx.restore(); }
});

test("reduced motion renders a static restrained pose without creating an engine clock", async () => {
  const fx = fixture(true);
  let player;
  try {
    player = await renderOccasionScene(fx.host, { sceneId: "cond-01", intensity: 5, autoPlay: false });
    assert.equal(fx.calls.length, 0);
    assert.equal(player.progress, 0.68);
    const root = fx.host.childNodes[0];
    assert.equal(root.getAttribute("data-restrained"), "true");
    assert.equal(root.getAttribute("data-intensity"), "1");
    assert.ok(root.childNodes[0].childNodes.length);
    player.play();
    assert.equal(fx.calls.length, 0);
    player.cancel();
    assert.equal(player.playing, false);
  } finally { player?.destroy(); fx.restore(); }
});

test("replacement and page hiding stop active playback and stale async mounts", async () => {
  const fx = fixture();
  let second;
  try {
    const firstPromise = renderOccasionScene(fx.host, { sceneId: "grad-02" });
    second = await renderOccasionScene(fx.host, { sceneId: "fest-02" });
    const first = await firstPromise;
    assert.equal(first.playing, false);
    assert.equal(fx.host.childNodes.length, 1);
    assert.equal(fx.host.childNodes[0].getAttribute("data-scene-id"), "fest-02");
    fx.doc.hidden = true;
    fx.doc.dispatch("visibilitychange");
    assert.equal(second.playing, false);
    assert.equal(fx.calls.at(-1).canceled, true);
  } finally { second?.destroy(); fx.restore(); }
});
