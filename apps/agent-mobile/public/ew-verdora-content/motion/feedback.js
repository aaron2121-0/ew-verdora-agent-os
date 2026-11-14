(function(R){'use strict';
function red(){return document.documentElement.getAttribute('data-motion')==='reduced'||!!(R.matchMedia&&R.matchMedia('(prefers-reduced-motion: reduce)').matches);}
function fmt(v,d){var p=Number(v).toFixed(d||0).split('.');p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return p.join('.');}
function renderOdometer(el,val,o){
  var opt=o||{},s=(opt.prefix||'')+fmt(val,opt.decimals||0)+(opt.suffix||''),di=0;
  el.classList.add('vd-odometer');el.setAttribute('aria-label',s);el.innerHTML='';
  for(var i=0;i<s.length;i++){
    var ch=s[i];
    if(ch>='0'&&ch<='9'){
      var w=document.createElement('span');w.className='vd-odo-digit';w.setAttribute('aria-hidden','true');
      var rl=document.createElement('span');rl.className='vd-odo-reel';rl.style.setProperty('--odo-delay',(di*45)+'ms');
      for(var d=0;d<=9;d++){var c=document.createElement('span');c.textContent=d;rl.appendChild(c);}
      var td=+ch;
      if(red())rl.style.setProperty('--odo-y',(-td*10)+'%');
      else{rl.style.setProperty('--odo-y','0%');(function(r,y){requestAnimationFrame(function(){requestAnimationFrame(function(){r.style.setProperty('--odo-y',(-y*10)+'%');});});})(rl,td);}
      w.appendChild(rl);el.appendChild(w);di++;
    }else{var sp=document.createElement('span');sp.className='vd-odo-sep';sp.setAttribute('aria-hidden','true');sp.textContent=ch;el.appendChild(sp);}
  }
}
function updateOdometer(el,v,o){
  var opt=o||{},s=(opt.prefix||'')+fmt(v,opt.decimals||0)+(opt.suffix||''),ds=[];
  for(var i=0;i<s.length;i++)if(s[i]>='0'&&s[i]<='9')ds.push(+s[i]);
  var rs=el.querySelectorAll('.vd-odo-reel');if(rs.length!==ds.length){renderOdometer(el,v,opt);return;}
  el.setAttribute('aria-label',s);rs.forEach(function(r,ix){r.style.setProperty('--odo-y',(-ds[ix]*10)+'%');});
}
function mountOdometer(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||{},v=data&&typeof data.value==='number'?data.value:(typeof data==='number'?data:12850),lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh'),sfx=o.suffix||'';
  box.classList.add('vd-odo-wrap');box.innerHTML='<span></span><span class="vd-odo-demo-tag"></span>';
  var num=box.children[0],tag=box.children[1];tag.textContent=VM.t?VM.t(lang,'demoDataTag'):'示范数据';
  renderOdometer(num,v,{suffix:sfx,decimals:o.decimals||0});
  return{el:box,setValue:function(nv){v=nv;updateOdometer(num,v,{suffix:sfx,decimals:o.decimals||0});},setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c!==lang){lang=c;tag.textContent=VM.t?VM.t(lang,'demoDataTag'):'示范数据';}}};
}
function mountProgressRing(box,o){
  var VM=R.VerdoraMotion||{},opt=o||{},sz=opt.size||116,th=opt.thick||10,mx=opt.max||100,lang=VM.normLang?VM.normLang(opt.lang):'zh',lbl=opt.label;
  var w=document.createElement('div');w.className='vd-ring-wrap';w.style.setProperty('--ring-size',sz+'px');w.style.setProperty('--ring-thick',th+'px');
  w.setAttribute('role','progressbar');w.setAttribute('aria-valuemin','0');w.setAttribute('aria-valuemax',String(mx));
  w.innerHTML='<span class="vd-ring-track" aria-hidden="true"></span><span class="vd-ring-clip vd-ring-clip--r" aria-hidden="true"><span class="vd-ring-fill vd-ring-fill--r"></span></span><span class="vd-ring-clip vd-ring-clip--l" aria-hidden="true"><span class="vd-ring-fill vd-ring-fill--l"></span></span><span class="vd-ring-center"><strong class="vd-ring-val">0%</strong><span class="vd-ring-label"></span></span>';
  box.innerHTML='';box.appendChild(w);
  var vEl=w.querySelector('.vd-ring-val'),lEl=w.querySelector('.vd-ring-label'),cur=0,raf=null;
  lEl.textContent=lbl||(VM.t?VM.t(lang,'ringLabelVerify'):'');
  function ap(p){var c=Math.max(0,Math.min(1,p));w.style.setProperty('--r-deg',(-135+Math.min(c*2,1)*180).toFixed(2)+'deg');w.style.setProperty('--l-deg',(-135+Math.max((c-.5)*2,0)*180).toFixed(2)+'deg');vEl.textContent=Math.round(c*100)+'%';w.setAttribute('aria-valuenow',String(Math.round(c*mx)));}
  function go(tv,dur,cb){
    cancelAnimationFrame(raf);w.classList.remove('is-complete');var tp=Math.max(0,Math.min(1,tv/mx)),sp=cur/mx;
    if(red()||!dur){cur=tv;ap(tp);if(tp>=1){w.classList.add('is-complete');if(cb)cb();}return;}
    var st=performance.now();
    (function step(nw){var t=Math.min(1,(nw-st)/dur);ap(sp+(tp-sp)*(1-Math.pow(1-t,3)));if(t<1)raf=requestAnimationFrame(step);else{cur=tv;if(tp>=1){w.classList.add('is-complete');if(cb)cb();}}})(st);
  }
  ap(0);if(typeof opt.value==='number')go(opt.value,opt.duration||900,opt.onComplete);
  return{el:w,setValue:function(v,d,cb){go(v,typeof d==='number'?d:780,cb);},setLang:function(nl,ol){lang=VM.normLang?VM.normLang(nl):nl;lEl.textContent=ol||(VM.t?VM.t(lang,'ringLabelVerify'):lEl.textContent);},reset:function(){cur=0;w.classList.remove('is-complete');ap(0);}};
}
var DEF_ST=[{area:'Petra Jaya'},{area:'Batu Kawa'},{area:'Tabuan Jaya'}],TONES=['review','confirm','pending'],KEYS=['stBadgeOpening','stBadgeBouquet','stBadgeWedding'];
function mountStatusFeed(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||{},rows=(Array.isArray(data)?data:(data&&data.items))||DEF_ST,lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh'),sh=0;
  box.classList.add('vd-status-list');
  function render(anim){box.innerHTML=rows.map(function(r,i){var ix=(i+sh)%3;return'<div class="vd-status-row vd-stagger-item" style="--i:'+i+(anim?'':';animation:none;opacity:1')+'"><span>'+(r.area||'Petra Jaya')+'</span><span class="vd-status-badge" data-tone="'+TONES[ix]+'">'+(VM.t?VM.t(lang,KEYS[ix]):KEYS[ix])+'</span></div>';}).join('');}
  render(true);
  return{el:box,cycle:function(){sh=(sh+1)%3;render(false);},setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c===lang)return;lang=c;if(VM.swapLangFade)VM.swapLangFade(box,function(){render(false);});else render(false);}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountProgressRing=mountProgressRing;V.mountOdometer=mountOdometer;V.mountStatusFeed=mountStatusFeed;
R.VerdoraFeedback={renderOdometer:renderOdometer,updateOdometer:updateOdometer,createProgressRing:mountProgressRing};
})(typeof window!=='undefined'?window:globalThis);
