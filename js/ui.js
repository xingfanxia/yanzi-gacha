// UI动画与交互
const UI = {
  // ===== 抽卡结果（先全部翻开，稀有卡再弹出） =====
  showPullResults(cards, callback) {
    const overlay = document.getElementById('pull-overlay');
    const container = document.getElementById('pull-results');
    overlay.classList.add('active');
    container.innerHTML = '';

    const isTenPull = cards.length > 1;

    // 第一步：所有卡全部普通翻入
    cards.forEach((card, index) => {
      const cardEl = this.createCardElement(card, true);
      cardEl.classList.add('plain-card');
      if (isTenPull) cardEl.classList.add(`card-delay-${index + 1}`);
      container.appendChild(cardEl);
    });

    // 第二步：SR/SSR卡弹出放大（CSS内置延迟，翻完自动触发）
    cards.forEach((card, index) => {
      if (card.rarity === 'SSR') {
        container.children[index].classList.add('popup-ssr');
      } else if (card.rarity === 'SR') {
        container.children[index].classList.add('popup-sr');
      }
    });

    overlay.onclick = (e) => {
      if (e.target === overlay || e.target.classList.contains('pull-results-wrapper')) {
        overlay.classList.remove('active');
        container.innerHTML = '';
        if (callback) callback();
      }
    };
  },

  createCardElement(card, withAnimation = false) {
    const el = document.createElement('div');
    el.className = `card card-${card.rarity.toLowerCase()}`;
    if (withAnimation) el.classList.add('card-reveal');

    const config = RARITY_CONFIG[card.rarity];

    el.innerHTML = `
      <div class="card-inner">
        <div class="card-front">
          <img src="${card.image}" alt="${card.characterName}" loading="lazy">
          <div class="card-info">
            <span class="card-rarity" style="background: ${config.gradient}">${config.label}</span>
            <span class="card-name">${card.characterName}</span>
          </div>
          ${card.isDuplicate ? `<div class="card-duplicate">重复 +${card.coinValue}金币</div>` : ''}
        </div>
      </div>
    `;

    el.onclick = (e) => {
      e.stopPropagation();
      this.showCardDetail(card);
    };

    return el;
  },

  // ===== 卡牌详情（带保存/分享） =====
  showCardDetail(card) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    const config = RARITY_CONFIG[card.rarity];

    content.innerHTML = `
      <button class="back-btn" onclick="document.getElementById('detail-overlay').classList.remove('active')">
        <svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="detail-card">
        <div class="detail-img-wrap">
          <img src="${card.image}" alt="${card.characterName}">
          <span class="detail-rarity-badge" style="background:${config.gradient}">${config.label}</span>
        </div>
        <div class="detail-info">
          <h2>${card.characterName}</h2>
          <p class="detail-desc">${card.description}</p>
          <div class="action-bar">
            <button class="action-btn" onclick="UI.saveImage('${card.image.replace(/'/g, "\\'")}', '${card.characterName}_${card.rarity}')">
              <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              保存图片
            </button>
            <button class="action-btn primary" onclick="UI.generatePoster('${card.image.replace(/'/g, "\\'")}', '${card.characterName}', '${card.rarity}', '${card.description.replace(/'/g, "\\'")}')">
              <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              生成海报
            </button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add('active');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    };
  },

  // ===== 角色画廊（无保存分享按钮） =====
  showCharacterGallery(char) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    const state = GameState.get();
    const progress = GachaEngine.getCharacterProgress(char.id);

    const allCards = GachaEngine.getCollectedCardsForCharacter(char.id);

    const cardsHtml = allCards.map(card => {
      const config = RARITY_CONFIG[card.rarity];
      if (card.collected) {
        const imgSrc = card.src.replace(/'/g, "\\'");
        return `<div class="gallery-card" onclick="UI.showCardDetail({image:'${imgSrc}',characterName:'${char.name}',rarity:'${card.rarity}',description:'${char.description.replace(/'/g, "\\'")}',characterId:'${char.id}',imageIndex:${card.imageIndex}})">
          <img src="${card.src}" loading="lazy">
          <span class="gallery-rarity-tag" style="background:${config.gradient}">${config.label}</span>
        </div>`;
      }
      return `<div class="gallery-card locked">
        <div class="lock-icon-wrap" style="color:${config.color}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <span class="gallery-rarity-tag locked-tag" style="background:${config.gradient};opacity:0.5">${config.label}</span>
      </div>`;
    }).join('');

    content.innerHTML = `
      <button class="back-btn" onclick="document.getElementById('detail-overlay').classList.remove('active')">
        <svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="gallery">
        <div class="gallery-header">
          <h2>${char.name}</h2>
          <p class="gallery-subtitle">${char.description}</p>
          <div class="gallery-progress-bar">
            <div class="gallery-progress-fill" style="width:${progress.percent}%"></div>
          </div>
          <span class="gallery-progress-text">收集 ${progress.collected} / ${progress.total}</span>
        </div>
        <div class="gallery-grid">${cardsHtml}</div>
      </div>
    `;

    overlay.classList.add('active');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    };
  },

  // ===== 保存图片 =====
  saveImage(imgSrc, filename) {
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = filename + '.jpg';
    link.target = '_blank';
    if (imgSrc.startsWith('img/')) {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(imgSrc, '_blank');
    }
  },

  // ===== 生成海报（修复变形） =====
  generatePoster(imgSrc, name, rarity, description) {
    const canvas = document.getElementById('poster-canvas');
    const ctx = canvas.getContext('2d');
    const config = RARITY_CONFIG[rarity];
    const rarityColors = { SSR: '#FFD700', SR: '#E8A0BF', R: '#89CFF0' };
    const color = rarityColors[rarity] || '#E8A0BF';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = 750, H = 1200;
      canvas.width = W;
      canvas.height = H;

      // 背景 - 甜美渐变
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#FFF0F5');
      bgGrad.addColorStop(0.5, '#FFF5F8');
      bgGrad.addColorStop(1, '#FFF0F5');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 装饰圆点
      ctx.fillStyle = 'rgba(255,182,193,0.15)';
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 3 + Math.random() * 8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 卡片区域 - 白色圆角卡片
      const cardX = 30, cardY = 30, cardW = W - 60, cardH = 700;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(255,105,180,0.15)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 8;
      this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 主图 - 保持原始宽高比，不变形
      const padding = 20;
      const imgAreaW = cardW - padding * 2;
      const imgAreaH = cardH - padding * 2;
      const imgRatio = img.width / img.height;
      const areaRatio = imgAreaW / imgAreaH;

      let drawW, drawH, drawX, drawY;
      if (imgRatio > areaRatio) {
        drawW = imgAreaW;
        drawH = imgAreaW / imgRatio;
      } else {
        drawH = imgAreaH;
        drawW = imgAreaH * imgRatio;
      }
      drawX = cardX + padding + (imgAreaW - drawW) / 2;
      drawY = cardY + padding + (imgAreaH - drawH) / 2;

      // 图片裁切为圆角
      ctx.save();
      this.roundRect(ctx, cardX + padding, cardY + padding, imgAreaW, imgAreaH, 16);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // 稀有度标签
      const tagW = 64, tagH = 30;
      const tagX = cardX + cardW - tagW - 20;
      const tagY = cardY + 20;
      ctx.fillStyle = color;
      this.roundRect(ctx, tagX, tagY, tagW, tagH, 8);
      ctx.fill();
      ctx.fillStyle = rarity === 'SSR' ? '#000' : '#FFF';
      ctx.font = 'bold 16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rarity, tagX + tagW / 2, tagY + tagH / 2);

      // 角色名
      const textY = cardY + cardH + 30;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#2D2D3A';
      ctx.font = 'bold 34px -apple-system, "PingFang SC", sans-serif';
      ctx.fillText(name, 50, textY);

      // 描述
      ctx.fillStyle = '#9B8EA8';
      ctx.font = '18px -apple-system, "PingFang SC", sans-serif';
      const descLines = this.wrapText(ctx, description, W - 100, 18);
      descLines.forEach((line, i) => {
        ctx.fillText(line, 50, textY + 46 + i * 28);
      });

      // 分隔线
      const lineY = H - 180;
      ctx.strokeStyle = 'rgba(232,160,191,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, lineY);
      ctx.lineTo(W - 50, lineY);
      ctx.stroke();

      // QR码区域
      const qrSize = 110;
      const qrX = W - 50 - qrSize;
      const qrY = lineY + 20;

      try {
        const qr = qrcode(0, 'M');
        qr.addData(window.location.href);
        qr.make();
        const qrModuleCount = qr.getModuleCount();
        const moduleSize = qrSize / qrModuleCount;

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 10;
        this.roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#2D2D3A';
        for (let row = 0; row < qrModuleCount; row++) {
          for (let col = 0; col < qrModuleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(qrX + col * moduleSize, qrY + row * moduleSize, moduleSize + 0.5, moduleSize + 0.5);
            }
          }
        }
      } catch (e) {}

      // 左侧品牌文字
      ctx.fillStyle = '#FF69B4';
      ctx.font = 'bold 22px -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('妍子 Cosplay', 50, qrY + 5);

      ctx.fillStyle = '#9B8EA8';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillText('扫码开启抽卡之旅', 50, qrY + 36);
      ctx.fillText('收集你最爱的角色卡牌', 50, qrY + 56);

      // 底部装饰线
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, H - 2);
      ctx.lineTo(W, H - 2);
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
      el = document.createElement('div');
      el.id = 'poster-overlay';
      el.className = 'poster-overlay';
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div class="poster-card">
        <img src="${dataUrl}" id="poster-img">
        <div class="poster-btns">
          <button class="poster-btn save" onclick="UI.downloadPoster()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            保存到相册
          </button>
          <button class="poster-btn share" onclick="UI.sharePoster()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:4px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            分享给好友
          </button>
          <button class="poster-btn close" onclick="document.getElementById('poster-overlay').classList.remove('active')">关闭</button>
        </div>
      </div>
    `;

    el.classList.add('active');
    el._dataUrl = dataUrl;
  },

  downloadPoster() {
    const el = document.getElementById('poster-overlay');
    const link = document.createElement('a');
    link.download = '妍子Cosplay海报_' + Date.now() + '.jpg';
    link.href = el._dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async sharePoster() {
    const el = document.getElementById('poster-overlay');
    const dataUrl = el._dataUrl;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], '妍子Cosplay海报.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: '妍子Cosplay抽卡集', text: '来看看我抽到的卡牌！', files: [file] });
          return;
        }
      } catch (e) {}
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('海报已复制到剪贴板！可以粘贴到微信/QQ发送');
    } catch (e) {
      this.downloadPoster();
      alert('海报已保存到本地');
    }
  },

  // ===== 顶部状态栏 =====
  updateStatusBar() {
    const state = GameState.get();
    document.getElementById('ticket-count').textContent = state.tickets;
    document.getElementById('coin-count').textContent = state.coins;
    document.getElementById('pity-count').textContent = `${state.pityCount}/90`;
    document.getElementById('collection-count').textContent = state.collection.length;
  },

  // ===== 图鉴页 =====
  renderCollection(filter = 'ALL') {
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    const state = GameState.get();

    CHARACTERS.forEach(char => {
      const progress = GachaEngine.getCharacterProgress(char.id);
      const allCards = GachaEngine.getCollectedCardsForCharacter(char.id);

      // 按筛选条件过滤
      const hasMatching = filter === 'ALL' || allCards.some(c => c.rarity === filter);
      if (!hasMatching && filter !== 'ALL') return;

      const thumbSrc = getCharacterThumb(char.id);
      const collectedCount = allCards.filter(c => c.collected).length;
      const isFullyLocked = collectedCount === 0;

      // 判断该角色的最高已收集稀有度
      let highestCollected = null;
      if (allCards.some(c => c.collected && c.rarity === 'SSR')) highestCollected = 'SSR';
      else if (allCards.some(c => c.collected && c.rarity === 'SR')) highestCollected = 'SR';
      else if (collectedCount > 0) highestCollected = 'R';

      const config = highestCollected ? RARITY_CONFIG[highestCollected] : RARITY_CONFIG[allCards[0]?.rarity || 'R'];

      const el = document.createElement('div');
      el.className = 'collection-card';
      if (isFullyLocked) el.classList.add('locked');

      el.innerHTML = `
        <div class="collection-thumb">
          <img src="${thumbSrc}" alt="${char.name}" loading="lazy">
          ${isFullyLocked ? '<div class="thumb-lock-overlay"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>' : ''}
          ${highestCollected ? `<span class="thumb-rarity" style="background:${config.gradient}">${highestCollected}</span>` : ''}
        </div>
        <div class="collection-info">
          <span class="collection-name">${char.name}</span>
          <div class="collection-progress">
            <div class="progress-fill" style="width:${progress.percent}%"></div>
          </div>
          <span class="collection-count">${progress.collected}/${progress.total}</span>
        </div>
      `;

      el.onclick = () => this.showCharacterGallery(char);
      grid.appendChild(el);
    });
  },

  // ===== 任务页 =====
  renderTasks() {
    const list = document.getElementById('task-list');
    const state = GameState.get();
    const today = new Date().toDateString();

    const tasks = [
      {
        id: 'daily-checkin', name: '每日签到', desc: '签到获得1张抽卡券',
        reward: '+1 抽卡券', done: state.lastCheckin === today,
        action: () => {
          if (state.lastCheckin === today) return '今天已签到';
          state.tickets += 1; state.lastCheckin = today;
          GameState.save(state); UI.updateStatusBar(); UI.renderTasks();
        }
      },
      {
        id: 'share-wechat', name: '分享到微信', desc: '分享给好友或朋友圈',
        reward: '+2 抽卡券', done: state.sharedWechat,
        action: () => {
          if (state.sharedWechat) return '已完成';
          navigator.clipboard.writeText(window.location.href).then(() => {
            state.sharedWechat = true; state.tickets += 2;
            GameState.save(state); UI.updateStatusBar(); UI.renderTasks();
            alert('链接已复制，去微信粘贴分享吧！');
          });
        }
      },
      {
        id: 'share-qq', name: '分享到QQ', desc: '分享到QQ空间或好友',
        reward: '+2 抽卡券', done: state.sharedQQ,
        action: () => {
          if (state.sharedQQ) return '已完成';
          navigator.clipboard.writeText(window.location.href).then(() => {
            state.sharedQQ = true; state.tickets += 2;
            GameState.save(state); UI.updateStatusBar(); UI.renderTasks();
            alert('链接已复制，去QQ粘贴分享吧！');
          });
        }
      },
      {
        id: 'share-weibo', name: '分享到微博', desc: '分享链接到微博',
        reward: '+2 抽卡券', done: state.sharedWeibo,
        action: () => {
          if (state.sharedWeibo) return '已完成';
          const t = encodeURIComponent('快来抽妍子的Cosplay卡牌！');
          const u = encodeURIComponent(window.location.href);
          window.open(`https://service.weibo.com/share/share.php?title=${t}&url=${u}`, '_blank');
          setTimeout(() => { state.sharedWeibo = true; state.tickets += 2; GameState.save(state); UI.updateStatusBar(); UI.renderTasks(); }, 2000);
        }
      },
      {
        id: 'invite', name: '邀请好友', desc: '分享邀请链接',
        reward: '+3 抽卡券', done: false,
        action: () => {
          const url = `${window.location.href}?inviter=${Date.now()}`;
          navigator.clipboard.writeText(url).then(() => {
            alert('邀请链接已复制！'); state.tickets += 3;
            GameState.save(state); UI.updateStatusBar(); UI.renderTasks();
          });
        }
      }
    ];

    list.innerHTML = tasks.map(task => `
      <div class="task-item ${task.done ? 'task-done' : ''}">
        <div class="task-info">
          <h3>${task.name}</h3>
          <p>${task.desc}</p>
          <span class="task-reward">${task.reward}</span>
        </div>
        <button class="task-btn ${task.done ? 'btn-done' : ''}"
                onclick="UI.handleTask('${task.id}')" ${task.done ? 'disabled' : ''}>
          ${task.done ? '已完成' : '去完成'}
        </button>
      </div>
    `).join('');

    this._tasks = tasks;
  },

  handleTask(taskId) {
    const task = this._tasks?.find(t => t.id === taskId);
    if (task) task.action();
  },

  // ===== 商店页 =====
  renderShop() {
    const list = document.getElementById('shop-list');
    const packs = [
      { id: 'small', name: '初遇之礼', coins: 60, price: '¥6', desc: '60金币，可抽6次' },
      { id: 'medium', name: '心动礼包', coins: 330, price: '¥30', desc: '330金币，超值加赠' },
      { id: 'large', name: '挚爱礼盒', coins: 1100, price: '¥98', desc: '1100金币，豪华加赠' }
    ];

    list.innerHTML = packs.map(p => `
      <div class="shop-item">
        <div class="shop-info">
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
          <span class="shop-coins">+${p.coins} 金币</span>
        </div>
        <button class="shop-btn" onclick="UI.buyPack('${p.id}',${p.coins})">${p.price}</button>
      </div>
    `).join('') + `
      <div class="shop-item">
        <div class="shop-info">
          <h3>金币抽卡</h3>
          <p>使用金币抽卡</p>
          <span class="shop-coins">10金=1抽 | 100金=10连</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="shop-btn small" onclick="app.doSinglePull()">单抽</button>
          <button class="shop-btn small" onclick="app.doTenPull()">十连</button>
        </div>
      </div>
    `;
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

  // ===== Tab切换 =====
  switchTab(tab) {
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`page-${tab}`).classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    if (tab === 'collection') this.renderCollection();
    if (tab === 'tasks') this.renderTasks();
    if (tab === 'shop') this.renderShop();
  }
};
