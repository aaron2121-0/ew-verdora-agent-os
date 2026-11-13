// Shared pure validator: Deno Edge Function and Node 22 tests.
export const HANDBOOK_SECTIONS=Object.freeze(["story","product_line","service_rule","delivery","script","announcement"]);
const rootKeys=new Set(["schema_version","source","entries","generated_at"]);
const entryKeys=new Set(["section","title_en","title_zh","body_en","body_zh","sort"]);
const fail=message=>{throw new Error(message)};
function plain(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)}
function fields(o,allowed,path){for(const key of Object.keys(o))if(!allowed.has(key))fail(path+"."+key+" unknown field")}
function value(x,path,max){
  if(typeof x!=="string")fail(path+" must be a string");
  const v=x.trim();
  if(!v||v.length>max)fail(path+" must have 1-"+max+" characters");
  return v;
}
export function validateHandbookContent(input){
  if(!plain(input))fail("root must be a JSON object");
  if(new TextEncoder().encode(JSON.stringify(input)).byteLength>262144)fail("payload exceeds 256 KiB");
  fields(input,rootKeys,"root");
  if(input.schema_version!=="1.0")fail("schema_version must be 1.0");
  if(input.source!=="grok")fail("source must be grok");
  if(input.generated_at!==undefined &&
      (typeof input.generated_at!=="string"||!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$/.test(input.generated_at)||!Number.isFinite(Date.parse(input.generated_at))))
    fail("generated_at must be a valid UTC ISO 8601 timestamp");
  if(!Array.isArray(input.entries)||input.entries.length<1||input.entries.length>100)
    fail("entries must contain 1-100 items");
  const entries=input.entries.map((item,i)=>{
    const path="entries["+i+"]";
    if(!plain(item))fail(path+" must be an object");
    fields(item,entryKeys,path);
    if(!HANDBOOK_SECTIONS.includes(item.section))fail(path+".section invalid");
    const sort=item.sort===undefined?0:item.sort;
    if(!Number.isInteger(sort)||sort<-10000||sort>10000)fail(path+".sort must be an integer between -10000 and 10000");
    return {
      section:item.section,
      title_en:value(item.title_en,path+".title_en",120),
      title_zh:value(item.title_zh,path+".title_zh",120),
      body_en:value(item.body_en,path+".body_en",10000),
      body_zh:value(item.body_zh,path+".body_zh",10000),
      sort
    };
  });
  return {schema_version:"1.0",source:"grok",entries};
}
