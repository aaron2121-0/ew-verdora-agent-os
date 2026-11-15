import { MOTION_PRESET_LIST, MOTION_REGISTRY, matchSceneForOccasion } from "./occasion-registry.js";
import { SVG_NS, patchSvgChildren } from "./occasion-scene-dom.js";

export { MOTION_PRESET_LIST, MOTION_REGISTRY, matchSceneForOccasion };

const GROUP_LOADERS = {
  graduation: () => import("./occasion-scene-graduation.js").then(module => module.GraduationSceneGroup),
  kindergarten: () => import("./occasion-scene-kindergarten.js").then(module => module.KindergartenSceneGroup),
  opening: () => import("./occasion-scene-opening.js").then(module => module.OpeningSceneGroup),
  condolence: () => import("./occasion-scene-condolence.js").then(module => module.CondolenceSceneGroup),
  wedding: () => import("./occasion-scene-wedding.js").then(module => module.WeddingSceneGroup),
  mothers_day: () => import("./occasion-scene-mothersDay.js").then(module => module.MothersDaySceneGroup),
  valentines: () => import("./occasion-scene-valentines.js").then(module => module.ValentinesSceneGroup),
  festival: () => import("./occasion-scene-festival.js").then(module => module.FestivalSceneGroup),
  corporate: () => import("./occasion-scene-corporate.js").then(module => module.CorporateSceneGroup),
  daily: () => import("./occasion-scene-daily.js").then(module => module.DailySceneGroup),
};

const activeHosts = new WeakMap();
const registrations = new WeakMap();
let nextClockId = 930000;
let engineImport;

function ensureStyles(doc) {
  if (doc.querySelector('link[data-occasion-motion]')) return;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./occasion-motion.css", import.meta.url).href;
  link.setAttribute("data-occasion-motion", "");
  doc.head.appendChild(link);
}

async function getEngine() {
  if (!window.VerdoraMotion?.logoMotion) {
    engineImport ||= import("./ew-verdora-content/motion/logo-motion.js");
    await engineImport;
  }
  return window.VerdoraMotion.logoMotion;
}

// The existing logoMotion tween is the only playback clock. Register one reusable
// tween per preset; the active host supplies its own draw callback and duration.
function clockIdFor(engine, preset) {
  let ids = registrations.get(engine);
  if (!ids) { ids = new Map(); registrations.set(engine, ids); }
  if (!ids.has(preset.id)) {
    const id = ++nextClockId;
    engine.reg(id, "#FFFFFF", preset.duration, context => {
      context.glow("#FFFFFF", 0);
      context.tween(preset.duration, progress => context.svg.__occasionDraw?.(progress));
    });
    ids.set(preset.id, id);
  }
  return ids.get(preset.id);
}

/**
 * Mount a bounded scene and start playback. cancel()/pause() freeze the current
 * pose; seek() accepts 0..1 and pauses; play() resumes (or replays a finished
 * scene); destroy() releases animation/listeners and removes mounted nodes.
 * autoPlay:false is useful for gallery thumbnails and reduced-motion cards.
 */
export async function renderOccasionScene(host, {
  occasion = {}, sceneId, lang = "zh", daysUntil = 0, intensity = 1,
  onComplete, autoPlay = true,
} = {}) {
  activeHosts.get(host)?.destroy();
  const doc = host.ownerDocument || document;
  const preset = MOTION_REGISTRY[sceneId] || matchSceneForOccasion(occasion);
  const root = doc.createElement("div");
  root.className = "occasion-scene";
  root.setAttribute("data-scene-id", preset.id);
  root.setAttribute("data-scene-group", preset.group);
  root.setAttribute("data-restrained", String(preset.restrained));
  root.setAttribute("data-days-until", String(Number(daysUntil) || 0));
  root.setAttribute("data-intensity", String(preset.restrained ? 1 : Math.min(5, Math.max(1, Number(intensity) || 1))));
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 280 200");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", lang === "en" ? preset.name_en : preset.name_zh);
  svg.setAttribute("focusable", "false");
  root.appendChild(svg);
  host.replaceChildren(root);
  ensureStyles(doc);

  let destroyed = false, clock = null, engine = null, clockHost = null;
  let drawFamily = null, progress = 0.68, token = 0, completionTimer = null;
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let reduced = media?.matches === true;
  let playing = false;
  const draw = value => {
    if (destroyed || !drawFamily) return;
    progress = Math.max(0, Math.min(1, Number(value) || 0));
    patchSvgChildren(svg, drawFamily({ index: preset.indexInGroup, t: progress }));
    root.setAttribute("data-progress", progress.toFixed(3));
  };
  const cancel = () => {
    token += 1;
    playing = false;
    clearTimeout(completionTimer);
    completionTimer = null;
    clock?.cancel();
    clock = null;
  };
  const completed = playbackToken => {
    if (destroyed || playbackToken !== token || !playing) return;
    playing = false;
    clock = null;
    onComplete?.();
  };
  const controller = {
    preset,
    get progress() { return progress; },
    get playing() { return playing; },
    cancel,
    pause: cancel,
    seek(value) { cancel(); draw(value); },
    play() {
      if (destroyed || !drawFamily || playing) return;
      cancel();
      playing = true;
      const playbackToken = token;
      if (reduced || !engine) {
        draw(0.68);
        completionTimer = setTimeout(() => completed(playbackToken), 200);
        return;
      }
      const start = progress >= 1 ? 0 : progress;
      clock = engine.play(clockHost, clockIdFor(engine, preset), { force: true, paused: true });
      clock.seek(start * preset.duration);
      clock.resume();
      clock.finished.then(() => completed(playbackToken));
    },
    destroy() {
      if (destroyed) return;
      cancel();
      destroyed = true;
      if (clockHost?.__vl?.svg) delete clockHost.__vl.svg.__occasionDraw;
      media?.removeEventListener?.("change", preferenceChanged);
      doc.removeEventListener("visibilitychange", visibilityChanged);
      root.remove();
      if (activeHosts.get(host) === controller) activeHosts.delete(host);
    },
  };
  const preferenceChanged = event => {
    reduced = event.matches;
    if (reduced) { cancel(); draw(0.68); }
  };
  const visibilityChanged = () => { if (doc.hidden) cancel(); };
  activeHosts.set(host, controller);
  media?.addEventListener?.("change", preferenceChanged);
  doc.addEventListener("visibilitychange", visibilityChanged);
  try {
    drawFamily = await GROUP_LOADERS[preset.group]();
    if (destroyed) return controller;
    draw(autoPlay && !reduced ? 0 : 0.68);
    if (!reduced) {
      engine = await getEngine();
      if (destroyed) return controller;
      clockHost = doc.createElement("div");
      clockHost.className = "occasion-scene-clock";
      clockHost.setAttribute("aria-hidden", "true");
      root.appendChild(clockHost);
      const state = engine.mount(clockHost);
      state.svg.__occasionDraw = draw;
    }
    if (autoPlay && !doc.hidden) controller.play();
    return controller;
  } catch (error) {
    controller.destroy();
    throw error;
  }
}
