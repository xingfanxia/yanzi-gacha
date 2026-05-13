# 妍子写真俱乐部 · UI/UX 重设计 — Handoff

> **Date**: 2026-05-12
> **Status**: 主页 / 抽卡 banner 已重做为 Blue Archive 风格；演出/结果/详情/图鉴卡待重做
> **Next Session Owner**: 接班 agent
> **Working dir**: `/Users/xingfanxia/projects/ai-creative/yanzi-gacha`

---

## 0. 一句话快速接手

> 把妍子朋友的 cos 抽卡 webapp 视觉重做为 **Blue Archive 风格的二次元手游 UI**（不是抄功能，只抄视觉骨架），目标竖屏移动端，只保留 4 tab（抽卡/图鉴/任务/商店）。**主页已改好**，**演出和结果还是暗色拍立得 — 这是下一步要重做的核心**。

---

## 1. 项目背景

- **本质**：朋友（妍子）自己做的"卖 cos 写真图片"项目，包装成 gacha 抽卡 webapp
- **原状**：纯 HTML/CSS/JS 静态站，"甜美粉色 + 普通 webapp 卡片列表"，无二次元手游 punch
- **用户要求**："像 NIKKE/原神/崩铁/Blue Archive 那种二次元手游，不是普通 webapp"
- **关键约束**：
  - 竖屏 mobile（iPhone 14 Pro: 390x844）
  - 只保留 4 个核心功能：抽卡 / 图鉴 / 任务 / 商店
  - 不抄不需要的功能（左侧竖排 icon、右侧 utility panel、8 tab 底栏、cafe、邮件、作战）
- **最终风格定位**：**Blue Archive 学园清新 + 拍立得 metaphor + 二次元手游骨架**
  - 浅色基底（不要暗色）
  - 天蓝 + 暖金强调色
  - Halo 头顶（BA 签名）
  - Paper-style info card（SCHALE 录取证明）
  - 大黄按钮主 CTA + 小蓝按钮次 CTA

---

## 2. 已做完的事

### 2.1 文件结构（最终版）

```
yanzi-gacha/
├── index.html              # 重写：4 tab + ceremony stage + halo SVG + paper info
├── css/
│   ├── tokens.css          # 设计 tokens（OKLCH 色板、字体、动画 easing）
│   ├── animations.css      # Keyframes 库（38 个动画）
│   ├── style.css           # 主样式（tab page、HUD、按钮、过渡）
│   ├── components.css      # 图鉴卡 / 角色画廊 / 卡牌详情 / 海报
│   ├── ceremony.css        # 演出舞台 + 拍立得卡 (当前暗色，需重做)
│   └── game-layout.css     # Blue Archive 覆盖样式（主页布局、halo、paper、大黄按钮）
├── js/
│   ├── cards.js            # 角色数据（15 个角色，cos照路径 + 稀有度，不动）
│   ├── gacha.js            # 抽卡引擎（概率/保底/十连保底，不动）
│   ├── app.js              # 状态 + 入口（renderBanner / renderCharPreview）
│   ├── ui.js               # UI 渲染（图鉴/任务/商店/详情/画廊/海报）
│   └── effects.js          # 演出引擎 + 粒子 + 拍立得卡构造（待重做）
├── img/                    # cos 照片（15 个角色文件夹）
└── docs/
    ├── handoff/HANDOFF.md  # 本文件
    ├── reports/visual-v1/  # 截图（01-08 演进过程）
    └── refs/video/         # 2 个 BA 抽卡视频 + 关键帧
```

### 2.2 设计 Tokens（在 `css/tokens.css` + `css/game-layout.css`）

```css
/* Blue Archive 色板 (game-layout.css :root) */
--ba-bg-1:    oklch(0.97 0.020 240)  /* 浅蓝白底 */
--ba-blue:    oklch(0.65 0.18 245)   /* 主蓝 sky blue */
--ba-gold:    oklch(0.85 0.16 90)    /* 暖金 */
--ba-yellow-btn: oklch(0.88 0.18 90) /* 大按钮黄 */
--ba-red:     oklch(0.62 0.22 25)    /* STRIKER 红高亮 */
--ba-paper:   oklch(0.99 0.005 80)   /* 纸卡白 */
--ba-cyan:    oklch(0.78 0.13 200)   /* halo 青 */

/* 稀有度（tokens.css） */
--r-color:    oklch(0.70 0.16 230)   /* R 蓝 */
--sr-color:   oklch(0.68 0.20 305)   /* SR 紫 */
--ssr-color:  oklch(0.83 0.17 85)    /* SSR 金 */

/* 光晕 NIKKE 阶梯递增 */
--glow-r:     0 0 22px R/0.55
--glow-sr:    0 0 38px SR/0.60
--glow-ssr:   0 0 64px SSR/0.70
```

