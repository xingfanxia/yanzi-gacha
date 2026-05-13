/* ============================================================
   抽卡演出引擎 - Blue Archive 8 阶段
   信封 → 展开 → 签字 → 飞散 → Shockwave → 白闪 → 立绘 → 结果
   ============================================================ */

// 安全 DOM 构建工具
function $el(tag, opts = {}) {
  const e = document.createElement(tag);
  if (opts.cls) e.className = opts.cls;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.attr) Object.entries(opts.attr).forEach(([k, v]) => e.setAttribute(k, v));
  if (opts.style) e.style.cssText = opts.style;
  return e;
}

// 静态 SVG 字符串 → 节点 (避免 innerHTML)
function ceremonyMakeSvg(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName === 'parsererror' || root.querySelector('parsererror')) {
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  }
  return root.cloneNode(true);
}

const SVG_HALO_MINI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <ellipse cx="50" cy="32" rx="22" ry="5" fill="none" stroke="oklch(0.62 0.18 200)" stroke-width="2.4"/>
  <line x1="50" y1="28" x2="50" y2="82" stroke="oklch(0.62 0.18 200)" stroke-width="2.2"/>
  <line x1="26" y1="55" x2="74" y2="55" stroke="oklch(0.62 0.18 200)" stroke-width="2.2"/>
  <circle cx="50" cy="55" r="16" fill="none" stroke="oklch(0.62 0.18 200)" stroke-width="2.2"/>
  <circle cx="50" cy="55" r="3" fill="oklch(0.62 0.18 200)"/>
