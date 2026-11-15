// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeInOutSine, easeOutCubic, lerp, phase } from "./occasion-scene-math.js";
const PinkCarnation = ({
  x,
  y,
  scale = 1,
  color = "#F472B6"
}) => /* @__PURE__ */ svgNode("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})` }, [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => /* @__PURE__ */ svgNode(
  "circle",
  {
    key: deg,
    cx: Math.cos(deg * Math.PI / 180) * 10,
    cy: Math.sin(deg * Math.PI / 180) * 10,
    r: "9",
    fill: color,
    opacity: 0.85
  }
)), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "8", fill: "#FB7185" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "4", fill: "#FDE047" }));
const MothersDaySceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const gentle = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const bloom = lerp(0.45, 1.05, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF5F7" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 84) scale(${bloom.toFixed(3)})` }, /* @__PURE__ */ svgNode(PinkCarnation, { x: -28, y: 4, scale: 0.78, color: "#F9A8D4" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 28, y: 4, scale: 0.78, color: "#F9A8D4" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 0, y: -8, scale: 0.96, color: "#F472B6" })), /* @__PURE__ */ svgNode("polygon", { points: "88,108 192,108 158,176 122,176", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 142, scale: 0.44, petalScale: 0.94 + 0.08 * gentle }));
    }
    case 1: {
      const cardLift = lerp(28, -18, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF7F8" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${74 + cardLift})` }, /* @__PURE__ */ svgNode("rect", { x: "-46", y: "-42", width: "92", height: "72", rx: "6", fill: "#FFFFFF", stroke: "#F472B6", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: -20, y: -18, scale: 0.28 }), /* @__PURE__ */ svgNode("line", { x1: "-24", y1: "8", x2: "26", y2: "8", stroke: "#26255F", strokeWidth: "2.5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "-16", y1: "18", x2: "18", y2: "18", stroke: "#8CB863", strokeWidth: "2", strokeLinecap: "round" })), /* @__PURE__ */ svgNode("rect", { x: "78", y: "106", width: "124", height: "62", rx: "10", fill: "#26255F" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 98, y: 100, scale: 0.7 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 182, y: 100, scale: 0.7 }));
    }
    case 2: {
      const sway = gentle * 4;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDF2F5" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 120) rotate(${sway.toFixed(1)})` }, /* @__PURE__ */ svgNode("path", { d: "M -38 -20 A 38 40 0 0 1 38 -20", stroke: "#D97706", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: -26, y: -24, scale: 0.75, color: "#FDA4AF" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 26, y: -24, scale: 0.75, color: "#FDA4AF" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 0, y: -32, scale: 0.92, color: "#F472B6" }), /* @__PURE__ */ svgNode("rect", { x: "-48", y: "-14", width: "96", height: "68", rx: "12", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("rect", { x: "-48", y: "10", width: "96", height: "14", fill: "#F9A8D4" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 17, scale: 0.44 })));
    }
    case 3: {
      const steamY = lerp(0, -18, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FCF6F2" }), /* @__PURE__ */ svgNode("ellipse", { cx: "116", cy: "154", rx: "52", ry: "11", fill: "#8CB863", opacity: 0.35 }), /* @__PURE__ */ svgNode("path", { d: "M 80 102 L 152 102 L 142 146 Q 116 154 90 146 Z", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("path", { d: "M 150 112 A 12 12 0 0 1 146 136", stroke: "#26255F", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode("path", { d: `M 104 ${88 + steamY} Q 98 70 108 54`, stroke: "#F9A8D4", strokeWidth: "2.5", fill: "none", opacity: 1 - t * 0.5 }), /* @__PURE__ */ svgNode("path", { d: `M 124 ${86 + steamY} Q 130 68 120 52`, stroke: "#F9A8D4", strokeWidth: "2.5", fill: "none", opacity: 1 - t * 0.5 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 190, y: 122, scale: 0.92 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 116, y: 124, scale: 0.32 }));
    }
    case 4: {
      const haloScale = lerp(0.75, 1.08, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "86", r: 54 * haloScale, fill: "#F9A8D4", opacity: 0.2 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 76, scale: 0.56, outlineOnLight: false }), /* @__PURE__ */ svgNode("path", { d: "M 48 164 Q 100 120 138 140", stroke: "#FDE68A", strokeWidth: "6", strokeLinecap: "round", fill: "none" }), /* @__PURE__ */ svgNode("path", { d: "M 232 164 Q 180 120 142 140", stroke: "#FDE68A", strokeWidth: "6", strokeLinecap: "round", fill: "none" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 84, y: 138, scale: 0.62 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 196, y: 138, scale: 0.62 }));
    }
    case 5: {
      const bowScale = lerp(0.55, 1.05, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDF2F8" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "64", width: "152", height: "96", rx: "12", fill: "#BE185D" }), /* @__PURE__ */ svgNode("rect", { x: "130", y: "64", width: "20", height: "96", fill: "#FBCFE8" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "102", width: "152", height: "20", fill: "#FBCFE8" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 112) scale(${bowScale.toFixed(3)})` }, /* @__PURE__ */ svgNode("ellipse", { cx: "-24", cy: "-8", rx: "22", ry: "12", fill: "#F9A8D4", stroke: "#FFFFFF", strokeWidth: "2", transform: "rotate(-18 -24 -8)" }), /* @__PURE__ */ svgNode("ellipse", { cx: "24", cy: "-8", rx: "22", ry: "12", fill: "#F9A8D4", stroke: "#FFFFFF", strokeWidth: "2", transform: "rotate(18 24 -8)" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 0, scale: 0.44 })));
    }
    case 6: {
      const sunMove = lerp(-24, 24, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EFF6FF" }), /* @__PURE__ */ svgNode("polygon", { points: `40,20 120,20 ${176 + sunMove},180 ${72 + sunMove},180`, fill: "#FEF3C7", opacity: 0.5 }), /* @__PURE__ */ svgNode("rect", { x: "44", y: "156", width: "192", height: "12", rx: "4", fill: "#CBD5E1" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 120, y: 66, scale: 0.8 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 160, y: 70, scale: 0.76 }), /* @__PURE__ */ svgNode("path", { d: "M 116 96 L 164 96 L 174 156 L 106 156 Z", fill: "#FFFFFF", opacity: 0.78, stroke: "#8CB863", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 128, scale: 0.42 }));
    }
    case 7: {
      const pop = lerp(24, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF7F2" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "34", width: "152", height: "142", rx: "12", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${76 + pop})` }, /* @__PURE__ */ svgNode("line", { x1: "-12", y1: "30", x2: "-18", y2: "-16", stroke: "#8CB863", strokeWidth: "4" }), /* @__PURE__ */ svgNode("line", { x1: "12", y1: "30", x2: "18", y2: "-16", stroke: "#8CB863", strokeWidth: "4" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: -18, y: -20, scale: 0.7 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 18, y: -20, scale: 0.7 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 0, y: -32, scale: 0.84, color: "#FB7185" })), /* @__PURE__ */ svgNode("path", { d: "M 92 94 L 188 94 L 188 148 Q 140 166 92 148 Z", fill: "#F9A8D4", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 122, scale: 0.4 }));
    }
    case 8: {
      const glowAlpha = lerp(0.35, 0.72, phase(t, 0, 0.8));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDE8D7" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "74", r: "48", fill: "#FDBA74", opacity: glowAlpha }), /* @__PURE__ */ svgNode("rect", { x: "36", y: "136", width: "208", height: "32", rx: "8", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 78, y: 114, scale: 0.78 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 202, y: 114, scale: 0.78 }), /* @__PURE__ */ svgNode("rect", { x: "112", y: "102", width: "56", height: "44", rx: "6", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 124, scale: 0.38 }));
    }
    default: {
      const ringAlpha = 0.4 + 0.4 * Math.sin(t * Math.PI);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("path", { d: "M 94 140 L 94 82 A 46 46 0 0 1 186 82 L 186 140 Z", fill: "#FFFFFF", opacity: 0.18, stroke: "#FBCFE8", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "84", r: "32", fill: "#F472B6", opacity: ringAlpha * 0.4 }), /* @__PURE__ */ svgNode(PinkCarnation, { x: 140, y: 90, scale: 0.96, color: "#F472B6" }), /* @__PURE__ */ svgNode("rect", { x: "82", y: "140", width: "116", height: "28", rx: "8", fill: "#B45309" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 154, scale: 0.34, outlineOnLight: false }));
    }
  }
};
export {
  MothersDaySceneGroup
};
