(function(R){'use strict';
function mountAiOrb(box,opts){
  var VM=R.VerdoraMotion||{},o=opts||{},sz=o.size||96,st=o.state||'idle',lang=VM.normLang?VM.normLang(o.lang):'zh';
  var w=document.createElement('div');w.className='vd-orb-wrap';w.style.setProperty('--orb-size',sz+'px');w.setAttribute('data-state',st);w.setAttribute('role','img');
  w.setAttribute('aria-label',o.label||(VM.t?VM.t(lang,'orbLabel'):'VERDORA AI Orb'));
  w.innerHTML='<span class="vd-orb-aura" aria-hidden="true"></span><span class="vd-orb-ripple vd-orb-ripple--1" aria-hidden="true"></span><span class="vd-orb-ripple vd-orb-ripple--2" aria-hidden="true"></span><span class="vd-orb-ripple vd-orb-ripple--3" aria-hidden="true"></span><span class="vd-orb-sphere" aria-hidden="true"><span class="vd-orb-blob vd-orb-blob--1"></span><span class="vd-orb-blob vd-orb-blob--2"></span><span class="vd-orb-blob vd-orb-blob--3"></span><span class="vd-orb-gloss"></span></span>';
  if(box){box.innerHTML='';box.appendChild(w);}
  return{el:w,setState:function(s){w.setAttribute('data-state',s==='thinking'||s==='replying'?s:'idle');},setLang:function(nl){lang=VM.normLang?VM.normLang(nl):nl;if(!o.label&&VM.t)w.setAttribute('aria-label',VM.t(lang,'orbLabel'));}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountAiOrb=mountAiOrb;
R.VerdoraOrb={create:function(c,o){return mountAiOrb(c,o).el;},setState:function(el,s){if(el)el.setAttribute('data-state',s==='thinking'||s==='replying'?s:'idle');}};
})(typeof window!=='undefined'?window:globalThis);
