(function(R){'use strict';
var D={
  en:{
    brandName:'EW VERDORA Motion',langToggle:'中文',themeDark:'Dark',themeLight:'Light',motionReduce:'Reduce Motion',motionNormal:'Normal Motion',
    demoDataTag:'Sample Data',photoNotice:'Portfolio photos will appear once approved by Owner',
    homeEyebrow:'DAILY FOCUS · PRIORITY',homeTitle:'3 Money-Making Actions Today',
    homeSubtitle:'Complete all 3 actions to reach 100% and unlock today’s petal celebration',
    homeCountDone:'{done} / {total} done',homeStart:'Start',homeDone:'Done',homeMinutes:'{min} min',
    homeTypeLead:'Find Leads',homeTypeFollowup:'Follow Up',homeTypePost:'Post Update',
    homeTipToggle:'1-Min Quick Tip Before You Start',homeTipHintOpen:'Hide',homeTipHintClosed:'Read',
    homeReset:'Reset',homeAllDoneBanner:'All 3 actions completed! Keep up the momentum.',
    cardsReplay:'Replay Bloom',galleryPrev:'Prev',galleryNext:'Next',galleryZoom:'Expand',galleryClose:'Close',gallerySlotNote:'Gradient · Photo Slot',
    orbLabel:'VERDORA AI Orb',orbIdle:'Breathing',orbThinking:'Thinking Fast',orbReplying:'Replying Ripple',
    ringLabelProgress:'Today',ringLabelVerify:'Progress',odoTitle:'Monthly Activity Index',statusTitle:'Order Status Badges',statusReplay:'Next Status',
    stBadgeOpening:'Opening Stand · Quote Under Review',stBadgeBouquet:'Signature Bouquet · Confirmed',stBadgeWedding:'Wedding Table Florals · Awaiting Payment',
    vtTitle:'Shared Element Transition',vtBack:'← Back',vtExpand:'Open →',vtDetailNote:'View Transition & FLIP fallback (gradient placeholder).',
    aiHubTitle:'AI Prototypes (Sample Data)',aiHubIdle:'Ready: trigger an action to see orb + shimmer + reveal',aiHubThinking:'AI processing…',aiHubDone:'AI ready',
    aiOcrTitle:'1. Screenshot Request Reader',aiOcrSub:'Scan beam -> fields -> missing alert -> draft & trilingual switch',
    aiOcrComplete:'Complete',aiOcrMissing:'Missing Info',aiOcrDropHint:'Drop card here',aiOcrDragChip:'Drag: Petra Jaya partial lead',
    aiOcrMissingTag:'Needs Info',aiOcrDraftLabel:'AI Draft (No Quote Price)',aiOcrCopy:'Copy',aiOcrCopied:'Copied',aiOcrTriBtn:'EN / 中文 / BM',
    aiVoiceTitle:'2. Voice-to-Lead Card',aiVoiceSub:'Hold mic wave -> transcript -> card flies into list',
    aiVoiceSim:'Simulate',aiVoiceHold:'Hold to Speak',aiVoiceListening:'Listening…',aiVoicePrompt:'Hold above to dictate a Kuching lead.',
    aiHbTitle:'3. Ask Handbook (Neutral Clauses)',aiHbSub:'Tap to highlight clauses, link line & source chips',
    aiHbAsk:'Ask',aiHbInputLabel:'Handbook question',aiHbSourcePrefix:'Source: ',
    aiFollowTitle:'4. Today’s Follow-Up Deck',aiFollowSub:'Skip left or WhatsApp right to advance the progress ring',
    aiFollowReset:'Redeal',aiFollowSkip:'← Skip',aiFollowSend:'WhatsApp →',aiFollowPending:'{left} / {total} left',
    aiFollowDone:'All 3 daily follow-ups handled',aiFollowSentMsg:'Simulated WhatsApp for "{client}"',aiFollowSkipMsg:'Skipped "{client}" ({left} left)',
    aiHeatTitle:'5. Lead Heat Score',aiHeatSub:'High heat (>= 80) pulses softly; tap for reasons',aiHeatWhy:'Why follow up:',aiHeatNext:'Next: ',
    aiRpTitle:'6. Client Roleplay',aiRpSub:'Mood reacts per reply; odometer score & 3 tips',
    aiRpReset:'Restart',aiRpMoodPrefix:'Mood: ',aiRpScoreTitle:'Roleplay Score',aiRpScoreSub:'Odometer + 3 tips',aiRpPts:' pts',
    aiTriTitle:'7. Trilingual 3D Flip',aiTriSub:'EN / 中文 / BM 3D card flip (Kuching, no prices)',
    aiTriCycle:'Flip',aiTriCopy:'Copy',aiTriScene1:'Opening',aiTriScene2:'Wedding',aiTriScene3:'Condolence'
  },
  zh:{
    brandName:'EW VERDORA 动态素材包',langToggle:'EN',themeDark:'深色',themeLight:'浅色',motionReduce:'减弱动态',motionNormal:'正常动态',
    demoDataTag:'示范数据',photoNotice:'作品照将由 Owner 核准后显示',
    homeEyebrow:'今日核心行动 · 优先推荐',homeTitle:'今天赚钱 3 件事',
    homeSubtitle:'完成全部 3 项推进进度环至 100%，触发花瓣庆祝动效',
    homeCountDone:'已完成 {done} / {total} 项',homeStart:'开始',homeDone:'已完成',homeMinutes:'约 {min} 分钟',
    homeTypeLead:'找客户',homeTypeFollowup:'跟进',homeTypePost:'发贴文',
    homeTipToggle:'做之前看一眼：1 分钟小知识',homeTipHintOpen:'收起',homeTipHintClosed:'展开',
    homeReset:'重置',homeAllDoneBanner:'今日 3 件事已全部完成，继续保持节奏！',
    cardsReplay:'重播绽放',galleryPrev:'上一张',galleryNext:'下一张',galleryZoom:'全屏',galleryClose:'关闭',gallerySlotNote:'品牌渐层 · 作品槽位',
    orbLabel:'VERDORA AI 光球',orbIdle:'呼吸待机',orbThinking:'高速思考',orbReplying:'回复涟漪',
    ringLabelProgress:'今日',ringLabelVerify:'进度',odoTitle:'本月互动指数',statusTitle:'订单状态实时徽章',statusReplay:'下一状态',
    stBadgeOpening:'开张花篮 · 报价审核中',stBadgeBouquet:'精致花束 · 已确认',stBadgeWedding:'婚礼桌花 · 待付款',
    vtTitle:'共享元素转场',vtBack:'← 返回',vtExpand:'展开 →',vtDetailNote:'View Transitions 与 FLIP 降级转场（无照片占位）。',
    aiHubTitle:'AI 互动原型（示范数据）',aiHubIdle:'就绪：触发操作查看光球思考 + 骨架闪光 + 渐显',aiHubThinking:'AI 处理中…',aiHubDone:'AI 已生成',
    aiOcrTitle:'1. 截图读需求',aiOcrSub:'光束扫描 → 打字填入 → 缺漏闪烁 → 草稿转三语',
    aiOcrComplete:'完整询盘',aiOcrMissing:'缺漏询盘',aiOcrDropHint:'拖入卡片扫描',aiOcrDragChip:'拖我：Petra Jaya 缺漏询盘',
    aiOcrMissingTag:'缺漏待确认',aiOcrDraftLabel:'AI 草稿（不含报价）',aiOcrCopy:'复制',aiOcrCopied:'已复制',aiOcrTriBtn:'EN / 中文 / BM',
    aiVoiceTitle:'2. 语音开单',aiVoiceSub:'按住声波跳动 → 转写 → 卡片飞入列表',
    aiVoiceSim:'模拟语音',aiVoiceHold:'按住说话',aiVoiceListening:'收音中…',aiVoicePrompt:'按住上方口述古晋客户需求。',
    aiHbTitle:'3. 问手册（中性条款）',aiHbSub:'提问高亮条款卡片、连线与可点击来源',
    aiHbAsk:'提问',aiHbInputLabel:'手册问题',aiHbSourcePrefix:'来源：',
    aiFollowTitle:'4. 今日跟进发牌',aiFollowSub:'左滑略过、右滑模拟发 WhatsApp 推进进度环',
    aiFollowReset:'重发牌',aiFollowSkip:'← 略过',aiFollowSend:'WhatsApp →',aiFollowPending:'待处理 {left} / {total}',
    aiFollowDone:'今日 3 笔跟进已全部完成',aiFollowSentMsg:'已模拟发给「{client}」',aiFollowSkipMsg:'已略过「{client}」（剩 {left}）',
    aiHeatTitle:'5. 成交热度',aiHeatSub:'高热（≥80）柔光脉动，点开看跟进理由',aiHeatWhy:'为什么跟进：',aiHeatNext:'建议：',
    aiRpTitle:'6. 模拟客人对练',aiRpSub:'情绪随回复变化，揭晓滚轮得分与 3 条建议',
    aiRpReset:'重来',aiRpMoodPrefix:'情绪：',aiRpScoreTitle:'对练得分',aiRpScoreSub:'滚轮 + 3 条建议',aiRpPts:' 分',
    aiTriTitle:'7. 一键三语翻牌',aiTriSub:'EN / 中文 / BM 3D 翻牌（古晋示范 · 无报价）',
    aiTriCycle:'翻牌',aiTriCopy:'复制',aiTriScene1:'开业',aiTriScene2:'婚礼',aiTriScene3:'帛事'
  }
};
function normLang(l){return l==='en'?'en':'zh';}
function t(l,k,v){var c=normLang(l),s=(D[c]&&D[c][k]!=null)?D[c][k]:(D.zh[k]||D.en[k]||k);return v?String(s).replace(/\{(\w+)\}/g,function(_,x){return v[x]!=null?String(v[x]):'';}):s;}
function pick(o,f,l){if(!o||typeof o!=='object')return'';var c=normLang(l),a=o[f+'_'+c],b=o[f+'_'+(c==='en'?'zh':'en')];if(a!=null&&String(a).trim()!=='')return String(a);if(b!=null&&String(b).trim()!=='')return String(b);return o[f]!=null?String(o[f]):'';}
function isReducedMotion(){return typeof document!=='undefined'&&(document.documentElement.getAttribute('data-motion')==='reduced'||!!(R.matchMedia&&R.matchMedia('(prefers-reduced-motion: reduce)').matches));}
function swapLangFade(el,fn){if(!el||typeof fn!=='function')return;if(isReducedMotion()){fn();return;}el.classList.add('vd-lang-fade','is-lang-fading');setTimeout(function(){fn();requestAnimationFrame(function(){el.classList.remove('is-lang-fading');});},105);}
var V=R.VerdoraMotion=R.VerdoraMotion||{};V.i18n=D;V.normLang=normLang;V.t=t;V.pick=pick;V.isReducedMotion=isReducedMotion;V.swapLangFade=swapLangFade;
})(typeof window!=='undefined'?window:globalThis);
