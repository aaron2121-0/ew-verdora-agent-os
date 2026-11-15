import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const target=process.env.OCCASION_TEST_DATABASE_URL;
test('private occasion RPCs enforce actor, ownership, review atomicity and import provenance',{skip:!target},()=>{
 assert.match(target,/^postgres(?:ql)?:\/\/(?:[^@]*@)?(?:127\.0\.0\.1|localhost)(?::\d+)?\/occasion_test$/,'use a disposable localhost occasion_test database');
 const migration=readdirSync('supabase/migrations').find(name=>/^\d+_occasion_calendar\.sql$/.test(name));
 const sql=['begin;',readFileSync('tests/occasions/fixture.sql','utf8'),readFileSync('supabase/migrations/'+migration,'utf8'),readFileSync('tests/occasions/database.sql','utf8'),'rollback;'].join('\n');
 const run=spawnSync(process.env.OCCASION_TEST_PSQL||'psql',['-X','--no-psqlrc','-v','ON_ERROR_STOP=1',target],{input:sql,encoding:'utf8',maxBuffer:1024*1024});
 assert.equal(run.status,0,run.stderr+'\n'+run.stdout);
});

// Removing either FOR UPDATE would let the second request overwrite a review or
// approve a stale proposal. Two separate sessions verify actual lock behavior.
test('concurrent repeated and conflicting reviews wait and fail safely',{skip:!target},async()=>{
 assert.match(target,/^postgres(?:ql)?:\/\/(?:[^@]*@)?(?:127\.0\.0\.1|localhost)(?::\d+)?\/occasion_test$/);
 const {spawn}=await import('node:child_process');
 const binary=process.env.OCCASION_TEST_PSQL||'psql';
 const args=['-X','--no-psqlrc','-v','ON_ERROR_STOP=1','-At',target];
 const migration=readdirSync('supabase/migrations').find(name=>/^\d+_occasion_calendar\.sql$/.test(name));
 const owner='11111111-1111-4111-8111-111111111111',agent='22222222-2222-4222-8222-222222222222';
 const input={date_start:'2026-12-25',date_end:null,estimated_date:null,name_zh:'Holiday',name_en:'Holiday',category:'festival',location_or_audience:'Kuching',flower_demand:'high',typical_products:[],order_lead_days:21,recurrence:'fixed',date_status:'pattern',confidence:'medium',past_2024:null,past_2025:null,source_url:null,evidence:null};
 const run=sql=>spawnSync(binary,args,{input:sql,encoding:'utf8',maxBuffer:1024*1024});
 const setup=run([readFileSync('tests/occasions/fixture.sql','utf8'),readFileSync('supabase/migrations/'+migration,'utf8'),`select public.occasion_upsert_internal('${owner}','${JSON.stringify(input)}',null,false);`].join('\n'));
 assert.equal(setup.status,0,setup.stderr);
 try {
 const created=setup.stdout.split('\n').find(line=>line.startsWith('{"occasion":'));
 const occasion=JSON.parse(created).occasion.id;
 const serviceList=run(`set role service_role; select public.occasion_list_internal('${agent}','agent');`);
 assert.equal(serviceList.status,0,serviceList.stderr);
 for(const role of ['anon','authenticated']){
   const denied=run(`set role ${role}; select public.occasion_list_internal('${agent}','agent');`);
   assert.notEqual(denied.status,0,role+' unexpectedly executed internal RPC');
   assert.match(denied.stderr,/permission denied/);
 }
 const direct=run('set role service_role; select * from private.occasions;');
 assert.notEqual(direct.status,0,'service_role unexpectedly read private table directly');

 const submit=date=>{
   const submission={occasion_id:occasion,proposed_date_start:date,proposed_date_end:null,proof_url:null,note:'Race proposal'};
   const result=run(`select public.occasion_verification_submit_internal('${agent}','${JSON.stringify(submission)}');`);
   assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout.trim()).verification.id;
 };
 const review=id=>`select public.occasion_verification_review_internal('${owner}','${id}','approved');`;
 async function race(firstId,secondId,expected){
   const first=spawn(binary,args,{stdio:['pipe','pipe','pipe']});
   let firstOut='',firstErr='';
   const locked=new Promise((resolve,reject)=>{
     first.stdout.on('data',chunk=>{firstOut+=chunk; if(firstOut.includes('RACE_LOCKED'))resolve();});
     first.stderr.on('data',chunk=>{firstErr+=chunk;});
     first.on('error',reject);first.on('close',code=>{if(!firstOut.includes('RACE_LOCKED'))reject(new Error(firstErr||'first reviewer did not lock'));});
   });
   const firstDone=new Promise(resolve=>first.on('close',resolve));
   first.stdin.end(`begin;\n${review(firstId)}\nselect 'RACE_LOCKED';\nselect pg_sleep(0.8);\ncommit;\n`);
   await locked;
   const started=Date.now();
   const second=spawn(binary,args,{stdio:['pipe','pipe','pipe']});let secondErr='';
   second.stderr.on('data',chunk=>{secondErr+=chunk;});second.stdout.resume();
   const secondDone=new Promise((resolve,reject)=>{second.on('close',resolve);second.on('error',reject);});
   second.stdin.end(review(secondId));
   assert.equal(await firstDone,0,firstErr);
   assert.notEqual(await secondDone,0,'second review unexpectedly succeeded');
   assert.ok(Date.now()-started>500,'second review did not wait on first reviewer lock');
   assert.ok(secondErr.includes(expected),secondErr);
 }
   const repeated=submit('2027-01-01'); await race(repeated,repeated,'occasion_verification_already_reviewed');
   const first=submit('2027-01-02'),second=submit('2027-01-03'); await race(first,second,'occasion_verification_stale');
   const state=run(`select date_start from private.occasions where id='${occasion}';`);
   assert.equal(state.stdout.trim(),'2027-01-02');
 } finally {
   const cleanup=run('drop schema private cascade; drop schema auth cascade; drop schema public cascade; create schema public; drop role anon; drop role authenticated; drop role service_role;');
   assert.equal(cleanup.status,0,cleanup.stderr);
 }
});
