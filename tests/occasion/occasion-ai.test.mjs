import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  handleOccasionAction, urgentOccasions, topOccasions30d,
} from '../../supabase/functions/_shared/occasion-ai.mjs';

const id = (n) => 'f770ecca-0000-4000-8000-' + String(n).padStart(12, '0');
const base = {
  id:id(1), date_start:'2026-12-25',date_end:null,estimated_date:null,
  name_zh:'圣诞节',name_en:'Christmas Day',
  category:'festival',flower_demand:'high',order_lead_days:21,
  date_status:'confirmed',confidence:'high',
};
const occasion = (values={}) => ({...base,...values});
const guard = (text) => /personal account|my bank|我的银行|供应商|supplier/i.test(text);
const nilAI = async () => null;
const goodAI = async () => JSON.stringify({zh:'欢迎咨询花礼',en:'Feel free to ask about flowers',ms:'Boleh tanya tentang bunga'});
function admin(rows,errors=false) {
  return {
    from(table) {
      assert.equal(table,'occasions');
      return {
        select() {
          return {
            eq(field,value) {
              assert.equal(field,'id');
              return { maybeSingle: async () => ({data:rows.find((row)=>row.id===value)||null,error:errors?{code:'XX000'}:null}) };
            },
            limit: async () => ({data:rows,error:errors?{code:'XX000'}:null}),
          };
        },
      };
    },
  };
}
const run = (action,body={},rows=[base],callAI=nilAI,errors=false) =>
  handleOccasionAction({action,body,admin:admin(rows,errors),callAI,guard,today:'2026-12-15'});

describe('Occasion AI draft actions with mock provider',()=>{
  it('includes server-owned confirmed date and produces three editable languages',async()=>{
    const result=await run('occasion_copy',{occasion_id:id(1),platform:'whatsapp'},[base],goodAI);
    assert.equal(result.status,200);
    assert.equal(result.body.provider,'gemini');
    assert.equal(result.body.editable,true);
    assert.match(result.body.content.zh,/2026-12-25/);
    assert.match(result.body.content.ms,/2026-12-25/);
  });
  it('always labels an estimated graduation date as unconfirmed',async()=>{
    const row=occasion({date_start:null,estimated_date:'2026-12-20',date_status:'pattern',confidence:'low'});
    const result=await run('occasion_copy',{occasion_id:id(1),platform:'xiaohongshu'},[row],goodAI);
    assert.equal(result.body.date_status,'pattern');
    assert.match(result.body.content.zh,/预计/);
    assert.match(result.body.content.en,/not officially confirmed/);
    assert.match(result.body.content.ms,/belum disahkan/);
  });
  it('never presents not_found as a real occasion date',async()=>{
    const row=occasion({date_start:null,estimated_date:null,date_status:'not_found',confidence:'low'});
    const result=await run('occasion_copy',{occasion_id:id(1),platform:'facebook'},[row]);
    assert.match(result.body.content.zh,/尚未确认/);
    assert.doesNotMatch(result.body.content.zh,/2026-12/);
  });
  it('rejects price, discount and fabricated-date AI output in favour of fallback',async()=>{
    const model=async()=>JSON.stringify({zh:'限时优惠 RM99',en:'Sale price RM99',ms:'2027-12-01 discount'});
    const result=await run('occasion_copy',{occasion_id:id(1),platform:'facebook'},[base],model);
    assert.equal(result.body.provider,'fallback');
    assert.doesNotMatch(result.body.content.en,/RM99/);
  });
  it('validates UUID and platform before loading an occasion',async()=>{
    assert.equal((await run('occasion_copy',{occasion_id:'bad',platform:'whatsapp'})).body.error,'occasion_invalid_id');
    assert.equal((await run('occasion_copy',{occasion_id:id(1),platform:'telegram'})).body.error,'occasion_invalid_platform');
  });
  it('creates polite three-language inquiries and checks hostile school names',async()=>{
    const result=await run('school_inquiry',{school_name:'CHMS No.3'});
    assert.match(result.body.content.zh,/CHMS No.3/);
    assert.match(result.body.content.en,/junior and senior/);
    assert.equal((await run('school_inquiry',{school_name:'<script>'})).status,400);
  });
  it('calculates three urgent tasks and handles an unconfirmed pattern',async()=>{
    const rows=[
      occasion({id:id(1),date_start:'2026-12-25'}),
      occasion({id:id(2),date_start:null,estimated_date:'2026-12-16',date_status:'pattern',confidence:'medium'}),
      occasion({id:id(3),date_start:'2026-12-18'}),
      occasion({id:id(4),date_start:'2027-03-01'}),
    ];
    const result=await run('daily_tasks',{},rows);
    assert.equal(result.body.tasks.length,3);
    assert.equal(result.body.tasks[0].occasion_id,id(2));
    assert.match(result.body.tasks[0].task_zh,/预计/);
    assert.equal(result.body.provider,'fallback');
    assert.equal(urgentOccasions(rows,'2026-12-15').length,3);
  });
  it('ranks the next thirty days and preserves can_lock_stock',async()=>{
    const rows=[
      occasion({id:id(1),date_start:'2026-12-25',flower_demand:'high'}),
      occasion({id:id(2),date_start:null,estimated_date:'2026-12-18',date_status:'pattern',confidence:'medium'}),
      occasion({id:id(3),date_start:'2027-03-01'}),
    ];
    const result=await run('top_occasions_30d',{},rows);
    assert.equal(result.body.items.length,2);
    assert.equal(result.body.items[1].can_lock_stock,false);
    assert.equal(topOccasions30d(rows,'2026-12-15').length,2);
  });
  it('does not leak raw database errors',async()=>{
    const result=await run('top_occasions_30d',{},[base],nilAI,true);
    assert.equal(result.status,500);
    assert.deepEqual(result.body,{error:'occasion_request_failed'});
  });
});

describe('source-level security contract',()=>{
  it('keeps AI auth and Owner review restricted',()=>{
    const agentAI=readFileSync(new URL('../../supabase/functions/agent-ai/index.ts',import.meta.url),'utf8');
    const owner=readFileSync(new URL('../../supabase/functions/owner-session/index.ts',import.meta.url),'utf8');
    const sql=readFileSync(new URL('../../supabase/migrations/20261115193000_occasion_calendar.sql',import.meta.url),'utf8');
    assert.match(agentAI,/authentication_required/);
    assert.match(agentAI,/owner_role_internal/);
    assert.match(owner,/occasion_review/);
    assert.match(sql,/revoke all on function public\.owner_review_occasion_verification_internal/);
    assert.match(sql,/occasion_confirmed_requires_date_and_high/);
    assert.match(sql,/occasion_pattern_requires_estimate/);
  });
});
