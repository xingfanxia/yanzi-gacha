/* ============================================================
   UI 渲染 + 交互（完全使用 createElement / textContent）
   ============================================================ */

// SVG 解析（避免 innerHTML 字符串注入）
function makeSvg(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName === 'parsererror' || root.querySelector('parsererror')) {
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  }
  return root.cloneNode(true);
}

const SVG_BACK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
const SVG_DOWNLOAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const SVG_POSTER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
const SVG_LOCK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
const SVG_SHARE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
const SVG_LOCK_WHITE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';

const UI = {

  // ===== 抽卡结果：交给 Ceremony 演出引擎 =====
  showPullResults(cards, callback) {
    if (typeof Ceremony !== 'undefined') {
      Ceremony.run(cards, () => {
        if (typeof callback === 'function') callback();
      });
    }
  },

  // ===== 顶部状态栏 =====
  updateStatusBar() {
    const state = GameState.get();
    const set = (id, val) => {
      const e = document.getElementById(id);
      if (e) e.textContent = val;
    };
    set('ticket-count', state.tickets);
    set('coin-count', state.coins);
    set('info-pity', state.pityCount);          // 主页 info-paper 里的保底数
    set('pity-count-2', `${state.pityCount}/90`); // 抽卡页 rate-card 保底数

    const totalCards = (typeof getAllCards === 'function') ? getAllCards().length : 150;
    set('collection-count', state.collection.length);     // 主页 collection-progress
    set('collection-total', totalCards);
    set('hud-collection-count', state.collection.length); // 顶部 HUD 图鉴 chip
    set('hud-collection-total', totalCards);

    const pityFill = document.getElementById('pity-progress-bar');
    if (pityFill) pityFill.style.width = `${Math.min(100, (state.pityCount / 90) * 100)}%`;
    const cpFill = document.getElementById('collection-progress-fill');
    if (cpFill) cpFill.style.width = `${Math.min(100, totalCards > 0 ? (state.collection.length / totalCards) * 100 : 0)}%`;
  },

  // ===== 卡牌详情 (Blue Archive 风格) =====
  showCardDetail(card) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    if (!overlay || !content) return;

    while (content.firstChild) content.removeChild(content.firstChild);

    const rarLower = String(card.rarity).toLowerCase();
    const starCount = card.rarity === 'SSR' ? 3 : (card.rarity === 'SR' ? 2 : 1);
    const num = String((card.imageIndex || 0) + 1).padStart(3, '0');

    // 返回按钮
    const back = $el('button', { cls: 'back-btn', attr: { 'aria-label': '返回' } });
    back.appendChild(makeSvg(SVG_BACK));
    back.addEventListener('click', () => overlay.classList.remove('is-active'));
    content.appendChild(back);

    const detailCard = $el('div', { cls: `detail-card detail-card-${rarLower}` });

    // 大图区
    const imgWrap = $el('div', { cls: 'detail-img-wrap' });
    imgWrap.appendChild($el('img', {
      attr: { src: card.image, alt: card.characterName || '' }
    }));
    // 稀有度大字 (右上)
    imgWrap.appendChild($el('span', {
      cls: `detail-rarity-tag detail-rarity-tag-${rarLower}`,
      text: card.rarity
    }));
    if (card.rarity === 'SSR') {
      imgWrap.appendChild($el('span', { cls: 'detail-foil' }));
    }
    // 名牌 overlay (左下)
    const nameCard = $el('div', { cls: `detail-namecard detail-namecard-${rarLower}` });
    nameCard.appendChild($el('span', {
      cls: 'detail-namecard-tag',
      text: card.rarity === 'SSR' ? '写真俱乐部 · 限定' : '写真俱乐部'
    }));
    nameCard.appendChild($el('span', {
      cls: 'detail-namecard-stars',
      text: '★ '.repeat(starCount).trim()
    }));
    nameCard.appendChild($el('span', {
      cls: 'detail-namecard-name',
      text: card.characterName || ''
    }));
    imgWrap.appendChild(nameCard);
    detailCard.appendChild(imgWrap);

    // Paper info card (SCHALE 风格)
    const paper = $el('div', { cls: 'detail-paper' });
    paper.appendChild($el('span', { cls: 'detail-paper-clip' }));
    paper.appendChild($el('span', {
      cls: 'detail-paper-tag',
      text: 'PROFILE'
    }));
    const paperBody = $el('div', { cls: 'detail-paper-body' });
    paperBody.appendChild($el('div', {
      cls: 'detail-paper-num',
      text: `No.${num}  ·  YANZI STUDIO`
    }));
    paperBody.appendChild($el('div', {
      cls: 'detail-paper-desc',
      text: card.description || ''
    }));

    // 角色收集进度 (如果能查到)
    if (card.characterId && typeof GachaEngine !== 'undefined') {
      try {
        const progress = GachaEngine.getCharacterProgress(card.characterId);
        const row = $el('div', { cls: 'detail-paper-row' });
        row.appendChild($el('span', { cls: 'detail-paper-row-label', text: '本角色收集' }));
        row.appendChild($el('span', {
          cls: 'detail-paper-row-value',
          text: `${progress.collected} / ${progress.total}`
        }));
        paperBody.appendChild(row);
      } catch (_) {}
    }
    paper.appendChild(paperBody);
    detailCard.appendChild(paper);

    // 操作按钮
    const actions = $el('div', { cls: 'detail-actions' });

    const saveBtn = $el('button', { cls: 'detail-btn' });
    saveBtn.appendChild(makeSvg(SVG_DOWNLOAD));
    saveBtn.appendChild($el('span', { text: '保存图片' }));
    saveBtn.addEventListener('click', () =>
      UI.saveImage(card.image, `${card.characterName}_${card.rarity}`));
    actions.appendChild(saveBtn);

    const posterBtn = $el('button', { cls: 'detail-btn detail-btn-primary' });
    posterBtn.appendChild(makeSvg(SVG_POSTER));
    posterBtn.appendChild($el('span', { text: '生成海报' }));
    posterBtn.addEventListener('click', () =>
      UI.generatePoster(card.image, card.characterName, card.rarity, card.description || ''));
    actions.appendChild(posterBtn);

    detailCard.appendChild(actions);
    content.appendChild(detailCard);

    overlay.classList.add('is-active');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove('is-active');
    };
  },

  // ===== 角色画廊 =====
  showCharacterGallery(char) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    if (!overlay || !content) return;

    const progress = GachaEngine.getCharacterProgress(char.id);
    const allCards = GachaEngine.getCollectedCardsForCharacter(char.id);

    while (content.firstChild) content.removeChild(content.firstChild);

    const back = $el('button', { cls: 'back-btn' });
    back.appendChild(makeSvg(SVG_BACK));
    back.addEventListener('click', () => overlay.classList.remove('is-active'));
    content.appendChild(back);

    const gallery = $el('div', { cls: 'gallery' });

    const header = $el('div', { cls: 'gallery-header' });
    header.appendChild($el('span', {
      cls: 'gallery-eyebrow',
      text: `COLLECTION / ${String(char.id).toUpperCase()}`
    }));
    header.appendChild($el('h2', { cls: 'gallery-title', text: char.name }));
    header.appendChild($el('p', { cls: 'gallery-desc', text: char.description }));

    const progressBar = $el('div', { cls: 'gallery-progress' });
    progressBar.appendChild($el('div', {
      cls: 'gallery-progress-fill',
      style: `width: ${progress.percent}%;`
    }));
    header.appendChild(progressBar);
    header.appendChild($el('span', {
      cls: 'gallery-progress-text',
      text: `已收集 ${progress.collected} / ${progress.total}`
    }));
    gallery.appendChild(header);

    const grid = $el('div', { cls: 'gallery-grid' });
    allCards.forEach((card) => {
      const item = $el('div', { cls: 'gallery-card' });
      if (card.collected) {
        item.appendChild($el('img', {
          attr: { src: card.src, alt: char.name, loading: 'lazy' }
        }));
        item.appendChild($el('span', {
          cls: `gallery-rarity gallery-rarity-${String(card.rarity).toLowerCase()}`,
          text: card.rarity
        }));
        item.addEventListener('click', () => {
          UI.showCardDetail({
            image: card.src,
            characterName: char.name,
            rarity: card.rarity,
            description: char.description,
            characterId: char.id,
            imageIndex: card.imageIndex
          });
        });
      } else {
        item.classList.add('is-locked');
        const lock = $el('div', { cls: 'gallery-lock' });
        lock.appendChild(makeSvg(SVG_LOCK));
        item.appendChild(lock);
        item.appendChild($el('span', {
          cls: `gallery-rarity gallery-rarity-${String(card.rarity).toLowerCase()} is-locked`,
          text: card.rarity
        }));
      }
      grid.appendChild(item);
    });

    gallery.appendChild(grid);
    content.appendChild(gallery);

    overlay.classList.add('is-active');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove('is-active');
    };
  },

  // ===== 保存图片 =====
  saveImage(imgSrc, filename) {
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = (filename || 'image') + '.jpg';
    link.target = '_blank';
    if (typeof imgSrc === 'string' && imgSrc.startsWith('img/')) {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(imgSrc, '_blank');
    }
  },

  // ===== 海报生成 (Blue Archive 学院风) =====
  generatePoster(imgSrc, name, rarity, description) {
    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rarityColors = { SSR: '#F8C247', SR: '#B795F0', R: '#6FB1E8' };
    const color = rarityColors[rarity] || '#F8C247';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = 750, H = 1200;
      canvas.width = W;
      canvas.height = H;

      // BA 学院风浅蓝渐变背景
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#E8F4FF');
      bgGrad.addColorStop(0.5, '#F0F8FF');
      bgGrad.addColorStop(1, '#D8E8F5');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 斜线纹理装饰 (右上)
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#5B9BD5';
      ctx.lineWidth = 2;
      for (let i = -200; i < 200; i += 24) {
        ctx.beginPath();
        ctx.moveTo(W - 280 + i, 0);
        ctx.lineTo(W + i - 50, 240);
        ctx.stroke();
      }
      ctx.restore();

      // 钻石装饰小点
      ctx.fillStyle = 'rgba(91,155,213,0.15)';
      for (let i = 0; i < 12; i++) {
        const dx = Math.random() * W, dy = Math.random() * H, ds = 3 + Math.random() * 6;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-ds/2, -ds/2, ds, ds);
        ctx.restore();
      }

      // 主卡 - 白色 SCHALE 纸张风
      const cardX = 45, cardY = 60, cardW = W - 90, cardH = 880;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(40,70,120,0.18)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 10;
      this.roundRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 卡左侧蓝色 4px 装饰条 (BA 名牌风)
      ctx.fillStyle = color;
      ctx.fillRect(cardX, cardY + 16, 6, cardH - 32);

      const padX = 36, padTop = 36, padBottom = 200;
      const imgAreaW = cardW - padX * 2;
      const imgAreaH = cardH - padTop - padBottom;
      const imgRatio = img.width / img.height;
      const areaRatio = imgAreaW / imgAreaH;

      let drawW, drawH;
      if (imgRatio > areaRatio) {
        drawW = imgAreaW;
        drawH = imgAreaW / imgRatio;
      } else {
        drawH = imgAreaH;
        drawW = imgAreaH * imgRatio;
      }
      const drawX = cardX + padX + (imgAreaW - drawW) / 2;
      const drawY = cardY + padTop + (imgAreaH - drawH) / 2;

      ctx.save();
      this.roundRect(ctx, cardX + padX, cardY + padTop, imgAreaW, imgAreaH, 4);
      ctx.clip();
      ctx.fillStyle = '#F5EFE6';
      ctx.fillRect(cardX + padX, cardY + padTop, imgAreaW, imgAreaH);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // 稀有度大字 tag (右上, 倾斜 BA 风)
      const tagW = 88, tagH = 38;
      const tagX = cardX + cardW - tagW - 26;
      const tagY = cardY + 24;
      ctx.save();
      ctx.translate(tagX + tagW / 2, tagY + tagH / 2);
      ctx.rotate(-0.07);
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(40,70,120,0.30)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      this.roundRect(ctx, -tagW/2, -tagH/2, tagW, tagH, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = rarity === 'SSR' ? '#3D2A0A' : '#FFFFFF';
      ctx.font = '900 20px "Big Shoulders Display", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rarity, 0, 1);
      ctx.restore();

      // SCHALE 角标 (左上)
      ctx.fillStyle = '#3D7AC0';
      const stagX = cardX + 26, stagY = cardY + 24;
      const stagW = 78, stagH = 26;
      this.roundRect(ctx, stagX, stagY, stagW, stagH, 13);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 12px "Bebas Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '0.2em';
      ctx.fillText('SCHALE', stagX + stagW / 2, stagY + stagH / 2 + 1);

      // 编号
      const captionY = cardY + cardH - padBottom + 28;
      ctx.fillStyle = '#5C7AA0';
      ctx.font = '600 13px "Bebas Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('NO.001  ·  YANZI STUDIO', cardX + padX, captionY);

      // 名字 BA 学院风 - 圆润 + 深蓝
      ctx.fillStyle = '#1B2840';
      ctx.font = '800 38px "M PLUS Rounded 1c", sans-serif';
      ctx.fillText(name, cardX + padX, captionY + 22);

      // 描述
      ctx.fillStyle = '#506280';
      ctx.font = '400 16px "Outfit", "M PLUS Rounded 1c", sans-serif';
      const descLines = this.wrapText(ctx, description, cardW - padX * 2);
      descLines.forEach((line, i) => {
        ctx.fillText(line, cardX + padX, captionY + 76 + i * 24);
      });

      // 底部 navy block (BA 风)
      ctx.fillStyle = '#1B2840';
      ctx.fillRect(0, H - 200, W, 200);

      // 顶部黄色装饰条
      ctx.fillStyle = '#F8C247';
      ctx.fillRect(0, H - 200, W, 4);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px "M PLUS Rounded 1c", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('妍子写真俱乐部', 50, H - 156);
      ctx.fillStyle = '#F8C247';
      ctx.font = '500 13px "Bebas Neue", sans-serif';
      ctx.fillText('YANZI  ·  PHOTO CLUB', 50, H - 120);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '400 12px "Outfit", sans-serif';
      ctx.fillText('扫码加入俱乐部 · 收集你的本命角色', 50, H - 92);

      try {
        const qr = qrcode(0, 'M');
        qr.addData(window.location.href);
        qr.make();
        const qrModuleCount = qr.getModuleCount();
        const qrSize = 116;
        const qrX = W - 50 - qrSize;
        const qrY = H - 160;
        const moduleSize = qrSize / qrModuleCount;
        ctx.fillStyle = '#FFFFFF';
        this.roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 10);
        ctx.fill();
        ctx.fillStyle = '#1B2840';
        for (let row = 0; row < qrModuleCount; row++) {
          for (let col = 0; col < qrModuleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(qrX + col * moduleSize, qrY + row * moduleSize, moduleSize + 0.5, moduleSize + 0.5);
            }
          }
        }
      } catch (e) {}

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, H - 4);
      ctx.lineTo(W, H - 4);
      ctx.stroke();

      this.showPosterPreview(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => { alert('图片加载失败'); };
    img.src = imgSrc;
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const lines = [];
    let currentLine = '';
    for (const char of text) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3);
  },

  // ===== 海报预览 =====
  showPosterPreview(dataUrl) {
    let el = document.getElementById('poster-overlay');
    if (!el) {
      el = $el('div', { cls: 'poster-overlay', attr: { id: 'poster-overlay' } });
      document.body.appendChild(el);
    }
    while (el.firstChild) el.removeChild(el.firstChild);

    const card = $el('div', { cls: 'poster-card' });
    card.appendChild($el('img', { attr: { src: dataUrl, id: 'poster-img' } }));

    const btns = $el('div', { cls: 'poster-btns' });

    const saveBtn = $el('button', { cls: 'poster-btn poster-btn-save' });
    saveBtn.appendChild(makeSvg(SVG_DOWNLOAD));
    saveBtn.appendChild($el('span', { text: '保存' }));
    saveBtn.addEventListener('click', () => UI.downloadPoster());
    btns.appendChild(saveBtn);

    const shareBtn = $el('button', { cls: 'poster-btn poster-btn-share' });
    shareBtn.appendChild(makeSvg(SVG_SHARE));
    shareBtn.appendChild($el('span', { text: '分享' }));
    shareBtn.addEventListener('click', () => UI.sharePoster());
    btns.appendChild(shareBtn);

    const closeBtn = $el('button', { cls: 'poster-btn poster-btn-close', text: '关闭' });
    closeBtn.addEventListener('click', () => el.classList.remove('is-active'));
    btns.appendChild(closeBtn);

    card.appendChild(btns);
    el.appendChild(card);
    el.classList.add('is-active');
    el._dataUrl = dataUrl;
  },

  downloadPoster() {
    const el = document.getElementById('poster-overlay');
    if (!el || !el._dataUrl) return;
    const link = document.createElement('a');
    link.download = '妍子写真_' + Date.now() + '.jpg';
    link.href = el._dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async sharePoster() {
    const el = document.getElementById('poster-overlay');
    if (!el) return;
    const dataUrl = el._dataUrl;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], '妍子写真.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: '妍子写真俱乐部', text: '来看看我抽到的写真！', files: [file] });
          return;
        }
      } catch (e) {}
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('海报已复制到剪贴板！');
    } catch (e) {
      this.downloadPoster();
      alert('海报已保存到本地');
    }
  },

  // ===== 图鉴 =====
  renderCollection(filter = 'ALL') {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    CHARACTERS.forEach(char => {
      const progress = GachaEngine.getCharacterProgress(char.id);
      const allCards = GachaEngine.getCollectedCardsForCharacter(char.id);

      const hasMatching = filter === 'ALL' || allCards.some(c => c.rarity === filter);
      if (!hasMatching && filter !== 'ALL') return;

      const thumbSrc = getCharacterThumb(char.id);
      const collectedCount = allCards.filter(c => c.collected).length;
      const isFullyLocked = collectedCount === 0;

      let highest = null;
      if (allCards.some(c => c.collected && c.rarity === 'SSR')) highest = 'SSR';
      else if (allCards.some(c => c.collected && c.rarity === 'SR')) highest = 'SR';
      else if (collectedCount > 0) highest = 'R';

      const item = $el('div', { cls: 'album-card' });
      if (isFullyLocked) item.classList.add('is-locked');
      if (highest) item.classList.add(`album-card-${highest.toLowerCase()}`);

      item.appendChild($el('span', { cls: 'album-tape' }));

      const photo = $el('div', { cls: 'album-photo' });
      photo.appendChild($el('img', {
        attr: { src: thumbSrc, alt: char.name, loading: 'lazy' }
      }));

      if (isFullyLocked) {
        const lockOverlay = $el('div', { cls: 'album-lock-overlay' });
        lockOverlay.appendChild(makeSvg(SVG_LOCK_WHITE));
        photo.appendChild(lockOverlay);
      }
      if (highest) {
        photo.appendChild($el('span', {
          cls: `album-rarity album-rarity-${highest.toLowerCase()}`,
          text: highest
        }));
      }
      item.appendChild(photo);

      const info = $el('div', { cls: 'album-info' });
      info.appendChild($el('span', { cls: 'album-name', text: char.name }));
      const bar = $el('div', { cls: 'album-progress' });
      bar.appendChild($el('div', {
        cls: 'album-progress-fill',
        style: `width:${progress.percent}%`
      }));
      info.appendChild(bar);
      info.appendChild($el('span', {
        cls: 'album-count',
        text: `${progress.collected}/${progress.total}`
      }));
      item.appendChild(info);

      item.addEventListener('click', () => this.showCharacterGallery(char));
      grid.appendChild(item);
    });
  },

  // ===== 任务 =====
  renderTasks() {
    const list = document.getElementById('task-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);

    const state = GameState.get();
    const today = new Date().toDateString();

    const tasks = [
      {
        id: 'daily-checkin', icon: '🌸', name: '每日签到', desc: '签到获得抽卡券',
        reward: '+1 抽卡券', done: state.lastCheckin === today,
        action: () => {
          if (state.lastCheckin === today) return;
          const s = GameState.get();
          s.tickets += 1;
          s.lastCheckin = today;
          GameState.save(s);
          UI.updateStatusBar();
          UI.renderTasks();
        }
      },
      {
        id: 'share-wechat', icon: '💬', name: '分享到微信', desc: '分享给好友或朋友圈',
        reward: '+2 抽卡券', done: state.sharedWechat,
        action: () => {
          if (state.sharedWechat) return;
          navigator.clipboard.writeText(window.location.href).then(() => {
            const s = GameState.get();
            s.sharedWechat = true;
            s.tickets += 2;
            GameState.save(s);
            UI.updateStatusBar();
            UI.renderTasks();
            alert('链接已复制，去微信粘贴分享吧！');
          });
        }
      },
      {
        id: 'share-qq', icon: '🐧', name: '分享到QQ', desc: '分享到QQ空间或好友',
        reward: '+2 抽卡券', done: state.sharedQQ,
        action: () => {
          if (state.sharedQQ) return;
          navigator.clipboard.writeText(window.location.href).then(() => {
            const s = GameState.get();
            s.sharedQQ = true;
            s.tickets += 2;
            GameState.save(s);
            UI.updateStatusBar();
            UI.renderTasks();
            alert('链接已复制，去QQ粘贴分享吧！');
          });
        }
      },
      {
        id: 'share-weibo', icon: '📢', name: '分享到微博', desc: '分享到微博',
        reward: '+2 抽卡券', done: state.sharedWeibo,
        action: () => {
          if (state.sharedWeibo) return;
          const t = encodeURIComponent('快来抽妍子的Cosplay写真！');
          const u = encodeURIComponent(window.location.href);
          window.open(`https://service.weibo.com/share/share.php?title=${t}&url=${u}`, '_blank');
          setTimeout(() => {
            const s = GameState.get();
            s.sharedWeibo = true;
            s.tickets += 2;
            GameState.save(s);
            UI.updateStatusBar();
            UI.renderTasks();
          }, 2000);
        }
      },
      {
        id: 'invite', icon: '💌', name: '邀请好友', desc: '分享邀请链接',
        reward: '+3 抽卡券', done: false,
        action: () => {
          const url = `${window.location.href}?inviter=${Date.now()}`;
          navigator.clipboard.writeText(url).then(() => {
            const s = GameState.get();
            s.tickets += 3;
            GameState.save(s);
            UI.updateStatusBar();
            UI.renderTasks();
            alert('邀请链接已复制！');
          });
        }
      }
    ];

    tasks.forEach(task => {
      const item = $el('div', { cls: 'task-item' });
      if (task.done) item.classList.add('is-done');

      item.appendChild($el('div', { cls: 'task-icon', text: task.icon }));

      const content = $el('div', { cls: 'task-content' });
      content.appendChild($el('div', { cls: 'task-name', text: task.name }));
      content.appendChild($el('div', { cls: 'task-desc', text: task.desc }));
      content.appendChild($el('span', { cls: 'task-reward', text: task.reward }));
      item.appendChild(content);

      const btn = $el('button', {
        cls: `task-btn${task.done ? ' is-done' : ''}`,
        text: task.done ? '已完成' : '去完成'
      });
      if (!task.done) btn.addEventListener('click', task.action);
      item.appendChild(btn);

      list.appendChild(item);
    });

    const hasUndone = tasks.some(t => !t.done);
    const dot = document.getElementById('task-dot');
    if (dot) dot.classList.toggle('is-show', hasUndone);
  },

  // ===== 商店 =====
  renderShop() {
    const list = document.getElementById('shop-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);

    const packs = [
      { id: 'small', icon: '🎁', name: '初遇之礼', coins: 60, price: '¥6', desc: '60金币 · 可抽6次' },
      { id: 'medium', icon: '💖', name: '心动礼包', coins: 330, price: '¥30', desc: '330金币 · 超值加赠' },
      { id: 'large', icon: '👑', name: '挚爱礼盒', coins: 1100, price: '¥98', desc: '1100金币 · 豪华加赠' }
    ];

    packs.forEach(p => {
      const item = $el('div', { cls: 'shop-item' });
      item.appendChild($el('div', { cls: 'shop-pack-icon', text: p.icon }));

      const info = $el('div', { cls: 'shop-info' });
      info.appendChild($el('div', { cls: 'shop-name', text: p.name }));
      info.appendChild($el('div', { cls: 'shop-desc', text: p.desc }));
      info.appendChild($el('span', { cls: 'shop-reward', text: `+${p.coins} 金币` }));
      item.appendChild(info);

      const btn = $el('button', { cls: 'shop-btn', text: p.price });
      btn.addEventListener('click', () => UI.buyPack(p.id, p.coins));
      item.appendChild(btn);

      list.appendChild(item);
    });

    // 金币抽卡
    const coinPullItem = $el('div', { cls: 'shop-item' });
    coinPullItem.appendChild($el('div', { cls: 'shop-pack-icon', text: '📷' }));
    const cpInfo = $el('div', { cls: 'shop-info' });
    cpInfo.appendChild($el('div', { cls: 'shop-name', text: '金币抽卡' }));
    cpInfo.appendChild($el('div', { cls: 'shop-desc', text: '使用金币抽卡' }));
    cpInfo.appendChild($el('span', { cls: 'shop-reward', text: '10金=1抽 · 100金=10连' }));
    coinPullItem.appendChild(cpInfo);
    const cpBtns = $el('div', { cls: 'shop-mini-btns' });
    const cpSingle = $el('button', { cls: 'shop-btn shop-btn-mini', text: '单抽' });
    cpSingle.addEventListener('click', () => app.doSinglePull());
    const cpTen = $el('button', { cls: 'shop-btn shop-btn-mini', text: '十连' });
    cpTen.addEventListener('click', () => app.doTenPull());
    cpBtns.appendChild(cpSingle);
    cpBtns.appendChild(cpTen);
    coinPullItem.appendChild(cpBtns);

    list.appendChild(coinPullItem);
  },

  buyPack(id, coins) {
    if (confirm(`模拟购买：获得${coins}金币（支付功能开发中）`)) {
      const state = GameState.get();
      state.coins += coins;
      GameState.save(state);
      this.updateStatusBar();
      alert(`充值成功！+${coins}金币`);
    }
  },

  // ===== Tab 切换 =====
  switchTab(tab) {
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('is-active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('is-active'));
    const target = document.getElementById(`page-${tab}`);
    const navBtn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if (target) target.classList.add('is-active');
    if (navBtn) navBtn.classList.add('is-active');

    if (tab === 'collection') this.renderCollection();
    if (tab === 'tasks') this.renderTasks();
    if (tab === 'shop') this.renderShop();
  }
};
