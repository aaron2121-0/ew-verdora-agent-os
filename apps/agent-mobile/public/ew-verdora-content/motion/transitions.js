(function(R){'use strict';
var DEF=[
  {id:'opening',kicker:'OPENING · PETRA JAYA',title_zh:'开张花篮礼架',title_en:'Opening Floral Stand',iconSvg:'<svg viewBox="0 0 48 48" fill="none"><path d="M24 8C27 12 27 17 24 21C21 17 21 12 24 8Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".22"/><rect x="14" y="21" width="20" height="5" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M17 26L14 40M31 26L34 40M15.5 34H32.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'},
  {id:'bouquet',kicker:'BOUQUET · BATU KAWA',title_zh:'手捧礼盒花束',title_en:'Signature Bouquet',iconSvg:'<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="15" r="5" stroke="currentColor" stroke-width="1.8" fill="currentColor" fill-opacity=".2"/><path d="M13 24L24 41L35 24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'},
  {id:'wedding',kicker:'WEDDING · TABUAN JAYA',title_zh:'婚礼主桌花艺',title_en:'Wedding Table Florals',iconSvg:'<svg viewBox="0 0 48 48" fill="none"><circle cx="19" cy="24" r="7" stroke="currentColor" stroke-width="1.8"/><circle cx="29" cy="24" r="7" stroke="currentColor" stroke-width="1.8"/></svg>'}
];
function red(){return R.VerdoraMotion&&R.VerdoraMotion.isReducedMotion?R.VerdoraMotion.isReducedMotion():false;}
function replayStagger(l){if(!l)return;l.querySelectorAll('.vd-stagger-item').forEach(function(it,i){it.style.setProperty('--i',String(i));it.style.animation='none';void it.offsetWidth;it.style.animation='';});}
function runSharedSwap(frEl,rNext,gTg){
  var fr=frEl?frEl.getBoundingClientRect():null;
  if(!red()&&typeof document.startViewTransition==='function'&&frEl){
    frEl.style.viewTransitionName='vd-shared-card';
    var vt=document.startViewTransition(function(){frEl.style.viewTransitionName='';rNext();var nx=gTg&&gTg();if(nx)nx.style.viewTransitionName='vd-shared-card';});
    vt.finished.finally(function(){var nx=gTg&&gTg();if(nx)nx.style.viewTransitionName='';});return;
  }
  rNext();var tg=gTg&&gTg();
  if(red()||!fr||!tg){if(tg)tg.style.animation='vd-vt-fade 200ms ease-out both';return;}
  var lr=tg.getBoundingClientRect();
  if(lr.width>0&&lr.height>0){tg.style.transition='none';tg.style.transform='translate3d('+(fr.left-lr.left)+'px,'+(fr.top-lr.top)+'px,0) scale('+(fr.width/lr.width)+','+(fr.height/lr.height)+')';tg.style.opacity='.7';void tg.offsetWidth;tg.style.transition='transform 360ms cubic-bezier(.22,1,.36,1),opacity 240ms ease';tg.style.transform='translate3d(0,0,0) scale(1,1)';tg.style.opacity='1';}
}
function mountTransitions(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||{},items=(Array.isArray(data)?data:(data&&data.items))||DEF,lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh'),sel=null;
  var t=function(k){return VM.t?VM.t(lang,k):k;},pk=function(it,f){return VM.pick?VM.pick(it,f,lang):(it[f+'_'+lang]||it[f]||'');};
  box.classList.add('vd-vt-stage');
  function rGrid(){
    sel=null;box.innerHTML='<div class="vd-vt-grid">'+items.map(function(it,i){return'<button type="button" class="vd-vt-card" d-ix="'+i+'"><div class="vd-vt-thumb">'+(it.iconSvg||'')+'</div><strong style="font-size:.9rem">'+pk(it,'title')+'</strong><span style="font-size:.74rem;color:var(--text-muted)">'+t('vtExpand')+'</span></button>';}).join('')+'</div>';
    box.querySelectorAll('.vd-vt-card').forEach(function(c){c.onclick=function(){var it=items[+c.getAttribute('d-ix')];runSharedSwap(c,function(){rDet(it);},function(){return box.querySelector('.vd-vt-detail');});};});
  }
  function rDet(it){
    sel=it;box.innerHTML='<div class="vd-vt-detail"><div class="vd-vt-thumb">'+(it.iconSvg||'')+'</div><div><div style="font-size:.72rem;font-weight:700;color:var(--gold);margin-bottom:4px">'+(it.kicker||'')+'</div><h4 style="margin:0 0 6px;font-size:1.06rem">'+pk(it,'title')+'</h4><p style="margin:0 0 10px;font-size:.82rem;color:var(--text-secondary)">'+t('vtDetailNote')+' '+t('photoNotice')+'.</p><button type="button" class="vd-spring-btn" id="vdVtBackBtn" style="background:var(--surface);border-color:var(--border);color:var(--text)">'+t('vtBack')+'</button></div></div>';
    box.querySelector('#vdVtBackBtn').onclick=function(){runSharedSwap(box.querySelector('.vd-vt-detail'),rGrid,function(){return box.querySelector('.vd-vt-grid');});};
  }
  rGrid();
  return{el:box,setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c!==lang){lang=c;var f=function(){if(sel)rDet(sel);else rGrid();};if(VM.swapLangFade)VM.swapLangFade(box,f);else f();}}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountTransitions=mountTransitions;V.runSharedSwap=runSharedSwap;V.replayStagger=replayStagger;
R.VerdoraTransitions={replayStagger:replayStagger,runSharedSwap:runSharedSwap};
})(typeof window!=='undefined'?window:globalThis);
