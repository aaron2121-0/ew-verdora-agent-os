// Native adapter for the Gemini coach design. Never mount the prototype defaults.
import {element,setButtonLoading} from "./components.js";
import {createIcon} from "./icons.js";
import {aiStart,aiEnd} from "./ai-ui.js";
import {triggerD6Celebration} from "./d6-motion.js";
import {todayProgress,tomorrowFocus,coachLeads,dueLeads,isLiveAI} from "./today-coach-data.js";
import {kuchingDateKey,formatKuchingDateTime} from "./date.js";

const TABS=["今日计划","任务话术","结果回填","2 分钟对练","晚上复盘"];
const EMPTY_AI="AI 暂时无法生成，请稍后重试。这里不会用预设建议代替 AI。";
const taskLabels={orders:"订单",qualified_leads:"合格客户",quotes:"报价",followups:"跟进"};
const text=value=>typeof value==="string"?value:"";
const p=(value,cls="tc-copy")=>element("p",{className:cls,text:value});
function button(label,fn,{primary=false,icon=null}={}){
  const b=element("button",{className:"tc-button "+(primary?"tc-primary":"tc-secondary"),attrs:{type:"button"}});
  if(icon)b.append(createIcon(icon,{size:18}));
  b.append(element("span",{text:label}));
  if(fn)b.addEventListener("click",fn);
  return b;
}
function field(label,tag="textarea",attrs={}){
  const wrap=element("label",{className:"tc-field"}),input=element(tag,{attrs});
  wrap.append(element("span",{text:label}),input);
  return {wrap,input};
}
function options(select,rows){for(const [value,label] of rows)select.append(element("option",{text:label,attrs:{value}}))}
function stylesheet(){
  if(document.querySelector('link[data-today-coach]'))return;
  const link=element("link",{attrs:{rel:"stylesheet",href:"/today-coach.css","data-today-coach":""}});document.head.append(link);
}

