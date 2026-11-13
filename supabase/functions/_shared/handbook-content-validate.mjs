// Strict validator for the exact Grok/Claude-reviewed handbook_content.json shape.
// Pure ESM: shared by Deno Edge Functions and Node 22 tests.
export const HANDBOOK_SECTIONS=Object.freeze(["story","product_line","service_rule","delivery","script","announcement","faq"]);
export const PRODUCT_LINES=Object.freeze(["condolence","opening","bouquet","wedding_event","wholesale"]);
const ROOT=new Set(["source_version","cards","scripts","faqs"]);
const CARD=new Set(["code","product_line","order","title_en","title_zh","body_en","body_zh","key_points_en","key_points_zh","icon_hint"]);
const SCRIPT=new Set(["code","product_line","situation_en","situation_zh","text_en","text_zh"]);
const FAQ=new Set(["code","q_en","q_zh","a_en","a_zh"]);
const fail=message=>{throw new Error(message)};
const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
function keys(obj,allowed,path){for(const key of Object.keys(obj))if(!allowed.has(key))fail(path+"."+key+" is not allowed")}
function required(x,path,max){
  if(typeof x!=="string")fail(path+" must be a string");
  const v=x.trim();
  if(!v||v.length>max)fail(path+" must contain 1-"+max+" characters");
  return v;
}
function code(x,path){
  const v=required(x,path,64);
  if(!/^[A-Z][A-Z0-9-]*$/.test(v))fail(path+" must use uppercase letters, digits and dashes");
  return v;
}
function line(x,path){
  if(!PRODUCT_LINES.includes(x))fail(path+" is not a supported product_line");
  return x;
}
function points(x,path){
  if(!Array.isArray(x)||x.length!==3)fail(path+" must contain exactly 3 points");
  return x.map((p,i)=>required(p,path+"["+i+"]",240));
}
function array(x,path,max=100){
  if(!Array.isArray(x)||!x.length||x.length>max)fail(path+" must contain 1-"+max+" entries");
  return x;
}
export function validateHandbookContent(payload){
  if(!object(payload))fail("root must be an object");
  const bytes=new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if(bytes>262144)fail("handbook JSON exceeds 256 KiB");
  keys(payload,ROOT,"root");
  const source_version=required(payload.source_version,"source_version",120);
  const used=new Set();
  const remember=(value,path)=>{
    if(used.has(value))fail(path+" duplicate code "+value);
    used.add(value);
    return value;
  };
  const cards=array(payload.cards,"cards").map((x,i)=>{
    const p="cards["+i+"]";
    if(!object(x))fail(p+" must be an object");
    keys(x,CARD,p);
    const n=x.order;
    if(!Number.isInteger(n)||n<1||n>100)fail(p+".order must be an integer in 1..100");
    return {
      code:remember(code(x.code,p+".code"),p),kind:"card",section:"product_line",
      product_line:line(x.product_line,p+".product_line"),sort:n,
      title_en:required(x.title_en,p+".title_en",120),
      title_zh:required(x.title_zh,p+".title_zh",120),
      body_en:required(x.body_en,p+".body_en",10000),
      body_zh:required(x.body_zh,p+".body_zh",10000),
      key_points_en:points(x.key_points_en,p+".key_points_en"),
      key_points_zh:points(x.key_points_zh,p+".key_points_zh"),
      icon_hint:required(x.icon_hint,p+".icon_hint",60)
    };
  });
  const scripts=array(payload.scripts,"scripts").map((x,i)=>{
    const p="scripts["+i+"]";
    if(!object(x))fail(p+" must be an object");
    keys(x,SCRIPT,p);
    return {
      code:remember(code(x.code,p+".code"),p),kind:"script",section:"script",
      product_line:line(x.product_line,p+".product_line"),sort:i+1,
      title_en:required(x.situation_en,p+".situation_en",120),
      title_zh:required(x.situation_zh,p+".situation_zh",120),
      body_en:required(x.text_en,p+".text_en",10000),
      body_zh:required(x.text_zh,p+".text_zh",10000),
      key_points_en:[],key_points_zh:[],icon_hint:null
    };
  });
  const faqs=array(payload.faqs,"faqs").map((x,i)=>{
    const p="faqs["+i+"]";
    if(!object(x))fail(p+" must be an object");
    keys(x,FAQ,p);
    return {
      code:remember(code(x.code,p+".code"),p),kind:"faq",section:"faq",
      product_line:null,sort:i+1,
      title_en:required(x.q_en,p+".q_en",120),
      title_zh:required(x.q_zh,p+".q_zh",120),
      body_en:required(x.a_en,p+".a_en",10000),
      body_zh:required(x.a_zh,p+".a_zh",10000),
      key_points_en:[],key_points_zh:[],icon_hint:null
    };
  });
  return {source_version,counts:{cards:cards.length,scripts:scripts.length,faqs:faqs.length},entries:[...cards,...scripts,...faqs]};
}
