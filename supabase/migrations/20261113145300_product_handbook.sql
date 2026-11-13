-- EW VERDORA Agent OS — Phase A: product handbook and private photo registry.
-- Review-only migration: DO NOT apply before Claude approval.
-- No commercial rules, commission, bonuses, agent levels, or profit guard changes.

create type public.handbook_section as enum
  ('story','product_line','service_rule','delivery','script','announcement');

create type public.portfolio_source as enum
  ('facebook','upload','export_zip');

create type public.portfolio_product_line as enum
  ('condolence','opening','bouquet','wedding_event','wholesale','unknown');

create type public.portfolio_status as enum
  ('pending_review','approved','hidden');

create table public.company_knowledge (
  id uuid primary key default gen_random_uuid(),
  section public.handbook_section not null,
  title_en text not null check (length(btrim(title_en)) > 0),
  title_zh text not null check (length(btrim(title_zh)) > 0),
  body_en text not null,
  body_zh text not null,
  sort integer not null default 0,
  active boolean not null default true,
  visible_to_agent boolean not null default true,
  needs_owner_confirm boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index company_knowledge_agent_section_sort_idx
  on public.company_knowledge(section,sort)
  where active=true and visible_to_agent=true and needs_owner_confirm=false;

create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  source public.portfolio_source not null,
  source_id text not null unique check (length(btrim(source_id)) > 0),
  product_line public.portfolio_product_line not null default 'unknown',
  storage_path text not null unique check (length(btrim(storage_path)) > 0),
  caption_en text not null default '',
  caption_zh text not null default '',
  ai_confidence numeric(5,4) check (ai_confidence between 0 and 1),
  status public.portfolio_status not null default 'pending_review',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  constraint portfolio_photo_approval_consistency check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or (status <> 'approved' and approved_by is null and approved_at is null)
  )
);

create index portfolio_photos_status_line_sort_idx
  on public.portfolio_photos(status,product_line,sort,created_at desc);

-- Both tables can only be reached using a server-side service_role client.
alter table public.company_knowledge enable row level security;
alter table public.portfolio_photos enable row level security;
revoke all on table public.company_knowledge,public.portfolio_photos from public,anon,authenticated;
grant select,insert,update,delete on table public.company_knowledge,public.portfolio_photos to service_role;
-- Deliberately NO anon/authenticated RLS policies; no direct Owner exception.
-- Owner access must be validated by the Edge Function BEFORE using service_role.

-- Supabase Storage is private. Do not add client policies on storage.objects.
insert into storage.buckets (id,name,public)
values ('portfolio','portfolio',false)
on conflict (id) do update set public=false;

-- Seeded only from the Owner-confirmed brief. Stable IDs make replay harmless;
-- ON CONFLICT DO NOTHING preserves later Owner edits.
insert into public.company_knowledge
 (id,section,title_en,title_zh,body_en,body_zh,sort,active,visible_to_agent,needs_owner_confirm)
values
('a0000000-0000-4000-8000-000000000001','story','About EW VERDORA','关于 EW VERDORA',
 'EW VERDORA is a women-owned floral brand based in Kuching. We offer delivery, in-store selection, pickup and on-site floral setup. We source flowers by air freight and handle our own e-Dagang Net, e-Permit, agricultural permits and DOA documentation for clearance at Kuching Airport. Pre-orders and stock checks help us plan flowers responsibly; availability and condition still require confirmation.',
 'EW VERDORA 是位于古晋的女性经营花艺品牌，提供配送、到店选购、自取和现场布置。我们透过空运采购鲜花，并使用自有 e-Dagang Net 账号，自行处理 e-Permit、农业许可证与 DOA 文件及古晋机场清关。预订制及库存盘点有助安排花材，实际供应与花况仍需确认。',10,true,true,false),
('a0000000-0000-4000-8000-000000000002','product_line','Condolence','帛事花圈',
 'For funerals, memorials and mourning venues. We offer formal standing wreaths and condolence flower baskets, with delivery to funeral venues across Kuching. Same-day delivery may be possible when conditions allow. Common questions: Can you deliver today? Which funeral venue? Can you include a message card? Confirm timing, venue and requirements before agreeing.',
 '适用于丧礼、追悼会及治丧处。提供庄重立式花圈与哀悼花篮，并安排古晋各殡仪馆配送；符合条件才可安排当日送达。常见问题：今天能送吗？送到哪个殡仪馆？可附慰问卡吗？先确认地点、时间与要求，不预先保证。',20,true,true,false),