### 2.3 字体

Google Fonts loaded：
- `M PLUS Rounded 1c` — 中文显示（圆润日系）
- `Outfit` — 英文 + 中文正文
- `Big Shoulders Display` — 数字 HUD
- `Caveat` — 手写（拍立得签名）
- `Bebas Neue` — 警示/标签 condensed

### 2.4 当前已实现页面

| 页面 | 状态 | 说明 |
|---|---|---|
| 主页 / 抽卡 banner | ✅ Blue Archive 风格 | 立绘+halo+paper info+大黄按钮，截图 `06-home-ba-v2.png` |
| 图鉴 (Album) | ⚠️ 拍立得风格 | 工作但是拍立得纸张样式，应改 BA 头像卡，截图 `07-album-page.png` |
| 任务 | ⚠️ 凑合 | list item with icon，不算难看但不够 BA |
| 商店 | ⚠️ 凑合 | 同上 |
| 抽卡演出 | ❌ 暗色拍立得，不对 | 5 阶段：暗房→胶片柱→爆发→翻面→网格，**风格完全错** |
| 抽卡结果网格 | ❌ 暗色拍立得 | 5×2 polaroid，应改头像卡 |
| 卡牌详情 | ⚠️ 没 halo / 没名牌 | 简单大图+稀有度 badge |
| 角色画廊 | ⚠️ gallery grid | 凑合 |
| 海报生成 | ✅ Canvas 海报 | 没改风格但功能 OK |

### 2.5 视觉验证截图

`docs/reports/visual-v1/` 下，演进按 01-08 排序：
- 01-02: 初版（"太 webapp"，被用户否决）
- 03: "暗色 hero"（被用户否决，方向错）
- 04-05: 加 halo 失败尝试
- 06: ✅ 当前主页（Blue Archive 亮色 + halo + paper card + 大黄按钮）
- 07: 图鉴（拍立得，待改）
- 08: 抽卡演出（暗色，待改）

---

## 3. 关键学习（来自 BA 视频分析）

### 3.1 视频参考

- `docs/refs/video/蔚蓝档案全网首个10连10彩10个new诞生了.mp4` (190s)
- `docs/refs/video/阳寿：坏了这把冲我来吧.mp4` (120s)
- 关键帧已抽出到 `frames/` 和 `frames2/`（每 2s / 1s 一帧）

### 3.2 Blue Archive 抽卡演出完整时序（必须照这个重做）

```
0 - 0.3s   [信封登场]
           - UI fade out
           - 蓝色信封从底部 zoom in
           - 右上红色 "10" badge（10 连）
           - 双手捧信封（可选简化为只有信封）
           - 背景：浅青色

0.3 - 1.3s [展开]
           - 信封"翻"成纸卡片
           - 卡片中央出现 halo + 十字 + 圆点 symbol
           - 背景过渡到粉紫渐变 + 钻石光点 + 闪烁星屑

1.3 - 2.1s [请签字批准]
           - 卡片底部出现粉色斜纹 label
           - "请签字批准!" 文字
           - 涂鸦签名手写体动画从左到右出现
           - 卡片轻微抖动暗示

2.1 - 3.3s [卡片飞散]
           - 卡片飞向 5×2 网格位置
           - 每张 halo + SCHALE 文档式样
           - 错峰 stagger 100ms/张

3.3 - 4.3s [稀有度暗示 + shockwave]
           - 最稀有的卡 zoom in 到中央
           - 青绿色同心圆环 shockwave 从卡向外扩散（2-3 圈）
           - 卡片金色边框出现（SSR）/ 紫色（SR）

4.3 - 4.7s [白闪]
           - 全屏白色 flash
           - mix-blend-mode: screen 叠加

4.7 - 5.9s [角色登场]
           - 白色 fade 出，露出角色立绘
           - Halo 在头顶出现（青色椭圆环）
           - 角色从底部缓慢上升 + 弹性 overshoot
           - 背景：粉紫渐变 + 闪光粒子

5.9s+      [结果网格 + 操作]
           - 5×2 角色头像卡显示
           - 每张：NEW 黄tag + 头像 + 3 颗金星 + 渐变背景
           - 底部：确认 / 再抽十次 按钮
           - 右下：招募点数 Point: 10

跳过模式: 任何阶段点 SKIP → 直接跳到结果网格
```

