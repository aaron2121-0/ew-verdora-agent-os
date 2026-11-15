// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { easeInOutSine, easeOutCubic, lerp } from "./occasion-scene-math.js";
const FestivalSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const sway = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF3EE" }), /* @__PURE__ */ svgNode("g", { transform: `translate(88 40) rotate(${(sway * 7).toFixed(1)})` }, /* @__PURE__ */ svgNode("line", { x1: "0", y1: "-10", x2: "0", y2: "12", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "36", rx: "26", ry: "24", fill: "#DC2626" }), /* @__PURE__ */ svgNode("rect", { x: "-12", y: "10", width: "24", height: "6", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("rect", { x: "-12", y: "58", width: "24", height: "6", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "64", x2: "0", y2: "86", stroke: "#F59E0B", strokeWidth: "3" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 36, scale: 0.34 })), /* @__PURE__ */ svgNode("g", { transform: `translate(192 48) rotate(${(-sway * 7).toFixed(1)})` }, /* @__PURE__ */ svgNode("line", { x1: "0", y1: "-16", x2: "0", y2: "12", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "34", rx: "22", ry: "20", fill: "#EF4444" }), /* @__PURE__ */ svgNode("rect", { x: "-10", y: "12", width: "20", height: "5", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("rect", { x: "-10", y: "52", width: "20", height: "5", fill: "#F59E0B" })), /* @__PURE__ */ svgNode("ellipse", { cx: "140", cy: "148", rx: "40", ry: "12", fill: "#8CB863", opacity: 0.35 }), /* @__PURE__ */ svgNode("circle", { cx: "126", cy: "126", r: "10", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("circle", { cx: "154", cy: "126", r: "10", fill: "#FBBF24" }));
    }
    case 1: {
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F0F7F2" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "96", r: "54", fill: "none", stroke: "#166534", strokeWidth: "20" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "96", r: "54", fill: "none", stroke: "#8CB863", strokeWidth: "10", strokeDasharray: "10 8" }), [0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg + t * 24) * Math.PI / 180;
        return /* @__PURE__ */ svgNode("circle", { key: deg, cx: 140 + Math.cos(rad) * 54, cy: 96 + Math.sin(rad) * 54, r: "5.5", fill: "#DC2626" });
      }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 96, scale: 0.56 }));
    }
    case 2: {
      const moonShift = lerp(8, 0, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), /* @__PURE__ */ svgNode("g", { transform: `translate(${104 + moonShift} 76)` }, /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "30", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "12", cy: "-6", r: "24", fill: "#26255F" })), /* @__PURE__ */ svgNode("polygon", { points: "184,82 214,112 184,142 154,112", fill: "#8CB863", stroke: "#FDE047", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 134, scale: 0.46, outlineOnLight: false }));
    }
    case 3: {
      const fan = lerp(0.7, 1.04, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FDF8EE" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 86) scale(${fan.toFixed(3)})` }, /* @__PURE__ */ svgNode("polygon", { points: "-24,20 -6,-36 8,20", fill: "#EA580C" }), /* @__PURE__ */ svgNode("polygon", { points: "0,20 26,-32 32,20", fill: "#FACC15" }), /* @__PURE__ */ svgNode("ellipse", { cx: "-24", cy: "-6", rx: "14", ry: "26", fill: "#8CB863", transform: "rotate(-28 -24 -6)" })), /* @__PURE__ */ svgNode("path", { d: "M 88 106 L 192 106 L 176 168 L 104 168 Z", fill: "#B45309", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 136, scale: 0.42 }));
    }
    case 4: {
      const moonGlow = lerp(0.7, 1, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#1E204D" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "86", r: "56", fill: "#FDE68A", opacity: moonGlow }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 86, scale: 0.54, opacity: 0.92, outlineOnLight: false }), /* @__PURE__ */ svgNode("path", { d: "M 52 162 Q 140 132 228 162", stroke: "#8CB863", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode("circle", { cx: "96", cy: "148", r: "5", fill: "#F59E0B" }), /* @__PURE__ */ svgNode("circle", { cx: "184", cy: "148", r: "5", fill: "#F59E0B" }));
    }
    case 5: {
      const floatY = lerp(18, -10, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#2D1B3D" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${94 + floatY})` }, /* @__PURE__ */ svgNode("rect", { x: "-34", y: "-44", width: "68", height: "88", rx: "22", fill: "#F97316", stroke: "#FDE047", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 0, scale: 0.48, outlineOnLight: false }), /* @__PURE__ */ svgNode("line", { x1: "0", y1: "44", x2: "0", y2: "68", stroke: "#FDE047", strokeWidth: "3" })));
    }
    case 6: {
      const burst = lerp(0.35, 1.05, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#26255F" }), [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = deg * Math.PI / 180;
        return /* @__PURE__ */ svgNode(
          "line",
          {
            key: deg,
            x1: 140 + Math.cos(rad) * 18,
            y1: 72 + Math.sin(rad) * 18,
            x2: 140 + Math.cos(rad) * (46 * burst),
            y2: 72 + Math.sin(rad) * (46 * burst),
            stroke: "#FACC15",
            strokeWidth: "3",
            strokeLinecap: "round"
          }
        );
      }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 72, scale: 0.44, outlineOnLight: false }), /* @__PURE__ */ svgNode("rect", { x: "92", y: "132", width: "96", height: "40", rx: "8", fill: "#8CB863" }));
    }
    case 7: {
      const bend = sway * 6;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFFBEB" }), /* @__PURE__ */ svgNode("path", { d: `M 84 166 Q ${88 + bend} 96 124 48`, stroke: "#D97706", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode("path", { d: `M 196 166 Q ${192 - bend} 96 156 48`, stroke: "#D97706", strokeWidth: "4", fill: "none" }), /* @__PURE__ */ svgNode("circle", { cx: "96", cy: "116", r: "16", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "184", cy: "116", r: "16", fill: "#FACC15" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 118, scale: 0.56 }));
    }
    case 8: {
      const starScale = 1 + 0.14 * sway;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F4FAF6" }), /* @__PURE__ */ svgNode("polygon", { points: "140,34 94,104 186,104", fill: "#166534" }), /* @__PURE__ */ svgNode("polygon", { points: "140,58 84,132 196,132", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "122", cy: "96", r: "5", fill: "#DC2626" }), /* @__PURE__ */ svgNode("circle", { cx: "156", cy: "112", r: "5", fill: "#FACC15" }), /* @__PURE__ */ svgNode("rect", { x: "110", y: "132", width: "60", height: "40", rx: "6", fill: "#26255F" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 152, scale: 0.36, coreScale: starScale, outlineOnLight: false }));
    }
    default: {
      const angpowSwing = sway * 8;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF7F2" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "78", r: "46", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "116", cy: "64", r: "9", fill: "#F97316" }), /* @__PURE__ */ svgNode("circle", { cx: "164", cy: "70", r: "9", fill: "#F97316" }), /* @__PURE__ */ svgNode("circle", { cx: "136", cy: "96", r: "9", fill: "#F97316" }), /* @__PURE__ */ svgNode("rect", { x: "104", y: "82", width: "12", height: "18", rx: "2", fill: "#DC2626", transform: `rotate(${angpowSwing.toFixed(1)} 110 82)` }), /* @__PURE__ */ svgNode("polygon", { points: "100,126 180,126 168,172 112,172", fill: "#DC2626" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 149, scale: 0.38 }));
    }
  }
};
export {
  FestivalSceneGroup
};
