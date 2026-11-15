// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
function clamp01(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}
function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}
function phase(t, start, end) {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp01((t - start) / (end - start));
}
function easeOutCubic(t) {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3;
}
function easeInOutSine(t) {
  const u = clamp01(t);
  return -(Math.cos(Math.PI * u) - 1) / 2;
}
function arcJump(t, height) {
  const u = clamp01(t);
  return -4 * height * u * (u - 1);
}
function bellCurve(t, center = 0.5, width = 0.25) {
  const d = (clamp01(t) - center) / Math.max(0.01, width);
  return Math.exp(-d * d * 2);
}
export {
  arcJump,
  bellCurve,
  clamp01,
  easeInOutSine,
  easeOutCubic,
  lerp,
  phase
};