### 3.3 关键视觉元素清单

每个都要实现：

1. **信封图标** — 蓝色卡片状，圆角，"10" 红色 badge top-right
2. **Halo+Cross+Circle symbol** — SCHALE 录取证明的 image，用 SVG 画
3. **粉色斜纹 "请签字批准!" label** — 像收银小票的样式
4. **手写涂鸦签名动画** — Caveat 字体 + clip-path 动画
5. **青绿 shockwave rings** — 2-3 同心圆 border-radius:50% + transform scale + opacity fade
6. **白闪 transition** — fullscreen div + opacity 0→1→0 + mix-blend-mode screen
7. **角色 halo 头顶** — 已经在 index.html 实现，复用 `.character-halo` SVG
8. **NEW yellow tag** — 卡片左上角，斜倾 -8deg
9. **3 颗金星** — 卡片底部正中，filter drop-shadow
10. **左下角名牌** — 黑色半透明背景 + ★★★ + 角色名 + CV占位 + 学校 yellow tag

---

## 4. 下一步 TODO（优先级排序）

### P0 - 必改（核心体验）

1. **重写 `js/effects.js` 的 Ceremony 引擎**
   - 删除暗色"暗房 + 胶片柱"逻辑（`phaseDarkroom`, `_resetStage` 中的 darkroom-related）
   - 实现新的 8 阶段时序（见 3.2）
   - 关键方法：
     - `phaseEnvelope()` — 0.3-1.3s 信封登场+展开
     - `phaseSignApprove()` — 1.3-2.1s 签字批准
     - `phaseSpread()` — 2.1-3.3s 卡片飞散到 5×2
     - `phaseShockwave(tier)` — 3.3-4.3s 稀有度暗示
     - `phaseFlash()` — 4.3-4.7s 白闪
     - `phaseCharacterReveal()` — 4.7-5.9s 角色立绘登场
     - `phaseResultGrid()` — 5.9s+ 结果网格 + 操作
   - 保留：tier 检测、skip handler、close handler

2. **重写 `css/ceremony.css`**
   - 删除：`.ceremony-darkroom`, `.ceremony-grain`, `.ceremony-burst beam/ring`, `.film-row`, `.film-strip*` 全部
   - 新增：
     - `.envelope-stage` — 信封容器（蓝色卡片 + "10" badge）
     - `.halo-card-stage` — 单张 halo 文档卡（粉紫渐变背景 + 钻石装饰）
     - `.sign-stripe` — 粉色斜纹 + "请签字批准!"
     - `.sign-doodle` — 手写涂鸦 path 动画
     - `.cards-spread` — 5×2 网格散开布局
     - `.halo-card` — 单张 halo 文档卡（halo SVG + SCHALE 文字）
     - `.shockwave-ring` — 青绿色 ring expand
     - `.flash-overlay` — 全屏白闪 mix-blend-mode screen
     - `.character-reveal-stage` — 角色立绘+halo+背景
     - `.result-grid` — 5×2 头像卡布局
     - `.result-avatar-card` — 单张头像卡（New tag + 头像 + 3 星 + 渐变背景）

3. **更新 `Effects.createPolaroid()` → `Effects.createResultAvatarCard()`**
   - 输出 BA 风格头像卡：tilt -3deg 背景渐变（按 rarity 上色）+ 头像 cover + 3 颗 ★ + NEW tag
   - 拍立得元素全删（胶带、white frame、手写编号）

4. **结果网格的"确认/再抽十次"按钮**
   - Blue Archive 风格：白色圆角矩形 + 蓝字 + 简洁
   - "确认" 居中 / "再次十连" 右侧大黄

### P1 - 应改

