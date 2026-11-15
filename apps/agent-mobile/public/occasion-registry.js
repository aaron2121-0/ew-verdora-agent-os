// Native port of verdora-content d33f8b6; registry labels and timing preserved.
const SCENE_GROUPS = [
  { id: "graduation", labelKey: "libGroupGraduation" },
  { id: "kindergarten", labelKey: "libGroupKindergarten" },
  { id: "opening", labelKey: "libGroupOpening" },
  { id: "condolence", labelKey: "libGroupCondolence" },
  { id: "wedding", labelKey: "libGroupWedding" },
  { id: "mothers_day", labelKey: "libGroupMothersDay" },
  { id: "valentines", labelKey: "libGroupValentines" },
  { id: "festival", labelKey: "libGroupFestival" },
  { id: "corporate", labelKey: "libGroupCorporate" },
  { id: "daily", labelKey: "libGroupDaily" }
];
function expandGroup(group, items) {
  return items.map((row, idx) => ({
    id: row[0],
    group,
    indexInGroup: idx,
    name_zh: row[1],
    name_en: row[2],
    occasion_zh: row[3],
    occasion_en: row[4],
    trigger: `${group}_${row[0]}`,
    trigger_zh: row[5],
    trigger_en: row[6],
    logoRole_zh: row[7],
    logoRole_en: row[8],
    duration: row[9],
    restrained: group === "condolence",
    audience: "both",
    enabled_in_v1: true
  }));
}
const GRADUATION = [
  ["grad-01", "抛学士帽与毕业花束", "Graduation Cap Toss & Bouquet", "中华一三四中联合高中毕业典礼", "CHMS 1/3/4 Senior Graduation", "打开 App 触发提前30天提醒", "Opening app inside 30d promo window", "徽章旋转稳居花束中央", "Logo seal spins onto bouquet wrap", 2500],
  ["grad-02", "毕业卷轴展开向日葵", "Diploma Scroll & Sunflower", "古晋中华三中初中毕业典礼", "CHMS No. 3 Junior Graduation", "点开中学毕业日历卡片", "Opening junior high graduation card", "Logo 作为卷轴红带火漆印", "Logo acts as wax seal on diploma", 2300],
  ["grad-03", "校门递出向日葵束", "School Gate Bouquet Handoff", "石角民立中学毕业典礼", "SMJK Min Lit Graduation", "提交毕业日期核实确认前预览", "Previewing Min Lit graduation date", "花纸外包装印有旋转品牌标", "Logo badge on kraft wrap", 2400],
  ["grad-04", "礼堂舞台聚光荣冠", "Convocation Stage Spotlight", "Swinburne Sarawak 毕业典礼", "Swinburne Sarawak Convocation", "进入前45天大学毕业主推窗", "Entering 45d uni convocation window", "舞台地贴投影出 Logo 轮廓", "Logo illuminated on stage floor", 2600],
  ["grad-05", "学府徽章向日葵环", "Campus Crest Sunflower Wreath", "UNIMAS 砂大毕业典礼", "UNIMAS Convocation", "点击日历 UNIMAS 档期格子", "Tapping UNIMAS date cell", "花环正心嵌入完整四层 Logo", "Logo centered in sunflower wreath", 2500],
  ["grad-06", "同窗拍立得毕业合影", "Classmate Polaroid Snapshot", "毕业团单好友互赠", "Classmate Group Order", "批量生成毕业推广文案后反馈", "After generating grad promo copy", "拍立得右下角盖上品牌章", "Logo stamped on polaroid corner", 2200],
  ["grad-07", "校园拱门花摊就位", "Campus Arch Floral Booth", "毕业当天校外设摊接单", "Graduation Day Booth Setup", "毕业当天早晨 07:00 闹钟提醒", "Graduation day morning reminder", "花摊顶棚招牌亮起品牌标", "Logo glows on floral booth sign", 2400],
  ["grad-08", "学位袍流苏拂过花朵", "Gown Tassel & Golden Blooms", "荣誉毕业生定制束", "Honours Graduate Bouquet", "倒数 7 天冲刺提醒弹出", "7-day sprint notification", "Logo 伴随流苏摆动微光绽放", "Logo core pulses beside tassel", 2100],
  ["grad-09", "礼盒抽屉拉出毕业熊", "Keep-Sake Bear Drawer Reveal", "熊仔毕业花束热推", "Grad Bear Bouquet Push", "切换热推产品「熊仔花束」时", "Inspecting grad bear product", "礼盒提手正中悬吊品牌挂牌", "Logo hangtag on gift drawer", 2500],
  ["grad-10", "毕业钟声与余晖花架", "Graduation Bell & Sunset Stand", "毕业典礼圆满收官复盘", "Post-Ceremony Retrospective", "毕业日次日复盘入口提示", "Next-day follow-up cue", "钟摆下方铭刻四层对称 Logo", "Logo engraved under school bell", 2400]
];
const KINDERGARTEN = [
  ["kinder-01", "彩色气球升空伴花盒", "Rising Balloons & Mini Box", "古晋幼儿园毕业季", "Kuching Kindergarten Season", "幼儿园毕业季待确认列表点开", "Opening kindergarten pending tray", "主气球印有亮绿品牌花徽", "Logo printed on center balloon", 2400],
  ["kinder-02", "小熊探头迷你花束", "Peekaboo Bear Mini Bouquet", "Tabuan Jaya 幼儿园毕业礼", "Tabuan Jaya Kindy Grad", "选择小熊向日葵儿童花束", "Selecting mini bear bouquet", "小熊胸前佩戴品牌领结章", "Logo worn as bear bowtie badge", 2500],
  ["kinder-03", "蜡笔彩虹糖果花筒", "Crayon & Candy Floral Cone", "Petra Jaya 幼教中心毕业", "Petra Jaya Kindy Ceremony", "幼儿园家长群推广预热", "Kindy parent group warmup", "纸筒腰封居中旋转展开 Logo", "Logo wraps around candy cone", 2200],
  ["kinder-04", "小太阳戴上毕业皇冠", "Crowned Mini Sunflower", "幼童人生第一次毕业礼", "First Little Graduation", "待确认日期提交核实后提示", "Submitting kindy date verify", "皇冠中央嵌着白星花徽", "Logo gem on mini crown", 2300],
  ["kinder-05", "纸飞机绕着花篮飞过", "Paper Plane & Ribbon Basket", "Satok 幼儿园联合汇演", "Satok Kindy Concert", "进入11月毕业季前30天", "30 days before kindy concert", "纸飞机尾迹汇聚成品牌花环", "Plane trail forms logo petal arc", 2400],
  ["kinder-06", "木质积木拼出小花台", "Toy Blocks Floral Pedestal", "亲子毕业拍照布景花", "Parent-Child Photo Florals", "预览儿童摄影配花建议", "Viewing kids photo flower tips", "顶块正面印有深蓝花形 Logo", "Logo embossed on top wooden block", 2100],
  ["kinder-07", "星星贴纸与迷你花束", "Gold Stars & Petite Posy", "幼儿园表现奖励小花", "Little Achiever Posy", "选择低客单高复购团单", "Choosing group mini posy", "星章中心替换成白色十二星芯", "Logo core shines inside badge", 2e3],
  ["kinder-08", "微笑向日葵左右摇摆", "Cheerful Swaying Sunflowers", "幼童毕业入场手持小花", "Entrance Hand-Held Florals", "浏览幼儿园客户话术草稿", "Drafting kindy parent message", "盆栽正面贴有清晰品牌标签", "Logo label on cheerful pot", 2300],
  ["kinder-09", "迷你学士帽压上棉花糖花束", "Tiny Cap & Marshmallow Posy", "学前班大班结业礼", "Pre-School Graduation", "幼儿园倒数 3 天冲刺提醒", "3-day kindy sprint reminder", "帽顶帽徽化作翠绿花瓣 Logo", "Logo sits atop tiny cap button", 2200],
  ["kinder-10", "卡通手提袋装满小雏菊", "Daisy Tote Bag Delivery", "校园集体自取分装袋", "Campus Bulk Tote Pickup", "幼儿园批量订单出货提示", "Kindy bulk handoff prompt", "手提袋正面满版印着品牌标", "Logo printed on daisy tote", 2400]
];
const OPENING = [
  ["open-01", "吉时红绸剪彩落地", "Grand Ribbon Cutting", "新店开张花篮档期", "Shop Grand Opening", "商务客户开张日当天 08:00 提醒", "Opening morning 08:00 alert", "红绸蝴蝶结正心扣着品牌徽", "Logo clasp holds cutting ribbon", 2600],
  ["open-02", "双层富贵开张花篮稳落", "Two-Tier Opening Stand Arrives", "元旦 / 商业机构开张", "Commercial Opening Stand", "选择「开张花篮」产品类别", "Selecting opening stand category", "花牌顶端高悬品牌金色框标", "Logo header on congratulatory card", 2500],
  ["open-03", "店门玻璃推开迎客绿植", "Storefront Glass Door Welcome", "门店乔迁桌面迎宾花", "Office Relocation Reception", "创建商务开张日历事件", "Creating business opening event", "玻璃推门磨砂徽标随门滑入", "Frosted Logo glides on glass door", 2400],
  ["open-04", "店铺霓虹灯箱逐字点亮", "Shopfront Signboard Glow", "新店夜场开业祝贺花礼", "Evening Launch Florals", "推广晚间开张派对花束", "Evening store launch promo", "灯箱左侧圆形标完整亮灯", "Circular Logo lights on signboard", 2200],
  ["open-05", "竖立开张贺词花牌条幅", "Standing Floral Banner Stand", "企业新分店启用礼", "Branch Launch Floral Stand", "生成开张花篮贺词草稿后", "After generating opening greeting", "条幅顶部印刻完整四层 Logo", "Logo crowns the opening banner", 2300],
  ["open-06", "舞狮绣球与翠绿发财树", "Festive Lion Ribbon & Money Tree", "古晋商铺开张旺季", "Kuching Shop Opening Peak", "进入年初商铺开张高峰月", "Entering opening peak month", "绣球中心由品牌 Logo 化形展开", "Logo blooms at center of silk ball", 2500],
  ["open-07", "铜锣清响开启吉日红门", "Opening Gong & Lucky Door", "商业伙伴新办公室揭幕", "Partner Office Unveiling", "提前 14 天企业客户邀约", "14d before corporate launch", "铜锣中央浮雕呈现品牌星芯", "Logo embossed at gong center", 2400],
  ["open-08", "红地毯铺展迎宾花柱", "Red Carpet & Floral Pillars", "旗舰展厅盛大开幕", "Flagship Showroom Launch", "高客单活动花艺提案", "High-ticket event proposal", "红毯尽头舞台背景墙亮出 Logo", "Logo backdrop at carpet end", 2600],
  ["open-09", "桌上旺财竹与大吉盆栽", "Desk Lucky Bamboo & Citrus Pot", "办公室新工位乔迁小礼", "Desk Warming Plant Gift", "B2B 办公室小礼推单", "B2B desk-warming campaign", "陶瓷花盆正中印着品牌标", "Logo glazed onto ceramic pot", 2100],
  ["open-10", "开业钥匙交接配香槟花盒", "Key Handoff & Floral Box", "交房 / 签约 / 新店交匙礼", "Key Handover & Floral Box", "地产/新店交匙客户跟进", "Property/shop handover follow-up", "钥匙扣圆牌正是品牌徽章", "Keyring tag shaped as Logo mark", 2300]
];
const CONDOLENCE = [
  ["cond-01", "素白菊花静放于青瓷瓶", "Quiet White Chrysanthemum Vase", "清明节 / 追思花礼", "Qingming / Condolence", "点开清明节或追思花礼日期", "Opening Qingming / tribute date", "品牌标低对比静置底座右角", "Quiet Logo mark at vase base", 2200],
  ["cond-02", "素雅烛光微明伴白花", "Soft Candlelight & White Blooms", "丧礼致意慰问花篮", "Sympathy Stand Tribute", "查看庄重克制慰问话术", "Viewing respectful sympathy copy", "烛光光晕柔和映出静态 Logo", "Logo appears gently beside flame", 2400],
  ["cond-03", "纯白百合低垂合十致敬", "Bowed White Lilies Tribute", "追悼会堂前静雅桌花", "Memorial Hall Arrangement", "预览追思白百合参考款", "Previewing white lily tribute", "Logo 以素雅单色边框轻现", "Muted framed Logo corner seal", 2300],
  ["cond-04", "素白丝带在微风中轻落", "Calm White Ribbon Drape", "花圈 / 挽联庄重交付", "Wreath Ribbon Care", "核对追思挽联署名落款", "Checking tribute ribbon names", "素带打结后徽章静静淡入", "Logo fades softly at ribbon fold", 2100],
  ["cond-05", "晨露白瓣静栖深蓝夜幕", "Morning Dew on Quiet Petals", "清明清晨扫墓鲜花束", "Qingming Morning Bouquet", "清明提前 14 天提醒卡片", "14d before Qingming notice", "深蓝背景与 Logo 沉稳相融", "Logo rests calmly on navy field", 2200],
  ["cond-06", "素雅圆环追思花圈轮廓", "Circular White Tribute Wreath", "企业致送丧家慰问花圈", "Corporate Sympathy Wreath", "企业客户订购庄重花圈", "Corporate condolence order", "花圈下方系带静置品牌微标", "Small Logo tag beneath wreath", 2500],
  ["cond-07", "素纸千纸鹤静置花叶旁", "Still Origami Crane & Leaf", "亲友遥寄哀思花礼", "Distant Family Sympathy", "跨州家属代订慰问花盒", "Outstation sympathy flower order", "纸鹤旁信笺印有暗纹品牌章", "Subtle watermark Logo on card", 2200],
  ["cond-08", "追思慰问卡缓缓合上封口", "Memorial Card Closing Calmly", "随花附送诚挚慰问短笺", "Sympathy Note Enclosure", "编辑 PDPA 合规慰问卡草稿", "Editing sympathy card note", "卡封正心呈现安静白色星印", "Quiet white Logo on envelope", 2e3],
  ["cond-09", "卫塞节与追思素雅白莲", "Serene White Lotus on Water", "卫塞节 / 佛堂供花", "Wesak / Temple Offering", "点开卫塞节或佛堂供花卡片", "Opening Wesak offering card", "莲池水波纹中心浮现品牌标", "Logo framed within calm ripple", 2400],
  ["cond-10", "夜灯柔和微光守候白枝", "Warm Night Lamp & White Stem", "深夜守灵花礼紧急调度", "Evening Vigil Floral Dispatch", "加急追思单静默核对流程", "Respectful urgent order check", "灯罩边缘轻印安静徽记", "Logo resting softly on lamp shade", 2300]
];
const WEDDING = [
  ["wed-01", "新娘手捧花双双递出", "Bridal Bouquet Presentation", "古晋婚礼婚庆花艺档期", "Kuching Wedding Florals", "查看婚礼婚庆客户手册与档期", "Inspecting wedding calendar item", "捧花丝带结正心闪耀品牌徽", "Logo clasp on bridal ribbon", 2500],
  ["wed-02", "金色双戒在白花间交叠", "Interlocking Rings & White Blooms", "婚期正式确认锁花提醒", "Wedding Date Confirmed Lock", "Owner 确认婚期后祝贺反馈", "Post-approval wedding cue", "双戒背后缓缓升起四层 Logo", "Logo rises behind gold rings", 2400],
  ["wed-03", "户外草坪婚礼花门搭起", "Garden Wedding Floral Arch", "草坪 / 酒店宴会厅花艺", "Garden & Ballroom Arch", "进入婚前 30 天主推提醒", "30d before confirmed wedding", "花门顶拱中轴挂载花环 Logo", "Logo crown on arch apex", 2700],
  ["wed-04", "轻盈白纱拂过碎花走廊", "Bridal Veil & Petal Aisle", "教堂与婚礼走廊路引花", "Aisle Runner Florals", "预览婚礼配色改编方案", "Previewing aisle palette", "地贴尾部点亮品牌徽记", "Logo at aisle entrance", 2300],
  ["wed-05", "新娘转身抛捧花弧线", "Bouquet Toss Graceful Arc", "姐妹团手腕花伴娘束", "Bridesmaid Bouquet Bundle", "推荐伴娘团配套手花", "Recommending bridesmaid add-ons", "捧花落地瞬间花瓣聚成 Logo", "Tossed petals resolve into Logo", 2400],
  ["wed-06", "长桌烛台与莫兰迪桌花", "Banquet Table & Candle Florals", "酒店主桌与宾客桌花", "Hotel Banquet Centerpiece", "对比往年婚宴花材数量", "Reviewing banquet lead time", "餐单卡抬头清晰印有品牌标", "Logo printed on menu header", 2500],
  ["wed-07", "新郎西装胸花精准别上", "Groom Boutonniere Pin", "新郎主婚人伴郎胸花", "Boutonniere & Corsage Set", "核对婚庆配件胸花清单", "Checking corsage checklist", "翻领别针下方衬托品牌小徽", "Logo crest beneath lapel pin", 2100],
  ["wed-08", "婚礼请柬火漆启封绽花", "Wedding Invite Wax Unseal", "婚前 60 天风格意向收集", "60d Early Palette Inquiry", "首次接入准新人咨询记录", "Logging new wedding inquiry", "火漆圆印按品牌星芯雕刻", "Logo sculpted as wax seal", 2200],
  ["wed-09", "香槟塔映照桌面小花", "Champagne Tower & Table Blooms", "晚宴敬酒区主题装饰", "Toast Stage Florals", "确认婚宴场地入场时段", "Confirming venue load-in", "塔顶玻璃杯折射出星芒 Logo", "Logo core glint atop tower", 2500],
  ["wed-10", "周年纪念花盒优雅开启", "Anniversary Keepsake Box Open", "结婚一周年老客回访", "1st Anniversary Follow-Up", "触发周年老客提前 21 天回访", "21d anniversary follow-up", "盒盖内衬烫印金色边品牌标", "Logo foil-stamped inside lid", 2400]
];
const MOTHERS_DAY = [
  ["mom-01", "粉嫩康乃馨逐层盛开", "Layered Carnation Bloom", "母亲节主推康乃馨档期", "Mother's Day Peak", "打开 App 母亲节 30 天提醒", "Opening Mother's Day 30d alert", "花托包纸中心显露翠绿 Logo", "Logo revealed at bouquet collar", 2500],
  ["mom-02", "手写感恩卡从花盒抽出", "Thank-You Card Slide Out", "随花附送烫金感恩卡", "Mother's Day Gift Card", "点击母亲节 AI 文案生成", "Generating Mother's Day copy", "卡片左上方压印四层品牌徽", "Logo embossed top-left of card", 2300],
  ["mom-03", "粉杏优雅抱抱桶提篮", "Warm Hug Bucket Arrangement", "孝亲与岳母长辈送礼", "Elders & Mother-in-Law Gift", "筛选「优雅抱抱桶」推荐款", "Selecting hug bucket style", "抱抱桶丝带正面贴着品牌圆标", "Logo badge centered on bucket", 2400],
  ["mom-04", "清晨茶盏配柔和芍药", "Morning Teacup & Soft Peony", "家庭温馨早茶送花场景", "Morning Tea Gift Moment", "早 08:30 母亲节预热推文", "Morning teaser post timing", "茶垫下压着干净品牌纸垫", "Logo coaster under teacup", 2200],
  ["mom-05", "两代牵手剪影伴康乃馨", "Joined Hands & Carnation Arc", "海外游子远程订花送古晋妈妈", "Outstation Child Order", "针对异地游子客户群跟进", "Outstation buyer campaign", "背景月轮浮现柔和绿蓝花标", "Soft Logo halo behind hands", 2600],
  ["mom-06", "丝绒礼盒系上暖粉蝴蝶结", "Velvet Box Ribbon Knot", "母亲节永生花礼盒", "Preserved Rose Mother Gift", "倒数 14 天母亲节主推期", "14d Mother's Day promo push", "蝴蝶结中央扣紧品牌挂饰", "Logo charm at ribbon center", 2300],
  ["mom-07", "阳光窗台玻璃花瓶静绽", "Sunlit Windowsill Flower Vase", "客厅窗边常鲜桌花", "Living Room Table Bouquet", "展示母亲节家居耐放建议", "Sharing flower care tips", "玻璃瓶颈吊着防水小吊牌", "Logo neck tag on glass vase", 2400],
  ["mom-08", "妈妈围裙兜里探出小花束", "Pocket Bouquet Surprise", "小预算精致心意单枝花", "Petite Gratitude Stem", "母亲节前 3 天现货快单", "3d last-minute stock push", "口袋边角露出一枚品牌别针", "Logo pin clipped to pocket", 2100],
  ["mom-09", "晚霞窗格映出温馨康乃馨", "Golden Hour Window Carnations", "周日家庭聚餐桌花交付", "Sunday Family Dinner Delivery", "母亲节当天傍晚交付冲刺", "Mother's Day dinner rush", "窗台名牌卡片居中展示 Logo", "Logo centered on table place card", 2500],
  ["mom-10", "永生花玻璃罩微光点亮", "Glass Dome Preserved Bloom", "母亲节高端永生纪念礼", "Luxury Glass Dome Edition", "高客单客户升级推荐", "High-value gift upsell", "木质底座正面镶嵌金属 Logo", "Logo inlay on wooden dome base", 2600]
];
const VALENTINES = [
  ["val-01", "丝绒红玫瑰层层绽放", "Crimson Rose Unfurling", "2月14日情人节高峰", "Valentine's Day Peak", "打开 App 情人节 30 天提醒", "Opening Valentine's 30d alert", "花束黑金丝带中心缀品牌标", "Logo clasp on velvet ribbon", 2500],
  ["val-02", "99朵玫瑰礼盒缓缓掀盖", "99-Rose Gift Box Reveal", "99朵/11朵定制告白花盒", "99-Rose Proposal Box", "推荐高阶告白礼盒档期", "Recommending proposal rose box", "盒盖内侧弹出品牌星芒徽", "Logo pops inside opened lid", 2600],
  ["val-03", "火漆情书信封滑出干花", "Love Letter Unseal & Dried Rose", "随花附浪漫保密代写情书", "Romantic Note Enclosure", "生成情人节 WhatsApp 话术", "Generating Valentine's copy", "信封封口正是品牌绿蓝花章", "Logo acts as envelope wax seal", 2200],
  ["val-04", "七夕鹊桥星夜蓝玫瑰", "Qixi Starlight Blue Rose", "农历七夕中国情人节", "Qixi Festival", "点击 8月8日 七夕日历格", "Tapping Aug 8 Qixi date", "星桥中央悬挂旋转品牌花徽", "Logo medallion hangs over stars", 2500],
  ["val-05", "韩式碎冰蓝玫瑰流光包扎", "Korean Blue Rose Wrapping", "七夕年轻情侣轻奢风", "Young Couple Pastel Bouquet", "推广「韩式碎冰蓝玫瑰」款", "Promoting iced-blue rose style", "韩式雪梨纸正心点亮品牌标", "Logo badge on layered paper", 2400],
  ["val-06", "双瓣交织环绕成浪漫花环", "Dual Petals Orbiting Wreath", "情侣互相暗中订花互送", "Mutual Surprise Delivery", "情人节前 7 天双倍提醒", "7d Valentine double reminder", "双瓣汇聚后显露完整四层标", "Orbiting petals form the Logo", 2300],
  ["val-07", "夕阳餐厅双人桌边小花瓶", "Candlelight Dinner Bud Vase", "情人节餐厅约会桌面布置", "Date Night Table Florals", "配合古晋餐厅约会配送", "Restaurant delivery coordination", "菜单旁桌牌嵌着清晰品牌标", "Logo seated on table card", 2200],
  ["val-08", "玫瑰丝带绕环收紧束腰", "Satin Ribbon Bouquet Tie", "情人节早鸟锁单确认时刻", "Early-Bird Order Confirmation", "情人节前 21 天早鸟催单", "21d early-bird nudge", "丝带交汇成翠绿品牌结", "Logo knot ties bouquet waist", 2100],
  ["val-09", "香氛礼盒伴满天星亮起", "Fragrance Box & Baby's Breath", "浪漫满天星与香氛套盒", "Baby's Breath & Scent Box", "引导单枝玫瑰搭香氛礼盒", "Cross-selling scent gift set", "礼盒缎带中央嵌入品牌圆章", "Logo medallion on scent box", 2400],
  ["val-10", "情人夜花店橱窗灯光渐亮", "Evening Florist Window Glow", "2月14日深夜紧急加单", "Feb 14 Evening Dispatch", "情人节当天下午末班车提醒", "Valentine afternoon cutoff alert", "橱窗正中灯箱亮起品牌 Logo", "Logo glows on florist window", 2500]
];
const FESTIVAL = [
  ["fest-01", "大红灯笼摇曳年花迎春", "Red Lanterns & CNY Florals", "农历新年年花与兰花", "Chinese New Year", "点击 2月6日-7日 农历新年", "Opening CNY date in calendar", "灯笼流苏正心印有品牌圆徽", "Logo emblem centered on lantern", 2600],
  ["fest-02", "诺贝松圣诞花环挂门迎喜", "Christmas Pine Wreath & Berries", "圣诞节松柏桌花与花环", "Christmas Day 2026 & 2027", "打开 12月25日 圣诞推广提醒", "Opening Dec 25 Christmas alert", "松枝花环下方垂挂品牌挂牌", "Logo charm beneath pine wreath", 2500],
  ["fest-03", "开斋新月伴金绿兰花礼篮", "Raya Crescent & Gold Orchids", "开斋节友族企业礼篮", "Hari Raya Aidilfitri", "开斋节推算日历与询价提醒", "Raya pattern verification alert", "新月与兰花间嵌入品牌星芯", "Logo core shines beside crescent", 2500],
  ["fest-04", "Gawai 丰收节热带天堂鸟", "Gawai Tropical Bird-of-Paradise", "6月1日达雅丰收节 Gawai", "Hari Gawai Dayak", "进入 6月 Gawai 推广窗口", "Entering Gawai promo window", "竹编花篮正面挂上品牌徽牌", "Logo plaque on woven Gawai basket", 2600],
  ["fest-05", "中秋圆月映衬桂花茶席", "Mid-Autumn Moon & Tea Floral", "中秋月饼鲜花组合礼盒", "Mid-Autumn Festival", "点击 9月15日 中秋节日期", "Opening Mid-Autumn date", "圆月轮廓渐变显露品牌花形", "Moon reveals subtle Logo crest", 2400],
  ["fest-06", "元宵提灯走过古晋老街", "Chap Goh Mei Lantern Walk", "元宵（华人情人节）", "Chap Goh Mei", "点击 2月20日 元宵节日历", "Opening Chap Goh Mei date", "花灯纸面映着翠绿花瓣 Logo", "Logo silhouetted on lantern paper", 2400],
  ["fest-07", "元旦钟鸣烟火配祝贺花篮", "New Year Sparkles & Congrat Basket", "1月1日 元旦开年花礼", "New Year Day", "进入 1月1日 元旦推广期", "Entering New Year promo window", "花篮彩带顶端呈现品牌徽标", "Logo badge tops New Year basket", 2300],
  ["fest-08", "砂拉越丰收稻穗配太阳花", "Golden Rice Stalks & Sunflowers", "州内丰收庆典企划", "Harvest Celebration Basket", "推荐金黄橙色系礼篮", "Selecting harvest gold basket", "稻穗交叉点扣着品牌圆标", "Logo clasp joins golden stalks", 2300],
  ["fest-09", "圣诞红果铃铛桌上松树", "Tabletop Pine & Holiday Bells", "办公室圣诞交换礼小松树", "Office Desk Christmas Pine", "圣诞节倒数 7 天批量提醒", "7d Christmas office rush", "微型松树盆器印有品牌标", "Logo printed on mini pine planter", 2200],
  ["fest-10", "新春年桔挂满吉庆红包", "CNY Mandarin Tree & Angpow", "企业开市拜年盆栽", "CNY Business Reunion Tree", "大年初四开工拜年跟进", "CNY business reopening push", "盆景红盆中央贴有品牌金徽", "Logo seal on crimson citrus pot", 2500]
];
const CORPORATE = [
  ["corp-01", "绅士蓝绣球礼盒送给爸爸", "Gentleman Hydrangea Gift Box", "父亲节 / 男性主管致意", "Father's Day / Executive Gift", "打开 6月20日 父亲节日历", "Opening Father's Day cell", "深蓝礼盒盖正心嵌品牌星徽", "Logo crest inlaid on navy box", 2400],
  ["corp-02", "商务高层大会VIP胸花队列", "Executive Summit VIP Corsages", "企业论坛与颁奖典礼", "Corporate Forum & Awards", "活动庆典提前 30 天锁单", "30d corporate event lead", "首枚 VIP 胸花名牌印品牌标", "Logo card sits on VIP corsage", 2300],
  ["corp-03", "诊所前台护士节康乃馨感谢礼", "Clinic Desk Nurses Day Bouquet", "5月12日 国际护士节", "International Nurses Day", "进入 5月12日 护士节推广期", "Entering Nurses Day window", "感谢卡正上方印出清新品牌标", "Logo tops the clinic thank-you card", 2300],
  ["corp-04", "教师节黑板与讲台向日葵", "Classroom Chalkboard & Sunflower", "5月16日 马来西亚教师节", "Malaysia Teachers' Day", "打开 5月16日 教师节日历", "Opening Teachers' Day cell", "讲台花瓶正面环绕品牌徽带", "Logo band wraps desk vase", 2400],
  ["corp-05", "砂拉越日红黄黑讲台致辞花", "Sarawak Day Podium Florals", "7月22日 砂拉越日庆典", "Sarawak Day Celebration", "进入 7月22日 砂拉越日窗口", "Entering Sarawak Day window", "讲台前方立牌呈现清晰品牌标", "Logo plaque anchors podium stand", 2600],
  ["corp-06", "妇女节职场女性致敬玫瑰束", "Women's Day Team Appreciation", "3月8日 国际妇女节", "International Women's Day", "点击 3月8日 妇女节推广提醒", "Clicking Women's Day alert", "单枝包装纸角印着翠绿 Logo", "Logo stamped on single-stem wrap", 2200],
  ["corp-07", "商务签约长桌对向桌花", "Signing Ceremony Table Floral", "企业战略合作签约花艺", "MOU Signing Florals", "提报 B2B 机构合作花艺案", "Submitting B2B event proposal", "桌面文件夹封底呈现品牌徽章", "Logo stamped on signing folder", 2400],
  ["corp-08", "商场品牌快闪几何花墙", "Pop-Up Store Floral Backdrop", "周末商场品牌快闪打卡墙", "Mall Pop-Up Floral Wall", "预览活动庆典打卡区方案", "Viewing pop-up booth showcase", "花墙中央圆盘即是品牌 Logo", "Logo center medallion on backdrop", 2600],
  ["corp-09", "星级酒店大堂迎宾高瓶花", "Hotel Lobby Architectural Vase", "企业季/月度大堂常驻花艺", "Monthly Lobby Subscription", "B2B 每周换花签约提醒", "B2B weekly refresh pitch", "大堂礼宾台金属牌刻品牌标", "Logo plate on lobby plinth", 2500],
  ["corp-10", "年度员工表彰颁奖台手捧花", "Annual Awards Winner Bouquet", "企业年会表彰与荣誉颁奖", "Annual Gala Award Bouquet", "年底企业年会花束规划", "Year-end gala inquiry prompt", "奖座花束缎带正中点亮 Logo", "Logo gleams on gala bouquet sash", 2400]
];
const DAILY = [
  ["daily-01", "古晋清晨花房修枝醒水", "Kuching Dawn Stem Conditioning", "每日鲜花出货前品控", "Daily Morning Prep", "每日早间工作流开始提示", "Daily morning workflow kickoff", "工作围裙胸前绣有四层 Logo", "Logo badge on florist apron", 2200],
  ["daily-02", "稳妥外送花车穿过古晋街道", "Floral Delivery Scooting Out", "Petra Jaya / Batu Kawa 配送", "Kuching Local Delivery", "订单调度确认配送区间", "Confirming delivery route", "保温配送箱侧面印大号 Logo", "Logo clearly printed on delivery box", 2400],
  ["daily-03", "花艺剪刀轻修枝叶成形", "Shears Trimming Fresh Stems", "定制花束手工制作瞬间", "Handcrafted Bouquet Prep", "接单后进入制作状态提示", "Order crafting confirmation", "剪刀旁木质工作台烫印 Logo", "Logo branded on workbench corner", 2100],
  ["daily-04", "双面缎带系成立体蝴蝶结", "Satin Bow Knot Tying", "日常礼盒出货封口收尾", "Gift Box Finishing Touch", "打包完成待质检拍照阶段", "Ready for dispatch photo", "蝴蝶结中央自然收拢品牌圆标", "Logo medallion centers satin bow", 2e3],
  ["daily-05", "手感牛皮纸分层折叠包裹", "Kraft Paper Bouquet Folding", "日常送礼高性价比花束", "Everyday Gift Bouquet", "浏览常规百搭款话术", "Browsing everyday gift script", "牛皮纸前折页露出一枚品牌贴纸", "Logo sticker seals kraft fold", 2300],
  ["daily-06", "钢笔手写祝贺卡片落款", "Fountain Pen Greeting Card", "客户随花附赠手写贺卡", "Handwritten Card Included", "复制 AI 文案并微调贺卡内容", "Customizing AI draft card note", "贺卡底部居中印有品牌小徽", "Logo crest printed at card footer", 2200],
  ["daily-07", "鲜花保鲜冷柜拉开取花材", "Floral Chiller Bloom Pick", "高温天气保证花材新鲜", "Tropical Cold-Chain Care", "强调古晋炎热天气冷链保鲜", "Explaining freshness guarantee", "冷柜玻璃门右角贴着品牌标", "Logo decal on chiller glass door", 2100],
  ["daily-08", "客户上门自取微笑交接", "Store Pickup Bouquet Handoff", "Tabuan Jaya 自取交接时刻", "Self-Pickup Handoff", "核对客户自取时段清单", "Confirming self-pickup slot", "交接提袋正面居中呈现 Logo", "Logo featured on pickup carry bag", 2300],
  ["daily-09", "雨天透明防潮花袋保护出货", "Rainy Day Protective Sleeve", "古晋雨季贴心防淋包装", "Monsoon Proof Packaging", "雨季配送提醒客户贴心防护", "Monsoon care reminder to buyer", "防潮袋顶端提手挂着品牌标", "Logo hangtag on rain sleeve", 2200],
  ["daily-10", "花店打烊清理桌面点亮夜灯", "Closing Tidy & Warm Lamp", "每日订单清零汇总复盘", "Daily Wrap-Up Summary", "今日紧急任务全部完成后", "All today tasks completed", "收工台灯下方静置品牌铭牌", "Logo plaque rests under warm lamp", 2400]
];
const MOTION_PRESET_LIST = [
  ...expandGroup("graduation", GRADUATION),
  ...expandGroup("kindergarten", KINDERGARTEN),
  ...expandGroup("opening", OPENING),
  ...expandGroup("condolence", CONDOLENCE),
  ...expandGroup("wedding", WEDDING),
  ...expandGroup("mothers_day", MOTHERS_DAY),
  ...expandGroup("valentines", VALENTINES),
  ...expandGroup("festival", FESTIVAL),
  ...expandGroup("corporate", CORPORATE),
  ...expandGroup("daily", DAILY)
];
const MOTION_REGISTRY = Object.fromEntries(
  MOTION_PRESET_LIST.map((item) => [item.id, item])
);
export {
  MOTION_PRESET_LIST,
  MOTION_REGISTRY,
  SCENE_GROUPS
};

