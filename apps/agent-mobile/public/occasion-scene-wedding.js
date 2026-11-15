// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { arcJump, easeInOutSine, easeOutCubic, lerp, phase } from "./occasion-scene-math.js";
const WeddingSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const pulse = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const scale = lerp(0.82, 1.02, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FCF9F5" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 94) scale(${scale.toFixed(3)})` }, /* @__PURE__ */ svgNode("circle", { cx: "-26", cy: "-16", r: "18", fill: "#F8DCE0" }), /* @__PURE__ */ svgNode("circle", { cx: "26", cy: "-16", r: "18", fill: "#F8DCE0" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-26", r: "22", fill: "#FFFFFF", stroke: "#E2E8F0", strokeWidth: "2" }), /* @__PURE__ */ svgNode("circle", { cx: "-18", cy: "4", r: "15", fill: "#8CB863", opacity: 0.75 }), /* @__PURE__ */ svgNode("circle", { cx: "18", cy: "4", r: "15", fill: "#8CB863", opacity: 0.75 }), /* @__PURE__ */ svgNode("path", { d: "M -10 22 Q -22 60 -30 78", stroke: "#FFFFFF", strokeWidth: "6", fill: "none" }), /* @__PURE__ */ svgNode("path", { d: "M 10 22 Q 22 60 30 78", stroke: "#FFFFFF", strokeWidth: "6", fill: "none" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 14, scale: 0.44 })));
    }
    case 1: {
      const join = lerp(24, 12, easeInOutSine(phase(t, 0, 0.72)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF6F0" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 66, scale: lerp(0.32, 0.5, e) }), /* @__PURE__ */ svgNode("circle", { cx: 140 - join, cy: 126, r: "28", fill: "none", stroke: "#D97706", strokeWidth: "5.5" }), /* @__PURE__ */ svgNode("circle", { cx: 140 + join, cy: 126, r: "28", fill: "none", stroke: "#F59E0B", strokeWidth: "5.5" }), /* @__PURE__ */ svgNode("circle", { cx: "90", cy: "144", r: "12", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }), /* @__PURE__ */ svgNode("circle", { cx: "190", cy: "144", r: "12", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2" }));
    }
    case 2: {
      const archBloom = lerp(0.5, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F2F8F3" }), /* @__PURE__ */ svgNode("path", { d: "M 68 172 L 68 96 A 72 64 0 0 1 212 96 L 212 172", stroke: "#8CB863", strokeWidth: "10", fill: "none" }), /* @__PURE__ */ svgNode("g", { transform: `scale(${archBloom.toFixed(3)})`, style: { transformOrigin: "140px 96px" } }, /* @__PURE__ */ svgNode("circle", { cx: "72", cy: "96", r: "14", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "208", cy: "96", r: "14", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "102", cy: "46", r: "16", fill: "#F9D5DA" }), /* @__PURE__ */ svgNode("circle", { cx: "178", cy: "46", r: "16", fill: "#F9D5DA" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 42, scale: 0.44 }));
    }
    case 3: {
      const sweep = lerp(-26, 26, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDFBF8" }), /* @__PURE__ */ svgNode("polygon", { points: "118,176 162,176 196,176 84,176", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("polygon", { points: "124,44 156,44 196,176 84,176", fill: "#F1F5F9" }), /* @__PURE__ */ svgNode("path", { d: `M ${110 + sweep} 34 Q ${140 + sweep * 1.4} 90 198 142 L 82 142 Z`, fill: "#FFFFFF", opacity: 0.75, stroke: "#CBD5E1", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 148, scale: 0.38 }));
    }
    case 4: {
      const arcX = lerp(64, 212, t);
      const arcY = 120 - arcJump(t, 56);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF5F6" }), /* @__PURE__ */ svgNode("path", { d: "M 64 120 Q 140 24 212 120", stroke: "#8CB863", strokeWidth: "2.5", strokeDasharray: "5 5", fill: "none" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${arcX.toFixed(1)} ${arcY.toFixed(1)}) rotate(${lerp(-25, 45, t).toFixed(1)})` }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-10", r: "14", fill: "#F9D5DA" }), /* @__PURE__ */ svgNode("polygon", { points: "-14,-4 14,-4 6,22 -6,22", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "1.8" })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 136, scale: 0.46, petalRotate: t * 60 }));
    }
    case 5: {
      const flameScale = 1 + 0.14 * pulse;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FBF8F3" }), /* @__PURE__ */ svgNode("rect", { x: "40", y: "136", width: "200", height: "28", rx: "6", fill: "#FFFFFF", stroke: "#D6D3D1", strokeWidth: "1.8" }), /* @__PURE__ */ svgNode("rect", { x: "76", y: "84", width: "6", height: "52", fill: "#26255F" }), /* @__PURE__ */ svgNode("rect", { x: "198", y: "84", width: "6", height: "52", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "79", cy: "76", r: 5 * flameScale, fill: "#F59E0B" }), /* @__PURE__ */ svgNode("circle", { cx: "201", cy: "76", r: 5 * flameScale, fill: "#F59E0B" }), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "126", rx: "46", ry: "18", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "118", cy: "122", r: "10", fill: "#F9D5DA" }), /* @__PURE__ */ svgNode("circle", { cx: "162", cy: "122", r: "10", fill: "#F9D5DA" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 78, scale: 0.44 }));
    }
    case 6: {
      const pinShift = lerp(24, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F4F5F7" }), /* @__PURE__ */ svgNode("polygon", { points: "74,34 156,34 140,176 74,176", fill: "#26255F" }), /* @__PURE__ */ svgNode("polygon", { points: "156,34 210,34 210,176 140,176", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${122 + pinShift} 96)` }, /* @__PURE__ */ svgNode("line", { x1: "0", y1: "0", x2: "-8", y2: "32", stroke: "#8CB863", strokeWidth: "4" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-4", r: "16", fill: "#FFFFFF", stroke: "#8CB863", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 46, y: 44, scale: 0.34 })));
    }
    case 7: {
      const lidY = lerp(80, 38, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FCF9F2" }), /* @__PURE__ */ svgNode("rect", { x: "64", y: "76", width: "152", height: "92", rx: "8", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("polygon", { points: `64,76 216,76 140,${lidY.toFixed(1)}`, fill: "#F3EFE6", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 114, scale: lerp(0.36, 0.48, e) }));
    }
    case 8: {
      const glint = 0.8 + 0.35 * pulse;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#1F2248" }), [
        [140, 74],
        [116, 108],
        [164, 108],
        [92, 142],
        [140, 142],
        [188, 142]
      ].map(([cx, cy], idx) => /* @__PURE__ */ svgNode("g", { key: idx, transform: `translate(${cx} ${cy})` }, /* @__PURE__ */ svgNode("polygon", { points: "-14,-10 14,-10 8,4 -8,4", fill: "#FDE68A", opacity: 0.82 }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "4", x2: "0", y2: "16", stroke: "#FFFFFF", strokeWidth: "2" }), /* @__PURE__ */ svgNode("line", { x1: "-8", y1: "16", x2: "8", y2: "16", stroke: "#FFFFFF", strokeWidth: "2" }))), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 42, scale: 0.38, coreScale: glint, outlineOnLight: false }));
    }
    default: {
      const openLift = lerp(0, -34, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF4F0" }), /* @__PURE__ */ svgNode("rect", { x: "78", y: "102", width: "124", height: "62", rx: "8", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "116", cy: "96", r: "14", fill: "#F8DCE0" }), /* @__PURE__ */ svgNode("circle", { cx: "164", cy: "96", r: "14", fill: "#F8DCE0" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "88", r: "16", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("g", { transform: `translate(0 ${openLift.toFixed(1)})` }, /* @__PURE__ */ svgNode("rect", { x: "72", y: "80", width: "136", height: "24", rx: "6", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 92, scale: 0.36 })));
    }
  }
};
export {
  WeddingSceneGroup
};
