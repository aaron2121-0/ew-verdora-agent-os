(function(R){'use strict';
var NS='http://www.w3.org/2000/svg',COLS=['#2E7D5B','#4CC38A','#D4B47A','#F5EAD3','#85B95B'],PATH='M12 1C18 6 20 14 12 28C4 14 6 6 12 1Z';
var DEF=[
  {id:'bouquet',line:'bouquet',icon:'bouquet.svg',kicker:'BOUQUET',title_zh:'定制手捧花束展示位',title_en:'Signature Bouquet Showcase',subtitle_zh:'Ken Burns 缓推 + 花瓣转场 · Petra Jaya / Batu Kawa',subtitle_en:'Ken Burns drift + petal wipe · Petra Jaya & Batu Kawa'},
  {id:'opening',line:'opening',icon:'opening.svg',kicker:'OPENING',title_zh:'双层开张花篮展示位',title_en:'Grand Opening Stand Showcase',subtitle_zh:'左右滑动切换 · Tabuan Jaya / Satok',subtitle_en:'Swipe to browse · Tabuan Jaya & Satok'},
  {id:'wedding',line:'wedding',icon:'wedding.svg',kicker:'WEDDING',title_zh:'婚礼花艺仪式展示位',title_en:'Wedding Floral Showcase',subtitle_zh:'60fps transform 动效 · Samarahan 宴会厅',subtitle_en:'60fps transitions · Samarahan'},
  {id:'condolence',line:'condolence',icon:'condolence.svg',kicker:'CONDOLENCE',title_zh:'帛事致意花礼展示位',title_en:'Condolence Stand Showcase',subtitle_zh:'深浅色自动适配 · 点击 FLIP 放大',subtitle_en:'Light/dark adaptive · Tap to FLIP'}
];
var FB='<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".2"/></svg>';
function red(){return document.documentElement.getAttribute('data-motion')==='reduced'||!!(R.matchMedia&&R.matchMedia('(prefers-reduced-motion: reduce)').matches);}
function wipe(vp,dir){
  if(red())return;var o=vp.querySelector('.vd-gallery-wipe');if(o&&o.parentNode)o.parentNode.removeChild(o);
  var wp=document.createElement('div');wp.className='vd-gallery-wipe';wp.setAttribute('aria-hidden','true');
  var r=vp.getBoundingClientRect(),w=r.width||440,h=r.height||330;
  for(var i=0;i<9;i++){
    var s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 24 30');s.setAttribute('class','vd-wipe-petal');
    var p=document.createElementNS(NS,'path');p.setAttribute('d',PATH);p.setAttribute('fill',COLS[i%5]);s.appendChild(p);
    var ys=h*((i+.5)/9)+((i%3)-1)*18,st=s.style;
    st.setProperty('--wx0',(dir>=0?w*.85:w*.15).toFixed(1)+'px');st.setProperty('--wy0',ys.toFixed(1)+'px');
    st.setProperty('--wx1',(dir>=0?-w*.15:w*1.05).toFixed(1)+'px');st.setProperty('--wy1',(ys+(i%2?1:-1)*34).toFixed(1)+'px');
    st.setProperty('--wr0',(i*28)+'deg');st.setProperty('--wr1',(i*28+(dir>=0?-160:160))+'deg');st.setProperty('--wd',(i*22)+'ms');wp.appendChild(s);
  }
  vp.appendChild(wp);setTimeout(function(){if(wp.parentNode)wp.parentNode.removeChild(wp);},760);
}
function mountGallery(box,data,opts){
  if(!box)return null;
  var VM=R.VerdoraMotion||{},o=opts||{};
  if(data&&!Array.isArray(data)&&!data.items&&(o.autoplayMs===undefined&&(data.autoplayMs!==undefined||data.iconsBase||data.lang))){o=data;data=null;}
  var items=(Array.isArray(data)?data:(data&&data.items))||o.items||DEF,base=(o.iconsBase||'./icons').replace(/\/$/,''),cache=o.svgCache||{},lang=VM.normLang?VM.normLang(o.lang):(o.lang==='en'?'en':'zh'),idx=0,tm=null;
  var t=function(k){return VM.t?VM.t(lang,k):k;},pk=function(it,f){return VM.pick?VM.pick(it,f,lang):(it[f+'_'+lang]||it[f]||'');};
  box.classList.add('vd-gallery');
  box.innerHTML='<div class="vd-gallery-viewport">'+items.map(function(it,i){return'<div class="vd-gallery-slide'+(i===0?' is-active':'')+'" data-line="'+(it.line||it.id||'bouquet')+'"><div class="vd-gallery-placeholder"><div class="vd-gallery-icon">'+FB+'</div><span class="vd-gallery-notice"></span></div></div>';}).join('')+'<div class="vd-gallery-scrim"><span class="vd-gallery-kicker"></span><h4 class="vd-gallery-title"></h4><p class="vd-gallery-sub"></p></div></div><div class="vd-gallery-controls"><div class="vd-gallery-dots" role="tablist">'+items.map(function(_,i){return'<button type="button" class="vd-gallery-dot" role="tab" aria-selected="'+(i===0)+'"></button>';}).join('')+'</div><div class="vd-gallery-btns"><button type="button" class="vd-gallery-btn" d-pv></button><button type="button" class="vd-gallery-btn" d-nx></button><button type="button" class="vd-gallery-btn" d-zm></button></div></div>';
  var q=function(s){return box.querySelector(s);},vp=q('.vd-gallery-viewport'),slides=Array.from(box.querySelectorAll('.vd-gallery-slide')),dots=Array.from(box.querySelectorAll('.vd-gallery-dot'));
  var sk=q('.vd-gallery-kicker'),st=q('.vd-gallery-title'),ss=q('.vd-gallery-sub'),pvB=q('[d-pv]'),nxB=q('[d-nx]'),zmB=q('[d-zm]');
  items.forEach(function(it,i){var ic=slides[i].querySelector('.vd-gallery-icon'),u=base+'/'+(it.icon||'bouquet.svg');if(cache[u])ic.innerHTML=cache[u];else if(typeof fetch==='function')fetch(u).then(function(r){return r.ok?r.text():FB;}).then(function(tx){cache[u]=tx;ic.innerHTML=tx;}).catch(function(){});});
  function openLB(srcPh,it){
    var fst=srcPh.getBoundingClientRect(),bx=document.createElement('div');
    bx.className='vd-lightbox';bx.setAttribute('role','dialog');bx.setAttribute('aria-modal','true');bx.setAttribute('aria-label',pk(it,'title'));
    bx.innerHTML='<div class="vd-lightbox-backdrop"></div><div class="vd-lightbox-stage"><div class="vd-lightbox-card"><div class="vd-gallery-icon">'+srcPh.querySelector('.vd-gallery-icon').innerHTML+'</div><span class="vd-gallery-notice"></span></div><div class="vd-lightbox-bar"><div><strong>'+pk(it,'title')+'</strong><div style="font-size:.8rem;opacity:.8">'+pk(it,'subtitle')+'</div></div><button type="button" class="vd-lightbox-close"></button></div></div>';
    bx.querySelector('.vd-gallery-notice').textContent=t('photoNotice');
    var clB=bx.querySelector('.vd-lightbox-close'),cd=bx.querySelector('.vd-lightbox-card'),bd=bx.querySelector('.vd-lightbox-backdrop');
    clB.textContent=t('galleryClose');document.body.appendChild(bx);
    requestAnimationFrame(function(){var lst=cd.getBoundingClientRect();if(!red()&&lst.width>0&&lst.height>0){cd.style.transition='none';cd.style.transform='translate3d('+(fst.left-lst.left)+'px,'+(fst.top-lst.top)+'px,0) scale('+(fst.width/lst.width)+','+(fst.height/lst.height)+')';void cd.offsetWidth;cd.style.transition='transform 380ms cubic-bezier(.2,.9,.24,1),opacity 240ms ease';cd.style.transform='translate3d(0,0,0) scale(1,1)';}bx.classList.add('is-open');});
    function close(){document.removeEventListener('keydown',onK);bx.classList.remove('is-open');if(!red()){var nf=srcPh.getBoundingClientRect(),nl=cd.getBoundingClientRect();if(nf.width>0&&nl.width>0){cd.style.transition='transform 300ms cubic-bezier(.3,.7,.2,1),opacity 240ms ease';cd.style.transform='translate3d('+(nf.left-nl.left)+'px,'+(nf.top-nl.top)+'px,0) scale('+(nf.width/nl.width)+','+(nf.height/nl.height)+')';cd.style.opacity='.25';}}setTimeout(function(){if(bx.parentNode)bx.parentNode.removeChild(bx);},310);}
    function onK(e){if(e.key==='Escape')close();}
    clB.onclick=close;bd.onclick=close;document.addEventListener('keydown',onK);clB.focus();
  }
  function applyText(){var nt=t('photoNotice');slides.forEach(function(s,i){s.querySelector('.vd-gallery-notice').textContent=nt;dots[i].setAttribute('aria-label',pk(items[i],'title'));});var c=items[idx];if(c){sk.textContent=(c.kicker||'PORTFOLIO')+' · '+t('gallerySlotNote');st.textContent=pk(c,'title');ss.textContent=pk(c,'subtitle');}pvB.textContent=t('galleryPrev');nxB.textContent=t('galleryNext');zmB.textContent=t('galleryZoom');}
  function goTo(n,dir){if(!items.length)return;var tg=(n+items.length)%items.length;if(tg===idx)return;var d=typeof dir==='number'?dir:(tg>idx?1:-1);slides.forEach(function(s,i){s.classList.toggle('is-prev',i===idx);s.classList.toggle('is-active',i===tg);});dots.forEach(function(dt,i){dt.setAttribute('aria-selected',String(i===tg));});idx=tg;applyText();wipe(vp,d);}
  function resetAuto(){clearInterval(tm);if(o.autoplayMs&&items.length>1)tm=setInterval(function(){goTo(idx+1,1);},o.autoplayMs);}
  dots.forEach(function(dt,i){dt.onclick=function(){goTo(i);resetAuto();};});pvB.onclick=function(){goTo(idx-1,-1);resetAuto();};nxB.onclick=function(){goTo(idx+1,1);resetAuto();};zmB.onclick=function(){if(slides[idx])openLB(slides[idx].querySelector('.vd-gallery-placeholder'),items[idx]);};
  var sx=null,mv=false;vp.onpointerdown=function(e){sx=e.clientX;mv=false;};vp.onpointermove=function(e){if(sx!==null&&Math.abs(e.clientX-sx)>16)mv=true;};vp.onpointerup=function(e){if(sx===null)return;var dx=e.clientX-sx;sx=null;if(Math.abs(dx)>36){goTo(dx<0?idx+1:idx-1,dx<0?1:-1);resetAuto();}else if(!mv&&slides[idx])openLB(slides[idx].querySelector('.vd-gallery-placeholder'),items[idx]);};
  applyText();resetAuto();
  return{el:box,next:function(){goTo(idx+1,1);},prev:function(){goTo(idx-1,-1);},goTo:goTo,setLang:function(nl){var c=VM.normLang?VM.normLang(nl):(nl==='en'?'en':'zh');if(c===lang)return;lang=c;if(VM.swapLangFade)VM.swapLangFade(box,applyText);else applyText();},destroy:function(){clearInterval(tm);}};
}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.mountGallery=mountGallery;V.GALLERY_DEFAULT=DEF;
R.VerdoraGallery={create:function(c,o){return mountGallery(c,o&&o.items,o);}};
})(typeof window!=='undefined'?window:globalThis);
