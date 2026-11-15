// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeInOutSine, easeOutCubic, lerp } from "./occasion-scene-math.js";
const CorporateSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const pulse = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const lift = lerp(0, -18, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F1F5F9" }), /* @__PURE__ */ svgNode("rect", { x: "78", y: "96", width: "124", height: "68", rx: "8", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "114", cy: "86", r: "18", fill: "#60A5FA" }), /* @__PURE__ */ svgNode("circle", { cx: "166", cy: "86", r: "18", fill: "#3B82F6" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "74", r: "20", fill: "#8CB863" }), /* @__PURE__ */ svgNode("g", { transform: `translate(0 ${lift.toFixed(1)})` }, /* @__PURE__ */ svgNode("rect", { x: "72", y: "84", width: "136", height: "20", rx: "5", fill: "#1E293B" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 130, scale: 0.44, outlineOnLight: false })));
    }
    case 1: {
      const stepIn = lerp(-28, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F8FAFC" }), [76, 140, 204].map((cx, i) => /* @__PURE__ */ svgNode("g", { key: cx, transform: `translate(${cx} ${96 + stepIn * ((i + 1) * 0.4)})` }, /* @__PURE__ */ svgNode("rect", { x: "-24", y: "-34", width: "48", height: "68", rx: "8", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-10", r: "12", fill: i === 1 ? "#8CB863" : "#26255F" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 16, scale: 0.28 }))));
    }
    case 2: {
      const rise = lerp(20, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F0F9FF" }), /* @__PURE__ */ svgNode("rect", { x: "62", y: "138", width: "156", height: "28", rx: "6", fill: "#FFFFFF", stroke: "#94A3B8", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode("g", { transform: `translate(110 ${92 + rise})` }, /* @__PURE__ */ svgNode("circle", { cx: "-14", cy: "-16", r: "12", fill: "#F9A8D4" }), /* @__PURE__ */ svgNode("circle", { cx: "14", cy: "-16", r: "12", fill: "#F9A8D4" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-26", r: "14", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("rect", { x: "-18", y: "-4", width: "36", height: "50", rx: "6", fill: "#8CB863" })), /* @__PURE__ */ svgNode("rect", { x: "152", y: "68", width: "54", height: "70", rx: "6", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 179, y: 96, scale: 0.34 }), /* @__PURE__ */ svgNode("rect", { x: "174", y: "116", width: "10", height: "4", rx: "1", fill: "#EF4444" }), /* @__PURE__ */ svgNode("rect", { x: "177", y: "113", width: "4", height: "10", rx: "1", fill: "#EF4444" }));
    }
    case 3: {
      const chalkW = lerp(16, 110, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F5F7F2" }), /* @__PURE__ */ svgNode("rect", { x: "44", y: "34", width: "192", height: "96", rx: "6", fill: "#1F4D3A", stroke: "#92400E", strokeWidth: "5" }), /* @__PURE__ */ svgNode("line", { x1: "68", y1: "68", x2: 68 + chalkW, y2: "68", stroke: "#FFFFFF", strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "68", y1: "86", x2: 68 + chalkW * 0.7, y2: "86", stroke: "#8CB863", strokeWidth: "3.5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("circle", { cx: "204", cy: "108", r: "16", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "204", cy: "108", r: "7", fill: "#5C3D1E" }), /* @__PURE__ */ svgNode("rect", { x: "184", y: "124", width: "40", height: "44", rx: "5", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 204, y: 146, scale: 0.34 }));
    }
    case 4: {
      const lift = lerp(16, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFFBEB" }), /* @__PURE__ */ svgNode("rect", { x: "52", y: "42", width: "176", height: "10", rx: "4", fill: "#DC2626" }), /* @__PURE__ */ svgNode("rect", { x: "52", y: "54", width: "176", height: "8", rx: "4", fill: "#FACC15" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${114 + lift})` }, /* @__PURE__ */ svgNode("polygon", { points: "-38,54 38,54 28,-12 -28,-12", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "-24", cy: "-22", r: "14", fill: "#DC2626" }), /* @__PURE__ */ svgNode("circle", { cx: "24", cy: "-22", r: "14", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-30", r: "16", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 20, scale: 0.44, outlineOnLight: false })));
    }
    case 5: {
      const tilt = lerp(-14, 0, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDF2F8" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 110) rotate(${tilt.toFixed(1)})` }, /* @__PURE__ */ svgNode("polygon", { points: "-28,-16 28,-16 12,56 -12,56", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-34", r: "22", fill: "#EC4899" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-34", r: "11", fill: "#BE185D" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 16, scale: 0.38 })));
    }
    case 6: {
      const slideIn = lerp(34, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F1F5F9" }), /* @__PURE__ */ svgNode("rect", { x: "34", y: "114", width: "212", height: "44", rx: "6", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "100", rx: "50", ry: "18", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "116", cy: "96", r: "9", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "164", cy: "96", r: "9", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${slideIn.toFixed(1)} 0)` }, /* @__PURE__ */ svgNode("rect", { x: "62", y: "122", width: "60", height: "30", rx: "4", fill: "#26255F" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 92, y: 137, scale: 0.28, outlineOnLight: false })));
    }
    case 7: {
      const panelScale = lerp(0.72, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F5F3EE" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 100) scale(${panelScale.toFixed(3)})` }, /* @__PURE__ */ svgNode("rect", { x: "-78", y: "-62", width: "156", height: "124", rx: "18", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "-64", cy: "40", r: "18", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "64", cy: "40", r: "18", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "-68", cy: "-42", r: "14", fill: "#F472B6" }), /* @__PURE__ */ svgNode("circle", { cx: "68", cy: "-42", r: "14", fill: "#FACC15" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 0, scale: 0.72, outlineOnLight: false })));
    }
    case 8: {
      const grow = lerp(0.55, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF8F5" }), /* @__PURE__ */ svgNode("rect", { x: "116", y: "106", width: "48", height: "66", rx: "6", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 106) scale(1 ${grow.toFixed(3)})` }, /* @__PURE__ */ svgNode("line", { x1: "0", y1: "0", x2: "-22", y2: "-66", stroke: "#8CB863", strokeWidth: "4" }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "0", x2: "22", y2: "-66", stroke: "#8CB863", strokeWidth: "4" }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "0", x2: "0", y2: "-76", stroke: "#8CB863", strokeWidth: "4" }), /* @__PURE__ */ svgNode("circle", { cx: "-22", cy: "-68", r: "10", fill: "#F472B6" }), /* @__PURE__ */ svgNode("circle", { cx: "22", cy: "-68", r: "10", fill: "#F472B6" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-78", r: "12", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 138, scale: 0.36 }));
    }
    default: {
      const shine = 0.85 + 0.25 * pulse;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("path", { d: "M 86 58 L 130 58 L 122 108 L 94 108 Z", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("rect", { x: "103", y: "108", width: "10", height: "32", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("rect", { x: "88", y: "140", width: "40", height: "16", rx: "3", fill: "#D97706" }), /* @__PURE__ */ svgNode("circle", { cx: "176", cy: "82", r: "24", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "164", cy: "70", r: "12", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "188", cy: "74", r: "12", fill: "#FACC15" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 176, y: 118, scale: 0.44, coreScale: shine, outlineOnLight: false }));
    }
  }
};
export {
  CorporateSceneGroup
};
