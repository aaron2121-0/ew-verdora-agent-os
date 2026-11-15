// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { arcJump, bellCurve, easeInOutSine, easeOutCubic, lerp, phase } from "./occasion-scene-math.js";
const SunflowerHead = ({
  x,
  y,
  scale = 1,
  rotate = 0
}) => /* @__PURE__ */ svgNode("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)}) scale(${scale.toFixed(3)})` }, [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => /* @__PURE__ */ svgNode(
  "ellipse",
  {
    key: deg,
    cx: "0",
    cy: "-15",
    rx: "4.2",
    ry: "10",
    fill: "#EAB308",
    transform: `rotate(${deg})`
  }
)), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "8.5", fill: "#4A3219" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "5", fill: "#714D27" }));
const GraduationSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const breath = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const capY = 72 - arcJump(t, 44);
      const capRot = lerp(-18, 22, easeInOutSine(t));
      const wrapScale = lerp(0.84, 1, easeOutCubic(phase(t, 0, 0.55)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F6F4EC" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "108", r: "68", fill: "#8CB863", opacity: 0.14 }), /* @__PURE__ */ svgNode("g", { transform: `translate(${lerp(92, 168, t).toFixed(1)} ${capY.toFixed(1)}) rotate(${capRot.toFixed(1)})` }, /* @__PURE__ */ svgNode("polygon", { points: "-28,0 0,-12 28,0 0,12", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "-14", y: "4", width: "28", height: "10", rx: "2", fill: "#1A1946" }), /* @__PURE__ */ svgNode("path", { d: "M 4 2 Q 20 8 24 22", stroke: "#EAB308", strokeWidth: "2.5", fill: "none" }), /* @__PURE__ */ svgNode("circle", { cx: "24", cy: "24", r: "3", fill: "#EAB308" })), /* @__PURE__ */ svgNode("g", { transform: `translate(140 132) scale(${wrapScale.toFixed(3)})` }, /* @__PURE__ */ svgNode(SunflowerHead, { x: -20, y: -24, scale: 0.82, rotate: -12 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 20, y: -22, scale: 0.78, rotate: 14 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 0, y: -32, scale: 0.95 }), /* @__PURE__ */ svgNode("polygon", { points: "-32,-12 32,-12 14,50 -14,50", fill: "#D9C39E", stroke: "#B79B70", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("polygon", { points: "-24,-12 24,-12 10,32 -10,32", fill: "#8CB863", opacity: 0.35 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 16, scale: 0.33, rosetteRotate: t * 180, coreRotate: -t * 180 })));
    }
    case 1: {
      const openW = lerp(18, 128, easeOutCubic(phase(t, 0.08, 0.72)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FBF9F2" }), /* @__PURE__ */ svgNode("g", { transform: "translate(140 94)" }, /* @__PURE__ */ svgNode("rect", { x: -openW / 2, y: "-36", width: openW, height: "72", rx: "4", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("rect", { x: -openW / 2 - 10, y: "-40", width: "12", height: "80", rx: "6", fill: "#E5DEC9", stroke: "#26255F", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode("rect", { x: openW / 2 - 2, y: "-40", width: "12", height: "80", rx: "6", fill: "#E5DEC9", stroke: "#26255F", strokeWidth: "1.8" }), openW > 56 && /* @__PURE__ */ svgNode("g", { opacity: phase(t, 0.3, 0.7) }, /* @__PURE__ */ svgNode("line", { x1: "-38", y1: "-16", x2: "38", y2: "-16", stroke: "#26255F", strokeWidth: "2.4", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "-30", y1: "-4", x2: "30", y2: "-4", stroke: "#8CB863", strokeWidth: "2", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "-22", y1: "8", x2: "22", y2: "8", stroke: "#CBD5E1", strokeWidth: "2", strokeLinecap: "round" }))), /* @__PURE__ */ svgNode(SunflowerHead, { x: 208, y: 66, scale: 0.75, rotate: t * 35 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 128, scale: lerp(0.28, 0.42, e), petalScale: 0.95 + 0.08 * breath }));
    }
    case 2: {
      const gateOpen = lerp(0, 34, easeOutCubic(phase(t, 0.1, 0.65)));
      const giftScale = lerp(0.58, 1.05, easeOutCubic(phase(t, 0.25, 0.9)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EEF3EE" }), /* @__PURE__ */ svgNode("rect", { x: "44", y: "34", width: "16", height: "132", rx: "3", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "220", y: "34", width: "16", height: "132", rx: "3", fill: "#26255F" }), /* @__PURE__ */ svgNode("path", { d: "M 52 36 Q 140 12 228 36", stroke: "#26255F", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${-gateOpen} 0)` }, /* @__PURE__ */ svgNode("rect", { x: "64", y: "48", width: "72", height: "114", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2", opacity: 0.85 }), /* @__PURE__ */ svgNode("line", { x1: "88", y1: "48", x2: "88", y2: "162", stroke: "#26255F", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("line", { x1: "112", y1: "48", x2: "112", y2: "162", stroke: "#26255F", strokeWidth: "1.5" })), /* @__PURE__ */ svgNode("g", { transform: `translate(${gateOpen} 0)` }, /* @__PURE__ */ svgNode("rect", { x: "144", y: "48", width: "72", height: "114", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2", opacity: 0.85 }), /* @__PURE__ */ svgNode("line", { x1: "168", y1: "48", x2: "168", y2: "162", stroke: "#26255F", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("line", { x1: "192", y1: "48", x2: "192", y2: "162", stroke: "#26255F", strokeWidth: "1.5" })), /* @__PURE__ */ svgNode("g", { transform: `translate(140 124) scale(${giftScale.toFixed(3)})` }, /* @__PURE__ */ svgNode(SunflowerHead, { x: -14, y: -20, scale: 0.72 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 14, y: -18, scale: 0.72 }), /* @__PURE__ */ svgNode("polygon", { points: "-24,-10 24,-10 10,40 -10,40", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 14, scale: 0.34 })));
    }
    case 3: {
      const beamSwing = Math.sin(t * Math.PI * 2) * 18;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("polygon", { points: `60,0 ${130 + beamSwing},165 ${190 + beamSwing},165`, fill: "#FFFFFF", opacity: 0.14 }), /* @__PURE__ */ svgNode("polygon", { points: `220,0 ${90 - beamSwing},165 ${150 - beamSwing},165`, fill: "#8CB863", opacity: 0.18 }), /* @__PURE__ */ svgNode("rect", { x: "52", y: "156", width: "176", height: "18", rx: "3", fill: "#FFFFFF", opacity: 0.2 }), /* @__PURE__ */ svgNode("rect", { x: "82", y: "138", width: "116", height: "18", rx: "3", fill: "#FFFFFF", opacity: 0.3 }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "140", rx: "52", ry: "10", fill: "#8CB863", opacity: 0.45 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 94, y: 118, scale: 0.62 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 186, y: 118, scale: 0.62 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 84, scale: 0.58, coreRotate: t * 90, rosetteRotate: -t * 45, outlineOnLight: false }));
    }
    case 4: {
      const ringRot = t * 60;
      const ringScale = lerp(0.7, 1, easeOutCubic(phase(t, 0, 0.6)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F4F8F2" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 100) rotate(${ringRot.toFixed(1)}) scale(${ringScale.toFixed(3)})` }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "62", fill: "none", stroke: "#8CB863", strokeWidth: "5", strokeDasharray: "8 6" }), [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = deg * Math.PI / 180;
        return /* @__PURE__ */ svgNode(SunflowerHead, { key: deg, x: Math.cos(rad) * 62, y: Math.sin(rad) * 62, scale: 0.48, rotate: deg });
      })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 100, scale: 0.56, petalScale: lerp(0.75, 1.02, e) }));
    }
    case 5: {
      const tilt = lerp(-12, -3, e);
      const photoAlpha = phase(t, 0.15, 0.78);
      const stampScale = lerp(1.7, 1, easeOutCubic(phase(t, 0.5, 0.92)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF6EE" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 100) rotate(${tilt.toFixed(1)})` }, /* @__PURE__ */ svgNode("rect", { x: "-56", y: "-68", width: "112", height: "136", rx: "6", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("rect", { x: "-46", y: "-58", width: "92", height: "86", rx: "3", fill: "#26255F" }), /* @__PURE__ */ svgNode("g", { opacity: photoAlpha }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-24", r: "24", fill: "#8CB863", opacity: 0.35 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: -16, y: -10, scale: 0.62 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 16, y: -12, scale: 0.58 }), /* @__PURE__ */ svgNode("polygon", { points: "-24,-10 24,-10 10,24 -10,24", fill: "#8CB863" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 28, y: 48, scale: 0.25 * stampScale })));
    }
    case 6: {
      const canopyDrop = lerp(-24, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F2F7F0" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "64", width: "6", height: "106", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "210", y: "64", width: "6", height: "106", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "56", y: "132", width: "168", height: "38", rx: "4", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("g", { transform: `translate(0 ${canopyDrop.toFixed(1)})` }, /* @__PURE__ */ svgNode("polygon", { points: "48,68 232,68 214,42 66,42", fill: "#8CB863" }), [0, 1, 2, 3, 4].map((k) => /* @__PURE__ */ svgNode("rect", { key: k, x: 56 + k * 36, y: "68", width: "18", height: "14", rx: "7", fill: k % 2 === 0 ? "#26255F" : "#8CB863" }))), /* @__PURE__ */ svgNode(SunflowerHead, { x: 92, y: 118, scale: 0.65 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 188, y: 118, scale: 0.65 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 102, scale: 0.44, petalRotate: breath * 12 }));
    }
    case 7: {
      const sway = Math.sin(t * Math.PI * 2) * 16;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F7F5F0" }), /* @__PURE__ */ svgNode("path", { d: "M 46 178 C 80 86, 128 42, 168 28 L 210 52 C 180 100, 152 140, 134 178 Z", fill: "#26255F" }), /* @__PURE__ */ svgNode("path", { d: "M 74 178 C 102 100, 144 58, 178 40", stroke: "#8CB863", strokeWidth: "6", fill: "none" }), /* @__PURE__ */ svgNode("g", { transform: `translate(186 48) rotate(${sway.toFixed(1)})` }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "6", fill: "#EAB308" }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "0", x2: "0", y2: "54", stroke: "#EAB308", strokeWidth: "3.5" }), /* @__PURE__ */ svgNode("polygon", { points: "-7,54 7,54 11,82 -11,82", fill: "#EAB308" })), /* @__PURE__ */ svgNode(SunflowerHead, { x: 86, y: 136, scale: 0.78 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 112, y: 96, scale: 0.44, coreScale: 1 + 0.14 * bellCurve(t) }));
    }
    case 8: {
      const slideX = lerp(0, 62, easeOutCubic(phase(t, 0.1, 0.72)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF4EE" }), /* @__PURE__ */ svgNode("rect", { x: "46", y: "72", width: "110", height: "86", rx: "8", fill: "#26255F" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${slideX.toFixed(1)} 0)` }, /* @__PURE__ */ svgNode("rect", { x: "64", y: "80", width: "118", height: "70", rx: "6", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("circle", { cx: "116", cy: "72", r: "9", fill: "#B68A5E" }), /* @__PURE__ */ svgNode("circle", { cx: "144", cy: "72", r: "9", fill: "#B68A5E" }), /* @__PURE__ */ svgNode("circle", { cx: "130", cy: "84", r: "17", fill: "#C99E70" }), /* @__PURE__ */ svgNode("circle", { cx: "124", cy: "82", r: "2", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "136", cy: "82", r: "2", fill: "#26255F" }), /* @__PURE__ */ svgNode("polygon", { points: "112,68 130,61 148,68 130,75", fill: "#26255F" }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 164, y: 98, scale: 0.55 })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 100, y: 115, scale: 0.38, outlineOnLight: false }));
    }
    default: {
      const bellSwing = Math.sin(t * Math.PI * 2) * 14;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FBF2E6" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "126", r: "56", fill: "#FDE68A", opacity: 0.55 }), /* @__PURE__ */ svgNode("path", { d: "M 76 168 L 76 62 A 64 40 0 0 1 204 62 L 204 168", stroke: "#26255F", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 42) rotate(${bellSwing.toFixed(1)})` }, /* @__PURE__ */ svgNode("path", { d: "M -22 36 Q -18 4 0 4 Q 18 4 22 36 L 28 44 L -28 44 Z", fill: "#D97706" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "48", r: "5", fill: "#26255F" })), /* @__PURE__ */ svgNode(SunflowerHead, { x: 80, y: 142, scale: 0.62 }), /* @__PURE__ */ svgNode(SunflowerHead, { x: 200, y: 142, scale: 0.62 }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 134, scale: 0.46, rosetteScale: 1 + 0.06 * breath }));
    }
  }
};
export {
  GraduationSceneGroup
};
