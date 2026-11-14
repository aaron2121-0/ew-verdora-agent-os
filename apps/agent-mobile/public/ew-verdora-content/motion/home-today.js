(function(R){'use strict';
var DEF={actions:[],tip:null};
var IC={
  lead:'<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle class="vd-ht-ic-pulse" cx="14" cy="14" r="8" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".12"/><path d="M20 20L27 27" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="14" cy="14" r="3" fill="currentColor"/></svg>',
  followup:'<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path class="vd-ht-ic-wave" d="M6 10C6 7.8 7.8 6 10 6H22C24.2 6 26 7.8 26 10V18C26 20.2 24.2 22 22 22H13L8 26V22H10C7.8 22 6 20.2 6 18V10Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".12" stroke-linejoin="round"/><path class="vd-ht-ic-pulse" d="M11 14H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  post:'<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="6" y="7" width="20" height="18" rx="5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".1"/><path class="vd-ht-ic-petal" d="M16 11C18.5 13 18.5 17 16 19C13.5 17 13.5 13 16 11Z" fill="currentColor"/><path d="M11 21H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function computeTodayState(list,doneIds){var a=Array.isArray(list)?list:[],m={};(doneIds||[]).forEach(function(id){m[id]=1;});var dc=a.filter(function(x){return!!m[x.id];}).length,tot=a.length||1;return{doneCount:dc,total:a.length,pct:Math.round(dc/tot*100),allDone:a.length>0&&dc>=a.length};}
function mountHomeToday(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||{},p=data&&Array.isArray(data.actions)&&data.actions.length?data:DEF,acts=p.actions.slice(0,3),tip=p.tip||null,lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh'),done=(Array.isArray(o.doneIds)?o.doneIds:[]).filter(function(id){return acts.some(function(a){return a.id===id;});}),tipOpen=false,celeb=done.length===acts.length;
  var t=function(k,v){return VM.t?VM.t(lang,k,v):k;},pk=function(x,f){return VM.pick?VM.pick(x,f,lang):(x[f+'_'+lang]||x[f]||'');};
  box.innerHTML='<section class="vd-ht-card" aria-label="'+esc(t('homeTitle'))+'"><div class="vd-ht-glow" aria-hidden="true"></div><div class="vd-ht-head"><div class="vd-ht-head-copy"><span class="vd-ht-eyebrow" d-eb></span><h2 class="vd-ht-title" d-ti></h2><p class="vd-ht-sub" d-sb></p></div><div class="vd-ht-progress-col"><span class="vd-ht-count" d-ct></span><div class="vd-ht-ring" d-rg></div></div></div><div class="vd-ht-list" d-ls></div><div class="vd-ht-banner" d-bn role="status"><span d-bt></span><button type="button" class="vd-ht-reset-btn" d-rs></button></div><div class="vd-ht-tip" d-tp><button type="button" class="vd-ht-tip-trigger" d-tb aria-expanded="false"><span d-tt></span><span class="vd-ht-tip-hint" d-th></span></button><div class="vd-ht-tip-body" d-td></div></div></section>';
  var q=function(s){return box.querySelector(s);},card=q('.vd-ht-card'),eb=q('[d-eb]'),ti=q('[d-ti]'),sb=q('[d-sb]'),ct=q('[d-ct]'),rg=q('[d-rg]'),ls=q('[d-ls]'),bn=q('[d-bn]'),bt=q('[d-bt]'),rs=q('[d-rs]'),tpBox=q('[d-tp]'),tb=q('[d-tb]'),tt=q('[d-tt]'),th=q('[d-th]'),td=q('[d-td]');
  var ring=VM.mountProgressRing?VM.mountProgressRing(rg,{size:78,thick:7,value:0,max:100,label:t('ringLabelProgress'),lang:lang}):null;
  function rList(anim){
    ls.innerHTML=acts.map(function(a,i){var d=done.indexOf(a.id)!==-1,tk=a.type==='followup'?'homeTypeFollowup':(a.type==='post'?'homeTypePost':'homeTypeLead');return'<article class="vd-ht-item'+(d?' is-done':'')+'" data-action-id="'+esc(a.id)+'" style="'+(anim?'--i:'+i:'--i:0;animation:none;opacity:1')+'"><div class="vd-ht-item-top"><div class="vd-ht-icon-box">'+(IC[a.type]||IC.lead)+'</div><div class="vd-ht-meta"><span>'+esc(t(tk))+'</span>'+(a.minutes!=null?'<span aria-hidden="true">·</span><span>'+esc(t('homeMinutes',{min:a.minutes}))+'</span>':'')+'</div></div><h3 class="vd-ht-item-title">'+esc(pk(a,'title'))+'</h3><button type="button" class="vd-ht-start-btn" d-tg="'+esc(a.id)+'" aria-pressed="'+d+'">'+esc(d?'✓ '+t('homeDone'):t('homeStart'))+'</button></article>';}).join('');
    ls.querySelectorAll('[d-tg]').forEach(function(b){b.onclick=function(){toggle(b.getAttribute('d-tg'));};});
  }
  function syncProg(anim){
    var st=computeTodayState(acts,done);ct.textContent=t('homeCountDone',{done:st.doneCount,total:st.total});if(ring)ring.setValue(st.pct,anim?420:0);
    bn.classList.toggle('is-visible',st.allDone);bt.textContent=t('homeAllDoneBanner');rs.textContent=t('homeReset');card.setAttribute('data-done-count',String(st.doneCount));
    if(st.allDone&&!celeb){celeb=true;if(VM.celebrate)VM.celebrate({type:'fullscreen',originEl:rg});}
    if(o.onChange)o.onChange(st,done.slice());
  }
  function toggle(id){if(!acts.some(function(a){return a.id===id;}))return;var ix=done.indexOf(id);if(ix===-1)done.push(id);else{done.splice(ix,1);celeb=false;}rList(false);syncProg(true);}
  function syncText(anim){card.setAttribute('aria-label',t('homeTitle'));eb.textContent=t('homeEyebrow');ti.textContent=t('homeTitle');sb.textContent=t('homeSubtitle');if(ring&&ring.setLang)ring.setLang(lang,t('ringLabelProgress'));tt.textContent=tip?(pk(tip,'title')||t('homeTipToggle')):'';th.textContent=tipOpen?t('homeTipHintOpen'):t('homeTipHintClosed');td.textContent=tip?pk(tip,'body'):'';tpBox.hidden=!tip;rList(anim);syncProg(false);}
  tb.onclick=function(){tipOpen=!tipOpen;tpBox.classList.toggle('is-open',tipOpen);tb.setAttribute('aria-expanded',String(tipOpen));th.textContent=tipOpen?t('homeTipHintOpen'):t('homeTipHintClosed');};
  rs.onclick=function(){done=[];celeb=false;if(ring)ring.reset();rList(true);syncProg(true);};
  syncText(true);
  return{el:card,setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c===lang)return;lang=c;if(VM.swapLangFade)VM.swapLangFade(card,function(){syncText(false);});else syncText(false);},toggleAction:toggle,reset:function(){done=[];celeb=false;if(ring)ring.reset();rList(true);syncProg(true);},getState:function(){return computeTodayState(acts,done);}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountHomeToday=mountHomeToday;V.HOME_TODAY_DEFAULT=DEF;V.computeTodayState=computeTodayState;
})(typeof window!=='undefined'?window:globalThis);