</svg>`;

const Effects = {
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  rand(min, max) { return Math.random() * (max - min) + min; },

  // ============ 装饰背景 bokeh (主页用) ============
  startAmbientBokeh(container, count = 8) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const colors = [
      'oklch(0.85 0.10 220)',
      'oklch(0.88 0.13 280)',
      'oklch(0.86 0.12 200)',
      'oklch(0.90 0.10 320)'
    ];
    for (let i = 0; i < count; i++) {
      const dot = $el('span', {
        cls: 'bokeh-dot',
        style: `
          left: ${this.rand(5, 95)}%;
          top: ${this.rand(5, 95)}%;
          --dx: ${this.rand(-80, 80)}px;
          --dy: ${this.rand(-100, 100)}px;
          background: radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 70%);
          animation-duration: ${this.rand(14, 22)}s;
          animation-delay: ${this.rand(0, 8)}s;
        `
      });
      container.appendChild(dot);
    }
  },

  // ============ 星屑/钻石装饰层 (演出粉紫阶段) ============
  startCeremonySparkles(container, count = 28) {
    while (container.firstChild) container.removeChild(container.firstChild);
    for (let i = 0; i < count; i++) {
      const isDiamond = Math.random() > 0.65;
      const dot = $el('span', {
        cls: isDiamond ? 'sparkle-diamond' : 'sparkle-dot',
        style: `
          left: ${this.rand(2, 98)}%;
          top: ${this.rand(2, 98)}%;
          animation-delay: ${this.rand(0, 2)}s;
          animation-duration: ${this.rand(2, 3.5)}s;
        `
      });
      container.appendChild(dot);
    }
  },

  // ============ BA 头像卡 (结果网格 / 图鉴用) ============
  createResultAvatarCard(card, options = {}) {
    const { showNew = true, animateIn = true } = options;
    const rarLower = String(card.rarity).toLowerCase();

    const el = $el('div', { cls: `avatar-card avatar-card-${rarLower}` });
    if (animateIn) el.classList.add('is-in');

    // NEW tag (新角色 / 非重复)
    if (showNew && !card.isDuplicate) {
      el.appendChild($el('span', { cls: 'avatar-card-new', text: 'NEW' }));
    }
    // 重复角色 → 金币提示
    if (card.isDuplicate) {
      el.appendChild($el('span', {
        cls: 'avatar-card-dup',
        text: `+${card.coinValue}`
      }));
    }

    // 照片
    const photo = $el('div', { cls: 'avatar-card-photo' });
    const img = $el('img', {
      attr: { src: card.image, alt: card.characterName || '', loading: 'lazy' }
    });
    photo.appendChild(img);
    el.appendChild(photo);

    // 3 颗金星 (按 rarity 调整: SSR=3, SR=2, R=1)
    const stars = $el('div', { cls: 'avatar-card-stars' });
    const starCount = card.rarity === 'SSR' ? 3 : (card.rarity === 'SR' ? 2 : 1);
    for (let i = 0; i < starCount; i++) {
      stars.appendChild($el('span', { cls: 'star', text: '★' }));
    }
    el.appendChild(stars);

    // 角色名
    el.appendChild($el('div', {
      cls: 'avatar-card-name',
      text: card.characterName || ''
    }));

    return el;
  },

  // ============ 飞散用的 halo 卡 (Phase 4) ============
  createSpreadHaloCard(rarity = 'R') {
    const card = $el('div', { cls: `spread-card is-${String(rarity).toLowerCase()}` });
    card.appendChild(ceremonyMakeSvg(SVG_HALO_MINI));
    return card;
  },

  // ============ 结果格子: R 自动翻开, SR/SSR halo 背面 → 点击翻面 ============
  createResultSlot(card, idx, onDetail) {
    const rarLower = String(card.rarity).toLowerCase();
    const slot = $el('div', { cls: `result-slot result-slot-${rarLower}` });
    slot.style.animationDelay = `${idx * 70}ms`;

    if (card.rarity === 'R') {
      // 直接翻开
      const avatar = this.createResultAvatarCard(card);
      avatar.style.animationDelay = '';
      avatar.classList.add('is-flipped');
      avatar.addEventListener('click', () => { if (onDetail) onDetail(); });
      slot.appendChild(avatar);
      slot.classList.add('is-flipped');
    } else {
      // SR / SSR: halo 背面卡，点击翻面
      const back = $el('div', { cls: `halo-back-card halo-back-${rarLower}` });
      back.appendChild(ceremonyMakeSvg(SVG_HALO_MINI));
      back.appendChild($el('span', { cls: 'halo-back-tap', text: '点击翻面' }));
      slot.appendChild(back);

      const flipSlot = () => {
        if (slot.classList.contains('is-flipped') || slot.classList.contains('is-zooming')) {
          if (slot.classList.contains('is-flipped') && onDetail) onDetail();
          return;
        }
        // 特写演出: zoom 放大 + halo burst + 翻面
        slot.classList.add('is-zooming');
        // 全屏 dim 蒙层（让特写更突出）
        const stage = document.getElementById('result-stage');
        if (stage) stage.classList.add('has-zoom');
        // 翻面 shockwave 环（仅 SR/SSR）
        const burst = $el('span', { cls: `slot-burst slot-burst-${rarLower}` });
        slot.appendChild(burst);
        // 在 320ms 时换内容
        setTimeout(() => {
          // 删除 back 但保留 burst
          const oldBack = slot.querySelector('.halo-back-card');
          if (oldBack) oldBack.remove();
          const avatar = this.createResultAvatarCard(card, { animateIn: false });
          avatar.classList.add('is-flipped');
          slot.appendChild(avatar);
          slot.classList.add('is-flipped');
          avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            if (slot.classList.contains('is-zooming')) return;
            if (onDetail) onDetail();
          });
        }, 320);
        // 在 1200ms 缩回 (~特写持续 ~900ms)
        setTimeout(() => {
          slot.classList.remove('is-zooming');
          const b = slot.querySelector('.slot-burst');
          if (b) b.remove();
          if (stage) stage.classList.remove('has-zoom');
        }, 1300);
      };
      back.addEventListener('click', flipSlot);
      slot.addEventListener('click', (e) => {
        if (!slot.classList.contains('is-flipped') && !slot.classList.contains('is-zooming') && e.target !== back) flipSlot();
      });
    }
    return slot;
  }
};

// ============================================================
// 抽卡仪式引擎 - BA 8 阶段
// ============================================================

const Ceremony = {
  isRunning: false,
  skipRequested: false,
  callbacks: { onClose: null },
  _lastPullCount: 1,
  _lastTier: 'R',

  els: {},

  init() {
    const ids = [
      'ceremony-stage', 'ceremony-bg', 'ceremony-sparkles',
      'envelope-stage', 'envelope-card', 'envelope-badge',
      'halo-card-stage', 'halo-paper', 'sign-stripe',
      'cards-spread',
      'shockwave-stage',
      'flash-overlay',
      'character-reveal-stage', 'reveal-portrait', 'reveal-portrait-img',
      'reveal-namecard', 'reveal-stars', 'reveal-cn', 'reveal-tag',
      'reveal-rarity-banner',
      'result-stage', 'result-grid', 'result-point-num',
      'result-btn-confirm', 'result-btn-again',
      'ceremony-skip'
    ];
    const camelKey = id => id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    ids.forEach(id => { this.els[camelKey(id)] = document.getElementById(id); });

    if (this.els.ceremonySkip) {
      this.els.ceremonySkip.addEventListener('click', () => {
        this.skipRequested = true;
        // 让 sign-wait 立即结束
        if (this._signResolve) {
          const r = this._signResolve;
          this._signResolve = null;
          r();
        }
      });
    }
    if (this.els.resultBtnConfirm) {
      this.els.resultBtnConfirm.addEventListener('click', () => this.close());
    }
    if (this.els.resultBtnAgain) {
      this.els.resultBtnAgain.addEventListener('click', () => {
        const isTen = this._lastPullCount === 10;
        this.close();
        setTimeout(() => {
          if (typeof app !== 'undefined') {
            isTen ? app.doTenPull() : app.doSinglePull();
          }
        }, 240);
      });
    }
  },

  detectTier(cards) {
    if (cards.some(c => c.rarity === 'SSR')) return 'SSR';
    if (cards.some(c => c.rarity === 'SR')) return 'SR';
    return 'R';
  },

  _pickHeadliner(cards) {
    const ssr = cards.find(c => c.rarity === 'SSR');
    if (ssr) return ssr;
    const sr = cards.find(c => c.rarity === 'SR');
    if (sr) return sr;
    return cards[0];
  },

  _clearChildren(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  },

  _setBgPhase(phase) {
    if (!this.els.ceremonyBg) return;
    this.els.ceremonyBg.classList.remove(
      'is-phase-magic', 'is-phase-reveal', 'is-phase-result'
    );
    if (phase) this.els.ceremonyBg.classList.add(`is-phase-${phase}`);
  },

  _hide(el) {
    if (!el) return;
    el.classList.remove('is-active');
  },

  _show(el) {
    if (!el) return;
    el.classList.add('is-active');
  },

  _resetStage() {
    this._setBgPhase(null);
    if (this.els.ceremonySparkles) {
      this.els.ceremonySparkles.classList.remove('is-active');
      this._clearChildren(this.els.ceremonySparkles);
    }
    this._hide(this.els.envelopeStage);
    if (this.els.envelopeCard) {
      this.els.envelopeCard.classList.remove('is-in', 'is-out');
    }
    this._hide(this.els.haloCardStage);
    if (this.els.haloPaper) this.els.haloPaper.classList.remove('is-in');
    if (this.els.signStripe) {
      this.els.signStripe.classList.remove('is-in');
      const doodle = this.els.signStripe.querySelector('.sign-doodle');
      if (doodle) doodle.classList.remove('is-in');
    }
    this._hide(this.els.cardsSpread);
    this._clearChildren(this.els.cardsSpread);
    if (this.els.shockwaveStage) {
      this.els.shockwaveStage.classList.remove('is-active', 'is-ssr');
    }
    if (this.els.flashOverlay) this.els.flashOverlay.classList.remove('is-active');
    this._hide(this.els.characterRevealStage);
    if (this.els.revealPortrait) this.els.revealPortrait.classList.remove('is-in');
    this._hide(this.els.resultStage);
    this._clearChildren(this.els.resultGrid);
  },

  async run(cards, onClose) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.skipRequested = false;
    this.callbacks.onClose = onClose;
    this._lastPullCount = cards.length;

    const tier = this.detectTier(cards);
    this._lastTier = tier;
    const headliner = this._pickHeadliner(cards);

    this._resetStage();
    this._show(this.els.ceremonyStage);

    // Phase 1: 信封 (0 - 0.7s)
    await this.phaseEnvelope(cards.length);
    if (this.skipRequested) return this.skipTo(cards);

    // Phase 2-3: 展开 + 签字批准 (0.7 - 2.1s)
    await this.phaseHaloCardAndSign();
    if (this.skipRequested) return this.skipTo(cards);

    // Phase 4: 飞散到 5×2 网格 (2.1 - 3.3s)
    await this.phaseSpread(cards);
    if (this.skipRequested) return this.skipTo(cards);

    // Phase 5: Shockwave (SR+) (3.3 - 4.3s)
    if (tier !== 'R') {
      await this.phaseShockwave(tier);
      if (this.skipRequested) return this.skipTo(cards);
    }

    // Phase 6: 白闪 (~0.4s)
    await this.phaseFlash();
    if (this.skipRequested) return this.skipTo(cards);

    // Phase 7: 角色立绘 (~1.6s)
    await this.phaseCharacterReveal(headliner, tier);
    if (this.skipRequested) return this.skipTo(cards);

    // Phase 8: 结果网格
    this.phaseResultGrid(cards);
  },

  async phaseEnvelope(count) {
    this._setBgPhase(null); // 浅青色基底
    this._show(this.els.envelopeStage);
    if (this.els.envelopeBadge) {
      this.els.envelopeBadge.textContent = String(count);
      this.els.envelopeBadge.style.display = count > 1 ? 'flex' : 'none';
    }
    if (this.els.envelopeCard) {
      this.els.envelopeCard.classList.add('is-in');
    }
    await Effects.sleep(700);
  },

  async phaseHaloCardAndSign() {
    // 信封消失
    if (this.els.envelopeCard) {
      this.els.envelopeCard.classList.add('is-out');
    }
    await Effects.sleep(220);
    this._hide(this.els.envelopeStage);

    // 切换到粉紫梦幻背景
    this._setBgPhase('magic');
    if (this.els.ceremonySparkles) {
      Effects.startCeremonySparkles(this.els.ceremonySparkles, 32);
      this.els.ceremonySparkles.classList.add('is-active');
    }

    // Halo 卡登场
    this._show(this.els.haloCardStage);
    if (this.els.haloPaper) this.els.haloPaper.classList.add('is-in');
    await Effects.sleep(600);
    if (this.skipRequested) return;

    // 签字批准条 - 等待用户点击 (或 skip / 5s 兜底)
    if (this.els.signStripe) {
      this.els.signStripe.classList.add('is-in', 'is-waiting');
      await Effects.sleep(220);
      await this._waitForSign();
    }
  },

  // 等待用户点击 sign-stripe (或 skip / 兜底自动签字)
  _waitForSign() {
    return new Promise((resolve) => {
      const stripe = this.els.signStripe;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (stripe) {
          stripe.removeEventListener('click', onClick);
          stripe.classList.remove('is-waiting');
        }
        this._signResolve = null;
        resolve();
      };
      const onClick = () => {
        if (done) return;
        // 画 doodle 签字动画
        const doodle = stripe && stripe.querySelector('.sign-doodle');
        if (doodle) doodle.classList.add('is-in');
        stripe.classList.add('is-signed');
        stripe.removeEventListener('click', onClick);
        // 等 doodle 画完
        setTimeout(finish, 750);
      };
      // 暴露给 skip handler 提前 resolve
      this._signResolve = finish;

      if (stripe) {
        stripe.addEventListener('click', onClick);
      }
      // 8 秒兜底自动签
      setTimeout(() => {
        if (!done && stripe) onClick();
      }, 8000);
    });
  },

  async phaseSpread(cards) {
    // 隐藏 halo 卡 + 签字
    this._hide(this.els.haloCardStage);

    this._show(this.els.cardsSpread);
    const inner = $el('div', { cls: 'cards-spread-inner' });
    this.els.cardsSpread.appendChild(inner);

    const total = Math.min(cards.length, 10);
    for (let i = 0; i < total; i++) {
      const c = cards[i];
      const fromX = Effects.rand(-200, 200);
      const fromY = Effects.rand(-300, 300);
      const rot = Effects.rand(-30, 30);
      const card = Effects.createSpreadHaloCard(c.rarity);
      card.style.setProperty('--from-x', `${fromX}px`);
      card.style.setProperty('--from-y', `${fromY}px`);
      card.style.setProperty('--rot', `${rot}deg`);
      card.style.animationDelay = `${i * 70}ms`;
      card.classList.add('is-in');
      inner.appendChild(card);
    }

    // 单抽时居中
    if (total === 1) inner.style.maxWidth = '120px';

    await Effects.sleep(total * 70 + 600);
  },

  async phaseShockwave(tier) {
    this._show(this.els.shockwaveStage);
    if (tier === 'SSR') this.els.shockwaveStage.classList.add('is-ssr');
    await Effects.sleep(900);
  },

  async phaseFlash() {
    // 同时隐藏飞散和 shockwave
    this._hide(this.els.cardsSpread);
    this._clearChildren(this.els.cardsSpread);
    this._hide(this.els.shockwaveStage);
    this.els.shockwaveStage.classList.remove('is-ssr');

    if (this.els.flashOverlay) {
      this.els.flashOverlay.classList.add('is-active');
    }
    await Effects.sleep(480);
    if (this.els.flashOverlay) {
      this.els.flashOverlay.classList.remove('is-active');
    }
  },

  async phaseCharacterReveal(card, tier) {
    if (this.els.ceremonySparkles) this.els.ceremonySparkles.classList.remove('is-active');
    this._setBgPhase('reveal');

    // 设 tier class 控制背景光晕/halo 颜色
    const stage = this.els.characterRevealStage;
    if (stage) {
      stage.classList.remove('is-r', 'is-sr', 'is-ssr');
      stage.classList.add(`is-${String(tier).toLowerCase()}`);
    }

    // 填角色立绘 + 名字
    if (this.els.revealPortraitImg) {
      this.els.revealPortraitImg.src = card.image;
      this.els.revealPortraitImg.alt = card.characterName || '';
    }
    if (this.els.revealCn) this.els.revealCn.textContent = card.characterName || '';
    if (this.els.revealStars) {
      const cnt = tier === 'SSR' ? 3 : (tier === 'SR' ? 2 : 1);
      this.els.revealStars.textContent = '★ '.repeat(cnt).trim();
    }
    if (this.els.revealTag) {
      this.els.revealTag.textContent = tier === 'SSR' ? '写真俱乐部 · 限定'
        : (tier === 'SR' ? '写真俱乐部' : '写真俱乐部');
    }

    // 稀有度大字横幅
    const banner = this.els.revealRarityBanner;
    if (banner) {
      banner.classList.remove('is-r', 'is-sr', 'is-ssr', 'is-in');
      banner.classList.add(`is-${String(tier).toLowerCase()}`);
      const text = banner.querySelector('.reveal-rarity-text');
      const sub = banner.querySelector('.reveal-rarity-sub');
      if (text) text.textContent = tier;
      if (sub) {
        sub.textContent = tier === 'SSR' ? 'VERY RARE'
          : (tier === 'SR' ? 'RARE' : 'NORMAL');
      }
      // 横幅淡入
      requestAnimationFrame(() => banner.classList.add('is-in'));
    }

    this._show(this.els.characterRevealStage);
    if (this.els.revealPortrait) this.els.revealPortrait.classList.add('is-in');

    await Effects.sleep(1500);
  },

  phaseResultGrid(cards) {
    this._hide(this.els.characterRevealStage);
    this._setBgPhase('result');
    if (this.els.ceremonySparkles) this.els.ceremonySparkles.classList.remove('is-active');

    this._clearChildren(this.els.resultGrid);
    if (cards.length === 1) {
      this.els.resultGrid.classList.add('is-single');
    } else {
      this.els.resultGrid.classList.remove('is-single');
    }

    const slots = [];
    cards.forEach((c, i) => {
      const slot = Effects.createResultSlot(c, i, () => {
        if (typeof UI !== 'undefined') UI.showCardDetail(c);
      });
      // 暴露 flip() 给 reveal-all
      if (c.rarity !== 'R') {
        slot._flipNow = () => {
          if (slot.classList.contains('is-flipped')) return;
          const back = slot.querySelector('.halo-back-card');
          if (back) back.click();
        };
      }
      slots.push(slot);
      this.els.resultGrid.appendChild(slot);
    });

    // "全部翻开" 按钮 - 只在有未翻 SR/SSR 时显示
    const hasHidden = slots.some(s => s._flipNow);
    this._setupRevealAllBtn(hasHidden, slots);

    // 招募点数 = 卡片数量
    if (this.els.resultPointNum) {
      this.els.resultPointNum.textContent = String(cards.length);
    }

    this._show(this.els.resultStage);
    this.isRunning = false;
  },

  _setupRevealAllBtn(show, slots) {
    let btn = document.getElementById('result-btn-reveal-all');
    const bottom = document.querySelector('.result-bottom');
    if (!btn && bottom) {
      btn = $el('button', {
        cls: 'result-reveal-all',
        attr: { id: 'result-btn-reveal-all', type: 'button' },
        text: '全部翻开'
      });
      bottom.insertBefore(btn, bottom.firstChild);
    }
    if (!btn) return;
    if (show) {
      btn.style.display = '';
      btn.onclick = () => {
        slots.forEach((s, i) => {
          if (s._flipNow) setTimeout(() => s._flipNow(), i * 90);
        });
        btn.style.display = 'none';
      };
    } else {
      btn.style.display = 'none';
    }
  },

  skipTo(cards) {
    // 跳到结果网格
    this._resetStage();
    this._show(this.els.ceremonyStage);
    this.phaseResultGrid(cards);
  },

  close() {
    this._hide(this.els.ceremonyStage);
    this.isRunning = false;
    setTimeout(() => {
      this._resetStage();
      if (this.callbacks.onClose) this.callbacks.onClose();
    }, 240);
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  Ceremony.init();
  const bokeh = document.getElementById('ambient-bokeh');
  if (bokeh) Effects.startAmbientBokeh(bokeh, 10);
});
