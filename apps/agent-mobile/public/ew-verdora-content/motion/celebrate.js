(function(r){'use strict';var N='http://www.w3.org/2000/svg',C=['#2E7D5B','#4CC38A','#D4B47A','#85B95B','#EADFC8'],E=['#D4B47A','#2E7D5B','#3FB6A8','#F5EAD3','#4CC38A'],P=['M7 1C10.5 4.2 12 9.2 7 17C2 9.2 3.5 4.2 7 1Z','M7 2C11.5 2.5 13 7.5 10.5 13C8.5 16.5 4.5 16.5 3 13C1 8 2.8 2.5 7 2Z','M7 1.5C9.5 5 11.5 8.5 10.5 13.5C9.2 16 4.8 16 3.5 13.5C2.5 8.5 4.5 5 7 1.5Z'];
function red(){return document.documentElement.getAttribute('data-motion')==='reduced'||!!(r.matchMedia&&r.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function trigger(o){var op=typeof o==='string'?{type:o}:(o||{}),t=op.type==='fullscreen'?'fullscreen':(op.type==='exam'?'exam':'course');if(red())return Promise.resolve({skipped:true,type:t});
var l=document.createElement('div');l.className='vd-celebrate-layer';l.setAttribute('aria-hidden','true');
var vw=r.innerWidth||390,vh=r.innerHeight||844,ox=vw*.5,oy=t==='exam'?vh*.24:(t==='fullscreen'?vh*.5:-16);
if(op.originEl&&op.originEl.getBoundingClientRect&&t!=='fullscreen'){var rc=op.originEl.getBoundingClientRect();ox=rc.left+rc.width*.5;if(t==='exam')oy=Math.max(48,rc.top)}
var n=t==='fullscreen'?36:(t==='exam'?24:16),pal=t==='course'?C:E,mx=0;
for(var i=0;i<n;i++){var g=document.createElementNS(N,'svg');g.setAttribute('viewBox','0 0 14 18');g.setAttribute('class','vd-petal'+(t==='exam'?' vd-petal--exam':(t==='fullscreen'?' vd-petal--full':'')));
var p=document.createElementNS(N,'path');p.setAttribute('d',P[i%3]);p.setAttribute('fill',pal[i%5]);g.appendChild(p);
var a=(i/n)*Math.PI*2+(i%3)*.21,x0,y0,xm,ym,x1,y1,d,dl;
if(t==='fullscreen'){x0=ox+Math.cos(a)*20;y0=oy+Math.sin(a)*20;xm=((i*73)%88+6)*vw/100;ym=((i*47)%80+8)*vh/100;x1=ox+Math.cos(a)*10;y1=oy-36;d=1180+(i%5)*42;dl=(i%6)*20}
else{var ex=t==='exam',sp=Math.min(vw*.45,230),dx=ex?Math.cos(a)*(50+(i%5)*32):(i%2?-1:1)*(18+(i%4)*16);x0=ex?ox+Math.cos(a)*14:ox+(i/(n-1)-.5)*sp*1.4;y0=ex?oy:-18-(i%4)*10;xm=x0+dx*.65;ym=ex?oy-42-(i%4)*20:y0+vh*.16;x1=x0+dx*1.15;y1=(ex?oy+Math.min(vh*.42,290):Math.min(vh*.52,360))+(i%4)*24;d=(ex?1080:1050)+(i%5)*45;dl=(i%6)*24}
var r0=(i*37)%180,s=g.style;[['--x0',x0.toFixed(1)+'px'],['--y0',y0.toFixed(1)+'px'],['--xm',xm.toFixed(1)+'px'],['--ym',ym.toFixed(1)+'px'],['--x1',x1.toFixed(1)+'px'],['--y1',y1.toFixed(1)+'px'],['--r0',r0+'deg'],['--rm',(r0+95)+'deg'],['--r1',(r0+(i%2?-220:220))+'deg'],['--d',d+'ms'],['--dl',dl+'ms']].forEach(function(kv){s.setProperty(kv[0],kv[1])});
if(d+dl>mx)mx=d+dl;l.appendChild(g)}
document.body.appendChild(l);return new Promise(function(res){setTimeout(function(){if(l.parentNode)l.parentNode.removeChild(l);res({skipped:false,type:t,durationMs:mx})},Math.min(1480,mx+40))})}
var VM=r.VerdoraMotion=r.VerdoraMotion||{};VM.celebrate=trigger;r.VerdoraCelebrate={trigger:trigger}})(typeof window!=='undefined'?window:globalThis);
