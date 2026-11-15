// Pure ESM shared by authenticated Edge dispatch and offline import/tests.
// Database RPCs repeat these checks; no caller may supply the acting user.
export const OCCASION_INPUT_FIELDS = Object.freeze([
  'date_start','date_end','estimated_date','name_zh','name_en','category',
  'location_or_audience','flower_demand','typical_products','order_lead_days',
  'recurrence','date_status','confidence','past_2024','past_2025','source_url','evidence'
]);
const INPUT_KEYS = new Set(OCCASION_INPUT_FIELDS);
const IMPORT_KEYS = new Set([...INPUT_KEYS,'id','verified_by','verified_at','created_at','updated_at','needs_owner_confirm']);
const SUBMISSION_KEYS = new Set(['occasion_id','proposed_date_start','proposed_date_end','proof_url','note']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = () => { throw new Error('occasion_invalid_request'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function exact(value, fields) {
  if (!object(value) || Object.keys(value).some(key => !fields.has(key))) fail();
}
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail();
  return value;
}
function nullableText(value, max) { return value === null ? null : text(value, max); }
function isoDate(value, nullable = true) {
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) fail();
  const parsed = new Date(value + 'T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) fail();
  return value;
}
function uuid(value) { if (typeof value !== 'string' || !UUID.test(value)) fail(); return value; }
function url(value) {
  if (value === null) return null;
  text(value,2048,true);
  if (/\s/.test(value) || !/^https?:\/\//i.test(value)) fail();
  let parsed; try { parsed = new URL(value); } catch { fail(); }
  if (!['http:','https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) fail();
  return value;
}
function choice(value, allowed) { if (!allowed.includes(value)) fail(); return value; }
export function validateOccasionInput(value) {
  exact(value, INPUT_KEYS);
  if (OCCASION_INPUT_FIELDS.some(key => !Object.hasOwn(value,key))) fail();
  const result = {
    date_start:isoDate(value.date_start), date_end:isoDate(value.date_end), estimated_date:isoDate(value.estimated_date),
    name_zh:text(value.name_zh,240,true), name_en:text(value.name_en,240,true),
    category:choice(value.category,['graduation','festival','cultural','business','wedding','event']),
    location_or_audience:text(value.location_or_audience,500), flower_demand:choice(value.flower_demand,['high','medium','low']),
    typical_products:value.typical_products, order_lead_days:value.order_lead_days,
    recurrence:choice(value.recurrence,['fixed','lunar','variable']), date_status:choice(value.date_status,['confirmed','pattern','not_found']),
    confidence:choice(value.confidence,['high','medium','low']), past_2024:nullableText(value.past_2024,1000),
    past_2025:nullableText(value.past_2025,1000),source_url:url(value.source_url),evidence:nullableText(value.evidence,10000)
  };
  if (!Array.isArray(result.typical_products) || result.typical_products.length>40) fail();
  result.typical_products=result.typical_products.map(item=>text(item,120,true));
  if (!Number.isInteger(result.order_lead_days) || result.order_lead_days<0 || result.order_lead_days>365) fail();
  if (result.date_end && (!result.date_start || result.date_end<result.date_start)) fail();
  if (result.date_status==='confirmed' && !result.date_start) fail();
  return result;
}
export function validateOccasionImport(records) {
  if (!Array.isArray(records) || records.length<1 || records.length>200 || new TextEncoder().encode(JSON.stringify(records)).length>2097152) fail();
  const ids = new Set();
  return records.map(record=>{
    exact(record,IMPORT_KEYS);
    if (typeof record.needs_owner_confirm!=='boolean') fail();
    let id;
    if (Object.hasOwn(record,'id')) { id=uuid(record.id); if(ids.has(id.toLowerCase()))fail(); ids.add(id.toLowerCase()); }
    if (record.verified_by!==undefined && record.verified_by!==null) uuid(record.verified_by);
    for(const key of ['verified_at','created_at','updated_at']) {
      if(record[key]!==undefined && record[key]!==null && (typeof record[key]!=='string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(record[key]) || !Number.isFinite(Date.parse(record[key]))))fail();
      if(record[key]!==undefined && record[key]!==null)isoDate(record[key].slice(0,10),false);
    }
    const input=validateOccasionInput(Object.fromEntries(OCCASION_INPUT_FIELDS.map(key=>[key,record[key]])));
    if(record.needs_owner_confirm){
      input.estimated_date=input.estimated_date??input.date_start;
      input.date_start=null; input.date_end=null;
      input.date_status=input.estimated_date?'pattern':'not_found';
    }
    return {...input,...(id?{id}:{}),needs_owner_confirm:record.needs_owner_confirm};
  });
}
export function validateOccasionSubmission(value) {
  exact(value,SUBMISSION_KEYS);
  const result={occasion_id:uuid(value.occasion_id),proposed_date_start:isoDate(value.proposed_date_start,false),proposed_date_end:isoDate(value.proposed_date_end),proof_url:url(value.proof_url),note:text(value.note,5000)};
  if(result.proposed_date_end && result.proposed_date_end<result.proposed_date_start)fail();
  return result;
}
const ACTIONS = new Set(['occasion_list','occasion_verification_submit','occasion_stock_eligibility','occasion_upsert','occasion_verification_review','occasion_import']);
const OWNER_ACTIONS = new Set(['occasion_upsert','occasion_verification_review','occasion_import']);
const KNOWN_ERRORS = new Set(['occasion_invalid_request','occasion_confirmation_required','occasion_not_found','occasion_verification_not_found','occasion_verification_already_reviewed','occasion_verification_stale','occasion_agent_required','forbidden']);
export async function handleOccasionAction({body,uid,admin,role}) {
  const action=body?.action;
  if(!ACTIONS.has(action))return null;
  if(!['agent','owner'].includes(role) || (OWNER_ACTIONS.has(action)&&role!=='owner') || (action==='occasion_verification_submit'&&role!=='agent'))return {status:403,payload:{error:'forbidden'}};
  let name,args={p_user_id:uid};
  try {
    uuid(uid);
    if(action==='occasion_list'){name='occasion_list_internal';args.p_role=role;}
    if(action==='occasion_verification_submit'){name='occasion_verification_submit_internal';args.p_submission=validateOccasionSubmission(body.submission);}
    if(action==='occasion_stock_eligibility'){name='occasion_stock_eligibility_internal';args.p_occasion_id=uuid(body.occasion_id);}
    if(action==='occasion_upsert'){
      name='occasion_upsert_internal';args.p_occasion=validateOccasionInput(body.occasion);
      if(body.confirm!==undefined && typeof body.confirm!=='boolean')fail();
      args.p_id=body.id===undefined?null:uuid(body.id);args.p_confirm=body.confirm===true;
      if(args.p_occasion.date_status==='confirmed'&&!args.p_confirm)throw new Error('occasion_confirmation_required');
      if(args.p_confirm && args.p_occasion.date_status!=='confirmed')fail();
    }
    if(action==='occasion_verification_review'){
      name='occasion_verification_review_internal';args.p_verification_id=uuid(body.verification_id);args.p_decision=choice(body.decision,['approved','rejected']);
    }
    if(action==='occasion_import'){name='occasion_import_internal';args.p_records=validateOccasionImport(body.records);}
  } catch(error) { return {status:422,payload:{error:KNOWN_ERRORS.has(error.message)?error.message:'occasion_invalid_request'}}; }
  const {data,error}=await admin.rpc(name,args);
  if(error){
    const code=KNOWN_ERRORS.has(error.message)?error.message:'occasion_request_failed';
    return {status:code==='forbidden'||code==='occasion_agent_required'?403:code.includes('already_reviewed')||code.includes('stale')?409:400,payload:{error:code}};
  }
  return {status:200,payload:{ok:true,...data}};
}