('a0000000-0000-4000-8000-000000000003','product_line','Grand Opening','开张花艺',
 'For openings, housewarmings, ribbon-cuttings and exhibitions. Options include celebratory large flower baskets, possible money-tree or lucky-bamboo combinations, and congratulatory banners. Common questions: Can we add a banner? What size and delivery time are possible? Ask the team to confirm availability, wording and setup.',
 '适用于开幕、乔迁、剪彩及展会。可讨论大型喜庆花篮、发财树或开运竹搭配，以及祝贺布条。常见问题：可加布条吗？尺寸和送达时间如何？须先由团队确认可安排的花材、字句和布置。',30,true,true,false),
('a0000000-0000-4000-8000-000000000004','product_line','Bouquet','精致花束',
 'For birthdays, proposals, anniversaries, graduations, Valentine’s Day and Mother’s Day. Seasonal imported and local materials may include roses, tulips, sunflowers, carnations, hydrangeas and lisianthus. Common questions: Can you match a reference photo? Which flowers are available? What is the current price? All depend on confirmation.',
 '适用于生日、求婚、纪念日、毕业、情人节和母亲节。时令进口及本地花材可包括玫瑰、郁金香、向日葵、康乃馨、绣球和洋桔梗。常见问题：可参考图片制作吗？有哪些现货？多少钱？均须先确认。',40,true,true,false),
('a0000000-0000-4000-8000-000000000005','product_line','Wedding / Event','婚礼与活动',
 'For wedding ceremonies and events. Scope may include bridal bouquets, boutonnieres, wedding car flowers, registration areas, arches, head tables and guest tables, with overall design and on-site setup. Common questions: Can you handle the whole setup? Can we share a mood board? Confirm event date, venue, scope and feasibility with the team.',
 '适用于婚礼与活动，可安排新娘手捧花、襟花、婚车、签到区、拱门、主桌与客桌花，以及整体设计和现场布置。常见问题：能全案布置吗？可按参考图讨论吗？须先确认日期、场地、范围和可行性。',50,true,true,false),
('a0000000-0000-4000-8000-000000000006','product_line','Wholesale','鲜花批发',
 'For local florists, wedding planners and event teams. We offer pre-order-based cut flowers and foliage in bundles or other available packing formats. Common questions: What is the order lead time? Which varieties and quantities can be booked? Ask for current availability and terms; never invent stock or a wholesale price.',
 '服务本地花店、婚礼策划及活动团队，以预订制提供散装鲜切花与叶材。常见问题：需要提前多久预订？哪些品种和数量可订？先向团队确认当下供货与条件，不虚构库存或批发价。',60,true,true,false),
('a0000000-0000-4000-8000-000000000007','delivery','Delivery Coverage','配送范围',
 'Subject to stock and scheduling, delivery may be arranged to Kuching, Matang, Batu Kawa, Tabuan Jaya, Petra Jaya, Satok, Padawan, Siburan and Samarahan. Confirm exact location, date, time and delivery feasibility before accepting.',
 '视库存与排期，可安排配送至 Kuching、Matang、Batu Kawa、Tabuan Jaya、Petra Jaya、Satok、Padawan、Siburan 与 Samarahan。接单前先确认详细地址、日期、时间与配送可行性。',70,true,true,false),
('a0000000-0000-4000-8000-000000000008','delivery','Delivery & Collection Arrangement','配送与自取安排',
 'Delivery, in-store selection, customer pickup and on-site setup are offered. A specific customer pickup address has not been confirmed. Do not provide an address or promise a collection slot until the Owner confirms.',
 '提供配送、到店选购、顾客自取与现场布置。顾客自取的具体地点仍待 Owner 确认；未确认前不得提供地址或保证自取时段。',80,true,true,false),
('a0000000-0000-4000-8000-000000000009','service_rule','WhatsApp Enquiries','WhatsApp 咨询',
 'Communicate directly with the team through WhatsApp. We do not use an online shopping cart or automatic card charges. Confirm the next step with the team; never claim a payment was processed.',
 '通过 WhatsApp 直接与团队沟通；不使用网购购物车或自动扣款。下一步由团队确认，不得声称付款已自动处理。',90,true,true,false),
('a0000000-0000-4000-8000-000000000010','service_rule','Current Pricing','当下价格',
 'Always say “Ask for current price”. Pricing is confirmed by the team for the actual requirements and date. Never quote or infer prices from reference photos or past orders.',
 '所有价格请使用「Ask for current price（请询问当下价格）」；由团队依实际要求和日期确认。不得根据图片或旧订单推测、承诺价格。',100,true,true,false),
('a0000000-0000-4000-8000-000000000011','service_rule','Reference Photos','参考图片原则',
 'Portfolio and customer reference photos are illustrative references, not a guarantee of an identical result. Flowers, colours, sizes and style are subject to feasibility, seasonal availability and team confirmation.',
 '作品和客人提供的照片仅供参考，不保证 1:1 完全复制。花材、颜色、尺寸与风格须视制作可行性、时令供货及团队确认。',110,true,true,false),