export function createTodayCoach({getData,getLang,getUserId,api,onRefresh,onOpenLead,onLocked,isLocked,onNavigate}){
  let active=0,owner=null,selected="",scenario="",priority=null,weekly=null;
  let lastProgress=null,view=0,root=null,day=null;
  const saved=new Map();
  const user=()=>String(getUserId?.()||getData()?.agent?.id||"");
  const available=()=>coachLeads(getData());
  const leadId=()=>available().some(x=>x.id===selected)?selected:(available()[0]?.id||"");
  const friendly=error=>api.friendlyError?.(error?.message)||"暂时无法连接，请稍后再试。";
  function message(host,value,cls="tc-empty"){host.replaceChildren(p(value,cls))}
  function output(host,response,lines){
    host.replaceChildren();
    if(!isLiveAI(response)){message(host,EMPTY_AI);return false}
    const values=lines.filter(x=>typeof x==="string"&&x.trim());
    if(!values.length){message(host,"AI 这次没有返回建议，请再试一次。");return false}
    host.append(p("AI 实时生成 · 请核对后再发送","tc-provider"));
    for(const value of values)host.append(p(value));
    return true;
  }
  async function perform(b,host,work,{selling=false}={}){
    if(selling&&isLocked?.()){onLocked?.();return}
    const identity=user(),revision=view;
    const label=b.querySelector("span:last-child")?.textContent||b.textContent;
    setButtonLoading(b,true,"处理中…");host.replaceChildren(p("AI 正在整理你的资料…","tc-status"));aiStart();let ok=false;
    const current=()=>identity===user()&&revision===view;
    try{await work(current);ok=true}catch(error){if(current())message(host,friendly(error),"tc-error")}
    finally{setButtonLoading(b,false,label);aiEnd(ok)}
  }
  function leadPicker(host){
    const rows=available();
    const {wrap,input}=field("选择这次要处理的客户","select");
    options(input,rows.length?rows.map(x=>[x.id,text(x.customer_label)||"未命名客户"]):[["","还没有客户，先到「客户」新增"]]);
    input.value=leadId();selected=input.value;input.disabled=!rows.length;
    input.addEventListener("change",()=>{selected=input.value;scenario="";drawPane()});
    host.append(wrap);
    if(!rows.length)host.append(p("新增一位真实客户后，就能让 AI 帮你写下一句。","tc-empty"),button("去新增客户",()=>onNavigate?.("customers")));
    return rows.length>0;
  }
  function copyAction(host,value){
    const status=element("span",{className:"tc-status",attrs:{role:"status"}});
    const copy=button("复制话术",async()=>{try{await navigator.clipboard.writeText(value);status.textContent="已复制"}catch{status.textContent="复制失败，请长按文字复制。"}},{icon:"copy"});
    host.append(copy,status);
  }
  function planPane(host){
    host.append(element("h2",{className:"tc-section-heading",text:"今天先联系谁？"}),p("从你的真实客户中找出重点，一次做好下一步。","tc-muted"));
    const out=element("div",{className:"tc-result",attrs:{"aria-live":"polite"}});
    function showPriority(response){
      out.replaceChildren();
      if(!isLiveAI(response)){message(out,EMPTY_AI);return}
      const rows=Array.isArray(response.customers)?response.customers:[];
      if(!rows.length){message(out,"现在还没有需要优先联系的客户。先新增客户，再来生成计划。");return}
      out.append(p("AI 根据你的客户资料整理","tc-provider"));
      for(const row of rows){
        const card=element("article",{className:"tc-card tc-lead"});
        card.append(element("h3",{text:text(row.customer_label)||"客户"}));
        for(const value of [row.why,row.message,row.suggested_time])if(text(value))card.append(p(value));
        if(text(row.message))copyAction(card,row.message);
        out.append(card);
      }
    }
    const run=button("生成今日带单计划",()=>perform(run,out,async current=>{
      const response=await api.ai({action:"today_priority"});if(!current())return;
      priority=response;showPriority(response);
    },{selling:true}),{primary:true,icon:"sparkles"});
    host.append(run,out);
    if(priority)showPriority(priority);else message(out,"还没有生成今日计划。点击上方按钮，让 AI 帮你整理。");
    const due=dueLeads(getData());
    const list=element("section",{className:"tc-due",attrs:{id:"dueFollowups"}});
    list.append(element("h2",{className:"tc-section-heading",text:"到期跟进"}));
    if(!due.length)list.append(p("目前没有到期跟进。新的跟进安排会出现在这里。","tc-empty"));
    for(const lead of due){
      const card=element("article",{className:"tc-card tc-lead"});
      card.append(element("h3",{text:text(lead.customer_label)||"未命名客户"}));
      if(lead.next_followup_at&&Number.isFinite(Date.parse(lead.next_followup_at)))card.append(p(formatKuchingDateTime(lead.next_followup_at,getLang()),"tc-muted"));
      const actions=element("div",{className:"tc-actions"});
      actions.append(button("写跟进话术",()=>{selected=lead.id;selectTab(1)},{primary:true,icon:"messageCircle"}),button("查看客户",()=>onOpenLead?.(lead)));
      card.append(actions);list.append(card);
    }
    host.append(list);
  }
  function scriptsPane(host){
    host.append(element("h2",{className:"tc-section-heading",text:"准备好这一句，再发出去"}));
    const mode=field("你现在需要什么？","select");
    options(mode.input,[["next","写下一句"],["objection","回应客户顾虑"],["translate","翻译回复"]]);host.append(mode.wrap);
    const body=element("div");host.append(body);
    const draw=()=>{
      body.replaceChildren();const kind=mode.input.value;
      const hasLead=kind==="next"?leadPicker(body):true;
      const content=field(kind==="translate"?"贴上要翻译的内容":kind==="objection"?"客户怎么说？（选填）":"客户最近说了什么？（选填）","textarea",{rows:3,maxlength:kind==="translate"?2000:800});body.append(content.wrap);
      const choice=field(kind==="translate"?"翻译成":"客户的顾虑","select");
      if(kind!=="next"){
        options(choice.input,kind==="translate"?[["zh","中文"],["en","English 英文"],["ms","Bahasa Melayu 马来文"]]:[["expensive","觉得太贵"],["think","想再考虑"],["exact","想确认款式"]]);body.append(choice.wrap);
      }
      const out=element("div",{className:"tc-result",attrs:{"aria-live":"polite"}});
      const run=button("请 AI 帮我准备",()=>perform(run,out,async current=>{
        if(kind==="translate"&&!content.input.value.trim()){message(out,"先贴上要翻译的内容。");return}
        const response=await api.ai(kind==="next"?{action:"next_message",lead_id:leadId(),outcome:"followup",customer_said:content.input.value.trim()}:kind==="objection"?{action:"objection_replies",objection:choice.input.value,customer_message:content.input.value.trim()}:{action:"translate_reply",target:choice.input.value,text:content.input.value.trim()});
        if(!current())return;
        const lines=kind==="next"?[response.content?.message,response.content?.why]:kind==="objection"?(Array.isArray(response.replies)?response.replies:[]):[response.text];
        if(kind==="objection"&&isLiveAI(response)){
          out.replaceChildren();
          if(!lines.length){message(out,"AI 这次没有返回建议，请再试一次。");return}
          out.append(p("AI 实时生成 · 请核对后再发送","tc-provider"));
          for(const reply of lines.filter(x=>text(x).trim())){const card=element("article",{className:"tc-card"});card.append(p(reply));copyAction(card,reply);out.append(card)}
        }else if(output(out,response,lines))copyAction(out,kind==="next"?text(response.content?.message):text(response.text));
      },{selling:true}),{primary:true,icon:"sparkles"});
      run.disabled=!hasLead;body.append(run,out);
    };mode.input.addEventListener("change",draw);draw();
  }
  function outcomePane(host){
    host.append(element("h2",{className:"tc-section-heading",text:"客户后来怎么说？"}),p("选真实结果，AI 帮你想下一步。不会自动确认订单或付款。","tc-muted"));
    const hasLead=leadPicker(host);
    const said=field("客户的回复（选填）","textarea",{rows:2,maxlength:750});
    const reason=field("如果丢单，主要原因是？","select");options(reason.input,[["","请选择丢单原因"],["too_expensive","价格不合适"],["think_about_it","还想考虑"],["no_reply","没有回复"],["chose_other","选了其他商家"],["other","其他原因"]]);
    host.append(said.wrap,reason.wrap);
    const grid=element("div",{className:"tc-outcomes"}),out=element("div",{className:"tc-result",attrs:{"aria-live":"polite"}});
    const recordState=element("p",{className:"tc-status",attrs:{role:"status"}});
    const actions=[["no_reply","没回覆"],["replied","有回覆"],["interested","有兴趣"],["wants_quote","要报价"],["won","成交了"],["lost","丢单"]];
    for(const [outcome,label] of actions){
      const b=button(label,async()=>{
        if(outcome==="lost"&&!reason.input.value){message(out,"请先选择丢单原因，再确认丢单。");return}
        const id=leadId();if(!id)return;
        const customerSaid=(outcome==="won"?"客户结果回报：成交了。订单及付款仍需正式确认。 ":"")+said.input.value.trim();
        grid.querySelectorAll("button").forEach(x=>x.disabled=true);
        const identity=user();
        await perform(b,out,async current=>{
          let recorded=false;
          try{
            if(outcome==="lost")await api.agent({action:"set_lead_loss",lead_id:id,loss_reason:reason.input.value});
            else await api.agent({action:"complete_followup",lead_id:id});
            recorded=true;
            if(user()!==identity)return;
            priority=null;weekly=null;
            const status=outcome==="lost"?"已保存丢单原因。":"已保存这次跟进；成交金额以正式订单为准。";
            saved.set(id,{response:null,lines:[],status});
            if(!current())return;
            recordState.textContent=status;
            const response=await api.ai(outcome==="lost"?{action:"lost_review",lead_id:id}:{action:"next_message",lead_id:id,outcome:outcome==="won"?"replied":outcome,customer_said:customerSaid});
            if(!current())return;
            const r=response.review||{};
            const lines=outcome==="lost"?[r.summary,r.next_time,r.model_message,r.avoid]:[response.content?.message,response.content?.why];
            saved.set(id,{response,lines,status});output(out,response,lines);
          }finally{
            // A saved server result must refresh even if the user changed tabs.
            if(recorded&&user()===identity)await onRefresh?.();
          }
        },{selling:true});
        grid.querySelectorAll("button").forEach(x=>x.disabled=!hasLead);
      });b.dataset.outcome=outcome;b.disabled=!hasLead;grid.append(b);
    }
    host.append(grid,recordState,element("h3",{className:"tc-section-heading",text:"AI 下一步建议"}),out);
    if(saved.has(leadId())){const x=saved.get(leadId());recordState.textContent=x.status||"";output(out,x.response,x.lines)}else message(out,"记录真实结果后，下一步建议会显示在这里。");
    host.append(button("需要报价或确认订单？去开单",()=>onNavigate?.("order"),{icon:"receipt"}));
  }
  function practicePane(host){
    host.append(element("h2",{className:"tc-section-heading",text:"用 2 分钟，练好一次回复"}),p("真实 AI 出题与点评，仅供练习，不影响认证成绩。","tc-muted"));
    const scene=element("div",{className:"tc-scenario",attrs:{"aria-live":"polite"}}),out=element("div",{className:"tc-result",attrs:{"aria-live":"polite"}});
    const answer=field("你会怎么回复客户？","textarea",{rows:4,maxlength:2000});
    const start=button("生成对练情境",async()=>{
      scenario="";answer.input.value="";answer.input.disabled=true;out.replaceChildren();score.disabled=true;
      try{await perform(start,scene,async current=>{
        const response=await api.ai({action:"roleplay_generate",weakness:"QUALIFY"});if(!current())return;
        scenario=isLiveAI(response)?text(response.scenario):"";output(scene,response,[scenario]);
      })}finally{score.disabled=!scenario;answer.input.disabled=false}
    },{primary:true,icon:"messageCircle"});
    const score=button("提交回复，请 AI 点评",async()=>{
      start.disabled=true;answer.input.disabled=true;
      try{await perform(score,out,async current=>{
        if(!answer.input.value.trim()){message(out,"先写下你会怎么回复客户。");return}
        const response=await api.ai({action:"roleplay_score",scenario,answer:answer.input.value.trim(),module_code:"QUALIFY"});if(!current())return;
        const value=response.score||{},feedback=response.feedback||value.feedback||{};
        const strengths=Array.isArray(feedback.strengths)?feedback.strengths.filter(x=>text(x)):[];
        const improvements=Array.isArray(feedback.improvements)?feedback.improvements.filter(x=>text(x)):[];
        if(output(out,response,[...strengths,...improvements,response.model_answer||value.model_answer])){
          out.replaceChildren(p("AI 实时生成 · 请核对后再发送","tc-provider"));
          if(typeof value.score==="number"&&Number.isFinite(value.score))out.append(element("h3",{text:"练习评分："+value.score+" / 100"}));
          for(const [label,lines] of [["做得好的",strengths],["下次可以改进",improvements],["AI 示范回复",[response.model_answer||value.model_answer]]]){
            if(lines.some(x=>text(x))){out.append(element("h4",{text:label}));for(const line of lines.filter(x=>text(x)))out.append(p(line))}
          }
        }
      })}finally{start.disabled=false;answer.input.disabled=false}
    },{primary:true});score.disabled=!scenario;
    if(scenario)scene.append(p(scenario));else message(scene,"还没有对练情境。点击按钮，让 AI 为你出题。");
    host.append(start,scene,answer.wrap,score,out);
  }
  function reviewPane(host){
    host.append(element("h2",{className:"tc-section-heading",text:"看看今天完成了什么"}));
    const progress=todayProgress(getData()),stats=element("div",{className:"tc-stat-grid"});
    if(!progress.available)stats.append(p("还没有今日任务记录。有了真实记录，这里就会更新。","tc-empty"));
    for(const item of progress.items){const card=element("div",{className:"tc-stat"});card.append(element("strong",{text:String(getData()?.today_progress?.[item.key]??item.done)+" / "+item.target}),element("span",{text:taskLabels[item.key]||item.key}));stats.append(card)}
    host.append(stats,element("h3",{className:"tc-section-heading",text:"明天的重点"}));
    const out=element("div",{className:"tc-result",attrs:{"aria-live":"polite"}});
    const show=response=>{
      const tomorrow=tomorrowFocus(response);
      output(out,response,tomorrow?[tomorrow.focus,...(Array.isArray(tomorrow.actions)?tomorrow.actions:[])]:[]);
      if(isLiveAI(response)&&!tomorrow)message(out,"AI 目前还没有明天的计划。跨周时，请等新一周计划准备好再查看。");
    };
    const run=button("请 AI 整理明天重点",()=>perform(run,out,async current=>{
      const response=await api.ai({action:"weekly_plan"});if(!current())return;weekly=response;show(response);
    },{selling:true}),{primary:true,icon:"calendarDays"});
    host.append(run,out);if(weekly)show(weekly);else message(out,"点击按钮，读取 AI 周计划里明天的重点。");
  }
  function drawPane(){
    const pane=root?.querySelector(".tc-pane");if(!pane)return;
    view++;pane.replaceChildren();pane.id="today-coach-panel";pane.setAttribute("aria-labelledby","today-coach-tab-"+active);
    [planPane,scriptsPane,outcomePane,practicePane,reviewPane][active](pane);
  }
  function selectTab(index,focus=false){
    active=index;
    const tabs=[...root.querySelectorAll(".tc-tab")];
    tabs.forEach((tab,i)=>{tab.setAttribute("aria-selected",String(i===active));tab.tabIndex=i===active?0:-1});
    drawPane();if(focus){tabs[active].focus();tabs[active].scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"})}
  }
  function render(){
    stylesheet();
    const data=getData()||{},progress=todayProgress(data),date=data.phase1?.kuching_date||kuchingDateKey();
    if(owner!==user()||day!==date){owner=user();day=date;active=0;selected="";scenario="";priority=null;weekly=null;saved.clear();lastProgress=null}
    if(lastProgress?.date===date&&lastProgress.available&&progress.available&&lastProgress.total===progress.total&&progress.done>lastProgress.done)triggerD6Celebration("course");
    lastProgress={date,done:progress.done,total:progress.total,available:progress.available};
    root=element("section",{className:"today-coach vc-shell",attrs:{"aria-label":"AI 每日带单计划"}});
    const hero=element("header",{className:"tc-hero"}),intro=element("div");
    intro.append(p("今天 · 把每一次联系做好","tc-eyebrow"),element("h1",{text:"AI 每日带单计划"}),p("你的真实进度，你的下一步。","tc-muted"));
    const orb=element("div",{className:"tc-orb",attrs:{"aria-hidden":"true"}});orb.append(createIcon("sparkles",{size:26}));hero.append(intro,orb);
    const metrics=element("div",{className:"tc-metrics"}),ring=element("div",{className:"tc-ring",attrs:{role:"img","aria-label":progress.available?`今日完成 ${progress.done} / ${progress.total}`:"尚无今日任务资料"}});
    ring.style.setProperty("--tc-progress",String(progress.total?progress.done/progress.total*100:0));
    ring.append(element("strong",{text:progress.available?progress.done+" / "+progress.total:"—"}),element("small",{text:"今日完成"}));
    const summary=element("div");summary.append(element("strong",{text:progress.available?(progress.total>0&&progress.done>=progress.total?"今天的目标已完成":"一步一步，完成今天的目标"):"从一位客户开始"}),p(progress.available?"进度来自今日任务记录，保存后自动更新。":"还没有今日任务资料，有了记录就会显示。","tc-muted"));
    metrics.append(ring,summary);
    // No selling streak exists in the current dashboard contract: do not invent one.
    const refresh=button("刷新真实进度",async()=>{setButtonLoading(refresh,true,"更新中…");try{await onRefresh?.()}catch(e){refresh.after(p(friendly(e),"tc-error"))}finally{setButtonLoading(refresh,false,"刷新真实进度")}},{icon:"refreshCw"});
    const tabs=element("div",{className:"tc-tabs",attrs:{role:"tablist","aria-label":"每日带单步骤"}});
    TABS.forEach((label,index)=>{const tab=button(label,()=>selectTab(index));tab.className="tc-tab";tab.id="today-coach-tab-"+index;tab.setAttribute("role","tab");tab.setAttribute("aria-controls","today-coach-panel");tab.addEventListener("keydown",event=>{const key=event.key;let next;if(key==="ArrowRight")next=(active+1)%5;if(key==="ArrowLeft")next=(active+4)%5;if(key==="Home")next=0;if(key==="End")next=4;if(next!==undefined){event.preventDefault();selectTab(next,true)}});tabs.append(tab)});
    const pane=element("div",{className:"tc-pane",attrs:{role:"tabpanel",tabindex:"0"}});
    hero.append(metrics);
    root.append(hero,refresh,tabs,pane);selectTab(active);return root;
  }
  return {render,destroy(){view++;root=null;saved.clear();priority=null;weekly=null;scenario="";lastProgress=null;owner=null;day=null}};
}
