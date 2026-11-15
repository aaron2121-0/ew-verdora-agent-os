// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeInOutSine, easeOutCubic, lerp } from "./occasion-scene-math.js";
const DailySceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const loop = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const sunY = lerp(52, 34, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF8EE" }), /* @__PURE__ */ svgNode("circle", { cx: "64", cy: sunY, r: "18", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("path", { d: "M 96 64 L 184 64 L 194 174 L 86 174 Z", fill: "#1F4D3A" }), /* @__PURE__ */ svgNode("path", { d: "M 114 64 A 26 26 0 0 1 166 64", stroke: "#FFFFFF", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 118, scale: 0.5, outlineOnLight: false }));
    }
    case 1: {
      const driveX = lerp(-44, 24, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F0F7F4" }), /* @__PURE__ */ svgNode("line", { x1: "28", y1: "158", x2: "252", y2: "158", stroke: "#94A3B8", strokeWidth: "3", strokeDasharray: "10 6", strokeDashoffset: -t * 60 }), /* @__PURE__ */ svgNode("g", { transform: `translate(${140 + driveX} 122)` }, /* @__PURE__ */ svgNode("circle", { cx: "-38", cy: "24", r: "14", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "38", cy: "24", r: "14", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "-46", y: "-26", width: "54", height: "40", rx: "6", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("path", { d: "M 10 -4 L 38 -4 L 46 22 L -16 22 Z", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: -19, y: -6, scale: 0.34 })));
    }
    case 2: {
      const snip = Math.abs(Math.sin(t * Math.PI * 2)) * 18;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF7F0" }), /* @__PURE__ */ svgNode("line", { x1: "74", y1: "138", x2: "184", y2: "68", stroke: "#8CB863", strokeWidth: "7", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("circle", { cx: "188", cy: "64", r: "16", fill: "#F472B6" }), /* @__PURE__ */ svgNode("g", { transform: "translate(142 108)" }, /* @__PURE__ */ svgNode("line", { x1: "-22", y1: -snip * 0.5, x2: "22", y2: snip * 0.5, stroke: "#26255F", strokeWidth: "4.5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "-22", y1: snip * 0.5, x2: "22", y2: -snip * 0.5, stroke: "#475569", strokeWidth: "4.5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "4", fill: "#8CB863" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 208, y: 144, scale: 0.4 }));
    }
    case 3: {
      const bowScale = lerp(0.55, 1.05, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F8FAFC" }), /* @__PURE__ */ svgNode("rect", { x: "74", y: "66", width: "132", height: "96", rx: "10", fill: "#8CB863" }), /* @__PURE__ */ svgNode("rect", { x: "130", y: "66", width: "20", height: "96", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "74", y: "104", width: "132", height: "20", fill: "#26255F" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 114) scale(${bowScale.toFixed(3)})` }, /* @__PURE__ */ svgNode("ellipse", { cx: "-26", cy: "-10", rx: "22", ry: "12", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2", transform: "rotate(-16 -26 -10)" }), /* @__PURE__ */ svgNode("ellipse", { cx: "26", cy: "-10", rx: "22", ry: "12", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2", transform: "rotate(16 26 -10)" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 0, scale: 0.46 })));
    }
    case 4: {
      const fold = lerp(24, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF6EF" }), /* @__PURE__ */ svgNode("circle", { cx: "118", cy: "70", r: "14", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("circle", { cx: "162", cy: "70", r: "14", fill: "#F9A8D4" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "58", r: "16", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("polygon", { points: `${82 - fold},88 140,174 140,88`, fill: "#D9C39E" }), /* @__PURE__ */ svgNode("polygon", { points: `${198 + fold},88 140,174 140,88`, fill: "#C7AE83" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 132, scale: 0.44 }));
    }
    case 5: {
      const penX = lerp(96, 184, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FBF9F5" }), /* @__PURE__ */ svgNode("rect", { x: "68", y: "42", width: "144", height: "122", rx: "8", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("line", { x1: "92", y1: "74", x2: penX, y2: "74", stroke: "#26255F", strokeWidth: "3", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "92", y1: "94", x2: 92 + (penX - 92) * 0.72, y2: "94", stroke: "#8CB863", strokeWidth: "3", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${penX.toFixed(1)} 72) rotate(-32)` }, /* @__PURE__ */ svgNode("polygon", { points: "-4,0 4,0 2,-38 -2,-38", fill: "#26255F" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 134, scale: 0.38 }));
    }
    case 6: {
      const doorX = lerp(0, 48, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EFF6FF" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "34", width: "152", height: "134", rx: "8", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "3" }), /* @__PURE__ */ svgNode("circle", { cx: "108", cy: "82", r: "14", fill: "#F472B6" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "74", r: "16", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "172", cy: "82", r: "14", fill: "#8CB863" }), /* @__PURE__ */ svgNode("rect", { x: 68 + doorX, y: "38", width: "76", height: "126", fill: "#DBEAFE", opacity: 0.78, stroke: "#60A5FA", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 132, scale: 0.4 }));
    }
    case 7: {
      const liftY = -Math.sin(t * Math.PI) * 14;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F2F8F3" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${114 + liftY})` }, /* @__PURE__ */ svgNode("path", { d: "M -22 -36 A 22 22 0 0 1 22 -36", stroke: "#26255F", strokeWidth: "4.5", fill: "none" }), /* @__PURE__ */ svgNode("circle", { cx: "-18", cy: "-38", r: "12", fill: "#F9A8D4" }), /* @__PURE__ */ svgNode("circle", { cx: "18", cy: "-38", r: "12", fill: "#FACC15" }), /* @__PURE__ */ svgNode("rect", { x: "-48", y: "-32", width: "96", height: "84", rx: "8", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "3" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 10, scale: 0.54 })));
    }
    case 8: {
      const dropShift = t * 42 % 28;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EBF3F9" }), [62, 92, 196, 224].map((rx, idx) => /* @__PURE__ */ svgNode("line", { key: rx, x1: rx, y1: 24 + dropShift + idx * 8, x2: rx - 6, y2: 42 + dropShift + idx * 8, stroke: "#60A5FA", strokeWidth: "2.5", strokeLinecap: "round" })), /* @__PURE__ */ svgNode("polygon", { points: "94,54 186,54 166,166 114,166", fill: "#FFFFFF", opacity: 0.82, stroke: "#3B82F6", strokeWidth: "2" }), /* @__PURE__ */ svgNode("circle", { cx: "122", cy: "86", r: "14", fill: "#F472B6" }), /* @__PURE__ */ svgNode("circle", { cx: "158", cy: "86", r: "14", fill: "#FACC15" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 128, scale: 0.44 }));
    }
    default: {
      const glow = 0.2 + 0.2 * easeInOutSine(t);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("polygon", { points: "104,54 176,54 220,164 60,164", fill: "#FDE68A", opacity: glow }), /* @__PURE__ */ svgNode("path", { d: "M 104 54 A 36 24 0 0 1 176 54 Z", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "154", width: "152", height: "14", rx: "4", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 118, scale: 0.52, coreScale: 1 + 0.1 * loop, outlineOnLight: false }));
    }
  }
};
export {
  DailySceneGroup
};
