/* ============================================================
   状态管理 + 主应用入口
   ============================================================ */

const GameState = {
  STORAGE_KEY: 'yanzi-gacha-state',

  defaultState() {
    return {
      tickets: 5,
      coins: 0,
      collection: [],
      pityCount: 0,
      totalPulls: 0,
      lastCheckin: '',
      sharedWechat: false,
      sharedQQ: false,
      sharedWeibo: false,
      inviteCount: 0
    };
  },

  get() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return this.defaultState();
      const state = JSON.parse(data);
      return { ...this.defaultState(), ...state };
    } catch {
      return this.defaultState();
    }
  },

  save(state) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  },

  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

const app = {
  init() {
    this.bindEvents();
    UI.updateStatusBar();
    this.renderBanner();
    this.renderCharPreview();
    UI.renderTasks();

    const params = new URLSearchParams(window.location.search);
    if (params.get('inviter')) {
      const state = GameState.get();
      if (!state._invited) {
        state.tickets += 1;
        state._invited = true;
        GameState.save(state);
        UI.updateStatusBar();
        setTimeout(() => alert('欢迎！通过好友邀请加入，获得1张抽卡券！'), 500);
      }
    }
  },

  bindEvents() {
    // Tab 切换
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => UI.switchTab(btn.dataset.tab));
    });

    // 抽卡按钮
    const single = document.getElementById('btn-single');
    const ten = document.getElementById('btn-ten');
    if (single) single.addEventListener('click', () => this.doSinglePull());
    if (ten) ten.addEventListener('click', () => this.doTenPull());

    // 图鉴筛选
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        UI.renderCollection(btn.dataset.filter);
      });
    });
  },

  doSinglePull() {
    const result = GachaEngine.singlePull();
    if (!result.success) {
      alert(result.reason);
      return;
    }
    UI.updateStatusBar();
    UI.showPullResults(result.cards);
  },

  doTenPull() {
    const result = GachaEngine.tenPull();
    if (!result.success) {
      alert(result.reason);
      return;
    }
    UI.updateStatusBar();
    UI.showPullResults(result.cards);
  },

  renderBanner() {
    const ssrCards = (typeof getCardsByRarity === 'function')
      ? getCardsByRarity('SSR')
      : [];
    if (ssrCards.length === 0) return;
    const bannerImg = document.getElementById('banner-img');
    if (bannerImg) {
      // 随机选一张SSR当banner
      const pick = ssrCards[Math.floor(Math.random() * ssrCards.length)];
      bannerImg.style.backgroundImage = `url("${pick.src}")`;
    }
  },

  renderCharPreview() {
    const container = document.getElementById('char-preview');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    CHARACTERS.forEach(char => {
      const thumb = getCharacterThumb(char.id);
      const item = $el('div', {
        cls: 'char-thumb',
        attr: { title: char.name }
      });
      item.appendChild($el('img', {
        attr: { src: thumb, alt: char.name, loading: 'lazy' }
      }));
      item.appendChild($el('span', { cls: 'char-thumb-name', text: char.name }));
      item.addEventListener('click', () => UI.showCharacterGallery(char));
      container.appendChild(item);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
