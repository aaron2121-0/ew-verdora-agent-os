(function(R){'use strict';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function red(){return R.VerdoraMotion&&R.VerdoraMotion.isReducedMotion?R.VerdoraMotion.isReducedMotion():!!(R.matchMedia&&R.matchMedia('(prefers-reduced-motion: reduce)').matches);}
var KUCHING_AREAS=['Petra Jaya','Batu Kawa','Tabuan Jaya','Satok','Samarahan'];
var OCR={
  complete:{sender:'Jason · Tabuan Jaya',lines_zh:['20/11 10:00 Tabuan Jaya 新店开张','两座香槟开业花架，请问档期与署名？'],lines_en:['20/11 10 AM opening in Tabuan Jaya','Two champagne stands—slot & wording?'],raw:{occasion_zh:'新店开业花架',occasion_en:'Grand Opening Stand',occasion_bm:'Gubahan Pembukaan',date_zh:'2026-11-20 10:00',date_en:'20 Nov 2026, 10 AM',date_bm:'20 Nov 2026',location:'Tabuan Jaya',tier_zh:'双座 · 报价审核中',tier_en:'Dual · Quote Review',tier_bm:'Dua · Semakan'}},
  missing:{sender:'Mei Ling · Petra Jaya',lines_zh:['下周送白玫瑰到 Petra Jaya 大堂','日期与规格稍后确认。'],lines_en:['White roses to Petra Jaya lobby next week','Date & tier to follow.'],raw:{occasion_zh:'商务花束',occasion_en:'Corporate Bouquet',occasion_bm:'Jambangan Ros Putih',date_zh:'',date_en:'',location:'Petra Jaya',tier_zh:'',tier_en:''}}
};
function normalizeOcrResult(raw,ul){
  var s=raw||{},l=ul==='en'?'en':'zh',oc=s['occasion_'+l]||s.occasion||'',dt=s['date_'+l]||s.date||'',lc=(s.location||'').trim(),tr=s['tier_'+l]||s.tier||'';
  var fs=[{key:'occasion',zh:'场合',en:'Occasion',v:oc.trim()},{key:'date',zh:'日期',en:'Date',v:dt.trim()},{key:'location',zh:'地区',en:'Area',v:lc},{key:'tier',zh:'规格',en:'Tier',v:tr.trim()}].map(function(f){var m=!f.v;return{key:f.key,label:f[l],enLabel:f.en,zhLabel:f.zh,value:m?(l==='en'?'Needs Info':'缺漏待确认'):f.v,missing:m};});
  var ms=fs.filter(function(f){return f.missing;}),oz=s.occasion_zh||oc||'花礼',oe=s.occasion_en||oc||'Order',ob=s.occasion_bm||oe,ls=lc||'Kuching';
  return{fields:fs,missingKeys:ms.map(function(f){return f.key;}),drafts:ms.length?{zh:'您好！收到 '+ls+'「'+oz+'」询问，请补充【'+ms.map(function(m){return m.zhLabel;}).join('、')+'】。',en:'Hello! Received "'+oe+'" for '+ls+'. Confirm ['+ms.map(function(m){return m.enLabel;}).join(' & ')+']?',bm:'Hai! Terima "'+ob+'" di '+ls+'. Kongsikan ['+ms.map(function(m){return m.enLabel;}).join(' & ')+']?'}:{zh:'您好！已登记 '+ls+'「'+oz+'」（'+(s.date_zh||dt)+' · '+(s.tier_zh||tr)+'），稍后核对贺卡署名。',en:'Hello! Noted "'+oe+'" in '+ls+' ('+(s.date_en||dt)+' · '+(s.tier_en||tr)+'). Card check follows.',bm:'Hai! Direkod "'+ob+'" di '+ls+' ('+(s.date_bm||dt)+'). Pengesahan kad menyusul.'}};
}
var VP={transcript_zh:'Batu Kawa 客户陈小姐，下周三需要两座白百合花架，报价审核中，挽联敬挽安息。',transcript_en:'Batu Kawa client Ms Tan needs two white lily stands next Wednesday, Quote Under Review.',parsed:{id:'cust-v1',name:'陈小姐 / Ms Tan',line_zh:'帛事致意 · 白百合 ×2',line_en:'Condolence · White Lily ×2',area:'Batu Kawa',statusKey:'stBadgeOpening'}};
function buildCustomerFromVoice(tr,ov){
  var s=String(tr||''),o=ov||{},am=s.match(/(Petra Jaya|Batu Kawa|Tabuan Jaya|Satok|Samarahan)/i),nm=s.match(/(?:客户|for\s+)([^\s，,、:：]+)/i),cd=/帛事|慰问|condolence/i.test(s);
  return{id:o.id||'cust-'+Math.abs(s.length*37),name:o.name||(nm?nm[1]:'Satok Client'),line_zh:o.line_zh||o.line||(cd?'帛事致意 · 花架':'定制花礼'),line_en:o.line_en||o.line||(cd?'Condolence Stand':'Custom Florals'),area:o.area||(am?am[1]:'Kuching'),statusKey:o.statusKey||(/确认|confirm/i.test(s)?'stBadgeBouquet':(/付款|payment/i.test(s)?'stBadgeWedding':'stBadgeOpening'))};
}
var HB=[
  {id:'sec-2-1',code_zh:'§2.1 配送区域',code_en:'§2.1 Delivery Coverage Zones',kw:['区域','配送','古晋','zone','area','kuching','petra jaya','batu kawa','samarahan'],excerpt_zh:'涵盖 Petra Jaya、Batu Kawa、Tabuan Jaya、Satok 及 Samarahan；跨区由调度核对。',excerpt_en:'Covers Petra Jaya, Batu Kawa, Tabuan Jaya, Satok, and Samarahan.',answer_zh:'依据《§2.1 配送区域》，古晋覆盖 Petra Jaya、Batu Kawa、Tabuan Jaya、Satok 与 Samarahan。',answer_en:'Per §2.1 Delivery Coverage Zones, routes include Petra Jaya, Batu Kawa, Tabuan Jaya, Satok, and Samarahan.'},
  {id:'sec-3-2',code_zh:'§3.2 参考图原则',code_en:'§3.2 Reference Photo Principles',kw:['参考图','配色','照片','photo','reference','style'],excerpt_zh:'参考图对齐色系与体量；作品图须经 Owner 核准后显示。',excerpt_en:'References align palette & scale; photos show after Owner approval.',answer_zh:'按照《§3.2 参考图原则》，作品照由 Owner 核准后显示，平时以参考图沟通色系。',answer_en:'Under §3.2 Reference Photo Principles, portfolio photos appear once Owner-approved.'},
  {id:'sec-4-1',code_zh:'§4.1 贺卡署名规范',code_en:'§4.1 Card & Ribbon Sign-Off',kw:['署名','贺卡','挽联','card','ribbon','wording'],excerpt_zh:'出花前请客人文字确认抬头与署名，无误后交门市印制。',excerpt_en:'Verify recipient title and sender wording in writing before printing.',answer_zh:'依据《§4.1 贺卡署名规范》，丝带与贺卡印制前请发给客户二次确认。',answer_en:'Per §4.1 Card & Ribbon Sign-Off, confirm card wording in writing before printing.'}
];
function matchHandbookClauses(q,lg){
  var s=String(q||'').toLowerCase(),l=lg==='en'?'en':'zh',sc=HB.map(function(c){var h=0;c.kw.forEach(function(k){if(s.indexOf(k.toLowerCase())!==-1)h++;});return{c:c,h:h};}).sort(function(a,b){return b.h-a.h;});
  var p=sc[0].h>0?sc[0].c:HB[0],s2=sc[1]&&sc[1].h>0?sc[1].c:null,ids=s2?[p.id,s2.id]:[p.id];
  return{answer:p['answer_'+l],matchedIds:ids,sources:ids.map(function(id){var f=HB.filter(function(c){return c.id===id;})[0];return{id:f.id,code:f['code_'+l]};})};
}
var DECK=[
  {id:'fu-1',client:'林先生 / Mr Lim',occasion_zh:'开业花篮 · Tabuan Jaya',occasion_en:'Opening · Tabuan Jaya',statusKey:'stBadgeOpening',draft_zh:'林先生早安！Tabuan Jaya 新店花架色系已记好，请问仪式几点？',draft_en:'Morning Mr Lim! Noted Tabuan Jaya stand tones—what time is the ceremony?'},
  {id:'fu-2',client:'Siti Nurhaliza',occasion_zh:'婚礼桌花 · Petra Jaya',occasion_en:'Wedding · Petra Jaya',statusKey:'stBadgeWedding',draft_zh:'Hi Siti! 跟进 Petra Jaya 宴会厅粉白花艺配色，确认主调了吗？',draft_en:'Hi Siti! Checking on Petra Jaya banquet blush & ivory direction.'},
  {id:'fu-3',client:'张太太 / Mrs Chong',occasion_zh:'精致花束 · Satok',occasion_en:'Bouquet · Satok',statusKey:'stBadgeBouquet',draft_zh:'张太太您好，Satok 花束偏好白玫瑰还是香槟色系呢？',draft_en:'Hello Mrs Chong! For your Satok bouquet, white roses or champagne tones?'}
];
function advanceFollowupDeck(dk,act){return!dk||!dk.length?{remaining:[],handledItem:null,action:act}:{remaining:dk.slice(1),handledItem:dk[0],action:act==='send'?'send':'skip'};}
var HEAT=[
  {id:'lead-1',name:'Dato Lim · Petra Jaya',statusKey:'stBadgeOpening',heat:92,stage_zh:'高意向 · 立即跟进',stage_en:'Hot · Follow Up',reasons_zh:['多次查看开张花架配色','已核对 Petra Jaya 卸货点'],reasons_en:['Viewed palette 3× today','Confirmed Petra Jaya drop-off'],next_zh:'发送丝带落款核对模板',next_en:'Send ribbon wording check'},
  {id:'lead-2',name:'Amanda & Kelvin · Tabuan Jaya',statusKey:'stBadgeWedding',heat:84,stage_zh:'高意向 · 今日回访',stage_en:'Warm-Hot · Today',reasons_zh:['询问 Tabuan Jaya 主桌花风格'],reasons_en:['Asked on Tabuan Jaya styling'],next_zh:'分享《参考图原则》配色板',next_en:'Share Reference Photo palette'},
  {id:'lead-3',name:'Farah · Samarahan',statusKey:'stBadgeBouquet',heat:58,stage_zh:'温热培育',stage_en:'Warm · Nurture',reasons_zh:['咨询 Samarahan 门市花束补货'],reasons_en:['Asked on stems in Samarahan'],next_zh:'分享配送区域说明',next_en:'Share Delivery Coverage Zones'},
  {id:'lead-4',name:'Mr Chong · Satok',statusKey:'stBadgeBouquet',heat:34,stage_zh:'早期了解',stage_en:'Early Stage',reasons_zh:['下月下旬纪念日，初步了解'],reasons_en:['Anniversary late next month'],next_zh:'下月中温和提醒',next_en:'Gentle check-in next month'}
];
function rankHeatLeads(ls){return(ls||[]).slice().sort(function(a,b){return b.heat-a.heat;});}
var RP=[
  {clientMsg_zh:'下周 Tabuan Jaya 户外证婚天气热，花况怎么顾？',clientMsg_en:'Tabuan Jaya ceremony is outdoors next week—how do you prep stems?',choices:[
    {id:'c1-best',delta:16,label_zh:'说明水袋保水工序并按《§2.1》分时进场',label_en:'Explain hydrated prep & timed setup per §2.1',mood:{emoji:'🙂',zh:'安心',en:'Reassured'},reply_zh:'有保水工序安心多了！周末定色调来得及吗？',reply_en:'Hydrated prep helps! Can we lock colors Sunday?',tip_zh:'',tip_en:''},
    {id:'c1-weak',delta:4,label_zh:'放心吧一切都没问题。',label_en:'Don’t worry, everything is handled cleanly.',mood:{emoji:'😟',zh:'疑虑',en:'Unsure'},reply_zh:'口头说有点悬…周末定色调来得及吗？',reply_en:'Vague replies leave me unsure—Sunday OK?',tip_zh:'用具体养护工序代替笼统安抚。',tip_en:'Explain care steps instead of vague replies.'}
  ]},
  {clientMsg_zh:'家里长辈周末确认香槟白绿色系。',clientMsg_en:'Family will confirm the champagne-green palette Sunday.',choices:[
    {id:'c2-best',delta:16,label_zh:'先记香槟白绿方向，周末再核对贺卡',label_en:'Note champagne-green now; check card Sunday',mood:{emoji:'😄',zh:'信任',en:'Confident'},reply_zh:'太贴心了，定完发您核对文字！',reply_en:'Thoughtful! Will send card wording Sunday.',tip_zh:'',tip_en:''},
    {id:'c2-weak',delta:5,label_zh:'请催长辈快一点决定。',label_en:'Please rush your family to decide ASAP.',mood:{emoji:'😐',zh:'观望',en:'Hesitant'},reply_zh:'好吧我再问看看。',reply_en:'Okay, I will ask them.',tip_zh:'先记色系方向减少决策压力。',tip_en:'Note color direction first.'}
  ]}
];
function evaluateRoleplaySession(ds,ct,lg){
  var l=lg==='en'?'en':'zh',sc=Math.max(0,Math.min(100,(ds||[]).reduce(function(s,d){return s+Number(d||0);},60)));
  var def=l==='en'?['Describe hydration steps clearly.','Note color direction before card details.','Follow §3.2 Reference Photo Principles.']:['以具体保水工序说明花况管理。','先记色系方向降低决策压力。','依《§3.2 参考图原则》对齐色系。'];
  var tp=(ct||[]).filter(Boolean);for(var i=0;i<def.length&&tp.length<3;i++)tp.push(def[i]);
  return{score:sc,tips:tp.slice(0,3)};
}
var TRI={
  en:{code:'EN',label:'English · Kuching',text:'Good morning! Your Tabuan Jaya opening stand is being arranged. Verify the ribbon wording.'},
  zh:{code:'中文',label:'简体中文 · 古晋',text:'早安！Tabuan Jaya 开张花架正在排期中，印制丝带前请核对公司署名。'},
  bm:{code:'BM',label:'Bahasa Melayu · Kuching',text:'Selamat pagi! Gubahan pembukaan untuk Tabuan Jaya sedang disusun. Sahkan nama reben.'}
};
function getTrilingualCopy(lg,cb){var k=lg==='en'||lg==='bm'||lg==='zh'?lg:'zh';return{lang:k,code:TRI[k].code,label:TRI[k].label,text:(cb&&cb[k])||TRI[k].text};}
function runTask(hub,getL){
  var tm=null;
  return function(o){
    var op=o||{},VM=R.VerdoraMotion||{},l=getL?getL():'zh';clearTimeout(tm);
    hub.st(op.statusText||(VM.t?VM.t(l,'aiHubThinking'):'Thinking…'));
    if(op.sk)op.sk.classList.add('is-active');if(op.bd)op.bd.style.opacity='.35';
    return new Promise(function(res){tm=setTimeout(function(){if(op.sk)op.sk.classList.remove('is-active');if(op.bd)op.bd.style.opacity='1';if(op.onDone)op.onDone();hub.rp(op.doneText||(VM.t?VM.t(l,'aiHubDone'):'Done'));res();},red()?140:(op.delay||520));});
  };
}
function mountAiDemos(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||(data&&data.lang?data:{}),lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh'),t=function(k,v){return VM.t?VM.t(lang,k,v):k;};
  var hd=function(a,b,r){return'<div class="vd-ai-card-head"><div><h3 class="vd-ai-card-title">'+esc(t(a))+'</h3><p class="vd-ai-card-sub">'+esc(t(b))+'</p></div>'+(r||'')+'</div>';};
  var bt=function(tx,id,at,c){return'<button type="button" class="vd-ai-btn '+(c||'vd-ai-btn--sm')+'"'+(id?' id="'+id+'"':'')+(at?' '+at:'')+'>'+esc(tx)+'</button>';};
  var sk=function(id){return'<div class="vd-ai-skeleton" id="'+id+'"><div class="vd-ai-skel-line vd-ai-skel-line--md"></div></div>';};
  var q=function(s){return box.querySelector(s);},qa=function(p,s){return p.querySelectorAll(s);};
  var cpFn=function(txt,btn){if(R.navigator&&R.navigator.clipboard)R.navigator.clipboard.writeText(txt||'').catch(function(){});btn.textContent=t('aiOcrCopied');};
  box.className='vd-ai-root';
  box.innerHTML='<div class="vd-ai-hub"><div class="vd-ai-hub-left"><div id="vdHO"></div><div class="vd-ai-hub-meta"><span class="vd-ai-hub-title" d-ht></span><span class="vd-ai-hub-status" id="vdHS"></span></div></div>'+bt('','vdPQ','')+'</div><div class="vd-ai-grid"><article class="vd-ai-card vd-ai-card--wide" id="vdSO"></article><article class="vd-ai-card" id="vdSV"></article><article class="vd-ai-card" id="vdSH"></article><article class="vd-ai-card" id="vdSF"></article><article class="vd-ai-card" id="vdSE"></article><article class="vd-ai-card" id="vdSR"></article><article class="vd-ai-card" id="vdST"></article></div>';
  var orb=VM.mountAiOrb?VM.mountAiOrb(q('#vdHO'),{size:54,state:'idle',lang:lang}):null,stEl=q('#vdHS'),htEl=q('[d-ht]'),qkB=q('#vdPQ'),iT=null;
  var run=runTask({st:function(m){clearTimeout(iT);if(orb)orb.setState('thinking');stEl.textContent=m;},rp:function(m){clearTimeout(iT);if(orb)orb.setState('replying');stEl.textContent=m;iT=setTimeout(function(){if(orb)orb.setState('idle');},1400);}},function(){return lang;});

  var triSlot=q('#vdST'),triL='zh',triSc='opening',SC={opening:{en:TRI.en.text,zh:TRI.zh.text,bm:TRI.bm.text},wedding:{en:'Hi Amanda! Sharing Tabuan Jaya wedding palette notes.',zh:'Amanda 您好！送上 Tabuan Jaya 婚礼配色方向。',bm:'Hai Amanda! Berikut panduan warna di Tabuan Jaya.'},condolence:{en:'Deepest condolences. Batu Kawa lily stand noted.',zh:'谨致慰问。Batu Kawa 白百合花架已登记，请核对挽联。',bm:'Salam takziah. Gubahan Batu Kawa direkod.'}},triB=SC.opening;
  function rTri(){
    triSlot.innerHTML=hd('aiTriTitle','aiTriSub')+'<div class="vd-tri-controls"><div class="vd-tri-seg">'+['en','zh','bm'].map(function(c){return'<button type="button" d-tl="'+c+'" aria-pressed="'+(triL===c)+'">'+(c==='en'?'EN':(c==='zh'?'中文':'BM'))+'</button>';}).join('')+'</div><div class="vd-ai-chip-row">'+bt(t('aiTriCycle'),'vdTCy')+bt(t('aiTriCopy'),'vdTCp','','vd-ai-btn--sm vd-ai-btn--primary')+'</div></div><div class="vd-tri-stage"><div class="vd-tri-card" id="vdTCd"><span class="vd-tri-lang-tag" id="vdTTg"></span><p class="vd-tri-copy" id="vdTCt"></p></div></div><div class="vd-ai-chip-row">'+['opening','wedding','condolence'].map(function(s,i){return bt(t('aiTriScene'+(i+1)),'','d-ts="'+s+'" aria-pressed="'+(triSc===s)+'"');}).join('')+'</div>';
    var cd=q('#vdTCd'),tg=q('#vdTTg'),ct=q('#vdTCt');
    function upd(a){var cp=getTrilingualCopy(triL,triB);qa(triSlot,'[d-tl]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('d-tl')===triL));});if(a&&!red()){cd.classList.remove('is-flipping');void cd.offsetWidth;cd.classList.add('is-flipping');}tg.textContent=cp.label;ct.textContent=cp.text;}
    upd(false);qa(triSlot,'[d-tl]').forEach(function(b){b.onclick=function(){triL=b.getAttribute('d-tl');upd(true);};});
    q('#vdTCy').onclick=function(){var x=['en','zh','bm'];triL=x[(x.indexOf(triL)+1)%3];upd(true);};
    qa(triSlot,'[d-ts]').forEach(function(b){b.onclick=function(){triSc=b.getAttribute('d-ts');triB=SC[triSc];qa(triSlot,'[d-ts]').forEach(function(y){y.setAttribute('aria-pressed',String(y===b));});upd(true);};});
    q('#vdTCp').onclick=function(e){cpFn(ct.textContent,e.currentTarget);};
  }

  var ocrSlot=q('#vdSO'),ocrS=OCR.complete,ocrD='zh';
  function rOcr(an){
    var ps=normalizeOcrResult(ocrS.raw,lang),lns=ocrS['lines_'+lang]||ocrS.lines_zh;
    ocrSlot.innerHTML=hd('aiOcrTitle','aiOcrSub','<div class="vd-ai-chip-row">'+bt(t('aiOcrComplete'),'','d-os="complete"')+bt(t('aiOcrMissing'),'','d-os="missing"')+'</div>')+'<div class="vd-ocr-layout"><div><div class="vd-ocr-drop" id="vdODr"><div class="vd-ocr-beam"></div><div class="vd-ocr-mockshot"><strong>'+esc(ocrS.sender)+'</strong>'+lns.map(function(n){return'<div class="vd-ocr-bubble">'+esc(n)+'</div>';}).join('')+'</div><span class="vd-ai-muted-c">'+esc(t('aiOcrDropHint'))+'</span></div><div class="vd-ocr-drag-chip" draggable="true" id="vdODg">'+esc(t('aiOcrDragChip'))+'</div></div><div>'+sk('vdOSk')+'<div id="vdOBd"><div class="vd-ocr-fields" id="vdOFd"></div><div class="vd-ocr-draft"><div class="vd-ai-row"><strong>'+esc(t('aiOcrDraftLabel'))+'</strong><span class="vd-ai-tag" id="vdOLB">'+(ocrD==='en'?'EN':(ocrD==='bm'?'BM':'中文'))+'</span></div><p class="vd-ocr-draft-text" id="vdODT">'+esc(ps.drafts[ocrD])+'</p><div class="vd-ai-chip-row">'+bt(t('aiOcrCopy'),'vdOCp','','vd-ai-btn--sm vd-ai-btn--primary')+bt(t('aiOcrTriBtn'),'vdOTr')+'</div></div></div></div></div>';
    var fEl=q('#vdOFd');
    function pt(tp){fEl.innerHTML=ps.fields.map(function(f,i){return'<div class="vd-ocr-field'+(f.missing?' is-missing':'')+' vd-ai-reveal" style="--i:'+i+'"><span class="vd-ocr-field-label">'+esc(f.label)+(f.missing?' · '+esc(t('aiOcrMissingTag')):'')+'</span><span class="vd-ocr-field-val" d-fk="'+f.key+'">'+(tp?'':esc(f.value))+'</span></div>';}).join('');if(tp&&!red())ps.fields.forEach(function(f,ix){var el=fEl.querySelector('[d-fk="'+f.key+'"]');Array.from(f.value).forEach(function(c,ci){setTimeout(function(){if(el)el.textContent+=c;},ix*80+ci*16);});});}
    if(an){var dr=q('#vdODr');dr.classList.add('is-scanning');run({sk:q('#vdOSk'),bd:q('#vdOBd'),onDone:function(){dr.classList.remove('is-scanning');pt(true);}});}else pt(false);
    qa(ocrSlot,'[d-os]').forEach(function(b){b.onclick=function(){ocrS=OCR[b.getAttribute('d-os')]||OCR.complete;rOcr(true);};});
    var dEl=q('#vdODr'),dg=q('#vdODg');
    if(dg)dg.ondragstart=function(e){if(e.dataTransfer)e.dataTransfer.setData('text/plain','missing');};
    dEl.ondragover=function(e){e.preventDefault();dEl.classList.add('is-dragover');};dEl.ondragleave=function(){dEl.classList.remove('is-dragover');};dEl.ondrop=function(e){e.preventDefault();dEl.classList.remove('is-dragover');ocrS=OCR.missing;rOcr(true);};
    q('#vdOCp').onclick=function(e){cpFn(q('#vdODT').textContent,e.currentTarget);};
    q('#vdOTr').onclick=function(){var x=['zh','en','bm'];ocrD=x[(x.indexOf(ocrD)+1)%3];q('#vdODT').textContent=ps.drafts[ocrD];q('#vdOLB').textContent=ocrD==='en'?'EN':(ocrD==='bm'?'BM':'中文');triL=ocrD;triB=ps.drafts;rTri();};
  }

  var vSlot=q('#vdSV'),vCust=[{id:'c0',name:'王先生 / Mr Ong',line_zh:'开业庆典 · 花架',line_en:'Opening · Stand',area:'Satok',statusKey:'stBadgeBouquet'}],vLast='';
  function rVoice(){
    vSlot.innerHTML=hd('aiVoiceTitle','aiVoiceSub',bt(t('aiVoiceSim'),'vdVSm'))+'<div class="vd-voice-stage">'+bt(t('aiVoiceHold'),'vdVMc','','vd-ai-btn--primary vd-voice-mic')+'<div class="vd-voice-wave">'+'<span class="vd-voice-bar"></span>'.repeat(6)+'</div></div><div class="vd-voice-transcript" id="vdVTr">'+esc(vLast||t('aiVoicePrompt'))+'</div>'+sk('vdVSk')+'<div id="vdVR"><div class="vd-voice-fly-slot" id="vdVF" style="display:none"></div><div class="vd-customer-list" id="vdCL"></div></div>';
    var lEl=q('#vdCL'),mc=q('#vdVMc'),brs=qa(vSlot,'.vd-voice-bar'),tr=q('#vdVTr'),fl=q('#vdVF'),wT=null,rc=false;
    function pt(hl){lEl.innerHTML=vCust.map(function(c,i){return'<div class="vd-customer-row'+(hl&&i===0?' vd-ai-reveal':'')+'"><div><strong>'+esc(c.name)+'</strong> · '+esc(c['line_'+lang]||c.line_zh)+'</div><span class="vd-ai-tag">'+esc(c.area)+' · '+esc(t(c.statusKey))+'</span></div>';}).join('');}
    function wv(on){clearInterval(wT);if(!on){brs.forEach(function(b){b.style.transform='scaleY(.22)';});return;}var k=0;wT=setInterval(function(){k++;brs.forEach(function(b,ix){b.style.transform='scaleY('+(.25+Math.abs(Math.sin(k*.7+ix))*.8).toFixed(2)+')';});},90);}
    function dn(){if(!rc)return;rc=false;mc.classList.remove('is-recording');mc.textContent=t('aiVoiceHold');wv(false);run({sk:q('#vdVSk'),bd:q('#vdVR'),delay:420,onDone:function(){var f=VP['transcript_'+lang];vLast=f;tr.textContent=f;var cu=buildCustomerFromVoice(f,VP.parsed);if(!red()){fl.style.display='block';fl.innerHTML='<div class="vd-voice-preview-card" id="vdFC"><strong>'+esc(cu.name)+'</strong><span>'+esc(cu.area)+' · '+esc(t(cu.statusKey))+'</span></div>';setTimeout(function(){var fc=q('#vdFC');if(fc)fc.classList.add('is-flying');},140);setTimeout(function(){fl.style.display='none';vCust=[cu].concat(vCust.slice(0,3));pt(true);},440);}else{vCust=[cu].concat(vCust.slice(0,3));pt(true);}}});}
    function st(){if(rc)return;rc=true;mc.classList.add('is-recording');mc.textContent=t('aiVoiceListening');wv(true);}
    pt(false);mc.onpointerdown=st;mc.onpointerup=dn;mc.onpointerleave=dn;q('#vdVSm').onclick=function(){st();setTimeout(dn,red()?90:460);};
  }

  var hbSlot=q('#vdSH'),hbQ='';
  function rHb(){
    var df=lang==='en'?'Which Kuching areas are in Delivery Coverage Zones?':'古晋哪些地区在配送区域内？',ps=lang==='en'?[{q:df,l:'§2.1 Zones'},{q:'How do Reference Photo Principles work?',l:'§3.2 Photos'},{q:'Card sign-off process?',l:'§4.1 Card'}]:[{q:df,l:'§2.1 配送区域'},{q:'参考图原则是什么？',l:'§3.2 参考图原则'},{q:'贺卡署名怎么核对？',l:'§4.1 贺卡署名'}];
    hbSlot.innerHTML=hd('aiHbTitle','aiHbSub')+'<div class="vd-ai-chip-row">'+ps.map(function(p){return bt(p.l,'','d-hq="'+esc(p.q)+'"');}).join('')+'</div><div class="vd-hb-input-row"><input type="text" class="vd-hb-input" id="vdHIn" aria-label="'+esc(t('aiHbInputLabel'))+'" value="'+esc(hbQ||df)+'"/>'+bt(t('aiHbAsk'),'vdHAsk','','vd-ai-btn--primary')+'</div><div class="vd-hb-clauses">'+HB.map(function(c){return'<div class="vd-hb-clause" d-ci="'+c.id+'"><strong>'+esc(c['code_'+lang])+'</strong><span>'+esc(c['excerpt_'+lang])+'</span></div>';}).join('')+'</div><div class="vd-hb-connector" id="vdHC"><span class="vd-hb-line"></span><span class="vd-hb-dot"></span></div>'+sk('vdHSk')+'<div class="vd-hb-answer" id="vdHA"><p class="vd-hb-answer-text" id="vdHT"></p><div class="vd-hb-sources" id="vdHS2"></div></div>';
    var inp=q('#vdHIn'),cn=q('#vdHC'),tx=q('#vdHT'),sr=q('#vdHS2');
    function ap(qs,ins){hbQ=qs;var res=matchHandbookClauses(qs,lang);function pt(){qa(hbSlot,'.vd-hb-clause').forEach(function(e){e.classList.toggle('is-matched',res.matchedIds.indexOf(e.getAttribute('d-ci'))!==-1);});cn.classList.add('is-linked');tx.textContent=res.answer;sr.innerHTML=res.sources.map(function(s){return bt(t('aiHbSourcePrefix')+s.code,'','d-si="'+s.id+'"');}).join('');qa(sr,'[d-si]').forEach(function(sb){sb.onclick=function(){var tg=hbSlot.querySelector('[d-ci="'+sb.getAttribute('d-si')+'"]');if(tg){tg.classList.remove('is-flash');void tg.offsetWidth;tg.classList.add('is-flash');}};});}if(ins)pt();else run({sk:q('#vdHSk'),bd:q('#vdHA'),delay:400,onDone:pt});}
    ap(hbQ||df,true);q('#vdHAsk').onclick=function(){ap(inp.value,false);};qa(hbSlot,'[d-hq]').forEach(function(b){b.onclick=function(){inp.value=b.getAttribute('d-hq');ap(inp.value,false);};});
  }

  var fuSlot=q('#vdSF'),deck=DECK.slice(),fuDone=0,fuMsg='',fuRg=null;
  function rFu(){
    var tot=DECK.length;
    fuSlot.innerHTML=hd('aiFollowTitle','aiFollowSub','<div class="vd-deck-head"><div id="vdFR"></div>'+bt(t('aiFollowReset'),'vdDRs')+'</div>')+'<div class="vd-deck-stage" id="vdDSt"></div><div class="vd-deck-actions"><div class="vd-ai-chip-row">'+bt(t('aiFollowSkip'),'vdDSk')+bt(t('aiFollowSend'),'vdDSn','','vd-ai-btn--sm vd-ai-btn--primary')+'</div><span class="vd-wa-feedback" id="vdWAF"></span></div>';
    var rm=q('#vdFR'),stEl=q('#vdDSt'),fb=q('#vdWAF'),sB=q('#vdDSk'),nB=q('#vdDSn');
    fuRg=VM.mountProgressRing?VM.mountProgressRing(rm,{size:58,thick:6,value:Math.round(fuDone/tot*100),duration:0,label:t('ringLabelProgress'),lang:lang}):null;
    fb.textContent=fuMsg||(fuDone>=tot?t('aiFollowDone'):t('aiFollowPending',{left:deck.length,total:tot}));
    function pt(dl){if(!deck.length){stEl.innerHTML='<div class="vd-deck-empty">'+esc(t('aiFollowDone'))+'</div>';sB.disabled=true;nB.disabled=true;return;}sB.disabled=false;nB.disabled=false;stEl.innerHTML=deck.slice(0,3).map(function(it,ix){return'<div class="vd-deck-card'+(dl&&!red()?' is-dealing':'')+'" data-pos="'+ix+'"><div class="vd-ai-row"><strong>'+esc(it.client)+' · '+esc(it['occasion_'+lang])+'</strong><span class="vd-ai-muted">'+esc(t(it.statusKey))+'</span></div><p class="vd-deck-msg">'+esc(it['draft_'+lang])+'</p></div>';}).join('');if(dl&&!red())qa(stEl,'.vd-deck-card').forEach(function(c,ix){setTimeout(function(){c.classList.remove('is-dealing');},50+ix*80);});}
    function sw(act){if(!deck.length)return;var top=stEl.querySelector('[data-pos="0"]'),nx=advanceFollowupDeck(deck,act);deck=nx.remaining;fuDone++;fuMsg=act==='send'?t('aiFollowSentMsg',{client:nx.handledItem.client}):t('aiFollowSkipMsg',{client:nx.handledItem.client,left:deck.length});fb.textContent=fuMsg;if(top&&!red()){top.classList.add(act==='send'?'is-swipe-right':'is-swipe-left');setTimeout(function(){pt(false);if(fuRg)fuRg.setValue(Math.round(fuDone/tot*100),360);if(fuDone>=tot&&VM.celebrate)VM.celebrate({type:'course',originEl:rm});},220);}else{pt(false);if(fuRg)fuRg.setValue(Math.round(fuDone/tot*100),0);}}
    pt(false);sB.onclick=function(){sw('skip');};nB.onclick=function(){sw('send');};
    q('#vdDRs').onclick=function(){deck=DECK.slice();fuDone=0;fuMsg='';if(fuRg)fuRg.reset();fb.textContent=t('aiFollowPending',{left:deck.length,total:tot});pt(true);};
  }

  var heatSlot=q('#vdSE'),hLeads=rankHeatLeads(HEAT),openH=hLeads[0].id;
  function rHeat(){
    heatSlot.innerHTML=hd('aiHeatTitle','aiHeatSub')+'<div class="vd-heat-list">'+hLeads.map(function(ld){var ht=ld.heat>=80,op=ld.id===openH;return'<div class="vd-heat-item'+(ht?' is-hot':'')+(op?' is-open':'')+'" d-li="'+ld.id+'"><button type="button" class="vd-heat-trigger" aria-expanded="'+op+'"><div class="vd-heat-row-top"><span><strong>'+esc(ld.name)+'</strong> · <span class="vd-ai-muted">'+esc(t(ld.statusKey))+'</span></span><span class="vd-heat-score">'+ld.heat+' · '+esc(ld['stage_'+lang])+'</span></div><div class="vd-heat-track"><div class="vd-heat-fill" style="--heat:'+(ld.heat/100).toFixed(2)+'"></div></div></button><div class="vd-heat-reasons"><strong>'+esc(t('aiHeatWhy'))+'</strong>'+(ld['reasons_'+lang]||[]).map(function(r){return'<span>• '+esc(r)+'</span>';}).join('')+'<span class="vd-ai-brand">'+esc(t('aiHeatNext')+ld['next_'+lang])+'</span></div></div>';}).join('')+'</div>';
    qa(heatSlot,'.vd-heat-trigger').forEach(function(b){b.onclick=function(){var id=b.closest('.vd-heat-item').getAttribute('d-li');openH=openH===id?'':id;rHeat();};});
  }

  var rpSlot=q('#vdSR'),rpSt=0,rpH=[{who:'client',item:RP[0],key:'clientMsg'}],rpM={emoji:'😐',zh:'犹豫审视',en:'Considering'},rpD=[],rpT=[];
  function rRp(){
    rpSlot.innerHTML=hd('aiRpTitle','aiRpSub',bt(t('aiRpReset'),'vdRR'))+'<div class="vd-rp-header"><div class="vd-rp-persona"><div class="vd-rp-mood-face">'+rpM.emoji+'</div><div><strong>Amanda · Tabuan Jaya</strong><div class="vd-ai-muted">'+esc(t('aiRpMoodPrefix')+rpM[lang])+'</div></div></div></div><div class="vd-rp-chat">'+rpH.map(function(m){return'<div class="vd-rp-msg vd-rp-msg--'+m.who+'">'+esc(m.item[m.key+'_'+lang])+'</div>';}).join('')+'</div>'+sk('vdRSk')+'<div id="vdRC"></div>';
    var ctrl=q('#vdRC');
    if(rpSt<RP.length){var trn=RP[rpSt];ctrl.innerHTML='<div class="vd-rp-choices">'+trn.choices.map(function(c){return bt(c['label_'+lang],'','d-cid="'+c.id+'"','vd-rp-choice-btn');}).join('')+'</div>';qa(ctrl,'[d-cid]').forEach(function(b){b.onclick=function(){var ch=trn.choices.filter(function(x){return x.id===b.getAttribute('d-cid');})[0];if(!ch)return;rpH.push({who:'agent',item:ch,key:'label'});rpD.push(ch.delta);if(ch['tip_'+lang])rpT.push(ch['tip_'+lang]);run({sk:q('#vdRSk'),bd:ctrl,delay:360,onDone:function(){rpM=ch.mood;rpH.push({who:'client',item:ch,key:'reply'});rpSt++;rRp();}});};});}
    else{var sm=evaluateRoleplaySession(rpD,rpT,lang);ctrl.innerHTML='<div class="vd-rp-summary vd-ai-reveal"><div class="vd-rp-score-row"><div><strong>'+esc(t('aiRpScoreTitle'))+'</strong><div class="vd-ai-muted">'+esc(t('aiRpScoreSub'))+'</div></div><div id="vdRSO" style="font-size:1.3rem;color:var(--brand)"></div></div><ol class="vd-rp-tips">'+sm.tips.map(function(x){return'<li>'+esc(x)+'</li>';}).join('')+'</ol></div>';if(VM.mountOdometer)VM.mountOdometer(q('#vdRSO'),{value:sm.score},{suffix:t('aiRpPts'),lang:lang});}
    q('#vdRR').onclick=function(){rpSt=0;rpD=[];rpT=[];rpM={emoji:'😐',zh:'犹豫审视',en:'Considering'};rpH=[{who:'client',item:RP[0],key:'clientMsg'}];rRp();};
  }

  function rAll(){htEl.textContent=t('aiHubTitle');stEl.textContent=t('aiHubIdle');qkB.textContent=t('aiOcrComplete');if(orb)orb.setLang(lang);rTri();rOcr(false);rVoice();rHb();rFu();rHeat();rRp();}
  rAll();qkB.onclick=function(){ocrS=OCR.missing;rOcr(true);};
  return{el:box,setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c===lang)return;lang=c;if(VM.swapLangFade)VM.swapLangFade(box,rAll);else rAll();}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountAiDemos=mountAiDemos;
V.aiHelpers={KUCHING_AREAS:KUCHING_AREAS,normalizeOcrResult:normalizeOcrResult,buildCustomerFromVoice:buildCustomerFromVoice,matchHandbookClauses:matchHandbookClauses,advanceFollowupDeck:advanceFollowupDeck,rankHeatLeads:rankHeatLeads,evaluateRoleplaySession:evaluateRoleplaySession,getTrilingualCopy:getTrilingualCopy};
R.VerdoraAiDemos={mount:mountAiDemos,helpers:V.aiHelpers};
})(typeof window!=='undefined'?window:globalThis);
