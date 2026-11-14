import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=fs.readFileSync(path.join(root,"index.ts"),"utf8");

test("Owner dashboard uses Chinese-first plain-language labels",()=>{
  for(const text of [
    "30 天净利润率","今天订单","今天营业额","每位活跃代理平均单数",
    "活跃代理","很久没动的代理","待付佣金","待付奖金",
    "需要你处理的问题","等你确认的报价",
    "记录日常开销（如租金、运费、材料）",
    "标准成本设定（会影响以后所有报价，小心改）"
  ]) assert.ok(source.includes(text),text);
});

test("completion form keeps only everyday essentials visible",()=>{
  assert.match(source,/制作成本 \/ Production cost/);
  assert.match(source,/送货成本 \/ Delivery cost/);
  assert.match(source,/品质检查通过（必须）/);
  assert.match(source,/<details class='completion-more'><summary class='btn'>更多选项 \/ More options<\/summary>/);
  for(const key of ["payment_cost","refund_cost","risk_cost","fulfilment","rework"])assert.ok(source.includes(key),key);
  assert.doesNotMatch(source,/<details class='completion-more' open/);
});

test("completion request and frozen financial inputs are unchanged",()=>{
  assert.match(source,/action:"launch_complete_order"/);
  assert.match(source,/for\(const key of \["production_cost","delivery_cost","payment_cost","refund_cost","risk_cost"\]\)/);
  assert.match(source,/fulfilment_type:form\.querySelector\("\.completion-type"\)\.value/);
  assert.match(source,/qc_pass:form\.querySelector\("\.completion-qc"\)\.checked/);
  assert.match(source,/rework:form\.querySelector\("\.completion-rework"\)\.checked/);
});

test("ordinary-user tap and text sizes meet the mobile baseline",()=>{
  assert.match(source,/\.btn\{min-height:48px;font-size:16px/);
  assert.match(source,/\.muted\{font-size:16px/);
});
