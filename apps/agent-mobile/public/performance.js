import {clear,element,emptyState,countTo,stagger,progress,toast,vibrate} from "./components.js";
import {createIcon} from "./icons.js";
import {kuchingDateKey,formatKuchingDateTime} from "./date.js";

const TTL=5*60*1000;

function money(v){
  return "RM "+Number(v||0).toLocaleString("en-MY",{minimumFractionDigits:0,maximumFractionDigits:2});
}
function pct(v){
  if(v===null||v===undefined||Number.isNaN(Number(v)))return "—";
  return (Number(v)*100).toFixed(Number(v)*100%1?1:0)+"%";
}
function score(v){
  if(v===null||v===undefined||Number.isNaN(Number(v)))return "—";
  return Number(v).toFixed(Number(v)%1?1:0)+"/100";
}
function tierKey(tier){
  return {starter:"tierStarter",active:"tierActive",pro:"tierPro",elite:"tierElite"}[tier]||"tierStarter";
}
function statusLabel(value,tr){
  const key={
    pending:"commissionPending",earned:"commissionEarned",payable:"commissionPayable",
    held:"commissionHeld",paid:"commissionPaid",reversed:"commissionReversed",
    applied:"commissionApplied",waived:"commissionWaived"
  }[String(value||"").toLowerCase()];
  return key?tr(key):String(value||"—");
}
function rankTone(rank){
  if(rank===1)return "gold";
  if(rank===2)return "silver";
  if(rank===3)return "bronze";
  return "plain";
}

