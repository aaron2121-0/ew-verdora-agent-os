(function(R){'use strict';
var DEF=[
  {id:'condolence',icon:'condolence.svg',kicker:'CONDOLENCE',title_zh:'帛事致意',title_en:'Condolence Tributes',subtitle_zh:'白菊百合花圈 · Petra Jaya / Satok',subtitle_en:'White lily stands · Petra Jaya & Satok'},
  {id:'opening',icon:'opening.svg',kicker:'OPENING',title_zh:'开业庆典',title_en:'Grand Opening',subtitle_zh:'双层开张花篮 · Tabuan Jaya',subtitle_en:'Dual-tier stands · Tabuan Jaya'},
  {id:'bouquet',icon:'bouquet.svg',kicker:'BOUQUET',title_zh:'定制花束',title_en:'Signature Bouquets',subtitle_zh:'手捧礼盒花束 · Batu Kawa',subtitle_en:'Hand-tied bouquets · Batu Kawa'},
  {id:'wedding',icon:'wedding.svg',kicker:'WEDDING',title_zh:'婚礼花艺',title_en:'Wedding Florals',subtitle_zh:'仪式花亭桌花 · 古晋场馆',subtitle_en:'Ceremony & tables · Kuching'},
  {id:'wholesale',icon:'wholesale.svg',kicker:'WHOLESALE',title_zh:'鲜花批发',title_en:'Stem Wholesale',subtitle_zh:'直采切花 · Samarahan 配货',subtitle_en:'Stem supply · Samarahan'}
];
var HALO='<svg viewBox="0 0 108 108" fill="none" aria-hidden="true"><circle cx="54" cy="10" r="3" fill="rgba(255,244,218,.68)"/><circle cx="98" cy="54" r="2.5" fill="rgba(255,255,255,.55)"/><circle cx="54" cy="98" r="3" fill="rgba(255,244,218,.68)"/><circle cx="10" cy="54" r="2.5" fill="rgba(255,255,255,.55)"/><path d="M22 22L26 26M86 22L82 26M86 86L82 82M22 86L26 82" stroke="rgba(255,255,255,.42)" stroke-width="1.6" stroke-linecap="round"/></svg>';
var FB='<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".2"/></svg>';
function red(){return R.VerdoraMotion&&R.VerdoraMotion.isReducedMotion?R.VerdoraMotion.isReducedMotion():false;}
function tilt(c){
  var dn=false;
  function upd(e,p){if(red())return;var r=c.getBoundingClientRect(),px=Math.max(0,Math.min(1,(e.clientX-r.left)/(r.width||1))),py=Math.max(0,Math.min(1,(e.clientY-r.top)/(r.height||1))),mx=p?13:8;c.style.setProperty('--rx',(-(py-.5)*2*mx).toFixed(2)+'deg');c.style.setProperty('--ry',((px-.5)*2*mx).toFixed(2)+'deg');c.style.setProperty('--sc',p?'.96':'1.02');c.style.setProperty('--gx',(px*r.width).toFixed(1)+'px');c.style.setProperty('--gy',(py*r.height).toFixed(1)+'px');c.style.setProperty('--glow-o',p?'1':'.68');}
  function rst(){dn=false;c.classList.remove('is-pressed');c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg');c.style.setProperty('--sc','1');c.style.setProperty('--glow-o','0');}
  c.onpointerdown=function(e){dn=true;c.classList.add('is-pressed');upd(e,true);};c.onpointermove=function(e){if(e.pointerType==='mouse'||dn)upd(e,dn);};c.onpointerup=c.onpointercancel=c.onpointerleave=rst;
}
function mountCards(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||{};if(data&&!Array.isArray(data)&&!data.lines&&(data.iconsBase||data.svgCache||data.lang)){o=data;data=null;}
  var lines=(Array.isArray(data)?data:(data&&data.lines))||o.lines||DEF,base=(o.iconsBase||'./icons').replace(/\/$/,''),cache=o.svgCache||{},lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh');
  var t=function(k){return VM.t?VM.t(lang,k):k;},pk=function(it,f){return VM.pick?VM.pick(it,f,lang):(it[f+'_'+lang]||it[f]||'');};
  box.classList.add('vd-hero-grid');
  box.innerHTML=lines.map(function(it,i){return'<button type="button" class="vd-hero-card" data-line="'+it.id+'" style="--delay:'+(i*85)+'ms"><span class="vd-card-flow" aria-hidden="true"></span><span class="vd-card-glow" aria-hidden="true"></span><span class="vd-card-bloom-stage"><span class="vd-card-aura" aria-hidden="true"></span><span class="vd-card-petals-halo" aria-hidden="true">'+HALO+'</span><span class="vd-card-icon-wrap">'+FB+'</span></span><span class="vd-card-copy"><span class="vd-card-kicker"></span><strong></strong><span d-sb></span></span><span class="vd-card-approval"></span></button>';}).join('');
  var nodes=Array.from(box.querySelectorAll('.vd-hero-card')).map(function(c,i){
    var it=lines[i],iw=c.querySelector('.vd-card-icon-wrap'),u=base+'/'+it.icon;
    if(cache[u])iw.innerHTML=cache[u];else if(typeof fetch==='function')fetch(u).then(function(r){return r.ok?r.text():FB;}).then(function(x){cache[u]=x;iw.innerHTML=x;}).catch(function(){});
    tilt(c);if(o.onSelect)c.onclick=function(){o.onSelect(it,c);};
    return{it:it,kk:c.querySelector('.vd-card-kicker'),ti:c.querySelector('strong'),sb:c.querySelector('[d-sb]'),nt:c.querySelector('.vd-card-approval')};
  });
  function ap(){var nt=t('photoNotice');nodes.forEach(function(n){n.kk.textContent=n.it.kicker||'';n.ti.textContent=pk(n.it,'title');n.sb.textContent=pk(n.it,'subtitle');n.nt.textContent=nt;});}
  ap();
  function rp(){box.querySelectorAll('.vd-card-aura,.vd-card-petals-halo,.vd-card-icon-wrap,.vd-card-copy').forEach(function(n){n.style.animation='none';void n.offsetWidth;n.style.animation='';});}
  return{el:box,replay:rp,setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c!==lang){lang=c;if(VM.swapLangFade)VM.swapLangFade(box,ap);else ap();}}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountCards=mountCards;V.CARDS_DEFAULT=DEF;
R.VerdoraCards={mount:function(c,o){return mountCards(c,o&&o.lines,o);},replay:function(c){if(c)c.querySelectorAll('.vd-card-aura,.vd-card-petals-halo,.vd-card-icon-wrap,.vd-card-copy').forEach(function(n){n.style.animation='none';void n.offsetWidth;n.style.animation='';});},DEFAULT_LINES:DEF};
})(typeof window!=='undefined'?window:globalThis);
