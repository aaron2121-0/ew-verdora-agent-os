import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function walk(dir){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>{
    const rel=path.posix.join(dir,e.name);
    if(e.isDirectory())return ['node_modules','dist','tests','.git'].includes(e.name)?[]:walk(rel);
    return /\.(?:html|js|mjs|ts|css)$/.test(e.name)?[rel]:[];
  });
}
const appFiles=[...walk('apps/agent-mobile'),...walk('apps/owner-mobile')].filter(p=>!p.includes('/tests/'));
function lineNo(s,at){return s.slice(0,at).split('\n').length}
function violations(pattern,include=appFiles){
  const out=[];
  for(const p of include){
    const s=read(p);pattern.lastIndex=0;
    for(const m of s.matchAll(pattern))out.push(p+':'+lineNo(s,m.index)+' '+m[0].slice(0,70));
  }
  return out;
}

test('P0: no unsafe DOM HTML sinks in either application (file:line)',()=>{
  const hits=violations(/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/g,
    appFiles.filter(p=>/\.(?:html|js|mjs|ts)$/.test(p)));
  // Temporary exact-line exception, approved for Owner Phase A only.
  // Expiry: Owner Phase B or explicit QA_OWNER_PHASE_B_COMPLETE=true.
  const owner=read('apps/owner-mobile/index.ts').split('\\n');
  const phaseB=process.env.QA_OWNER_PHASE_B_COMPLETE==='true' || owner.some(x=>x.includes('QA_OWNER_PHASE_B_COMPLETE'));
  const exceptions=new Set(phaseB?[]:['apps/owner-mobile/index.ts:33 innerHTML','apps/owner-mobile/index.ts:34 innerHTML']);
  const escaped=owner[32]?.includes('escapeHtml(')&&owner[33]?.includes('.innerHTML=')&&owner.slice(34,39).join(' ').includes('const esc=escapeHtml');
  assert.ok(phaseB||escaped,'Owner Phase A exception must retain escaping at precise lines 33–34');
  const disallowed=hits.filter(h=>!exceptions.has(h));
  assert.deepEqual(disallowed,[],'Unsafe HTML sinks (Owner Phase B expires exception): '+disallowed.join('; '));
});
test('P0: no inline browser event attributes in HTML or template literals',()=>{
  const hits=violations(/\son(?:click|error|load|submit|change|input|mouseover|focus|blur|keydown)\s*=/gi,
    appFiles.filter(p=>/\.(?:html|js|mjs|ts)$/.test(p)));
  assert.deepEqual(hits,[],'Inline handler: '+hits.join('; '));
});
test('P0: no service role credentials or secret-bearing tokens in client files',()=>{
  const client=appFiles.filter(p=>p.includes('/public/')||p.endsWith('.html'));
  const hits=violations(/\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|service_role|GEMINI_API_KEY|DATABASE_URL)\b|\b(?:sk-proj-|sb_secret_)[A-Za-z0-9_-]{8,}/g,client);
  assert.deepEqual(hits,[],'Client credential exposure: '+hits.join('; '));
});
test('P0: app asset URLs must be self hosted or explicitly approved origins',()=>{
  const allowed=new Set([
    'agent-mobile-production.up.railway.app','owner-mobile-production.up.railway.app',
    'vuibesuahnhlafsfraeo.supabase.co','cdn.jsdelivr.net'
  ]);
  const files=appFiles.filter(p=>p.includes('/public/')&&/\.(?:html|js|mjs|css)$/.test(p));
  const hits=[];
  for(const p of files){
    const s=read(p);
    for(const m of s.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)){
      const host=m[1].toLowerCase();
      // Content and message links are not executable assets.
      const line=s.slice(0,m.index).split('\n').length;
      const statement=s.split('\n')[line-1]||'';
      if(!/(?:src|href|import\s*\(|createElement\(["']script|fetch\s*\()/i.test(statement))continue;
      if(!allowed.has(host))hits.push(p+':'+line+' '+host);
    }
  }
  assert.deepEqual(hits,[],'Unapproved external executable/asset origins: '+hits.join('; '));
});
test('P0: pricing lives in server quotation implementation, not client formulas',()=>{
  const client=appFiles.filter(p=>p.includes('/public/')&&/\.(?:js|mjs)$/.test(p));
  const hits=violations(/\b(?:production_cost|safe_cost|reference_baseline|commissionable_revenue)\b\s*[*+\/-]|\b(?:budget|sellingPrice|selling_price)\s*\*\s*0\.\d+/gi,client);
  assert.deepEqual(hits,[],'Frontend pricing calculation: '+hits.join('; '));
  const quote=read('supabase/functions/quote-intake/index.ts');
  assert.match(quote,/create_quote_from_request_internal|quote_underwrite_internal/,'Quote Edge must delegate official pricing');
});
test('P0: agent selling is blocked in both Agent and quote Edge',()=>{
  const agent=read('supabase/functions/agent-session/index.ts');
  const quote=read('supabase/functions/quote-intake/index.ts');
  for(const s of ['trainee','restricted','recovery','dormant','suspended']){
    assert.ok(agent.includes('"'+s+'"'),'agent-session missing lock: '+s);
    assert.ok(quote.includes('"'+s+'"'),'quote-intake missing lock: '+s);
  }
  assert.match(quote,/quote_access_locked/);
});
test('P0: training response sanitizes private answer keys',()=>{
  const training=read('supabase/functions/agent-training/index.ts');
  for(const field of ['correct_index','question_id','option_order']){
    assert.ok(training.includes('"'+field+'"'),'training sanitizer missing '+field);
  }
  assert.match(training,/safeQuestionPayload\(data,false\)/,'Must scrub before answering');
});
test('P0: leaderboard is aggregate-only, excludes demo and refunded transactions',()=>{
  const sql=read('supabase/migrations/20261113_phase2_agent_performance_dashboard.sql');
  assert.match(sql,/a\.is_demo=false/);
  assert.match(sql,/payment_status<>'refunded'/);
  assert.match(sql,/order by revenue desc/);
});
test('P0: AI quota error and deterministic fallback remain explicit',()=>{
  const ai=read('supabase/functions/agent-ai/index.ts');
  assert.match(ai,/daily_limit/);
  assert.match(ai,/fallbackCoach/);
  assert.match(ai,/fallbackScenario/);
  assert.match(ai,/GEMINI_API_KEY/);
});
test('P0: Kuching calendar boundary is covered by reused Phase 1 tests',()=>{
  const t=read('apps/agent-mobile/tests/phase1-security.test.mjs');
  assert.ok(t.includes('2026-11-30T16:30:00Z'),'Missing Nov/Dec UTC+8 boundary');
  assert.ok(t.includes('2026-12-01'),'Missing month rollover assertion');
});
