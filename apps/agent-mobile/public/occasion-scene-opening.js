// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeOutCubic, lerp, phase } from "./occasion-scene-math.js";
const OpeningSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const pulse = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const cutShift = lerp(0, 32, phase(t, 0.45, 0.9));
      const scissorX = lerp(62, 134, phase(t, 0, 0.55));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF6F0" }), /* @__PURE__ */ svgNode("rect", { x: "44", y: "64", width: "8", height: "106", rx: "4", fill: "#D97706" }), /* @__PURE__ */ svgNode("rect", { x: "228", y: "64", width: "8", height: "106", rx: "4", fill: "#D97706" }), /* @__PURE__ */ svgNode("rect", { x: "52", y: "96", width: 88 - cutShift, height: "16", fill: "#C93B3B" }), /* @__PURE__ */ svgNode("rect", { x: 140 + cutShift, y: "96", width: 88 - cutShift, height: "16", fill: "#C93B3B" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${scissorX.toFixed(1)} 72)` }, /* @__PURE__ */ svgNode("circle", { cx: "-12", cy: "-10", r: "7", fill: "none", stroke: "#26255F", strokeWidth: "3" }), /* @__PURE__ */ svgNode("circle", { cx: "-12", cy: "10", r: "7", fill: "none", stroke: "#26255F", strokeWidth: "3" }), /* @__PURE__ */ svgNode("line", { x1: "-5", y1: "-6", x2: "20", y2: "8", stroke: "#475569", strokeWidth: "3.5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "-5", y1: "6", x2: "20", y2: "-8", stroke: "#475569", strokeWidth: "3.5", strokeLinecap: "round" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 104, scale: lerp(0.32, 0.54, e) }));
    }
    case 1: {
      const dropY = lerp(-24, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF7F5" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${106 + dropY})` }, /* @__PURE__ */ svgNode("line", { x1: "0", y1: "-24", x2: "-36", y2: "70", stroke: "#92400E", strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "-24", x2: "36", y2: "70", stroke: "#92400E", strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "16", rx: "44", ry: "18", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "-22", cy: "14", r: "10", fill: "#EF4444" }), /* @__PURE__ */ svgNode("circle", { cx: "22", cy: "14", r: "10", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "-24", rx: "52", ry: "24", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "-26", cy: "-30", r: "12", fill: "#EF4444" }), /* @__PURE__ */ svgNode("circle", { cx: "26", cy: "-30", r: "12", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-40", r: "14", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: -20, scale: 0.44 })));
    }
    case 2: {
      const slide = lerp(0, 38, easeOutCubic(phase(t, 0.1, 0.78)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EBF4F6" }), /* @__PURE__ */ svgNode("rect", { x: "46", y: "28", width: "188", height: "146", rx: "6", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "3" }), /* @__PURE__ */ svgNode("rect", { x: 54 - slide, y: "36", width: "84", height: "130", fill: "#D8EBF0", opacity: 0.85, stroke: "#26255F", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("rect", { x: 142 + slide, y: "36", width: "84", height: "130", fill: "#D8EBF0", opacity: 0.85, stroke: "#26255F", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "146", rx: "28", ry: "12", fill: "#26255F" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 96, scale: 0.56 }));
    }
    case 3: {
      const glow = lerp(0.35, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#1B1B42" }), /* @__PURE__ */ svgNode("rect", { x: "34", y: "48", width: "212", height: "104", rx: "12", fill: "#26255F", stroke: "#8CB863", strokeWidth: "3", opacity: glow }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 92, y: 100, scale: 0.62, outlineOnLight: false, coreScale: 1 + 0.12 * pulse }), /* @__PURE__ */ svgNode("g", { opacity: glow }, /* @__PURE__ */ svgNode("rect", { x: "138", y: "76", width: "84", height: "12", rx: "6", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("rect", { x: "138", y: "98", width: "64", height: "10", rx: "5", fill: "#8CB863" }), /* @__PURE__ */ svgNode("rect", { x: "138", y: "116", width: "76", height: "10", rx: "5", fill: "#FBBF24" })));
    }
    case 4: {
      const bannerH = lerp(24, 128, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF6EF" }), /* @__PURE__ */ svgNode("rect", { x: "108", y: "32", width: "64", height: bannerH, rx: "6", fill: "#C93B3B", stroke: "#F59E0B", strokeWidth: "2.5" }), bannerH > 64 && /* @__PURE__ */ svgNode("g", { opacity: phase(t, 0.35, 0.8) }, /* @__PURE__ */ svgNode("line", { x1: "140", y1: "84", x2: "140", y2: Math.min(144, bannerH + 14), stroke: "#FDE68A", strokeWidth: "3", strokeDasharray: "6 4" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 54, scale: 0.4 }));
    }
    case 5: {
      const bloom = lerp(0.55, 1.05, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF9F0" }), /* @__PURE__ */ svgNode("line", { x1: "140", y1: "144", x2: "140", y2: "76", stroke: "#26255F", strokeWidth: "5" }), /* @__PURE__ */ svgNode("ellipse", { cx: "116", cy: "96", rx: "22", ry: "10", fill: "#8CB863", transform: "rotate(-24 116 96)" }), /* @__PURE__ */ svgNode("ellipse", { cx: "164", cy: "96", rx: "22", ry: "10", fill: "#8CB863", transform: "rotate(24 164 96)" }), /* @__PURE__ */ svgNode("polygon", { points: "104,136 176,136 164,174 116,174", fill: "#C93B3B" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 66) scale(${bloom.toFixed(3)})` }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "32", fill: "#EF4444", opacity: 0.22 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 0, scale: 0.56, rosetteRotate: t * 90 })));
    }
    case 6: {
      const ringScale = lerp(0.7, 1.38, e);
      const ringAlpha = Math.max(0, 1 - e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F8F5EE" }), /* @__PURE__ */ svgNode("line", { x1: "72", y1: "42", x2: "208", y2: "42", stroke: "#26255F", strokeWidth: "6", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "84", y1: "42", x2: "84", y2: "168", stroke: "#26255F", strokeWidth: "5" }), /* @__PURE__ */ svgNode("line", { x1: "196", y1: "42", x2: "196", y2: "168", stroke: "#26255F", strokeWidth: "5" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "108", r: 44 * ringScale, fill: "none", stroke: "#F59E0B", strokeWidth: "2.5", opacity: ringAlpha }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "108", r: "44", fill: "#F59E0B", stroke: "#B45309", strokeWidth: "3" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 108, scale: 0.54, coreScale: 1 + 0.14 * pulse }));
    }
    case 7: {
      const roll = lerp(0.25, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F5F3EE" }), /* @__PURE__ */ svgNode("polygon", { points: `120,${178 - roll * 96} 160,${178 - roll * 96} 216,178 64,178`, fill: "#B91C1C" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "88", width: "22", height: "76", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode("rect", { x: "194", y: "88", width: "22", height: "76", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode("circle", { cx: "75", cy: "82", r: "14", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "205", cy: "82", r: "14", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 64, scale: 0.56 }));
    }
    case 8: {
      const shootY = lerp(18, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F0F7F1" }), /* @__PURE__ */ svgNode("g", { transform: `translate(0 ${shootY.toFixed(1)})` }, /* @__PURE__ */ svgNode("rect", { x: "122", y: "42", width: "10", height: "82", rx: "4", fill: "#65A30D" }), /* @__PURE__ */ svgNode("rect", { x: "136", y: "30", width: "10", height: "94", rx: "4", fill: "#8CB863" }), /* @__PURE__ */ svgNode("rect", { x: "150", y: "48", width: "10", height: "76", rx: "4", fill: "#4D7C0F" }), /* @__PURE__ */ svgNode("ellipse", { cx: "110", cy: "64", rx: "16", ry: "7", fill: "#8CB863", transform: "rotate(-24 110 64)" }), /* @__PURE__ */ svgNode("ellipse", { cx: "170", cy: "68", rx: "16", ry: "7", fill: "#8CB863", transform: "rotate(24 170 68)" })), /* @__PURE__ */ svgNode("rect", { x: "96", y: "118", width: "88", height: "52", rx: "10", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 144, scale: 0.42 }));
    }
    default: {
      const keyX = lerp(42, 108, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF7F0" }), /* @__PURE__ */ svgNode("rect", { x: "138", y: "96", width: "84", height: "66", rx: "8", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "164", cy: "88", r: "14", fill: "#FDE68A" }), /* @__PURE__ */ svgNode("circle", { cx: "196", cy: "88", r: "14", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "180", cy: "76", r: "16", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${keyX.toFixed(1)} 104)` }, /* @__PURE__ */ svgNode("circle", { cx: "-18", cy: "0", r: "14", fill: "none", stroke: "#D97706", strokeWidth: "5" }), /* @__PURE__ */ svgNode("rect", { x: "-4", y: "-3", width: "38", height: "6", rx: "2", fill: "#D97706" }), /* @__PURE__ */ svgNode("rect", { x: "20", y: "3", width: "6", height: "10", fill: "#D97706" }), /* @__PURE__ */ svgNode("rect", { x: "29", y: "3", width: "5", height: "8", fill: "#D97706" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: -18, y: 32, scale: 0.34 })));
    }
  }
};
export {
  OpeningSceneGroup
};
