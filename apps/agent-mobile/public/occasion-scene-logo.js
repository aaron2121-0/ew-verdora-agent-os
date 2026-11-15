// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
import { svgNode } from "./occasion-scene-dom.js";
function buildRosettePath() {
  const lobes = 12;
  const rInner = 34.5;
  const rOuter = 40.5;
  const pts = [];
  for (let i = 0; i < lobes; i += 1) {
    const a0 = (i * 30 - 90 - 15) * Math.PI / 180;
    const aMid = (i * 30 - 90) * Math.PI / 180;
    const a1 = (i * 30 - 90 + 15) * Math.PI / 180;
    const x0 = +(rInner * Math.cos(a0)).toFixed(2);
    const y0 = +(rInner * Math.sin(a0)).toFixed(2);
    const cx = +((rOuter + 5.2) * Math.cos(aMid)).toFixed(2);
    const cy = +((rOuter + 5.2) * Math.sin(aMid)).toFixed(2);
    const x1 = +(rInner * Math.cos(a1)).toFixed(2);
    const y1 = +(rInner * Math.sin(a1)).toFixed(2);
    if (i === 0) {
      pts.push(`M ${x0} ${y0}`);
    }
    pts.push(`Q ${cx} ${cy} ${x1} ${y1}`);
  }
  pts.push("Z");
  return pts.join(" ");
}
function buildStarCorePath() {
  const spikes = 12;
  const rOuter = 17.5;
  const rInner = 11.4;
  const cmds = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (i * 15 - 90) * Math.PI / 180;
    const r = i % 2 === 0 ? rOuter : rInner;
    const px = +(r * Math.cos(angle)).toFixed(2);
    const py = +(r * Math.sin(angle)).toFixed(2);
    cmds.push(`${i === 0 ? "M" : "L"} ${px} ${py}`);
  }
  cmds.push("Z");
  return cmds.join(" ");
}
const ROSETTE_PATH = buildRosettePath();
const STAR_CORE_PATH = buildStarCorePath();
const PETAL_PATH = "M 0 -14.2 C -6.8 -22.5 -10.8 -29.5 -9.8 -35.2 C -8.8 -39.5 -4.6 -42 0 -42 C 4.6 -42 8.8 -39.5 9.8 -35.2 C 10.8 -29.5 6.8 -22.5 0 -14.2 Z";
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];
const VerdoraLogoMark = ({
  x = 0,
  y = 0,
  scale = 1,
  opacity = 1,
  discScale = 1,
  rosetteRotate = 0,
  rosetteScale = 1,
  petalRotate = 0,
  petalScale = 1,
  coreRotate = 0,
  coreScale = 1,
  outlineOnLight = true
}) => {
  return /* @__PURE__ */ svgNode(
    "g",
    {
      transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`,
      opacity
    },
    /* @__PURE__ */ svgNode("g", { transform: `scale(${discScale.toFixed(3)})` }, /* @__PURE__ */ svgNode(
      "circle",
      {
        cx: "0",
        cy: "0",
        r: "49",
        fill: "#FFFFFF",
        stroke: outlineOnLight ? "#DDD8CB" : "none",
        strokeWidth: outlineOnLight ? 1.2 : 0
      }
    )),
    /* @__PURE__ */ svgNode("g", { transform: `rotate(${rosetteRotate.toFixed(2)}) scale(${rosetteScale.toFixed(3)})` }, /* @__PURE__ */ svgNode("path", { d: ROSETTE_PATH, fill: "#26255F" })),
    /* @__PURE__ */ svgNode("g", { transform: `rotate(${petalRotate.toFixed(2)}) scale(${petalScale.toFixed(3)})` }, PETAL_ANGLES.map((deg) => /* @__PURE__ */ svgNode("path", { key: deg, d: PETAL_PATH, fill: "#8CB863", transform: `rotate(${deg})` }))),
    /* @__PURE__ */ svgNode("g", { transform: `rotate(${coreRotate.toFixed(2)}) scale(${coreScale.toFixed(3)})` }, /* @__PURE__ */ svgNode("path", { d: STAR_CORE_PATH, fill: "#FFFFFF" }))
  );
};
export {
  VerdoraLogoMark
};
