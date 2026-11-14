import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
import {fileURLToPath} from "node:url";

const source=readFileSync(fileURLToPath(new URL("../index.ts",import.meta.url)),"utf8");
const tick=String.fromCharCode(96);
const js=source.split("const JS=String.raw"+tick)[1]?.split(tick+";\nconst CSP=")[0];
assert.ok(js,"embedded Owner UI script must exist");

test("Owner embedded JavaScript still parses",()=>assert.doesNotThrow(()=>new Script(js)));

test("dashboard uses everyday Chinese-first labels",()=>{
  for(const label of [
    "30 天净利润率","今天订单","今天营业额","每位活跃代理平均单数",
    "活跃代理","很久没动的代理","待付佣金","待付奖金",
    "需要你处理的问题","等你确认的报价",
    "记录日常开销（如租金、运费、材料）",
    "标准成本设定（会影响以后所有报价，小心改）"
  ])assert.ok(source.includes(label),label);
});

test("completion keeps only common fields visible and puts advanced fields under More options",()=>{
  const start=js.indexOf('"<div class=\\'form launch-completion\\'');
  const end=js.indexOf('+"</div>"',start);
  const block=js.slice(start,end+12);
  assert.match(block,/制作成本 \/ Production cost/);
  assert.match(block,/送货成本 \/ Delivery cost/);
  assert.match(block,/品质检查通过（必须） \/ Quality check passed/);
  assert.match(block,/<details class='completion-more'><summary>更多选项 \/ More options<\/summary>/);
  for(const cls of ["completion-payment_cost","completion-refund_cost","completion-risk_cost","completion-type","completion-rework"])
    assert.ok(block.includes(cls),cls);
  assert.match(block,/value='0'/);
});

test("business actions and commission display are untouched",()=>{
  for(const marker of ["launch_complete_order","launch_confirm_payment","launch_create_order","commission_amount","refreshLaunchPanels"])
    assert.ok(source.includes(marker),marker);
});

test("mobile reading targets are at least 16px text and 48px controls",()=>{
  assert.match(source,/\.muted\{font-size:16px/);
  assert.match(source,/\.btn\{min-height:48px/);
  assert.match(source,/min-height:48px;font-size:16px/);
});