export function createPerformanceDashboard({getUserId,getLang,tr,api}){
  let host=null;
  let data=null;
  let loading=false;
  let lastError="";
  let rankDelta=0;
  let pullStart=null;
  let pullDistance=0;

  const month=()=>kuchingDateKey().slice(0,7);
  const cacheKey=()=> "ew_phase2_sales_cache_v1:"+String(getUserId()||"anonymous")+":"+month();
  const rankKey=()=> "ew_phase2_rank_v1:"+String(getUserId()||"anonymous")+":"+month();

  function readCache(){
    try{
      const raw=sessionStorage.getItem(cacheKey());
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(!parsed||Date.now()-Number(parsed.fetched_at||0)>TTL)return null;
      return parsed;
    }catch{return null}
  }

  function writeCache(value){
    try{
      const currentRank=Number(value?.leaderboard?.me?.rank||0);
      const oldRank=Number(sessionStorage.getItem(rankKey())||0);
      rankDelta=oldRank&&currentRank?oldRank-currentRank:0;
      if(currentRank)sessionStorage.setItem(rankKey(),String(currentRank));
      sessionStorage.setItem(cacheKey(),JSON.stringify({fetched_at:Date.now(),data:value}));
    }catch{}
  }

  function metricChange(value,current,previous){
    const wrap=element("span",{className:"metric-change"});
    if(value===null||value===undefined){
      if(Number(current||0)>0&&Number(previous||0)===0){
        wrap.classList.add("new");
        wrap.textContent=tr("metricNew");
      }else{
        wrap.classList.add("flat");
        wrap.textContent=tr("noPreviousComparison");
      }
      return wrap;
    }
    const n=Number(value||0);
    wrap.classList.add(n>0?"up":n<0?"down":"flat");
    wrap.append(createIcon(n>0?"trendingUp":n<0?"arrowDown":"minus",{size:13}),
      element("span",{text:(Math.abs(n)).toFixed(Math.abs(n)%1?1:0)+"%"}));
    return wrap;
  }

  function renderLoading(){
    if(!host)return;
    clear(host);
    const page=element("div",{className:"page-shell performance-shell"});
    const header=element("div",{className:"screen-header"});
    const copy=element("div");
    copy.append(element("h1",{className:"screen-title",text:tr("performanceTitle")}),
      element("p",{className:"screen-subtitle",text:tr("performanceSubtitle")}));
    header.append(copy);
    page.append(header);
    const hero=element("div",{className:"perf-metric-grid"});
    for(let i=0;i<4;i++){
      const s=element("div",{className:"perf-skeleton-card"});
      s.append(element("span",{className:"skeleton-line short"}),element("span",{className:"skeleton-line big"}),element("span",{className:"skeleton-line"}));
      hero.append(s);
    }
    page.append(hero);
    const block=element("div",{className:"perf-skeleton-block"});
    block.append(element("span",{className:"skeleton-line short"}),element("span",{className:"skeleton-chart"}));
    page.append(block);
    host.append(page);
  }

  async function load({force=false,quiet=false}={}){
    if(loading)return;
    if(!force){
      const cached=readCache();
      if(cached){
        data=cached.data;
        lastError="";
        render();
        return;
      }
    }
    loading=true;
    lastError="";
    if(!quiet)renderLoading();
    try{
      const j=await api.agent({action:"sales_dashboard",month:month()});
      data=j.sales_dashboard||null;
      if(!data)throw new Error("request_failed");
      writeCache(data);
      render();
    }catch(e){
      lastError=api.friendlyError(e?.message);
      if(!quiet)render();
    }finally{
      loading=false;
      resetPull();
    }
  }

  function screenHeader(){
    const row=element("div",{className:"screen-header performance-header"});
    const left=element("div");
    left.append(element("h1",{className:"screen-title",text:tr("performanceTitle")}),
      element("p",{className:"screen-subtitle",text:tr("performanceSubtitle")}));
    const monthBadge=element("span",{className:"badge badge-gold",text:new Intl.DateTimeFormat(getLang()==="zh"?"zh-CN":"en-MY",{timeZone:"Asia/Kuching",year:"numeric",month:"short"}).format(new Date(month()+"-01T00:00:00+08:00"))});
    row.append(left,monthBadge);
    return row;
  }

  function metrics(){
    const sales=data?.sales||{},prev=data?.previous||{},changes=data?.changes||{};
    const grid=element("section",{className:"perf-metric-grid"});
    const items=[
      {key:"mtdRevenue",value:sales.revenue,display:money(sales.revenue),change:changes.revenue_pct,prev:prev.revenue,icon:"wallet"},
      {key:"mtdOrders",value:sales.orders,display:String(Number(sales.orders||0)),change:changes.orders_pct,prev:prev.orders,icon:"receipt"},
      {key:"avgOrderValue",value:sales.aov,display:money(sales.aov),change:changes.aov_pct,prev:prev.aov,icon:"trendingUp"},
      {key:"quoteConversion",value:sales.quote_conversion,display:pct(sales.quote_conversion),change:changes.quote_conversion_pct,prev:prev.quote_conversion,icon:"target"}
    ];
    items.forEach((item,i)=>{
      const card=element("article",{className:"perf-metric-card"});
      const top=element("div",{className:"perf-metric-top"});
      const ico=element("span",{className:"perf-metric-icon"});ico.append(createIcon(item.icon,{size:18}));
      top.append(ico,element("span",{text:tr(item.key)}));
      const value=element("strong",{className:"perf-metric-value",text:item.display});
      if(i<3&&Number(item.value||0)>0){
        value.textContent=i===1?"0":"RM 0";
        requestAnimationFrame(()=>countTo(value,Number(item.value||0),{
          duration:560,
          formatter:x=>i===1?String(Math.round(x)):"RM "+Math.round(x).toLocaleString("en-MY")
        }));
      }
      const foot=element("div",{className:"perf-metric-foot"});
      foot.append(metricChange(item.change,item.value,item.prev),element("small",{text:tr("samePeriodLastMonth")}));
      card.append(top,value,foot);
      grid.append(card);
    });
    return grid;
  }

  function salesChart(){
    const rows=Array.isArray(data?.daily)?data.daily:[];
    const section=element("section",{className:"perf-card sales-chart-card"});
    const head=element("div",{className:"perf-section-head"});
    const title=element("div");title.append(createIcon("trendingUp",{size:19}),element("h2",{text:tr("salesTrend")}));
    head.append(title,element("small",{text:tr("performanceMonth")}));
    section.append(head);
    if(!rows.length){
      section.append(emptyState({icon:"trendingUp",title:tr("noSalesYet")}));
      return section;
    }
    const max=Math.max(1,...rows.map(x=>Number(x.revenue||0)));
    const chart=element("div",{className:"sales-bars",attrs:{role:"img","aria-label":tr("salesTrend")}});
    rows.forEach((row,index)=>{
      const col=element("div",{className:"sales-bar-col",attrs:{title:String(row.date)+" · "+money(row.revenue)+" · "+String(row.orders)+" "+tr("ordersShort")}});
      const barWrap=element("div",{className:"sales-bar-track"});
      const bar=element("span",{className:"sales-bar"});
      const ratio=Number(row.revenue||0)/max;
      bar.style.transform="scaleY("+Math.max(row.revenue?0.05:0,ratio)+")";
      barWrap.append(bar);
      const show=Number(row.day)===1||Number(row.day)%5===0||index===rows.length-1;
      col.append(barWrap,element("small",{text:show?String(row.day):""}));
      chart.append(col);
    });
    section.append(chart);
    return section;
  }

  function tierCard(){
    const tp=data?.tier_progress||{};
    const card=element("section",{className:"perf-card tier-card"});
    const head=element("div",{className:"perf-section-head"});
    const title=element("div");title.append(createIcon("trophy",{size:19}),element("h2",{text:tr("tierProgressTitle")}));
    head.append(title,element("span",{className:"badge badge-gold",text:tr(tierKey(tp.current_tier))}));
    card.append(head);
    if(!tp.next_tier){
      const done=element("div",{className:"tier-max"});
      done.append(createIcon("sparkles",{size:22}),element("strong",{text:tr("maxTier")}));
      card.append(done);return card;
    }
    card.append(element("div",{className:"tier-next",text:tr("nextTierLine",{tier:tr(tierKey(tp.next_tier))})}));
    const orderRatio=tp.next_orders_required?Math.min(1,Number(tp.orders_30d||0)/Number(tp.next_orders_required)):1;
    const scoreRatio=tp.next_score_required?Math.min(1,Number(tp.performance_score||0)/Number(tp.next_score_required)):1;
    const rows=[
      [tr("ordersProgress"),Number(tp.orders_30d||0)+" / "+Number(tp.next_orders_required||0),orderRatio],
      [tr("scoreProgress"),Number(tp.performance_score||0).toFixed(0)+" / "+Number(tp.next_score_required||0).toFixed(0),scoreRatio]
    ];
    rows.forEach(([label,value,ratio])=>{
      const row=element("div",{className:"tier-progress-row"});
      const top=element("div");top.append(element("span",{text:label}),element("strong",{text:value}));
      row.append(top,progress(ratio).lastChild);
      card.append(row);
    });
    card.append(element("div",{className:"tier-needs",text:tr("nextTierNeeds",{orders:Number(tp.orders_remaining||0),score:Number(tp.score_remaining||0).toFixed(0)})}));
    return card;
  }

  function kpis(){
    const k=data?.kpis||{};
    const section=element("section",{className:"perf-card"});
    const head=element("div",{className:"perf-section-head"});
    const title=element("div");title.append(createIcon("target",{size:19}),element("h2",{text:tr("kpiTitle")}));
    head.append(title);section.append(head);
    const grid=element("div",{className:"kpi-grid"});
    const items=[
      {icon:"receipt",title:"quoteConversion",value:pct(k.quote_conversion),explain:"kpiQuoteExplain",improve:"kpiQuoteImprove"},
      {icon:"phoneCall",title:"kpiFollowup",value:pct(k.followup_completion),explain:"kpiFollowupExplain",improve:"kpiFollowupImprove"},
      {icon:"graduationCap",title:"kpiTraining",value:score(k.training_score),explain:"kpiTrainingExplain",improve:"kpiTrainingImprove"},
      {icon:"trendingUp",title:"kpiPerformance",value:score(k.performance_score),explain:"kpiPerformanceExplain",improve:"kpiPerformanceImprove"}
    ];
    items.forEach(item=>{
      const card=element("article",{className:"kpi-card"});
      const top=element("div",{className:"kpi-card-top"});
      const ico=element("span");ico.append(createIcon(item.icon,{size:18}));
      top.append(ico,element("span",{text:tr(item.title)}));
      card.append(top,element("strong",{className:"kpi-value",text:item.value}),element("p",{text:tr(item.explain)}));
      const how=element("div",{className:"kpi-improve"});
      how.append(element("b",{text:tr("howToImprove")}),element("span",{text:tr(item.improve)}));
      card.append(how);grid.append(card);
    });
    section.append(grid);return section;
  }

  function team(){
    const t=data?.team||{};
    const card=element("section",{className:"perf-card team-card"});
    const head=element("div",{className:"perf-section-head"});
    const title=element("div");title.append(createIcon("users",{size:19}),element("h2",{text:tr("teamSnapshot")}));
    head.append(title);card.append(head);
    const grid=element("div",{className:"team-counts"});
    [[tr("activeAgents"),t.active_agents],[tr("totalAgents"),t.total_agents]].forEach(([label,value])=>{
      const x=element("div");x.append(element("strong",{text:String(Number(value||0))}),element("span",{text:label}));grid.append(x);
    });
    card.append(grid);return card;
  }

  function leaderboard(){
    const lb=data?.leaderboard||{},rows=Array.isArray(lb.top)?lb.top:[],me=lb.me||null;
    const section=element("section",{className:"perf-card leaderboard-card"});
    const head=element("div",{className:"perf-section-head"});
    const title=element("div");title.append(createIcon("trophy",{size:19}),element("h2",{text:tr("leaderboardTitle")}));
    head.append(title,element("small",{text:tr("teamAgents",{count:Number(lb.team_count||0)})}));
    section.append(head);
    if(!rows.length){
      section.append(emptyState({icon:"trophy",title:tr("noSalesYet")}));
    }else{
      const list=element("div",{className:"leaderboard-list"});
      rows.forEach(row=>{
        const item=element("div",{className:"leaderboard-row"+(row.is_me?" is-me":"")});
        const rank=element("span",{className:"rank-badge rank-"+rankTone(Number(row.rank||0)),text:String(row.rank)});
        const who=element("div",{className:"leaderboard-who"});
        who.append(element("strong",{text:String(row.label||"—")}),element("small",{text:tr(tierKey(row.tier))}));
        const stats=element("div",{className:"leaderboard-stats"});
        stats.append(element("strong",{text:money(row.revenue)}),element("small",{text:tr("ordersCount",{count:Number(row.orders||0)})}));
        item.append(rank,who,stats);list.append(item);
      });
      section.append(list);
    }
    if(me){
      const pinned=element("div",{className:"leaderboard-me"});
      const left=element("div",{className:"leaderboard-me-rank"});
      left.append(element("span",{text:"#"+String(me.rank||"—")}),element("small",{text:tr("myRank")}));
      const middle=element("div",{className:"leaderboard-me-copy"});
      middle.append(element("strong",{text:String(me.label||"—")}),
        element("small",{text:Number(me.rank||0)===1?tr("rankOne"):tr("gapToNext",{amount:money(me.gap_to_next)})}));
      const movement=element("span",{className:"rank-movement "+(rankDelta>0?"up":rankDelta<0?"down":"flat")});
      if(rankDelta>0)movement.textContent="↑ "+rankDelta;
      else if(rankDelta<0)movement.textContent="↓ "+Math.abs(rankDelta);
      else movement.textContent=tr("rankSame");
      pinned.append(left,middle,movement);section.append(pinned);
    }
    return section;
  }

  function wallet(){
    const w=data?.wallet||{},ledger=Array.isArray(data?.wallet_ledger)?data.wallet_ledger:[];
    const section=element("section",{className:"perf-card wallet-card",attrs:{id:"commissionPreview"}});
    const head=element("div",{className:"perf-section-head"});
    const title=element("div");title.append(createIcon("wallet",{size:19}),element("h2",{text:tr("walletTitle")}));
    head.append(title,element("span",{className:"badge",text:tr("readOnly")}));
    section.append(head);
    const grid=element("div",{className:"wallet-grid"});
    [["walletEarned","earned"],["walletPayable","payable"],["walletHeld","held"],["walletPaid","paid"]].forEach(([label,key])=>{
      const x=element("div",{className:"wallet-tile"});
      x.append(element("span",{text:tr(label)}),element("strong",{text:money(w[key])}));grid.append(x);
    });
    section.append(grid);
    const adjust=Number(w.refund_adjustments_pending||0);
    if(adjust!==0){
      const note=element("div",{className:"wallet-adjustment"});
      note.append(createIcon("refreshCw",{size:17}),element("span",{text:tr("refundAdjustment",{amount:money(adjust)})}));
      section.append(note);
    }
    const sub=element("h3",{className:"wallet-ledger-title",text:tr("walletLedger")});section.append(sub);
    if(!ledger.length){
      section.append(element("div",{className:"empty-mini",text:tr("noWalletActivity")}));
    }else{
      const list=element("div",{className:"wallet-ledger"});
      ledger.forEach(row=>{
        const item=element("div",{className:"wallet-ledger-row"});
        const left=element("div");
        left.append(element("strong",{text:row.kind==="adjustment"?tr("refundAdjustmentShort"):tr("commissionPreview")}),
          element("small",{text:formatKuchingDateTime(row.occurred_at,getLang())+" · "+statusLabel(row.status,tr)}));
        const amount=element("strong",{className:Number(row.amount||0)<0?"negative":"",text:money(row.amount)});
        item.append(left,amount);list.append(item);
      });
      section.append(list);
    }
    return section;
  }

  function render(){
    if(!host)return;
    if(loading&&!data){renderLoading();return}
    clear(host);
    const page=element("div",{className:"page-shell performance-shell"});
    const pull=element("div",{className:"pull-refresh",attrs:{id:"performancePull"}});
    pull.append(createIcon("refreshCw",{size:16}),element("span",{text:loading?tr("refreshing"):tr("pullToRefresh")}));
    page.append(pull,screenHeader());
    if(lastError&&!data){
      const retry=element("div",{className:"perf-error"});
      retry.append(element("p",{text:lastError}));
      const b=element("button",{className:"btn btn-primary",text:tr("refreshNow"),attrs:{type:"button"}});
      b.addEventListener("click",()=>load({force:true}));
      retry.append(b);page.append(retry);host.append(page);return;
    }
    if(!data){
      host.append(page);
      load();
      return;
    }
    page.append(metrics(),salesChart(),tierCard(),kpis(),team(),leaderboard(),wallet());
    host.append(page);
    stagger(page.querySelectorAll(".perf-metric-card,.kpi-card,.leaderboard-row,.wallet-tile"),{step:30,max:8});
  }

  function resetPull(){
    pullStart=null;pullDistance=0;
    const el=host?.querySelector(".pull-refresh");
    if(el){el.style.transform="translateY(0)";el.classList.remove("ready","active")}
  }

  function bindPull(target){
    if(!target||target.dataset.pullBound==="1")return;
    target.dataset.pullBound="1";
    target.addEventListener("touchstart",e=>{
      if(window.scrollY>1||loading)return;
      pullStart=e.touches?.[0]?.clientY??null;pullDistance=0;
    },{passive:true});
    target.addEventListener("touchmove",e=>{
      if(pullStart===null||loading)return;
      pullDistance=Math.max(0,Math.min(86,(e.touches?.[0]?.clientY||0)-pullStart));
      const el=target.querySelector(".pull-refresh");if(!el)return;
      el.style.transform="translateY("+Math.round(pullDistance*.55)+"px)";
      el.classList.toggle("ready",pullDistance>=64);
      const label=el.querySelector("span");if(label)label.textContent=pullDistance>=64?tr("releaseToRefresh"):tr("pullToRefresh");
    },{passive:true});
    target.addEventListener("touchend",()=>{
      if(pullStart===null)return;
      const should=pullDistance>=64;
      resetPull();
      if(should){vibrate(8);load({force:true})}
    },{passive:true});
  }

  function open(target){
    host=target||host;
    bindPull(host);
    const cached=readCache();
    if(cached&&!data)data=cached.data;
    render();
    if(!data)load();
  }

  function onLanguageChange(){if(host)render()}
  function onForeground(){
    if(!host)return;
    const active=host.classList.contains("active");
    if(active||data)load({force:true,quiet:!active});
  }
  function refresh(){return load({force:true})}

  return {open,render,onLanguageChange,onForeground,refresh,getData:()=>data};
}
