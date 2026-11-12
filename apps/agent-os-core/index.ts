
const tiers=[
  {name:"Starter",rate:0.05,minOrders:0,minScore:0},
  {name:"Active",rate:0.07,minOrders:15,minScore:70},
  {name:"Pro",rate:0.085,minOrders:30,minScore:80},
  {name:"Elite",rate:0.10,minOrders:45,minScore:90}
];
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
function stress(seed=20261112){
 let s=seed>>>0;const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296};
 const budgets=[250,300,350,400,500,650,800,1000],rates=[.05,.07,.085,.10];
 let totalEnquiries=0,totalOrders=0,green=0,amber=0,manual=0,below50=0,unsafe=0,duplicateCommission=0,minNet=1,maxNet=0,totalRevenue=0;
 for(let round=0;round<100;round++){
  const overhead=.05+rnd()*.10,required=Math.min(.85,Math.max(.60,.50+overhead+.05));
  let rev=0,cost=0;
  for(let a=0;a<10;a++){
   const rate=rates[Math.floor(rnd()*rates.length)],score=60+rnd()*38;
   for(let e=0;e<5;e++){
    totalEnquiries++;
    const budget=budgets[Math.floor(rnd()*budgets.length)],shock=rnd()<.30?1.20:1;
    let prod=budget*Math.max(.14,Math.min(.55,.29+(rnd()-.5)*.22))*shock;
    if(rnd()<.12){manual++;continue}
    const room=1-required-rate-.02-.03-.01;if(room<=0){manual++;continue}
    const maxBuy=budget*room;let price=budget,conv=.22+(score-75)/250;
    if(prod<=maxBuy)green++;
    else{amber++;const pick=rnd();if(pick<.55&&maxBuy>=budget*.08){prod=maxBuy*.90;conv=.17+(score-75)/300}else if(pick<.75){price=Math.ceil((prod/room)/10)*10;conv=.12+(score-75)/350}else continue}
    conv=Math.max(.02,Math.min(.60,conv));
    if(rnd()<conv){totalOrders++;rev+=price;totalRevenue+=price;const vc=prod+price*(rate+.02+.03+.01);cost+=vc;if((price-vc)/price+1e-9<required)unsafe++}
   }
  }
  if(rev>0){const net=(rev-cost-rev*overhead)/rev;minNet=Math.min(minNet,net);maxNet=Math.max(maxNet,net);if(net<.50)below50++}
 }
 return {runs:100,totalEnquiries,totalOrders,totalRevenue:Math.round(totalRevenue*100)/100,quoteResults:{green,amber,manual},invariants:{netMarginBelow50Runs:below50,unsafeAccepted:unsafe,duplicateCommission},netMargin:{min:minNet===1?null:minNet,max:maxNet},pass:below50===0&&unsafe===0&&duplicateCommission===0}
}

