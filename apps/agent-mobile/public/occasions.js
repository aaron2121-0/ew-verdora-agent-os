import {element} from './components.js';
import {createIcon} from './icons.js';
import {getKuchingTodayIso,getMonthGridDays,isOccasionOnDay,getDisplayDate,getPromotionWindow,getUpcoming30DayAlerts,getUrgentOccasions,getPendingConfirmationOccasions,getDailyAlertStorageKey,filterUnnotifiedToday,splitAlertBatch,canLockStockOrPurchase} from './occasion-rules.js';

const statusText={confirmed:'Owner 已核实',pattern:'规律推算 · 待核实',not_found:'尚无日期'};
const demandText={high:'需求高',medium:'一般需求',low:'少量需求'};
function node(tag,text='',className=''){return element(tag,{text,className})}
function button(text,click,kind='secondary'){const b=node('button',text,'btn btn-'+kind);b.type='button';b.addEventListener('click',click);return b}
function safeLink(value,label){try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return null;return element('a',{text:label,attrs:{href:u.href,target:'_blank',rel:'noopener noreferrer'}})}catch{return null}}
function loadStyles(){if(document.querySelector('link[data-occasions]'))return;const l=element('link',{attrs:{rel:'stylesheet',href:new URL('./occasions.css',import.meta.url).href,'data-occasions':''}});document.head.append(l)}