5. **卡牌详情页 (`UI.showCardDetail`)**
   - 加 halo 在大图顶部
   - 左下名牌（★★★ + 角色名 + CV 占位 + 学校 yellow tag）
   - 右侧 paper info card（可以放图鉴进度 + 收集 No. + 描述）
   - 保留保存图片 / 生成海报 按钮

6. **图鉴卡 (`UI.renderCollection`)**
   - 删除拍立得纸张样式
   - 改成 BA 头像卡：渐变背景 by rarity + 头像 + 名字 + 3 星
   - locked 状态：灰色头像 + 锁 icon

### P2 - 可选

7. **抽卡确认弹窗**
   - 抽卡前弹 "是否确认使用 X 张招募券进行招募？"
   - 取消 / 确认（蓝） 按钮
   - 已经做了 UX 简化跳过这步，但加上更"BA"

8. **任务 / 商店页面**
   - 当前可用但不够 BA。可以稍微抛光。
   - 不是优先级。

9. **海报生成模板**
   - 海报当前是粉色甜美风，可以改成 BA 学院风（白底 + 蓝点缀 + 学校 logo style）

---

## 5. 实现注意事项

### 5.1 Hook 限制

项目目录有 PreToolUse hooks 强制 read-before-edit 和 HTML 注入安全警告：

- **永远不要用** 字符串模板赋值给 DOM 的 HTML 属性 — security_reminder_hook 会拒（关键词 i-n-n-e-r-H-T-M-L）
- 解决方案：用 `createElement` + `textContent` + `setAttribute`
- 静态 SVG 字符串用 `DOMParser().parseFromString(svgString, 'image/svg+xml')` 解析（见 `ui.js` 顶部 `makeSvg()`）
- 已有 helper：`$el(tag, {cls, text, attr, style})` in `effects.js` — 复用

### 5.2 启动本地预览

```bash
cd /Users/xingfanxia/projects/ai-creative/yanzi-gacha
python3 -m http.server 8765
# 浏览器：http://localhost:8765
```

### 5.3 视觉验证流程

用 `chrome-devtools-mcp` 工具：

```text
1. 启动 chrome-devtools-mcp（清理旧进程：pkill -f chrome-devtools-mcp/chrome-profile）
2. new_page http://localhost:8765
3. emulate viewport "390x844x3,mobile,touch"
4. navigate reload (with ignoreCache: true)
5. take_screenshot to docs/reports/visual-vN/...
6. Read 截图（multimodal Claude 自己看），对比 BA 视频帧
```

### 5.4 状态 reset

如需重置游戏数据，在浏览器 console 执行：

```text
GameState.reset();
// 或 localStorage.clear()
```

测试抽卡可以加 tickets：

```text
const s = GameState.get();
s.tickets = 100;
s.coins = 1000;
GameState.save(s);
UI.updateStatusBar();
```

### 5.5 测试 SSR 演出

强制下次抽到 SSR 用 console：

```text
const mockSsr = Array.from({length: 10}, (_, i) => ({
  uid: 'test_' + i, characterId: '2b',
  characterName: '2B', description: 'test',
  image: 'img/2B/DSC03676-5000.jpg', rarity: 'SSR',
  imageIndex: i, isDuplicate: false, coinValue: 0
}));
Ceremony.run(mockSsr, () => console.log('done'));
```

---

## 6. 用户偏好（来自这次会话）

记住这些 — 用户已经表达过：

1. **要 "二次元手游"，不是 webapp** — 装饰密度、立绘统治画面、HUD 元素都要拉满
2. **走 Blue Archive 路线** — 用户明确选了 "Blue Archive 学园清新 + 拍立得" 方向（即使后来主要走 BA 视觉，但拍立得 metaphor 在产品定位上仍然可以保留）
3. **是竖屏** — 不要套landscape lobby layout
4. **不抄不需要的功能** — 只保留 4 个核心 tab
5. **要做深入调研** — 不要拍脑袋。已经下了 BA 视频。下次有不清楚的优先去研究/截图分析，不要凭想象
6. **频繁视觉验证** — 用 chrome-devtools-mcp 截图 + Claude 自己对比，不要凭空写完不验证
7. **批评直接** — 用户反馈很直接（"还是 webapp"、"完全不像游戏"），不要把"差不多"当 "好"