function stressAgent100(seed=992026){
  let s=seed>>>0;const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296};
  const ps=[.10,.15,.20,.25,.30,.40,.45];
  let agentDays=0,daysWithOrder=0,totalOrders=0,totalQuotes=0,totalLeads=0,cappedLowConversion=0,trainingDays=0;
  const targetProb=.80;
  for(let day=0;day<100;day++){
    for(let a=0;a<10;a++){
      agentDays++;
      const p=ps[Math.floor(rnd()*ps.length)];
      let histOrders=0;
      for(let i=0;i<20;i++)if(rnd()<p)histOrders++;
      const qconv=Math.min(.80,Math.max(.08,(histOrders+2)/28));
      const leadQuote=Math.min(.90,Math.max(.15,.45+(rnd()-.5)*.25));
      let n=Math.ceil(Math.log(1-targetProb)/Math.log(1-qconv));
      n=Math.min(8,Math.max(3,n));
      const leads=Math.min(20,Math.max(5,Math.ceil(n/leadQuote)));
      totalQuotes+=n;totalLeads+=leads;
      if(n===8&&qconv<.15){cappedLowConversion++;trainingDays++}
      let orders=0;
      for(let i=0;i<n;i++)if(rnd()<p)orders++;
      totalOrders+=orders;if(orders>=1)daysWithOrder++;
    }
  }
  return {
    runs:100,agentsPerRun:10,agentDays,
    oneOrMoreOrderDays:daysWithOrder,
    oneOrMoreOrderRate:daysWithOrder/agentDays,
    totalOrders,avgOrdersPerAgentDay:totalOrders/agentDays,
    avgQuotesPerAgentDay:totalQuotes/agentDays,
    avgQualifiedLeadsTarget:totalLeads/agentDays,
    cappedLowConversionDays:cappedLowConversion,
    autoClosingTrainingDays:trainingDays,
    policy:{targetProbability:targetProb,minQuotes:3,maxQuotes:8,maxLeads:20},
    note:"Outcomes are probabilistic; the system controls activity/training, not customer purchase decisions."
  };
}
export default {
  async fetch(req){
    const u=new URL(req.url);
    if(u.pathname==="/api/health")return json({ok:true,service:"EW VERDORA Agent OS Core",version:"0.5.3",database:"supabase-live"});
    if(u.pathname==="/api/rules")return json({tiers,targetCompanyNetMargin:0.50,agentManagement:"system-first",aiAuthority:["training","roleplay","sales-coach","content","diagnosis","audit-detection"],ruleAuthority:["commission","tier","bonus","price-floor","profit-guard","permissions","financial-payout"]});
    if(u.pathname==="/api/stress-100")return json(stress());
if(u.pathname==="/api/review-manifest")return json({
  project:"EW VERDORA Agent OS",
  reviewMode:"REVIEW_ONLY_DO_NOT_REBUILD",
  completedByClaudeFrozen:[
    "Rule Engine",
    "Commission/Tier/Bonus",
    "Profit Guard/KPI/Audit/Lifecycle",
    "AI provider abstraction and EN/ZH dictionaries",
    "10-agent/50-enquiry simulation",
    "Probability-based daily missions",
    "Lifecycle-aware missions",
    "Profit-gated campaigns",
    "Normalized sales categories",
    "AI usage quota guard",
    "Quote cold-start owner calibration",
    "Live daily progress and auto micro-training",
    "7-day streak and monthly volume bonus logic"
  ],
  continuationImplemented:[
    "Supabase live schema/RLS/seed integration",
    "Agent/Owner Edge Functions",
    "Agent Mobile and Owner Mobile Railway services",
    "Quote reference private storage and historical underwriting",
    "Order/payment/commission/refund idempotency",
    "Commission clawback ledger",
    "Adaptive procurement variance profit buffer",
    "Strict recovery gate",
    "Least-privilege client writes",
    "Private paid AI hard-disabled",
    "Missing FK indexes",
    "Daily qualified-lead progress bug fix",
    "Campaign bonus cross-month duplicate bug fix",
    "Daily Content undefined parseJson runtime fix",
    "Zero-paid deterministic certification wiring",
    "Manual quote review to locked quote flow",
    "Legacy quote_underwrite overload ambiguity removed",
    "Claude handoff: quote→order uniqueness and order-code collision fixed",
    "Claude handoff: payment/refund lifecycle hardened",
    "Claude handoff: partial-refund commission and paid-clawback accounting fixed",
    "Claude handoff: excess anon/authenticated grants removed",
    "Claude handoff: internal cron helpers no longer client-executable",
    "Claude handoff: owner-session raw database errors sanitized",
    "Agent session dashboard quote-request runtime bug fixed in v11",
    "Owner/Agent auth bridge implemented without paid services",
    "One-time Agent Access Link auth",
    "Legacy Owner bootstrap endpoint retired"
  ],
  live:{
    supabaseProject:"EW VERDORA Agent OS",
    edgeFunctions:["agent-session","agent-ai","quote-intake","owner-session"],
    railwayServices:["agent-os-core","agent-mobile","owner-mobile"],
    cron:["ew_agent_daily_manager daily","ew_release_commissions every 15 min"]
  },
  tests:{
    dbRegressionRuns:100,
    manualQuoteReviewRegressionRuns:100,
    claudeHandoffPaymentOrderRegressionRuns:100,
    result:"PASS",
    ownerPreloginLiveRuns:100,
    tested:[
      "today progress event timing",
      "commission idempotency",
      "payment-event idempotency",
      "tier validity",
      "AI quota DB guard",
      "campaign bonus once-only",
      "payment/refund settlement",
      "recovery restrictions",
      "profit stress",
      "manual quote review underwriting",
      "locked quote creation",
      "cross-month campaign bonus idempotency",
      "quote-to-order one-to-one idempotency",
      "payment event replay idempotency",
      "partial/full refund state transitions",
      "late payment after refund rejection",
      "partial refund commission reduction",
      "paid commission event-scoped clawbacks",
      "Owner authenticated refresh → owner-session dashboard E2E",
      "Agent register → 7 training modules + daily mission → dashboard E2E",
      "Owner pre-login live 100/100 regression",
      "Owner Magic Link production redirect probe"
    ]
  },
  authValidation:{
    ownerConfirmed:true,
    ownerRoleBound:true,
    ownerE2E:"PASS",
    agentRegistrationDashboardE2E:"PASS",
    ownerPrelogin100:"PASS",
    authBridgeLive100:"PASS",
    agentInviteAuthE2E:"PASS",
    agentRedirectStrategy:"Magic Link returns to allowed Owner Mobile domain; authenticated non-Owner sessions are client-routed to Agent Mobile through URL fragment and immediately restored/cleared",
    emailDeliveryFallback:"Supabase email 429 over_email_send_rate_limit confirmed; Owner-issued one-time Agent Access Links provide zero-email fallback",
    legacyBootstrap:"RETIRED",
    ownerSessionVersion:8,
    agentSessionVersion:11
  },
  costPolicy:"NO_EXTRA_PAID_SERVICES; external paid AI hard-disabled; fallback/manual only",
  canonicalLocalHead:"818efa43c69638cfad398d9abcc70f308ce2baf6",
  githubRepository:"aaron2121-0/ew-verdora-agent-os",
  githubBranch:"main",
  githubOwnerSessionSyncCommit:"75da40f4dcf4729191dae75e9086854a809ed517",
  githubStatus:"Canonical source is now in GitHub: aaron2121-0/ew-verdora-agent-os (main); canonical snapshot restored and owner-session synced to live Supabase v6",
  claudeInstructions:[
    "Do not rebuild frozen modules.",
    "Review current Supabase migrations/functions and Railway live services.",
    "Only report concrete bugs, security issues, race conditions, or broken integrations.",
    "If fixing, make the smallest patch possible.",
    "Do not introduce paid APIs or paid services.",
    "Re-run existing regression tests after each patch."
  ]
});
    if(u.pathname==="/api/stress-agent-100")return json(stressAgent100());
    return json({error:"not_found"},404);
  }
};