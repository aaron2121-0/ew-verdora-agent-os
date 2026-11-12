import fs from "node:fs";
const p="docs/phase0/lighthouse.json";
const report=JSON.parse(fs.readFileSync(p,"utf8"));
const score=k=>Math.round((report.categories[k]?.score||0)*100);
const perf=score("performance");
const a11y=score("accessibility");
const best=score("best-practices");
const cls=Number(report.audits["cumulative-layout-shift"]?.numericValue??999);
const summary={
  performance:perf,
  accessibility:a11y,
  bestPractices:best,
  cls,
  firstContentfulPaintMs:report.audits["first-contentful-paint"]?.numericValue??null,
  largestContentfulPaintMs:report.audits["largest-contentful-paint"]?.numericValue??null,
  totalBlockingTimeMs:report.audits["total-blocking-time"]?.numericValue??null
};
fs.writeFileSync("docs/phase0/lighthouse-summary.json",JSON.stringify(summary,null,2));
console.log(summary);
if(perf<90)throw new Error(`Performance ${perf}<90`);
if(a11y<95)throw new Error(`Accessibility ${a11y}<95`);
if(best<95)throw new Error(`Best Practices ${best}<95`);
if(cls>0.05)throw new Error(`CLS ${cls}>0.05`);