/** Data is fetched only through the existing authenticated session API. No seed fallback. */
export function createOccasionCalendar({api,getUserId,onBack,isToday=()=>true}){
  loadStyles();
  let rows=[],verifications=[],error='',loaded=false,busy=null,loadedAt=0,identity=getUserId(),revision=0,destroyed=false;
  let upcomingHost=null,pageHost=null,modal=null,scene=null,sceneRevision=0,activeTab='calendar',filter='all',selected=getKuchingTodayIso(),month=selected.slice(0,7),autoKey='';
  const today=()=>getKuchingTodayIso();
  const name=o=>String(o.name_zh||o.name_en||'未命名场合');
  const alerts=()=>getUpcoming30DayAlerts(rows,today());
  const key=()=>getDailyAlertStorageKey(today())+'_'+getUserId();
  function notified(){try{return new Set(JSON.parse(localStorage.getItem(key())||'[]'))}catch{return new Set()}}
  function remember(id){const ids=notified();ids.add(id);try{localStorage.setItem(key(),JSON.stringify([...ids]))}catch{}}
  function resetIdentity(){if(identity===getUserId())return;identity=getUserId();revision++;busy=null;rows=[];verifications=[];loaded=false;loadedAt=0;error='';autoKey='';closeModal()}
  async function refresh({force=false}={}){
    resetIdentity();if(destroyed||!identity)return;
    if(busy)return busy;
    if(!force&&loaded&&Date.now()-loadedAt<60000){render();return}
    const token=revision,uid=identity;
    const request=(async()=>{
      try{const result=await api.agent({action:'occasion_list'});if(destroyed||revision!==token||uid!==getUserId())return;
        if(!Array.isArray(result?.occasions))throw new Error('occasion_unavailable');
        rows=result.occasions;verifications=Array.isArray(result.verifications)?result.verifications:[];loaded=true;loadedAt=Date.now();error='';
      }catch{if(revision===token&&!destroyed)error='场合资料暂时无法读取，请稍后重试。'}
      finally{if(revision===token&&!destroyed){busy=null;render();maybeAutoAlert()}}
    })();busy=request;return request;
  }
  function render(){if(upcomingHost?.isConnected)renderUpcoming();if(pageHost?.isConnected)renderPage()}
  function badge(o){return node('span',statusText[o.date_status]||'待核实','occasion-status '+o.date_status)}
  function summary(o){const b=button('',()=>showDetail(o));b.classList.add('occasion-row');b.append(node('strong',name(o)),node('span',getDisplayDate(o)||'请帮忙核实日期','occasion-date'),badge(o));return b}
  function state(host){if(error){host.append(node('p',error,'occasion-muted'),button('重新读取',()=>refresh({force:true})));return true}if(!loaded){host.append(node('p','正在读取场合日历…','occasion-muted'));return true}return false}
  function renderUpcoming(){
    upcomingHost.replaceChildren();upcomingHost.className='occasion-upcoming';
    const head=node('div','','occasion-heading');const title=node('strong','近期用花机会');title.prepend(createIcon('calendarDays',{size:20}));head.append(title,button('场合日历',openPage));upcomingHost.append(head);
    if(state(upcomingHost))return;
    const items=alerts();
    if(!items.length){upcomingHost.append(node('p','还没有近期场合。Owner 加入真实资料后会显示在这里。','occasion-muted'));return}
    const strip=node('div','','occasion-strip');for(const a of items.slice(0,3)){const b=button('',()=>showDetail(a.occasion));b.classList.add('occasion-upcoming-item');b.append(node('small',a.inPromoToday?'现在适合开始联系':'即将进入推广期'),node('strong',name(a.occasion)),node('span',a.displayDate+(a.daysUntil>0?' · '+a.daysUntil+' 天后':' · 已到日期')),badge(a.occasion));strip.append(b)}
    upcomingHost.append(strip,button('播放提醒'+(items.length>3?' · 还有 '+(items.length-3)+' 个':''),()=>showAlerts(items)));
  }
  function mountUpcoming(host){if(destroyed)return;upcomingHost=host;resetIdentity();renderUpcoming();void refresh()}
  function openPage(){closeModal();pageHost?.remove();pageHost=node('section','','section active');pageHost.id='occasionsPage';pageHost.dataset.page='occasions';document.querySelectorAll('#app > .section').forEach(x=>x.classList.remove('active'));document.getElementById('app').append(pageHost);renderPage();void refresh();window.scrollTo({top:0,behavior:'instant'})}
  function leave(){closeModal();pageHost?.remove();pageHost=null;onBack()}
  function renderPage(){
    pageHost.replaceChildren();const page=node('div','','page-shell occasion-page');
    const head=node('div','','occasion-heading');head.append(button('← 今天',leave),button('刷新',()=>refresh({force:true})));page.append(head,node('p','OCCASION CALENDAR','occasion-eyebrow'),node('h1','场合日历'),node('p','先核实日期，再安排推广与备货。','occasion-muted'));
    const tabs=node('div','','occasion-tabs');for(const [id,label]of [['calendar','月历'],['list','场合清单'],['library','动态场景']]){const b=button(label,()=>{closeModal();activeTab=id;renderPage()});b.setAttribute('aria-pressed',String(activeTab===id));tabs.append(b)}page.append(tabs);pageHost.append(page);
    if(activeTab==='library'){renderLibrary(page);return}
    if(state(page))return;
    const select=element('select',{attrs:{'aria-label':'日期状态'}});for(const [id,label]of [['all','所有日期状态'],...Object.entries(statusText)]){const o=element('option',{text:label,attrs:{value:id}});select.append(o)}select.value=filter;select.addEventListener('change',()=>{filter=select.value;renderPage()});page.append(select);
    const visible=rows.filter(o=>filter==='all'||o.date_status===filter);
    if(!rows.length){page.append(node('p','目前没有真实场合资料。请 Owner 从审核页新增或导入 CSV。','occasion-empty'));return}
    const urgent=getUrgentOccasions(visible,today());const urgentBox=node('aside','','occasion-panel');if(urgent.length){urgentBox.append(node('h2','今天适合联系'));urgent.forEach(a=>urgentBox.append(summary(a.occasion)))}
    if(activeTab==='list'){if(urgent.length)page.append(urgentBox);const list=node('div','','occasion-list');visible.forEach(o=>list.append(summary(o)));if(!visible.length)list.append(node('p','这个筛选条件下还没有场合。'));page.append(list);return}
    const control=node('div','','occasion-heading');control.append(button('‹ 上月',()=>moveMonth(-1)),node('h2',month.replace('-',' 年 ')+' 月'),button('下月 ›',()=>moveMonth(1)));page.append(control);
    const grid=node('div','','occasion-grid');grid.setAttribute('aria-label','场合月历');for(const d of ['日','一','二','三','四','五','六'])grid.append(node('span',d,'occasion-weekday'));
    for(const d of getMonthGridDays(Number(month.slice(0,4)),Number(month.slice(5))-1)){const hits=visible.filter(o=>isOccasionOnDay(o,d.iso));const b=button('',()=>{selected=d.iso;showDay(d.iso,visible)});b.className='occasion-day'+(!d.inMonth?' outside':'')+(d.iso===today()?' is-today':'');b.setAttribute('aria-label',d.iso+' · '+hits.length+' 个场合');b.append(node('span',String(Number(d.iso.slice(-2)))));if(hits.length)b.append(node('small',hits.length+' 个'));grid.append(b)}page.append(grid);if(urgent.length)page.append(urgentBox);
    const pending=getPendingConfirmationOccasions(visible);if(pending.length){const box=node('div','','occasion-panel');box.append(node('h2','等待核实日期'));pending.forEach(o=>box.append(summary(o)));page.append(box)}
  }
  function moveMonth(delta){const date=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5))-1+delta,1));month=date.toISOString().slice(0,7);renderPage()}
  function stopScene(){sceneRevision++;scene?.destroy();scene=null}
  function closeModal(){stopScene();if(!modal)return;const {root,previous,keydown}=modal;document.removeEventListener('keydown',keydown);root.remove();modal=null;previous?.focus?.()}
  function dialog(title,full=false){
    closeModal();const previous=document.activeElement,root=node('div','','occasion-overlay'+(full?' occasion-fullscreen':''));root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);const panel=node('div','','occasion-dialog');const head=node('div','','occasion-heading');head.append(node('h2',title),button('关闭',closeModal));panel.append(head);root.append(panel);root.addEventListener('click',e=>{if(e.target===root)closeModal()});
    const keydown=e=>{if(e.key==='Escape'){e.preventDefault();closeModal()}if(e.key==='Tab'){const nodes=[...root.querySelectorAll('button,a,input,textarea,select')].filter(n=>!n.disabled);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',keydown);document.body.append(root);modal={root,previous,keydown};head.querySelector('button').focus();return panel;
  }
  function showDay(day,visible){const p=dialog(day+' 的场合');const hits=visible.filter(o=>isOccasionOnDay(o,day));if(!hits.length)p.append(node('p','这一天还没有场合。日期仍在核实的项目请看月历下方。','occasion-empty'));else hits.forEach(o=>p.append(summary(o)))}
  async function mountScene(host,opts){const token=++sceneRevision;try{const {renderOccasionScene}=await import('./occasion-scenes.js');if(token!==sceneRevision||!host.isConnected)return;const c=await renderOccasionScene(host,opts);if(token!==sceneRevision||!host.isConnected)c.destroy();else scene=c}catch{if(host.isConnected)host.textContent='动态暂时无法播放，场合资料仍可查看。'}}
  function details(p,o){
    p.append(badge(o),node('h3',name(o)),node('p',o.name_en||'','occasion-muted'),node('p',(getDisplayDate(o)||'日期尚未找到')+(o.date_end?' 至 '+o.date_end:'')),node('p',o.location_or_audience||''),node('p',(demandText[o.flower_demand]||'')+' · 建议提前 '+o.order_lead_days+' 天联系'));
    const win=getPromotionWindow(o);if(win)p.append(node('p','推广期：'+win.promoStart+' 至 '+win.promoEnd));
    p.append(node('p','常用花品：'+((o.typical_products||[]).join('、')||'尚未填写')));
    if(o.evidence)p.append(node('p',o.evidence));const link=safeLink(o.source_url,'查看资料来源');if(link)p.append(link);
    const eligibility=canLockStockOrPurchase(o);p.append(node('p',eligibility.allowed?'日期已核实。安排锁货前仍须遵守原有订单流程。':'日期未经 Owner 核实，不能锁货或采购。','occasion-policy'));
    const result=node('p','','occasion-muted');const check=button('检查备货资格',async()=>{check.disabled=true;try{const r=await api.agent({action:'occasion_stock_eligibility',occasion_id:o.id});if(!p.isConnected)return;result.textContent=r.allowed?'Owner 已核实日期，可以按原有流程安排。':'日期尚未核实，请先提交核实资料。'}catch{if(p.isConnected)result.textContent='暂时无法检查，请稍后再试。'}finally{check.disabled=false}});p.append(check,result);
    if(o.date_status!=='confirmed')p.append(button('帮忙核实日期',()=>showVerification(o),'primary'));
    const own=verifications.filter(v=>v.occasion_id===o.id);for(const v of own)p.append(node('p','我提交的日期 '+v.proposed_date_start+' · '+({pending:'Owner 审核中',approved:'已通过',rejected:'未通过，可补充资料再提交'}[v.status]||v.status),'occasion-muted'));
  }
  function showDetail(o){const p=dialog('场合详情');const art=node('div','','occasion-art');p.append(art);void mountScene(art,{occasion:o,autoPlay:false});details(p,o)}
  function showVerification(o){const p=dialog('帮忙核实 · '+name(o));p.append(node('p','提交后等待 Owner 审核；提交本身不会确认日期或开放锁货。','occasion-policy'));const f=element('form');
    function input(label,type,value='',required=false){const l=node('label',label);const i=element('input',{attrs:{type,value,required}});l.append(i);f.append(l);return i}
    const start=input('开始日期','date',getDisplayDate(o)||'',true),end=input('结束日期（选填）','date'),url=input('官方资料链接（选填）','url');const label=node('label','核实说明');const note=element('textarea',{attrs:{required:true,maxlength:2000,rows:3}});label.append(note);f.append(label);const result=node('p','','occasion-muted');result.setAttribute('role','status');const submit=element('button',{text:'提交给 Owner 审核',className:'btn btn-primary',attrs:{type:'submit'}});f.append(submit,result);p.append(f);
    f.addEventListener('submit',async e=>{e.preventDefault();if(end.value&&end.value<start.value){result.textContent='结束日期不能早于开始日期。';return}submit.disabled=true;const uid=getUserId(),token=revision;try{await api.agent({action:'occasion_verification_submit',submission:{occasion_id:o.id,proposed_date_start:start.value,proposed_date_end:end.value||null,proof_url:url.value.trim()||null,note:note.value.trim()}});if(token!==revision||uid!==getUserId()||!f.isConnected)return;result.textContent='已提交，等待 Owner 审核。';submit.remove();void refresh({force:true})}catch{if(f.isConnected)result.textContent='提交失败，请检查日期和资料链接后重试。'}finally{submit.disabled=false}});
  }
  function showAlerts(items){
    const {activeBatch,overflowCount}=splitAlertBatch(items,3);if(!activeBatch.length)return;let index=0;
    const show=()=>{const a=activeBatch[index],p=dialog('近期用花提醒',true);remember(a.occasion.id);p.append(node('p',(index+1)+' / '+activeBatch.length+(overflowCount?' · 另有 '+overflowCount+' 个可到日历查看':''),'occasion-eyebrow'));const art=node('div','','occasion-art');p.append(art);void mountScene(art,{occasion:a.occasion,daysUntil:a.daysUntil,intensity:a.intensity});p.append(button('跳过动态',()=>scene?.seek(0.68)));details(p,a.occasion);p.append(button(index+1<activeBatch.length?'下一个提醒':'完成，回到今天',()=>{if(++index<activeBatch.length)show();else closeModal()},'primary'),button('查看日历',openPage));};show();
  }
  function maybeAutoAlert(){if(destroyed||!loaded||!isToday()||pageHost?.isConnected||modal||document.hidden||document.querySelector('.onboarding-layer,.spotlight-layer,.vw-root'))return;const k=key();if(autoKey===k)return;autoKey=k;const list=filterUnnotifiedToday(alerts(),notified());if(list.length)showAlerts(list)}
  function renderLibrary(page){
    page.append(node('p','100 个原生 SVG 场景 · 10 组 · 每次只预览一个','occasion-muted'));const holder=node('div');page.append(holder);
    import('./occasion-registry.js').then(({MOTION_PRESET_LIST})=>{if(!holder.isConnected)return;const select=element('select',{attrs:{'aria-label':'选择动态场景'}});for(const preset of MOTION_PRESET_LIST.filter(p=>p.enabled_in_v1))select.append(element('option',{text:preset.name_zh+' · '+preset.name_en,attrs:{value:preset.id}}));const art=node('div','','occasion-art');let current=null;const info=node('p','','occasion-muted');const preview=()=>{stopScene();current=MOTION_PRESET_LIST.find(p=>p.id===select.value);info.textContent=current.name_zh+' · '+current.group+' · '+current.duration+'ms';void mountScene(art,{sceneId:current.id,autoPlay:false})};select.addEventListener('change',preview);const controls=node('div','','occasion-heading');controls.append(button('播放',()=>scene?.play(),'primary'),button('暂停',()=>scene?.pause()));const seek=element('input',{attrs:{type:'range',min:0,max:100,value:68,'aria-label':'场景进度'}});seek.addEventListener('input',()=>scene?.seek(Number(seek.value)/100));holder.append(select,art,info,controls,seek);preview()}).catch(()=>{holder.textContent='动态场景暂时无法读取。'});
  }
  function deactivate(){stopScene();closeModal();pageHost?.remove();pageHost=null}
  function suspend(){revision++;busy=null;stopScene();closeModal();pageHost?.remove();pageHost=null;rows=[];verifications=[];loaded=false;loadedAt=0;error='';autoKey=''}
  // Retry once a blocking welcome/tour is removed, without an animation clock.
  const welcomeObserver=new MutationObserver(()=>maybeAutoAlert());
  welcomeObserver.observe(document.body,{childList:true});
  function destroy(){suspend();destroyed=true;welcomeObserver.disconnect();upcomingHost=null}
  return {mountUpcoming,openPage,refresh,suspend,destroy,deactivate,checkReminders:maybeAutoAlert,onLanguageChange:render};
}
