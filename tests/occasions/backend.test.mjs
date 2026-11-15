import test from 'node:test';
import assert from 'node:assert/strict';
const subject = await import('../../supabase/functions/_shared/occasions.mjs').catch(() => ({}));
const uid='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const input={date_start:'2026-12-25',date_end:null,estimated_date:null,name_zh:'圣诞节',name_en:'Christmas',category:'festival',location_or_audience:'Kuching',flower_demand:'high',typical_products:['bouquet'],order_lead_days:21,recurrence:'fixed',date_status:'confirmed',confidence:'high',past_2024:null,past_2025:null,source_url:'https://example.com/date',evidence:'Owner checked source'};
test('validates real dates, safe URLs, bounded values and exact fields',()=>{
 assert.equal(typeof subject.validateOccasionInput,'function');
 assert.deepEqual(subject.validateOccasionInput(input),input);
 for(const patch of [{date_start:'2026-02-29'},{date_start:'2026-2-01'},{date_end:'2026-01-01'},{source_url:'javascript:alert(1)'},{source_url:'https://user:pass@example.com'},{order_lead_days:366},{typical_products:[12]},{verified_by:uid},{extra:'bad'}]) assert.throws(()=>subject.validateOccasionInput({...input,...patch}));
});
test('import removes supplied provenance and downgrades dates requiring confirmation',()=>{
 assert.equal(typeof subject.validateOccasionImport,'function');
 const [record]=subject.validateOccasionImport([{...input,id,verified_by:uid,verified_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',needs_owner_confirm:true}]);
 assert.equal(record.date_status,'pattern'); assert.equal(record.date_start,null); assert.equal(record.estimated_date,input.date_start); assert.equal(record.verified_by,undefined);
 assert.throws(()=>subject.validateOccasionImport([{...input,needs_owner_confirm:'true'}]));
 for(const verified_at of ['2026-02-29T00:00:00Z','2026-01-01T24:00:00Z']) assert.throws(()=>subject.validateOccasionImport([{...input,needs_owner_confirm:false,verified_at}]));
 assert.throws(()=>subject.validateOccasionImport(Array.from({length:201},()=>({...input,needs_owner_confirm:false}))));
});
test('dispatch uses authenticated actor and role, never body actor',async()=>{
 assert.equal(typeof subject.handleOccasionAction,'function');
 const calls=[]; const admin={rpc:async(name,args)=>{calls.push({name,args});return {data:{verification:{id}},error:null}}};
 const result=await subject.handleOccasionAction({role:'agent',uid,admin,body:{action:'occasion_verification_submit',p_user_id:id,submitted_by:id,submission:{occasion_id:id,proposed_date_start:'2027-01-01',proposed_date_end:null,proof_url:null,note:'School announced date'}}});
 assert.equal(result.status,200); assert.equal(calls[0].args.p_user_id,uid); assert.equal(calls[0].args.p_submission.submitted_by,undefined);
 const forbidden=await subject.handleOccasionAction({role:'agent',uid,admin,body:{action:'occasion_upsert',occasion:input,confirm:true}});
 assert.equal(forbidden.status,403); assert.equal(calls.length,1);
});
test('dispatch enforces explicit owner attestation and exposes only allowlisted errors',async()=>{
 assert.equal(typeof subject.handleOccasionAction,'function');
 const admin={rpc:async()=>({error:{message:'relation private.secret does not exist'}})};
 const unconfirmed=await subject.handleOccasionAction({role:'owner',uid,admin,body:{action:'occasion_upsert',occasion:input}});
 assert.equal(unconfirmed.status,422);
 const failed=await subject.handleOccasionAction({role:'owner',uid,admin,body:{action:'occasion_verification_review',verification_id:id,decision:'approved'}});
 assert.equal(failed.payload.error,'occasion_request_failed');
 assert.equal(await subject.handleOccasionAction({role:'agent',uid,admin,body:{action:'dashboard'}}),null);
});
