// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeInOutSine, lerp } from "./occasion-scene-math.js";
const WhiteChrysanthemum = ({
  x,
  y,
  scale = 1,
  opacity = 1
}) => /* @__PURE__ */ svgNode("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})`, opacity }, [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => /* @__PURE__ */ svgNode(
  "ellipse",
  {
    key: deg,
    cx: "0",
    cy: "-16",
    rx: "3.2",
    ry: "12",
    fill: "#FFFFFF",
    stroke: "#CBD5E1",
    strokeWidth: "0.8",
    transform: `rotate(${deg})`
  }
)), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "6", fill: "#E2E8F0" }));
const CondolenceSceneGroup = ({ index, t }) => {
  const calm = easeInOutSine(t);
  const softBreath = 0.5 + 0.5 * Math.sin(t * Math.PI);
  switch (index) {
    case 0: {
      const fade = lerp(0.55, 1, calm);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F2F4F3" }), /* @__PURE__ */ svgNode("g", { opacity: fade }, /* @__PURE__ */ svgNode("line", { x1: "140", y1: "110", x2: "120", y2: "68", stroke: "#64748B", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("line", { x1: "140", y1: "110", x2: "162", y2: "72", stroke: "#64748B", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("line", { x1: "140", y1: "110", x2: "140", y2: "54", stroke: "#64748B", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(WhiteChrysanthemum, { x: 118, y: 66, scale: 0.78 }), /* @__PURE__ */ svgNode(WhiteChrysanthemum, { x: 162, y: 70, scale: 0.74 }), /* @__PURE__ */ svgNode(WhiteChrysanthemum, { x: 140, y: 50, scale: 0.92 }), /* @__PURE__ */ svgNode("path", { d: "M 118 110 L 162 110 L 154 166 Q 140 174 126 166 Z", fill: "#DDE5E2", stroke: "#94A3B8", strokeWidth: "1.5" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 198, y: 152, scale: 0.32, opacity: lerp(0.45, 0.85, calm) }));
    }
    case 1: {
      const halo = lerp(22, 30, softBreath);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "116", cy: "72", r: halo, fill: "#FEF3C7", opacity: 0.14 }), /* @__PURE__ */ svgNode("rect", { x: "102", y: "88", width: "28", height: "72", rx: "4", fill: "#F8FAFC" }), /* @__PURE__ */ svgNode("path", { d: "M 116 62 Q 123 74 116 82 Q 109 74 116 62 Z", fill: "#FDE68A", opacity: lerp(0.75, 0.96, softBreath) }), /* @__PURE__ */ svgNode(WhiteChrysanthemum, { x: 168, y: 136, scale: 0.86, opacity: 0.92 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 176, y: 78, scale: 0.44, opacity: lerp(0.55, 0.88, calm), outlineOnLight: false }));
    }
    case 2: {
      const lean = lerp(4, 10, calm);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F4F5F6" }), /* @__PURE__ */ svgNode("path", { d: "M 134 166 Q 128 110 104 68", stroke: "#8CB863", strokeWidth: "3", fill: "none", opacity: 0.7 }), /* @__PURE__ */ svgNode("path", { d: "M 146 166 Q 152 106 176 68", stroke: "#8CB863", strokeWidth: "3", fill: "none", opacity: 0.7 }), /* @__PURE__ */ svgNode("g", { transform: `translate(104 68) rotate(${(-lean).toFixed(1)})` }, /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "-12", rx: "9", ry: "18", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.4" }), /* @__PURE__ */ svgNode("ellipse", { cx: "-10", cy: "0", rx: "8", ry: "15", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.2", transform: "rotate(-35)" })), /* @__PURE__ */ svgNode("g", { transform: `translate(176 68) rotate(${lean.toFixed(1)})` }, /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "-12", rx: "9", ry: "18", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.4" }), /* @__PURE__ */ svgNode("ellipse", { cx: "10", cy: "0", rx: "8", ry: "15", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.2", transform: "rotate(35)" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 138, scale: 0.38, opacity: lerp(0.5, 0.9, calm) }));
    }
    case 3: {
      const drapeAlpha = lerp(0.5, 1, calm);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EEF0F2" }), /* @__PURE__ */ svgNode("g", { opacity: drapeAlpha }, /* @__PURE__ */ svgNode("line", { x1: "94", y1: "156", x2: "184", y2: "54", stroke: "#8CB863", strokeWidth: "2.5", opacity: 0.75 }), /* @__PURE__ */ svgNode("path", { d: "M 88 86 Q 140 120 192 86 L 182 142 Q 140 112 98 142 Z", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.5" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 102, scale: 0.42, opacity: drapeAlpha }));
    }
    case 4: {
      const shimmer = lerp(0.45, 0.95, softBreath);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode(WhiteChrysanthemum, { x: 108, y: 102, scale: 1.15, opacity: 0.94 }), /* @__PURE__ */ svgNode("circle", { cx: "94", cy: "84", r: "3.5", fill: "#E2E8F0", opacity: shimmer }), /* @__PURE__ */ svgNode("circle", { cx: "122", cy: "116", r: "2.8", fill: "#E2E8F0", opacity: shimmer }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 190, y: 102, scale: 0.46, opacity: lerp(0.6, 0.9, calm), outlineOnLight: false }));
    }
    case 5: {
      const ringAlpha = lerp(0.5, 1, calm);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F4F5F4" }), /* @__PURE__ */ svgNode("g", { opacity: ringAlpha }, /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "88", r: "46", fill: "none", stroke: "#8CB863", strokeWidth: "8", opacity: 0.4 }), [0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = deg * Math.PI / 180;
        return /* @__PURE__ */ svgNode(WhiteChrysanthemum, { key: deg, x: 140 + Math.cos(rad) * 44, y: 88 + Math.sin(rad) * 44, scale: 0.45 });
      }), /* @__PURE__ */ svgNode("rect", { x: "132", y: "132", width: "16", height: "32", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.2" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 88, scale: 0.36, opacity: ringAlpha }));
    }
    case 6: {
      const fade = lerp(0.55, 1, calm);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F3F4F2" }), /* @__PURE__ */ svgNode("g", { opacity: fade }, /* @__PURE__ */ svgNode("rect", { x: "66", y: "108", width: "148", height: "58", rx: "4", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("polygon", { points: "104,88 140,74 176,88 140,104", fill: "#E2E8F0", stroke: "#94A3B8", strokeWidth: "1.2" }), /* @__PURE__ */ svgNode("polygon", { points: "140,74 152,50 158,78", fill: "#FFFFFF", stroke: "#94A3B8", strokeWidth: "1.2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 182, y: 137, scale: 0.28 })));
    }
    case 7: {
      const flapY = lerp(52, 86, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F5F5F4" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "64", width: "152", height: "92", rx: "6", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode("polygon", { points: `64,64 216,64 140,${flapY.toFixed(1)}`, fill: "#F8FAFC", stroke: "#94A3B8", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 118, scale: 0.38, opacity: lerp(0.5, 0.92, calm) }));
    }
    case 8: {
      const rippleR = lerp(26, 48, calm);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EBF0F2" }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "144", rx: rippleR * 1.4, ry: "14", fill: "none", stroke: "#94A3B8", strokeWidth: "1.5", opacity: 1 - calm * 0.5 }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "144", rx: rippleR, ry: "10", fill: "none", stroke: "#64748B", strokeWidth: "1.2", opacity: 0.6 }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "96", rx: "14", ry: "28", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("ellipse", { cx: "116", cy: "108", rx: "12", ry: "22", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.5", transform: "rotate(-28 116 108)" }), /* @__PURE__ */ svgNode("ellipse", { cx: "164", cy: "108", rx: "12", ry: "22", fill: "#FFFFFF", stroke: "#CBD5E1", strokeWidth: "1.5", transform: "rotate(28 164 108)" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 56, scale: 0.34, opacity: lerp(0.5, 0.88, calm) }));
    }
    default: {
      const coneAlpha = lerp(0.14, 0.28, softBreath);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("polygon", { points: "88,68 152,68 190,174 50,174", fill: "#FEF3C7", opacity: coneAlpha }), /* @__PURE__ */ svgNode("polygon", { points: "88,42 152,42 162,70 78,70", fill: "#F8FAFC" }), /* @__PURE__ */ svgNode("line", { x1: "120", y1: "70", x2: "120", y2: "164", stroke: "#E2E8F0", strokeWidth: "4" }), /* @__PURE__ */ svgNode(WhiteChrysanthemum, { x: 174, y: 122, scale: 0.72 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 174, y: 64, scale: 0.34, opacity: 0.82, outlineOnLight: false }));
    }
  }
};
export {
  CondolenceSceneGroup
};
