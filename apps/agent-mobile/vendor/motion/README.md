# EW VERDORA Motion Dist (`/motion-dist/`)

纯 HTML + 原生 JavaScript（ES2020）独立交付包，**不依赖 React、TypeScript 或任何打包工具（Vite/Webpack）**，所有元件统一挂载在 `window.VerdoraMotion` 命名空间下。

> **重要声明：本素材包永远不含照片。**
> 所有业务卡片与作品展位均采用品牌色渐层 + 动态 SVG 图标占位，并提示「作品照将由 Owner 核准后显示 / Portfolio photos will appear once approved by Owner」。全套示例不含任何货币报价金额，地点统一采用古晋地区（Petra Jaya、Batu Kawa、Tabuan Jaya、Satok、Samarahan）。

---

## 0. 全局双语与主题底座

引入 `tokens.css` 与 `i18n.js` 后，即可通过 `{ lang: "zh" | "en" }` 挂载任意元件，并调用实例方法 `instance.setLang("en")` / `instance.setLang("zh")` 在**不重载页面、保留当前动画与交互状态**的前提下平滑淡入淡出切换语言。

```html
<link rel="stylesheet" href="/motion-dist/tokens.css" />
<script src="/motion-dist/i18n.js"></script>
```

- **静态固定文案**：统一存放在 `VerdoraMotion.i18n = { en: {...}, zh: {...} }`（可按需覆写词条）。
- **动态内容容错**：传给元件的数据栏位优先使用 `{ title_en, title_zh, body_en, body_zh }`；缺漏任一语言时自动回退显示另一语言，绝不留白。

---

## 1. 首页焦点元件：`home-today`（今天赚钱 3 件事）

- **档案**：`home-today.css` + `home-today.js`（可搭配 `feedback.js` 进度环与 `celebrate.js` 花瓣庆祝）
- **挂载函式**：`VerdoraMotion.mountHomeToday(el, data, { lang: "zh" })`
- **返回控制**：`{ setLang(lang), toggleAction(id), reset(), getState() }`
- **Reduced Motion**：停用背景光晕与图标持续摇摆，3 张卡片与小知识展开改为 180ms 简单淡入。

```json
{
  "actions": [
    {
      "id": "act-lead",
      "type": "lead",
      "minutes": 10,
      "title_zh": "问 3 位朋友最近有没有开张",
      "title_en": "Ask 3 friends about upcoming shop openings"
    },
    {
      "id": "act-followup",
      "type": "followup",
      "minutes": 8,
      "title_zh": "跟进 2 位上周询问的客人",
      "title_en": "Follow up with 2 leads from last week"
    },
    {
      "id": "act-post",
      "type": "post",
      "minutes": 6,
      "title_zh": "发一则母亲节花束贴文",
      "title_en": "Post a Mother’s Day bouquet update"
    }
  ],
  "tip": {
    "title_zh": "做之前看一眼：1 分钟小知识",
    "title_en": "1-Min Quick Tip Before You Start",
    "body_zh": "先问清楚收花区域（Petra Jaya / Batu Kawa / Tabuan Jaya）和送礼对象。",
    "body_en": "Confirm the Kuching delivery zone and recipient context first."
  }
}
```

---

## 2. 全量元件清单一览

| 元件 | JS / CSS 档名 | 挂载函式 (`window.VerdoraMotion.*`) | Data 范例 | `prefers-reduced-motion` 行为 |
| --- | --- | --- | --- | --- |
| 多语字典 | `i18n.js` / `tokens.css` | `VerdoraMotion.i18n`, `VerdoraMotion.t`, `VerdoraMotion.pick` | `{ en: {...}, zh: {...} }` | 缩短淡入时间至 80ms |
| 今天赚钱 3 件事 | `home-today.js` / `.css` | `mountHomeToday(el, data, opts)` | 见上方 JSON | 停止图标微动与光晕，卡片改为淡入 |
| 业务线 3D 卡片 | `cards.js` / `.css` | `mountCards(el, data, opts)` | `[{ id, icon, kicker, title_zh, title_en, subtitle_zh, subtitle_en }]` | 停止渐层漂流与 3D 倾斜，改为淡入 |
| 作品展位滑块 | `gallery.js` / `.css` | `mountGallery(el, data, opts)` | `[{ id, line, icon, title_zh, title_en, subtitle_zh, subtitle_en }]` | 停用 Ken Burns、花瓣转场与 FLIP 位移 |
| 液态 AI 光球 | `ai-orb.js` / `.css` | `mountAiOrb(el, opts)` | `{ size: 96, state: "idle" }` | 停止液态涡流与外圈涟漪 |
| 进度环/计数器/状态 | `feedback.js` / `.css` | `mountProgressRing`, `mountOdometer`, `mountStatusFeed` | `{ value: 12850 }` / `[{ area, key }]` | 立即显示目标数值，停用滚动与弹出 |
| 花瓣庆祝 | `celebrate.js` / `.css` | `celebrate({ type: "fullscreen" })` | `{ type: "course" \| "exam" \| "fullscreen" }` | 直接跳过粒子（返回 `{ skipped: true }`） |
| 共享元素转场 | `transitions.js` / `.css` | `mountTransitions(el, data, opts)` | `[{ id, kicker, title_zh, title_en, iconSvg }]` | 停用弹性位移与扫光，改为 200ms 淡入 |
| 7 合 1 AI 原型 | `ai-demos.js` / `.css` | `mountAiDemos(el, data, opts)` | `{ lang: "zh" }` | 停用扫描光束、闪烁与翻牌 3D，立即渲染 |

### SVG 独立素材
- `icons/`：9 枚纯 SVG `currentColor` 微动效图标（每个 `≤ 4 KB`，循环周期 `≤ 2s`）。
- `onboarding/`：4 张分级进场导览插画（每张 `≤ 15 KB`，支持浅色/深色自动适配）。

---

## 3. 验收与运行

无需构建工具，直接将 `/motion-dist/` 作为静态目录打开 `demo.html` 即可运作（右上角可即时切换 `EN / 中文`、`浅色 / 深色` 与 `减弱动态`）。
