// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
import { VerdoraLogoMark } from "./occasion-scene-logo.js";
import { arcJump, easeInOutSine, easeOutCubic, lerp, phase } from "./occasion-scene-math.js";
const KindergartenSceneGroup = ({ index, t }) => {
  const e = easeOutCubic(t);
  const bob = Math.sin(t * Math.PI * 2);
  switch (index) {
    case 0: {
      const riseY = lerp(24, -14, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F3FAFE" }), /* @__PURE__ */ svgNode("g", { transform: `translate(0 ${riseY.toFixed(1)})` }, /* @__PURE__ */ svgNode("line", { x1: "100", y1: "68", x2: "140", y2: "122", stroke: "#94A3B8", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("line", { x1: "180", y1: "68", x2: "140", y2: "122", stroke: "#94A3B8", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("line", { x1: "140", y1: "74", x2: "140", y2: "122", stroke: "#94A3B8", strokeWidth: "1.5" }), /* @__PURE__ */ svgNode("ellipse", { cx: "96", cy: "54", rx: "22", ry: "28", fill: "#F59E0B", opacity: 0.9 }), /* @__PURE__ */ svgNode("ellipse", { cx: "184", cy: "54", rx: "22", ry: "28", fill: "#EC4899", opacity: 0.85 }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "48", r: "28", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 48, scale: 0.44 }), /* @__PURE__ */ svgNode("rect", { x: "108", y: "122", width: "64", height: "44", rx: "6", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "122", cy: "116", r: "10", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "112", r: "11", fill: "#8CB863" }), /* @__PURE__ */ svgNode("circle", { cx: "158", cy: "116", r: "10", fill: "#FFFFFF" })));
    }
    case 1: {
      const peekY = lerp(26, 0, easeOutCubic(phase(t, 0, 0.68)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFF8EE" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${94 + peekY})` }, /* @__PURE__ */ svgNode("circle", { cx: "-26", cy: "-28", r: "12", fill: "#B48456" }), /* @__PURE__ */ svgNode("circle", { cx: "26", cy: "-28", r: "12", fill: "#B48456" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-10", r: "30", fill: "#D1A272" }), /* @__PURE__ */ svgNode("ellipse", { cx: "0", cy: "-2", rx: "12", ry: "9", fill: "#FDE6C4" }), /* @__PURE__ */ svgNode("circle", { cx: "-11", cy: "-16", r: "3", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "11", cy: "-16", r: "3", fill: "#26255F" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-5", r: "3.5", fill: "#26255F" })), /* @__PURE__ */ svgNode("circle", { cx: "88", cy: "110", r: "14", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("circle", { cx: "192", cy: "110", r: "14", fill: "#FBBF24" }), /* @__PURE__ */ svgNode("polygon", { points: "82,116 198,116 156,176 124,176", fill: "#8CB863" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 140, scale: 0.42, petalScale: 1 + 0.08 * bob }));
    }
    case 2: {
      const fanOut = lerp(0.4, 1, e);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FEF7FA" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 120) scale(${fanOut.toFixed(3)})` }, [-34, -14, 14, 34].map((deg, idx) => /* @__PURE__ */ svgNode("g", { key: deg, transform: `rotate(${deg})` }, /* @__PURE__ */ svgNode("rect", { x: "-8", y: "-68", width: "16", height: "62", rx: "3", fill: ["#F97316", "#3B82F6", "#EC4899", "#8CB863"][idx] }), /* @__PURE__ */ svgNode("polygon", { points: "-8,-68 8,-68 0,-84", fill: "#26255F" })))), /* @__PURE__ */ svgNode("polygon", { points: "94,106 186,106 152,174 128,174", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 136, scale: 0.44, rosetteRotate: t * 120 }));
    }
    case 3: {
      const crownY = lerp(-44, 0, easeOutCubic(phase(t, 0.1, 0.72)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFFBEB" }), /* @__PURE__ */ svgNode("line", { x1: "140", y1: "114", x2: "140", y2: "176", stroke: "#8CB863", strokeWidth: "7", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("ellipse", { cx: "118", cy: "148", rx: "18", ry: "8", fill: "#8CB863", transform: "rotate(-24 118 148)" }), /* @__PURE__ */ svgNode("g", { transform: "translate(140 104)" }, [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => /* @__PURE__ */ svgNode("ellipse", { key: deg, cx: "0", cy: "-28", rx: "8", ry: "16", fill: "#FACC15", transform: `rotate(${deg})` })), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "0", r: "22", fill: "#5C3D1E" }), /* @__PURE__ */ svgNode("circle", { cx: "-7", cy: "-3", r: "2.5", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("circle", { cx: "7", cy: "-3", r: "2.5", fill: "#FFFFFF" }), /* @__PURE__ */ svgNode("path", { d: "M -8 5 Q 0 12 8 5", stroke: "#FFFFFF", strokeWidth: "2.5", fill: "none", strokeLinecap: "round" })), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${64 + crownY})` }, /* @__PURE__ */ svgNode("polygon", { points: "-24,0 -20,-24 -8,-10 0,-28 8,-10 20,-24 24,0", fill: "#F59E0B", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: -6, scale: 0.22 })));
    }
    case 4: {
      const planeX = lerp(42, 236, t);
      const planeY = 58 - arcJump(t, 28);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#EEF6FF" }), /* @__PURE__ */ svgNode(
        "path",
        {
          d: "M 38 72 Q 140 16 238 66",
          stroke: "#8CB863",
          strokeWidth: "3",
          strokeDasharray: "6 6",
          strokeDashoffset: -t * 48,
          fill: "none"
        }
      ), /* @__PURE__ */ svgNode("g", { transform: `translate(${planeX.toFixed(1)} ${planeY.toFixed(1)}) rotate(${lerp(-18, 16, t).toFixed(1)})` }, /* @__PURE__ */ svgNode("polygon", { points: "-18,-8 18,0 -14,10 -8,0", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2" })), /* @__PURE__ */ svgNode("path", { d: "M 88 122 L 192 122 L 176 168 L 104 168 Z", fill: "#D9B382", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("path", { d: "M 96 122 A 44 44 0 0 1 184 122", stroke: "#26255F", strokeWidth: "3.5", fill: "none" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 144, scale: 0.38 }));
    }
    case 5: {
      const drop = lerp(-30, 0, easeOutCubic(phase(t, 0.2, 0.8)));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F5F7FA" }), /* @__PURE__ */ svgNode("rect", { x: "78", y: "132", width: "52", height: "44", rx: "6", fill: "#8CB863" }), /* @__PURE__ */ svgNode("rect", { x: "148", y: "132", width: "52", height: "44", rx: "6", fill: "#26255F" }), /* @__PURE__ */ svgNode("text", { x: "104", y: "160", textAnchor: "middle", fill: "#FFFFFF", fontSize: "18", fontWeight: "700" }, "E"), /* @__PURE__ */ svgNode("text", { x: "174", y: "160", textAnchor: "middle", fill: "#FFFFFF", fontSize: "18", fontWeight: "700" }, "W"), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${106 + drop})` }, /* @__PURE__ */ svgNode("rect", { x: "-28", y: "-22", width: "56", height: "48", rx: "8", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 2, scale: 0.38 }), /* @__PURE__ */ svgNode("circle", { cx: "-18", cy: "-30", r: "10", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "18", cy: "-30", r: "10", fill: "#EC4899" })));
    }
    case 6: {
      const starSpin = t * 90;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FFFDF5" }), [0, 120, 240].map((deg, idx) => {
        const rad = (deg + starSpin) * Math.PI / 180;
        const sx = 140 + Math.cos(rad) * 76;
        const sy = 96 + Math.sin(rad) * 44;
        return /* @__PURE__ */ svgNode(
          "polygon",
          {
            key: idx,
            points: "0,-14 4,-4 14,-4 6,3 9,13 0,7 -9,13 -6,3 -14,-4 -4,-4",
            fill: "#F59E0B",
            transform: `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`
          }
        );
      }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 96, scale: 0.62, coreScale: 1 + 0.14 * bob }));
    }
    case 7: {
      const sway = Math.sin(t * Math.PI * 2) * 10;
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F2F8F1" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 132) rotate(${sway.toFixed(1)})` }, /* @__PURE__ */ svgNode("line", { x1: "-22", y1: "0", x2: "-34", y2: "-52", stroke: "#8CB863", strokeWidth: "5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("line", { x1: "22", y1: "0", x2: "34", y2: "-52", stroke: "#8CB863", strokeWidth: "5", strokeLinecap: "round" }), /* @__PURE__ */ svgNode("circle", { cx: "-36", cy: "-58", r: "18", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "-36", cy: "-58", r: "9", fill: "#5C3D1E" }), /* @__PURE__ */ svgNode("circle", { cx: "36", cy: "-58", r: "18", fill: "#FACC15" }), /* @__PURE__ */ svgNode("circle", { cx: "36", cy: "-58", r: "9", fill: "#5C3D1E" })), /* @__PURE__ */ svgNode("polygon", { points: "88,120 192,120 174,174 106,174", fill: "#E07A5F", stroke: "#26255F", strokeWidth: "2" }), /* @__PURE__ */ svgNode("rect", { x: "82", y: "112", width: "116", height: "12", rx: "4", fill: "#D4664B" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 148, scale: 0.36 }));
    }
    case 8: {
      const capTilt = lerp(-24, 6, easeInOutSine(t));
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#FAF5FF" }), /* @__PURE__ */ svgNode("circle", { cx: "116", cy: "108", r: "20", fill: "#F9A8D4" }), /* @__PURE__ */ svgNode("circle", { cx: "164", cy: "108", r: "20", fill: "#93C5FD" }), /* @__PURE__ */ svgNode("circle", { cx: "140", cy: "96", r: "22", fill: "#FFFFFF", stroke: "#E2E8F0", strokeWidth: "2" }), /* @__PURE__ */ svgNode("polygon", { points: "94,116 186,116 154,172 126,172", fill: "#8CB863" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${62 - arcJump(t, 12)}) rotate(${capTilt.toFixed(1)})` }, /* @__PURE__ */ svgNode("polygon", { points: "-32,0 0,-13 32,0 0,13", fill: "#26255F" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 0, scale: 0.2 })), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 140, y: 144, scale: 0.34 }));
    }
    default: {
      const hopY = -arcJump(t, 14);
      return /* @__PURE__ */ svgNode("g", null, /* @__PURE__ */ svgNode("rect", { width: "280", height: "200", rx: "16", fill: "#F1F8F5" }), /* @__PURE__ */ svgNode("g", { transform: `translate(140 ${112 + hopY})` }, /* @__PURE__ */ svgNode("path", { d: "M -26 -38 A 26 26 0 0 1 26 -38", stroke: "#26255F", strokeWidth: "5", fill: "none" }), /* @__PURE__ */ svgNode("circle", { cx: "-26", cy: "-34", r: "14", fill: "#FFFFFF", stroke: "#FACC15", strokeWidth: "4" }), /* @__PURE__ */ svgNode("circle", { cx: "26", cy: "-34", r: "14", fill: "#FFFFFF", stroke: "#FACC15", strokeWidth: "4" }), /* @__PURE__ */ svgNode("circle", { cx: "0", cy: "-40", r: "15", fill: "#8CB863" }), /* @__PURE__ */ svgNode("rect", { x: "-54", y: "-36", width: "108", height: "92", rx: "10", fill: "#FFFFFF", stroke: "#26255F", strokeWidth: "2.5" }), /* @__PURE__ */ svgNode(VerdoraLogoMark, { x: 0, y: 10, scale: 0.54, petalRotate: bob * 10 })));
    }
  }
};
export {
  KindergartenSceneGroup
};
