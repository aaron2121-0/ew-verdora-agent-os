// EW VERDORA Logo 动态桥接:开场 Welcome + 每个底部 tab 点进去的 Logo 动态。
// 动态本体来自 ew-verdora-content 动态包(100 个,见 docs/motion-registry.json)。
import "./ew-verdora-content/motion/logo-motion.js";
import "./ew-verdora-content/motion/motions-1.js";
import "./ew-verdora-content/motion/motions-2.js";
import "./ew-verdora-content/motion/welcome.js";

// tab -> 动态 id(对应注册表的 trigger)
const TAB_MOTION = { today: 1, customers: 25, order: 36, training: 63, performance: 78 };
const CAP_MS = 900;          // 单次切页动态最长时间,避免每次点击都等
let overlay = null, current = null, cssLoaded = false;

function reduced() { return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true; }

function ensureCss(href) {
  if (document.querySelector('link[href="' + href + '"]')) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
}
function ensureAssets() {
  if (cssLoaded) return; cssLoaded = true;
  ensureCss("/ew-verdora-content/motion/logo-motion.css");
  ensureCss("/ew-verdora-content/motion/welcome.css");
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "lm-swap";
  overlay.setAttribute("aria-hidden", "true");
  const slot = document.createElement("div");
  slot.className = "lm-swap-logo";
  overlay.appendChild(slot);
  document.body.appendChild(overlay);
  return overlay;
}

/** 点 tab 时播一小段 Logo 动态;不阻塞导航,页面在底下照常切换。 */
export function playTabMotion(tab) {
  const LM = window.VerdoraMotion?.logoMotion;
  const id = TAB_MOTION[tab];
  if (!LM || !id || reduced()) return;
  ensureAssets();
  const el = ensureOverlay(), host = el.firstElementChild;
  if (current) { try { current.cancel(); } catch (e) { } current = null; }
  el.classList.add("on");
  try {
    LM.mount(host);
    current = LM.play(host, id, { force: true });
  } catch (e) { el.classList.remove("on"); return; }
  const stop = () => {
    el.classList.remove("on");
    setTimeout(() => { if (current) { try { current.cancel(); } catch (e) { } current = null; } }, 260);
  };
  setTimeout(stop, Math.min(CAP_MS, current.duration || CAP_MS));
}

/** 登录后进入 app 时的开场。每个会话完整播一次,之后 1.2s 简版。 */
export function runWelcome(opts) {
  const W = window.VerdoraMotion?.welcome;
  if (!W) return Promise.resolve();
  ensureAssets();
  try { return W.run(opts || {}).done; } catch (e) { return Promise.resolve(); }
}

export const tabMotionIds = TAB_MOTION;