/** Match real occasion names/categories; imported records need no demo UUIDs. */
export function matchSceneForOccasion(occasion = {}) {
  const hay = `${occasion.name_zh || ""} ${occasion.name_en || ""}`.toLowerCase();
  const namedScenes = [
    [/wesak|vesak|卫塞|衛塞/, "cond-09"],
    [/qingming|清明|condolence|funeral|bereave|memorial|丧|喪|悼|追思/, "cond-01"],
    [/chap goh mei|元宵/, "fest-06"],
    [/qixi|七夕/, "val-04"],
    [/christmas|圣诞|聖誕/, "fest-02"],
    [/chinese new year|lunar new year|农历新年|農曆新年|春节|春節/, "fest-01"],
    [/new year|元旦/, "fest-07"],
    [/hari raya|aidilfitri|开斋|開齋/, "fest-03"],
    [/gawai|达雅|達雅|丰收|豐收/, "fest-04"],
    [/mid.autumn|中秋/, "fest-05"],
    [/women.?s day|妇女节|婦女節/, "corp-06"],
    [/nurses?.? day|护士节|護士節/, "corp-03"],
    [/teachers?.? day|教师节|教師節/, "corp-04"],
    [/father.?s day|父亲节|父親節/, "corp-01"],
    [/sarawak day|砂拉越日/, "corp-05"],
    [/kindergarten|preschool|幼儿园|幼兒園/, "kinder-01"],
    [/mother|母亲|母親/, "mom-01"],
    [/valentine|情人/, "val-01"],
    [/swinburne/, "grad-04"],
    [/unimas|砂大/, "grad-05"],
    [/min lit|民立/, "grad-03"],
    [/junior graduation|初中毕业|初中畢業/, "grad-02"],
    [/opening|grand open|开张|開張|开业|開業/, "open-01"],
    [/wedding|marriage|婚礼|婚禮/, "wed-01"],
  ];
  for (const [pattern, id] of namedScenes) {
    if (pattern.test(hay)) return MOTION_REGISTRY[id];
  }
  const categoryScenes = {
    graduation: "grad-01", wedding: "wed-01", business: "open-02",
    cultural: "fest-01", event: "corp-08", daily: "daily-01",
  };
  return MOTION_REGISTRY[categoryScenes[occasion.category] || "fest-07"];
}