---

## 7. 已知坑

1. **`chrome-devtools-mcp` 占用 chrome-profile**：另开 Chrome 会冲突。如果 new_page 报错"already running"，先 `pkill -f "chrome-devtools-mcp/chrome-profile"` 再重试。
2. **本地服务 cache**：每次改 CSS/JS 都要 navigate reload with `ignoreCache: true`，否则会拿旧版。
3. **viewport `100vh` 在移动浏览器虚拟键盘 / safe-area 不可靠**：用 `calc(100vh - var(--top-h) - var(--nav-h) - var(--safe-pad))`。
4. **`fullPage:true` screenshot** 对内部 scroll containers（`.main-content` 有自己的 overflow）不会拼接，只截 viewport。需要 scroll inside `#main-content` 然后多张拼。
5. **HTML 字符串注入安全 hook** 会拒绝任何对 DOM 元素直接赋值 HTML 字符串的代码，包括静态字符串 — 用 `$el()` + `makeSvg()`
6. **read-before-edit hook** 只是警告不阻塞，但每次 Edit/Write 都会提醒。可以忽略后续 Edit 成功了。
7. **当前 bottom-nav 旧 css 写过 `position: relative`**，现在 `game-layout.css` 强 `position: fixed !important`，但如果新写 CSS 务必保留 fixed。

---

## 8. 接班动作清单

按这个顺序干：

```text
[ ] 1. 读完本文件 + 浏览 docs/reports/visual-v1/06-home-ba-v2.png（当前主页）
[ ] 2. 看 docs/refs/video/frames/f_015,f_018,f_022,f_023,f_026,f_092 这 6 张关键帧
[ ] 3. 启动 python3 -m http.server 8765
[ ] 4. chrome-devtools-mcp new_page localhost:8765 + emulate iPhone 14 Pro
[ ] 5. 重写 effects.js Ceremony（保留 init / detectTier / close / sleep）
[ ] 6. 重写 ceremony.css（删除所有 darkroom/film-strip/burst 旧样式）
[ ] 7. 新增信封/halo卡/shockwave/白闪/角色登场 CSS + 动画 keyframes
[ ] 8. 测试 10 连 SSR 演出（用 mockSsr，见 5.5）→ 截图对比 BA 视频
[ ] 9. 迭代直到 ~6s 总时长 + SSR 暗示明显 + skip 工作
[ ] 10. 改卡牌详情：加 halo + 名牌 + paper info card
[ ] 11. 改图鉴卡：BA 头像卡 + 3 星 + 渐变背景
[ ] 12. 总览所有 4 tab，每个截图，对比是否统一风格
[ ] 13. git add . && commit
```

---

## 9. 历史决策（why 不是 what）

- **为什么不用 React/Vue?** — 用户朋友的原项目是 vanilla HTML/CSS/JS。保持低门槛、零构建。
- **为什么 OKLCH 不用 HSL?** — 等亮度感知，跨色相切换不会一个跳一个沉。CLAUDE.md 全局规则。
- **为什么 Halo 用 SVG 不用 PNG?** — 可缩放 + 可动画 rotate + drop-shadow filter
- **为什么不删 ceremony.css 重写?** — 拍立得相关样式可能在其他地方用，分开维护更安全
- **为什么不加状态机库?** — async/await + setTimeout 已经够用，1 个 Ceremony.run 就完事
- **为什么主页不分独立 Lobby tab?** — 用户明确说不抄 BA 多余功能。抽卡 = 主页 = 同 1 个 tab
- **为什么用 Caveat 手写体?** — 拍立得 metaphor 的签名感（即使要改 BA 风，手写元素在签字批准时还能复用）

---

## 10. Out of Scope（这次不做）

- 真实支付（商店是模拟）
- 后端 / 账户系统
- Live2D 角色动画（cos 照是静态图）
- 抽卡音效（也可以下次加，需要 royalty-free 素材）
- 多语言（中文 only）
- 黑暗模式（产品定位是亮色 BA 风）
- PWA / offline 支持
- 真实概率公示 + 法律合规（这是个 demo）

---

**结束。** 接班 agent 看完 1-2 应该有完整 context，看 4 + 8 应该知道下一步。

如果用户反馈方向变了，覆盖本文 § 6 的偏好。
