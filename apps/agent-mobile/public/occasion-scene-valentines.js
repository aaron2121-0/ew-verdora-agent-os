// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeInOutSine, easeOutCubic, lerp, phase } from "./occasion-scene-math.js";
const RoseBloom = ({
  x,
  y,
  scale = 1,
  color = "#E11D48",
  inner = "#9F1239"
}) => /* @__PURE__ */ svgNode("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})` }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "20", fill: color }), /* @__PURE__ */ svgNode("path", { d: "M -12 -6 Q 0 -18 12 -6 Q 16 8 0 14 Q -16 8 -12 -6 Z", fill: inner, opacity: 0.65 }), /* @__PURE__ */ svgNode("path", { d: "M -7 -2 Q 0 -10 7 -2 Q 6 6 0 8 Q -6 6 -7 -2 Z", fill: color }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "3.5", fill: inner }));
const ValentinesSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const pulse = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const bloom = lerp(0.45, 1.04, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDF2F4" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 82) scale(${bloom.toFixed(3)})` }, /* @__PURE__ */ svgNode(RoseBloom, { x: -26, y: 6, scale: 0.78 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 26, y: 6, scale: 0.78 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 0, y: -10, scale: 0.96 })), /* @__PURE__ */ svgNode("polygon", { points: "88,104 192,104 156,174 124,174", fill: "#1F2937" }), /* @__PURE__ */ svgNode("rect", { x: "114", y: "128", width: "52", height: "10", rx: "4", fill: "#F59E0B" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 133, scale: 0.44 }));
    }
    case 1: {
      const lidOpen = lerp(0, -48, easeOutCubic(phase(t, 0.1, 0.78)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "74", y: "106", width: "132", height: "58", rx: "8", fill: "#9F1239" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 106, y: 96, scale: 0.62 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 140, y: 92, scale: 0.68 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 174, y: 96, scale: 0.62 }), /* @__PURE__ */ svgNode("g", { transform: `translate(0 ${lidOpen.toFixed(1)})` }, /* @__PURE__ */ svgNode("rect", { x: "70", y: "88", width: "140", height: "24", rx: "6", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 76, scale: 0.44, outlineOnLight: false })));
    }
    case 2: {
      const slide = lerp(24, -18, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF4F4" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${72 + slide})` }, /* @__PURE__ */ svgNode("rect", { x: "-48", y: "-32", width: "96", height: "68", rx: "4", fill: "#FFFFFF", stroke: "#E11D48", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 0, y: -4, scale: 0.65, color: "#FB7185", inner: "#E11D48" })), /* @__PURE__ */ svgNode("rect", { x: "72", y: "96", width: "136", height: "72", rx: "6", fill: "#F8ECEC", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 132, scale: 0.44 }));
    }
    case 3: {
      const bridgeGlow = 0.65 + 0.35 * pulse;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#1C1B4B" }), /* @__PURE__ */ svgNode("path", { d: "M 28 148 Q 140 82 252 148", stroke: "#93C5FD", strokeWidth: "6", fill: "none", opacity: bridgeGlow }), /* @__PURE__ */ svgNode("circle", { cx: "60", cy: "48", r: "2.5", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "220", cy: "44", r: "3", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "96", cy: "36", r: "2", fill: "#93C5FD" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 92, y: 120, scale: 0.78, color: "#60A5FA", inner: "#2563EB" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 188, y: 120, scale: 0.78, color: "#60A5FA", inner: "#2563EB" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 78, scale: 0.56, coreScale: 1 + 0.14 * pulse, outlineOnLight: false }));
    }
    case 4: {
      const layerSpread = lerp(0.75, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EFF6FF" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 112) scale(${layerSpread.toFixed(3)})` }, /* @__PURE__ */ svgNode("polygon", { points: "-48,-16 48,-16 14,56 -14,56", fill: "#BFDBFE", stroke: "#FFFFFF", strokeWidth: "2" }), /* @__PURE__ */ svgNode("polygon", { points: "-34,-12 34,-12 10,48 -10,48", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode(RoseBloom, { x: -16, y: -28, scale: 0.72, color: "#60A5FA", inner: "#1D4ED8" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 16, y: -28, scale: 0.72, color: "#93C5FD", inner: "#2563EB" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 0, y: -38, scale: 0.86, color: "#3B82F6", inner: "#1E40AF" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 16, scale: 0.38 })));
    }
    case 5: {
      const angle = t * Math.PI * 2;
      const rx = Math.cos(angle) * 66;
      const ry = Math.sin(angle) * 34;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF1F2" }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "100", rx: "68", ry: "36", fill: "none", stroke: "#FDA4AF", strokeWidth: "2", strokeDasharray: "6 6" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 140 + rx, y: 100 + ry, scale: 0.7 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 140 - rx, y: 100 - ry, scale: 0.7, color: "#FB7185" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 100, scale: 0.56 }));
    }
    case 6: {
      const flicker = 1 + 0.14 * pulse;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#2A1B2E" }), /* @__PURE__ */ svgNode("rect", { x: "44", y: "142", width: "192", height: "24", rx: "6", fill: "#FFFFFF", opacity: 0.14 }), /* @__PURE__ */ svgNode("rect", { x: "86", y: "102", width: "10", height: "40", fill: "#FFFBEB" }), /* @__PURE__ */ svgNode("circle", { cx: "91", cy: "92", r: 6 * flicker, fill: "#FBBF24" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 140, y: 76, scale: 0.75 }), /* @__PURE__ */ svgNode("path", { d: "M 128 96 L 152 96 L 158 142 L 122 142 Z", fill: "#FFFFFF", opacity: 0.85 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 188, y: 114, scale: 0.44, outlineOnLight: false }));
    }
    case 7: {
      const cinch = lerp(22, 6, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF5F7" }), /* @__PURE__ */ svgNode("line", { x1: "126", y1: "74", x2: "136", y2: "168", stroke: "#8CB863", strokeWidth: "5" }), /* @__PURE__ */ svgNode("line", { x1: "154", y1: "74", x2: "144", y2: "168", stroke: "#8CB863", strokeWidth: "5" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 122, y: 64, scale: 0.82 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 158, y: 64, scale: 0.82 }), /* @__PURE__ */ svgNode("rect", { x: 140 - cinch - 14, y: "114", width: (cinch + 14) * 2, height: "12", rx: "6", fill: "#E11D48" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 120, scale: 0.42 }));
    }
    case 8: {
      const spark = 0.85 + 0.25 * pulse;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF5FF" }), /* @__PURE__ */ svgNode("rect", { x: "86", y: "72", width: "46", height: "82", rx: "10", fill: "#FDE8EC", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("rect", { x: "98", y: "54", width: "22", height: "18", rx: "3", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "170", cy: "82", r: "5", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("circle", { cx: "190", cy: "96", r: "5", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("circle", { cx: "178", cy: "112", r: "5", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 109, y: 114, scale: 0.34, coreScale: spark }), /* @__PURE__ */ svgNode(RoseBloom, { x: 178, y: 138, scale: 0.75 }));
    }
    default: {
      const glow = lerp(0.45, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#1E1B4B" }), /* @__PURE__ */ svgNode("rect", { x: "44", y: "34", width: "192", height: "132", rx: "12", fill: "#FFF1F2", opacity: glow, stroke: "#E11D48", strokeWidth: "3" }), /* @__PURE__ */ svgNode(RoseBloom, { x: 88, y: 126, scale: 0.78 }), /* @__PURE__ */ svgNode(RoseBloom, { x: 192, y: 126, scale: 0.78 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 96, scale: 0.62 }));
    }
  }
};
export {
  ValentinesSceneGroup
};