('a0000000-0000-4000-8000-000000000012','service_rule','Availability & Customer Feedback','库存与评价真实性',
 'Never invent live inventory, flower quality claims, customer ratings, testimonials or reviews. If information is unavailable, say “Please confirm with the Owner”. Do not speculate about individual public reviews.',
 '绝不虚构实时库存、花况、客户评分、推荐语或评价。没有确定资料就说「请向 Owner 确认」。不得猜测个别公开评价的事实。',120,true,true,false),
('a0000000-0000-4000-8000-000000000013','service_rule','Pre-order & Service Confirmation','预订与服务确认',
 'Pre-orders and inventory checks support supply planning. Actual flowers, service availability, delivery slots and order acceptance all depend on the team’s confirmation. Do not guarantee before confirmation.',
 '以预订制和库存盘点规划供货。实际花材、服务安排、配送档期及是否接单，均需团队确认；确认前不得作保证。',130,true,true,false),
('a0000000-0000-4000-8000-000000000014','script','If asked about a negative Google review','客户问到 Google 负评',
 'Thank you for asking us directly. We take customer feedback seriously and do not dismiss anyone’s experience. I cannot verify or comment on the details of an individual review. If you share what you are concerned about, I can help check our current service arrangements with the team, or refer the concern to the Owner.',
 '谢谢你直接向我们了解。我们认真看待每一位客人的反馈，不会否定任何人的经历。个别评价的细节我无法自行核实或评论。如果你愿意告诉我最担心什么，我可以向团队确认目前的服务安排，或交由 Owner 跟进。',140,true,true,false),
('a0000000-0000-4000-8000-000000000015','script','If asked whether flowers will be fresh','客户问花会不会不新鲜',
 'We source flowers through air freight and handle our import and clearance arrangements directly, with pre-orders and stock checks to support planning. Flower condition can still vary by variety and shipment. Rather than promise what I cannot verify, I will ask the team to confirm the actual flowers and condition before your order.',
 '我们的花材透过空运采购，进口清关由团队自行处理，并以预订和库存盘点协助安排。不过，不同品种及批次的实际花况仍会有差异。我不会在未核实前保证，先请团队确认这次可安排的花材和花况再回复你。',150,true,true,false),
('a0000000-0000-4000-8000-000000000016','script','If asked to replicate a reference photo','客户问能否照图制作',
 'You are welcome to send us the photo as a reference. We can check the flower choices, colours, style, size and date with our florist. We cannot promise an exact copy because materials and availability change. We will confirm a feasible direction and the current price before taking the order.',
 '欢迎把图片发给我们作为参考。我们会请花艺师依花材、颜色、风格、尺寸及日期评估，因材料和供应会变化，无法保证完全一模一样。我们会先确认可行方案和当下价格，再确定订单。',160,true,true,false),
('a0000000-0000-4000-8000-000000000017','announcement','Proposed retail location — unconfirmed','拟定门市地址—待确认',
 'UNCONFIRMED — Third Floor, CityONE Megamall, Jalan Song, Kuching. Not to be shared with customers or Agents until Owner verifies.',
 '待确认：Third Floor, CityONE Megamall, Jalan Song, Kuching。Owner 核实前不得向客人或 Agent 提供。',170,false,false,true),
('a0000000-0000-4000-8000-000000000018','announcement','Proposed office location — unconfirmed','拟定办公室地址—待确认',
 'UNCONFIRMED — No.49, Level 2, Taman Wan Alwi, 93350 Kuching. Customer pickup address remains unconfirmed.',
 '待确认：No.49, Level 2, Taman Wan Alwi, 93350 Kuching。顾客自取地点仍待确认。',180,false,false,true),
('a0000000-0000-4000-8000-000000000019','announcement','Proposed business hours — unconfirmed','拟定营业时间—待确认',
 'UNCONFIRMED — 09:00–17:00. Do not communicate these hours until the Owner verifies.',
 '待确认：09:00–17:00。Owner 核实前不得向外公布此时间。',190,false,false,true),
('a0000000-0000-4000-8000-000000000020','announcement','Condolence 24/7 enquiry — unconfirmed','花圈 24/7 咨询—待确认',
 'UNCONFIRMED — Whether 24/7 condolence enquiries are supported. Do not promise round-the-clock response until Owner confirmation.',
 '待确认：是否提供 24/7 花圈咨询。Owner 核实前不得承诺全天候回复。',200,false,false,true)
on conflict (id) do nothing;
