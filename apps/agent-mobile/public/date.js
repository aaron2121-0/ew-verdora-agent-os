export const KUCHING_TZ="Asia/Kuching";

function parts(value=Date.now()){
  const d=value instanceof Date?value:new Date(value);
  const list=new Intl.DateTimeFormat("en-GB",{
    timeZone:KUCHING_TZ,year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).formatToParts(d);
  const get=type=>list.find(x=>x.type===type)?.value||"";
  return {year:get("year"),month:get("month"),day:get("day"),hour:get("hour"),minute:get("minute")};
}

export function kuchingDateKey(value=Date.now()){
  const p=parts(value);
  return p.year+"-"+p.month+"-"+p.day;
}

export function kuchingHour(value=Date.now()){
  return Number(parts(value).hour)||0;
}

export function greetingPeriod(value=Date.now()){
  const h=kuchingHour(value);
  if(h<12)return "morning";
  if(h<17)return "afternoon";
  if(h<21)return "evening";
  return "night";
}

export function addDateDays(dateKey,days){
  const [y,m,d]=String(dateKey).split("-").map(Number);
  const dt=new Date(Date.UTC(y,m-1,d+Number(days||0)));
  return dt.toISOString().slice(0,10);
}

export function kuchingLocalToIso(dateKey,timeValue="12:00"){
  const [y,m,d]=String(dateKey).split("-").map(Number);
  const [hh,mm]=String(timeValue).slice(0,5).split(":").map(Number);
  return new Date(Date.UTC(y,m-1,d,(hh||0)-8,mm||0,0,0)).toISOString();
}

export function formatKuchingDate(value,lang="en",options={}){
  if(!value)return "";
  return new Intl.DateTimeFormat(lang==="zh"?"zh-CN":"en-MY",{
    timeZone:KUCHING_TZ,
    month:"short",day:"numeric",
    ...options
  }).format(new Date(value));
}

export function formatKuchingDateTime(value,lang="en"){
  if(!value)return "";
  return new Intl.DateTimeFormat(lang==="zh"?"zh-CN":"en-MY",{
    timeZone:KUCHING_TZ,
    month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).format(new Date(value));
}

export function deliveryDateChoices(base=kuchingDateKey()){
  return [
    {offset:0,value:base},
    {offset:1,value:addDateDays(base,1)},
    {offset:2,value:addDateDays(base,2)}
  ];
}
