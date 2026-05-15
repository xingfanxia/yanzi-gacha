// @ts-nocheck
// Extracted from battle/index.html. Keep rule changes parity-driven.
export const MAX_HP = 20;
export const MAX_ENERGY = 3;
export const MAX_CHARGE = 10;

// === 角色数据（含真人皮肤） ===
// === 从主游戏 localStorage 读 battleSkins，覆盖 HEROES 默认 skinImage ===
// （V2.0 上后端后，这里会改成从云端拉用户当前皮肤设置）
export type BattleState = {
  hp: number;
  energy: number;
  charge: number;
  combo: number;
  cstreak: number;
};

export function normalizeSkinSource(src) {
  if (!src) return src;
  if (/^(https?:|data:|\/)/.test(src)) return src;
  return '/' + src.replace(/^(\.\.\/)+/, '');
}

function _loadBattleSkinOverrides() {
  try {
    // V2 主游戏 key: memoria-network-state ｜ V1 兼容: memoria-yanzi-state / yanzi-gacha-state
    const raw = localStorage.getItem('memoria-network-state')
             || localStorage.getItem('memoria-yanzi-state')
             || localStorage.getItem('yanzi-gacha-state');
    if (!raw) return {};
    const state = JSON.parse(raw);
    const bs = state.battleSkins || {};
    // bs = { A: 'charId_idx', B: ..., C: ... }
    // 需要把 'charId_idx' 映射回 img src
    // 兼容简单做法：直接存 src 也可以，这里假设是 key
    const out = {};
    Object.keys(bs).forEach(letter => {
      const key = bs[letter];
      if (!key) return;
      // key 格式 'charId_idx'
      const [charId, idxStr] = key.split('_');
      const idx = parseInt(idxStr);
      // CHARACTERS 来自主游戏 cards.js，battle 是独立页面读不到
      // 退而求其次：直接用 state.skinSrcCache（如有），或者依赖主游戏写入的 _battleSkinSrcs
      const cache = state._battleSkinSrcs || {};
      if (cache[key]) {
        // 主游戏 src 是相对根目录的（img/...），iframe 在 /battle/ 下需要加 ../
        let src = cache[key];
        out[letter] = normalizeSkinSource(src);
      }
    });
    return out;
  } catch (e) { return {}; }
}
const _skinOverrides = _loadBattleSkinOverrides();

export const HEROES = [
  {
    id: 'A', letter: 'Y', name: '妍子', nameCN: '妍 子', archetype: 'YANZI · STRIKE',
    desc: '触达基础伤害 3——连击 3/4/5，主动出击型',
    skinImage: _skinOverrides.A || '/img/2B/DSC03676-5000.webp',
    attackBase: 3, comboMax: 2, blockReflect: 1, guardReflect: 1, chargeBoost: 0,
    ultimate: {
      id: 'blaze', cn: '烈 触 达', en: 'BLAZE TOUCH',
      trigger: { type: 'combo', value: 3 },
      triggerCN: '连击 ≥ 3',
      effect: '下次触达 · 伤害 +2 · 穿透守护',
      tagline: '焰息共鸣 · 一击破阵',
      color: '#FF8A5C',
      tint: 'rgba(255,138,92,0.85)',
      gradient: 'linear-gradient(135deg, #FF6B3C, #FFD24A 55%, #FFB8D9)',
    },
  },
  {
    id: 'B', letter: 'X', name: '小雨', nameCN: '小 雨', archetype: 'XIAOYU · REFLECT',
    desc: '反伤 +1 · 每被命中 2 次自动 +1 能量（反击型）',
    skinImage: _skinOverrides.B || '/img/小雨/xy-1.webp',
    attackBase: 2, comboMax: 2, blockReflect: 2, guardReflect: 2, chargeBoost: 0,
    ultimate: {
      id: 'echo', cn: '共 鸣 回 响', en: 'RESONANCE ECHO',
      trigger: { type: 'hp_lte', value: 8 },
      triggerCN: 'HP ≤ 8',
      effect: '两回合内 · 防御反伤回血 = 反伤值 ×150% + 2',
      tagline: '心跳尚存 · 频率回响',
      color: '#C4A0FF',
      tint: 'rgba(196,160,255,0.85)',
      gradient: 'linear-gradient(135deg, #B580FF, #FFB8D9 55%, #7BC9FF)',
    },
  },
  {
    id: 'C', letter: 'A', name: 'Aria', nameCN: 'Aria', archetype: 'ARIA · OVERFLOW',
    desc: '虚拟 Memoria · 极光少女 · 原创 IP · 连蓄递增更快——聚频 2/4/7/11，爆发型',
    skinImage: _skinOverrides.C || '/spec/assets/virtual/aria/v1.webp',
    attackBase: 2, comboMax: 2, blockReflect: 1, guardReflect: 1, chargeBoost: 1,
    ultimate: {
      id: 'overflow', cn: '共 鸣 溢 出', en: 'OVERFLOW',
      trigger: { type: 'charge', value: 8 },
      triggerCN: '蓄能 ≥ 8',
      effect: '下次爆响 · 穿透守护 · 蓄能不消耗',
      tagline: '极光不熄 · 频率永续',
      color: '#FFD89B',
      tint: 'rgba(255,216,155,0.85)',
      gradient: 'linear-gradient(135deg, #FFD24A, #FFB8D9 55%, #7BC9FF)',
    },
  },
];

export const ACTIONS = [
  { id: 'attack', name: '触达', en: 'attack', cls: 'attack' },
  { id: 'power',  name: '爆响', en: 'power',  cls: 'power' },
  { id: 'block',  name: '守护', en: 'block',  cls: 'block' },
  { id: 'guard',  name: '凝固', en: 'guard',  cls: 'guard' },
  { id: 'charge', name: '聚频', en: 'charge', cls: 'charge' },
  { id: 'break',  name: '散频', en: 'break',  cls: 'break' },
];
export const ACTION_LABEL = Object.fromEntries(ACTIONS.map(a => [a.id, a.name]));

export function ActionGlyph({ action, size = 36 }) {
  const p = { width: size, height: size, viewBox: "0 0 100 100", fill: "none", stroke: "currentColor", strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch(action) {
    case 'attack': return (<svg {...p}><path d="M 18 50 L 70 50"/><path d="M 56 32 L 84 50 L 56 68"/></svg>);
    case 'power': return (<svg {...p}><circle cx="50" cy="50" r="10" fill="currentColor" stroke="none"/><line x1="50" y1="12" x2="50" y2="28"/><line x1="50" y1="72" x2="50" y2="88"/><line x1="12" y1="50" x2="28" y2="50"/><line x1="72" y1="50" x2="88" y2="50"/><line x1="24" y1="24" x2="34" y2="34"/><line x1="66" y1="66" x2="76" y2="76"/><line x1="76" y1="24" x2="66" y2="34"/><line x1="34" y1="66" x2="24" y2="76"/></svg>);
    case 'block': return (<svg {...p}><path d="M 50 14 L 80 25 V 50 Q 80 76 50 88 Q 20 76 20 50 V 25 Z"/><path d="M 38 50 L 46 58 L 62 42"/></svg>);
    case 'guard': return (<svg {...p}><polygon points="50,12 84,32 84,68 50,88 16,68 16,32"/><line x1="50" y1="12" x2="50" y2="88"/><line x1="16" y1="32" x2="84" y2="68"/><line x1="84" y1="32" x2="16" y2="68"/></svg>);
    case 'charge': return (<svg {...p}><path d="M 30 78 Q 38 60, 50 50 Q 62 40, 70 22"/><path d="M 58 22 L 72 22 L 72 36"/><circle cx="30" cy="78" r="3" fill="currentColor" stroke="none"/></svg>);
    case 'break': return (<svg {...p}><circle cx="50" cy="50" r="26" strokeDasharray="6 5"/><line x1="22" y1="22" x2="78" y2="78"/><line x1="78" y1="22" x2="22" y2="78"/></svg>);
    default: return null;
  }
}

const BEATS = { signal: 'echo', echo: 'resonance', resonance: 'signal' };
export function chargeInc(streak, hero) {
  const base = [1, 3, 6, 10, 14, 18];
  return base[Math.min(streak, 5)] + (hero.chargeBoost || 0);
}

export function resolveTurn(pAct, eAct, pSt, eSt, pH, eH, cfg = {}) {
  const pSpend = pAct === 'power' ? Math.max(1, Math.min(pSt.charge, cfg.pSpend ?? pSt.charge)) : 0;
  const eSpend = eAct === 'power' ? Math.max(1, Math.min(eSt.charge, cfg.eSpend ?? eSt.charge)) : 0;
  const pAtkDmg = pAct === 'attack' ? pH.attackBase + Math.min(pSt.combo, pH.comboMax) : 0;
  const eAtkDmg = eAct === 'attack' ? eH.attackBase + Math.min(eSt.combo, eH.comboMax) : 0;
  const pPwrDmg = pAct === 'power' ? 1 + pSpend : 0;
  const ePwrDmg = eAct === 'power' ? 1 + eSpend : 0;
  const pPwrLeft = pAct === 'power' ? pSt.charge - pSpend : pSt.charge;
  const ePwrLeft = eAct === 'power' ? eSt.charge - eSpend : eSt.charge;
  const r = { pDmg: 0, eDmg: 0, pE: pSt.energy, eE: eSt.energy, pC: pSt.charge, eC: eSt.charge, pCb: 0, eCb: 0, pCs: 0, eCs: 0, msg: '', event: null };
  const key = pAct + '_' + eAct;
  switch (key) {
    case 'attack_attack': r.pDmg = eAtkDmg; r.eDmg = pAtkDmg; r.pCb = pSt.combo + 1; r.eCb = eSt.combo + 1; r.msg = `互殴 · 你扣 ${eAtkDmg}，对方扣 ${pAtkDmg}`; break;
    case 'attack_power':
      if (eSpend >= 5) { r.pDmg = ePwrDmg; r.eDmg = pAtkDmg; r.eC = ePwrLeft; r.pCb = pSt.combo + 1; r.msg = `对方穿透爆响 · 你扣 ${ePwrDmg}，对方扣 ${pAtkDmg}`; }
      else { r.eDmg = pAtkDmg; r.pCb = pSt.combo + 1; r.msg = `普攻打断强攻 · 对方扣 ${pAtkDmg}，对方蓄能保留`; }
      break;
    case 'attack_block': r.pDmg = eH.blockReflect; r.pCb = 0; r.msg = `对方普防反伤 · 你扣 ${r.pDmg}，连击中断`; break;
    case 'attack_guard': r.pDmg = eH.guardReflect; r.eE = Math.max(0, eSt.energy - 2); r.pCb = 0; r.msg = `对方有效防反伤 · 你扣 ${r.pDmg}，连击中断`; break;
    case 'attack_charge': r.eDmg = pAtkDmg; r.pCb = pSt.combo + 1; r.eC = Math.min(10, eSt.charge + chargeInc(eSt.cstreak, eH)); r.eCs = eSt.cstreak + 1; r.msg = `你打中蓄能中对方 · 对方扣 ${pAtkDmg} 但点数照收`; break;
    case 'attack_break': r.eDmg = pAtkDmg; r.eE = Math.max(0, eSt.energy - 1); r.pCb = pSt.combo + 1; r.msg = `你打中破蓄中对方 · 对方扣 ${pAtkDmg}+1 能量浪费`; break;
    case 'power_attack':
      if (pSpend >= 5) { r.eDmg = pPwrDmg; r.pDmg = eAtkDmg; r.pC = pPwrLeft; r.eCb = eSt.combo + 1; r.msg = `穿透爆响 · 对方扣 ${pPwrDmg}，你扣 ${eAtkDmg}`; r.event = 'burst'; }
      else { r.pDmg = eAtkDmg; r.eCb = eSt.combo + 1; r.msg = `对方普攻打断你强攻 · 你扣 ${eAtkDmg}，蓄能保留`; }
      break;
    case 'power_power':
      if (pPwrDmg > ePwrDmg) { r.eDmg = pPwrDmg - ePwrDmg; r.msg = `强攻对轰 · 对方扣 ${r.eDmg}`; if (pSpend >= 4) r.event = 'burst'; }
      else if (ePwrDmg > pPwrDmg) { r.pDmg = ePwrDmg - pPwrDmg; r.msg = `强攻对轰 · 你扣 ${r.pDmg}`; }
      else { r.msg = `强攻同轰 · 双方不扣血`; }
      r.pC = pPwrLeft; r.eC = ePwrLeft; break;
    case 'power_block': r.eDmg = pPwrDmg; r.msg = `强攻穿透普防 · 对方扣 ${pPwrDmg}`; r.pC = pPwrLeft; if (pSpend >= 4) r.event = 'burst'; break;
    case 'power_guard': {
      const bonus = Math.floor(pSpend / 3);
      r.pDmg = eH.guardReflect + bonus; r.eE = Math.max(0, eSt.energy - 2); r.pC = pPwrLeft;
      r.msg = bonus > 0 ? `对方凝固反震 · 你扣 ${r.pDmg}（+${bonus} 蓄能加成）` : `对方有效防挡下强攻 · 你扣 ${r.pDmg}`;
      break;
    }
    case 'power_charge': r.eDmg = pPwrDmg; r.pC = pPwrLeft; r.eC = eSt.charge; r.msg = `强攻打断对方蓄能 · 对方扣 ${pPwrDmg}（对方蓄能保留 · 本回合 +0）`; if (pSpend >= 4) r.event = 'burst'; break;
    case 'power_break': r.eDmg = pPwrDmg; r.eE = Math.max(0, eSt.energy - 1); r.pC = pPwrLeft; r.msg = `强攻命中破蓄 · 对方扣 ${pPwrDmg}`; if (pSpend >= 4) r.event = 'burst'; break;
    case 'block_attack': r.eDmg = pH.blockReflect; r.eCb = 0; r.msg = `你普防反伤 · 对方扣 ${r.eDmg}，对方连击中断`; break;
    case 'block_power': r.pDmg = ePwrDmg; r.msg = `对方强攻穿透你普防 · 你扣 ${ePwrDmg}`; r.eC = ePwrLeft; break;
    case 'block_block': r.msg = `双方对峙`; break;
    case 'block_guard': r.eE = Math.max(0, eSt.energy - 2); r.msg = `双方对峙 · 对方 -2 能量`; break;
    case 'block_charge': r.eC = Math.min(10, eSt.charge + chargeInc(eSt.cstreak, eH)); r.eCs = eSt.cstreak + 1; r.msg = `对方安全蓄能 +${chargeInc(eSt.cstreak, eH)}`; break;
    case 'block_break': r.eE = Math.max(0, eSt.energy - 1); r.msg = `对方破蓄落空 · -1 能量`; break;
    case 'guard_attack': r.eDmg = pH.guardReflect; r.pE = Math.max(0, pSt.energy - 2); r.eCb = 0; r.msg = `你有效防反伤 · 对方扣 ${r.eDmg}`; break;
    case 'guard_power': {
      const bonus = Math.floor(eSpend / 3);
      r.eDmg = pH.guardReflect + bonus; r.pE = Math.max(0, pSt.energy - 2); r.eC = ePwrLeft;
      r.msg = bonus > 0 ? `凝固反震 · 对方扣 ${r.eDmg}（+${bonus} 蓄能加成）` : `你有效防挡下强攻 · 对方扣 ${r.eDmg}`;
      break;
    }
    case 'guard_block': r.pE = Math.max(0, pSt.energy - 2); r.msg = `双方对峙 · 你 -2 能量`; break;
    case 'guard_guard': r.pE = Math.max(0, pSt.energy - 2); r.eE = Math.max(0, eSt.energy - 2); r.msg = `双方对峙 · 各 -2 能量`; break;
    case 'guard_charge': r.pE = Math.max(0, pSt.energy - 2); r.eC = Math.min(10, eSt.charge + chargeInc(eSt.cstreak, eH)); r.eCs = eSt.cstreak + 1; r.msg = `你举盾落空，对方蓄能 +${chargeInc(eSt.cstreak, eH)}`; break;
    case 'guard_break': r.pE = Math.max(0, pSt.energy - 2); r.eE = Math.max(0, eSt.energy - 1); r.msg = `双方资源浪费`; break;
    case 'charge_attack': r.pDmg = eAtkDmg; r.eCb = eSt.combo + 1; r.pC = Math.min(10, pSt.charge + chargeInc(pSt.cstreak, pH)); r.pCs = pSt.cstreak + 1; r.msg = `你蓄能被打 · 你扣 ${eAtkDmg} 但点数照收`; break;
    case 'charge_power': r.pDmg = ePwrDmg; r.pC = pSt.charge; r.eC = ePwrLeft; r.msg = `你蓄能被强攻打断 · 你扣 ${ePwrDmg}，本回合 +0（已有蓄能保留）`; break;
    case 'charge_block': r.pC = Math.min(10, pSt.charge + chargeInc(pSt.cstreak, pH)); r.pCs = pSt.cstreak + 1; r.msg = `你安全蓄能 +${chargeInc(pSt.cstreak, pH)}`; break;
    case 'charge_guard': r.pC = Math.min(10, pSt.charge + chargeInc(pSt.cstreak, pH)); r.pCs = pSt.cstreak + 1; r.eE = Math.max(0, eSt.energy - 2); r.msg = `你安全蓄能 +${chargeInc(pSt.cstreak, pH)}`; break;
    case 'charge_charge': {
      const pInc = Math.max(1, Math.floor(chargeInc(pSt.cstreak, pH) / 2));
      const eInc = Math.max(1, Math.floor(chargeInc(eSt.cstreak, eH) / 2));
      r.pC = Math.min(10, pSt.charge + pInc); r.eC = Math.min(10, eSt.charge + eInc);
      r.pCs = pSt.cstreak + 1; r.eCs = eSt.cstreak + 1;
      r.msg = `双方对蓄 · 你 +${pInc}，对方 +${eInc}（减半）`;
      break;
    }
    case 'charge_break': r.pC = 0; r.eE = Math.max(0, eSt.energy - 1); r.eC = Math.min(10, eSt.charge + 3); r.msg = `你蓄能被破 · 清零，对方偷取 3 点`; r.event = 'break_success'; break;
    case 'break_attack': r.pDmg = eAtkDmg; r.pE = Math.max(0, pSt.energy - 1); r.eCb = eSt.combo + 1; r.msg = `你破蓄被打 · 你扣 ${eAtkDmg}`; break;
    case 'break_power': r.pDmg = ePwrDmg; r.pE = Math.max(0, pSt.energy - 1); r.eC = ePwrLeft; r.msg = `你破蓄被强攻 · 你扣 ${ePwrDmg}`; break;
    case 'break_block': r.pE = Math.max(0, pSt.energy - 1); r.msg = `你破蓄落空 · -1 能量`; break;
    case 'break_guard': r.pE = Math.max(0, pSt.energy - 1); r.eE = Math.max(0, eSt.energy - 2); r.msg = `双方资源浪费`; break;
    case 'break_charge': r.eC = 0; r.pE = Math.max(0, pSt.energy - 1); r.pC = Math.min(10, pSt.charge + 3); r.msg = `破蓄成功 · 对方清零，你偷取 3 点`; r.event = 'break_success'; break;
    case 'break_break': r.pE = Math.max(0, pSt.energy - 1); r.eE = Math.max(0, eSt.energy - 1); r.msg = `双方破蓄 · 各 -1 能量`; break;
    default: r.msg = '???';
  }
  return r;
}

/* === AI 共用工具：玩家行动预测 + EV 评估 === */
// 预测主体方下一招的概率分布（subj 视角，foe 是其对手）
export function predictActionDist(subj, foe, subjH, foeH, recentSubjActs = []) {
  const d = { attack: 0.24, power: 0, block: 0.16, guard: 0, charge: 0.22, break: 0 };
  // 资源前置
  d.power = subj.charge >= 1 ? (subj.charge >= 4 ? 0.26 : 0.12) : 0;
  d.guard = subj.energy >= 2 ? 0.12 : 0;
  d.break = (subj.energy >= 1 && foe.charge >= 2) ? (foe.charge >= 4 ? 0.32 : 0.08) : 0;
  // 威胁倾向：对方蓄能高 → 防/破
  if (foe.charge >= 5) { d.break += 0.30; d.guard += 0.18; d.attack -= 0.15; d.charge -= 0.10; }
  else if (foe.charge >= 3) { d.break += 0.10; d.guard += 0.05; }
  // 对方能量低 → 玩家敢爆响
  if (foe.energy < 2 && subj.charge >= 3) d.power += 0.18;
  // 自己已连击 → 倾向继续触达
  if (subj.combo >= 1) d.attack += 0.10;
  // HP 危险 → 倾向防御
  if (subj.hp / MAX_HP < 0.25) { d.block += 0.10; d.guard += 0.05; d.attack -= 0.06; }
  // 反读最近行为
  for (const act of recentSubjActs) {
    if (act && d[act] !== undefined) d[act] += 0.07;
  }
  // 钳制 + 归一化
  for (const k in d) d[k] = Math.max(0, d[k]);
  const sum = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  for (const k in d) d[k] /= sum;
  return d;
}

// 我视角 (mySt, oppSt) 出 myAct 对方出 oppAct 的得分（越大越好）
export function scoreOutcome(myAct, mySpend, oppAct, mySt, oppSt, myH, oppH) {
  const r = resolveTurn(myAct, oppAct, mySt, oppSt, myH, oppH, { pSpend: mySpend });
  const dmgDiff = r.eDmg - r.pDmg;
  const chargeDiff = (r.pC - mySt.charge) - (r.eC - oppSt.charge);
  const energyDiff = (r.pE - mySt.energy) - (r.eE - oppSt.energy);
  const newMyHp = mySt.hp - r.pDmg, newOppHp = oppSt.hp - r.eDmg;
  let endBonus = 0;
  if (newOppHp <= 0) endBonus = 120;
  if (newMyHp <= 0) endBonus = -150;
  let cliff = 0;
  if (newMyHp <= 3 && r.pDmg > 0) cliff -= 8;
  if (newMyHp <= 5 && r.pDmg >= 4) cliff -= 4;
  const comboFut = (r.pCb >= 2 ? 1.2 : 0) - (r.eCb >= 2 ? 1.2 : 0);
  // 推进性：鼓励攻击 / 蓄能 / 散频，惩罚双方都摸鱼的僵局
  let tempo = 0;
  if (myAct === 'attack') tempo += 1.2;
  else if (myAct === 'charge') tempo += 0.7;
  else if (myAct === 'break') tempo += 0.5;
  else if (myAct === 'power') tempo += 0.4;
  const noProgress = r.pDmg === 0 && r.eDmg === 0
                    && (r.pC - mySt.charge) === 0 && (r.eC - oppSt.charge) === 0
                    && (myAct === 'block' || myAct === 'guard');
  if (noProgress) tempo -= 2.5;
  return dmgDiff * 1.4 + chargeDiff * 0.6 + energyDiff * 0.25 + endBonus + cliff + comboFut + tempo;
}

export function generateCandidates(mySt) {
  const out = [{ a: 'attack', s: 0 }, { a: 'block', s: 0 }, { a: 'charge', s: 0 }];
  if (mySt.energy >= 2) out.push({ a: 'guard', s: 0 });
  if (mySt.energy >= 1) out.push({ a: 'break', s: 0 });
  if (mySt.charge >= 1) {
    const set = new Set([mySt.charge]);
    if (mySt.charge >= 5) set.add(5);
    if (mySt.charge >= 3) set.add(Math.max(1, Math.floor(mySt.charge / 2)));
    if (mySt.charge >= 2) set.add(1);
    for (const s of set) out.push({ a: 'power', s });
  }
  return out;
}

export function evaluateEV(myAct, mySpend, mySt, oppSt, myH, oppH, dist) {
  let ev = 0;
  for (const oppAct of ['attack','power','block','guard','charge','break']) {
    const p = dist[oppAct] || 0;
    if (p <= 0) continue;
    ev += p * scoreOutcome(myAct, mySpend, oppAct, mySt, oppSt, myH, oppH);
  }
  return ev;
}

/* === 新手档：保留概率分支，加两条安全栏 === */
// 技能 charged 时引导 AI 选对应动作：blaze→attack / echo→block(or guard) / overflow→power
export function ultPreferredAction(myUlt, myHero, myState) {
  if (!myUlt?.charged || myUlt.used) return null;
  const uid = myHero?.ultimate?.id;
  if (uid === 'blaze') return { action: 'attack', spend: 0 };
  if (uid === 'echo') {
    if (myState.energy >= 2 && Math.random() < 0.45) return { action: 'guard', spend: 0 };
    return { action: 'block', spend: 0 };
  }
  if (uid === 'overflow' && myState.charge >= 1) return { action: 'power', spend: myState.charge };
  return null;
}

export function aiPickActionNewbie(myState, oppState, myHero, oppHero, history, myUlt) {
  // 技能 charged 必选对应动作（85% 概率，避免浪费）
  const pref = ultPreferredAction(myUlt, myHero, myState);
  if (pref && Math.random() < 0.85) return pref;
  const r = Math.random();
  const myCharge = myState.charge, oppCharge = oppState.charge;
  const myEnergy = myState.energy, oppEnergy = oppState.energy;
  // 安全栏 1：对方蓄能 ≥5（穿透阈值）必防
  if (oppCharge >= 5) {
    if (myEnergy >= 2 && Math.random() < 0.55) return { action: 'guard', spend: 0 };
    if (myEnergy >= 1 && Math.random() < 0.85) return { action: 'break', spend: 0 };
  }
  let action;
  if (oppCharge >= 4) { if (myEnergy >= 1 && r < 0.55) action = 'break'; else action = 'attack'; }
  else if (myCharge >= 4 && oppEnergy === 0 && r < 0.75) action = 'power';
  else if (myCharge >= 3) { if (r < 0.35) action = 'power'; else if (r < 0.55) action = 'attack'; else if (r < 0.75) action = 'charge'; else action = 'block'; }
  else if (myCharge >= 1) { if (r < 0.30) action = 'charge'; else if (r < 0.55) action = 'attack'; else if (r < 0.75) action = 'block'; else action = 'power'; }
  else { if (r < 0.45) action = 'attack'; else if (r < 0.75) action = 'charge'; else if (r < 0.90) action = 'block'; else action = 'attack'; }
  let spend = 0;
  if (action === 'power') {
    // 安全栏 2：spend 智能
    if (oppEnergy < 2) spend = myCharge;
    else if (myCharge >= 5 && Math.random() < 0.4) spend = 5; // 试穿透
    else spend = Math.max(1, Math.floor(myCharge * (0.5 + Math.random() * 0.4)));
  }
  return { action, spend };
}

/* === 中阶档：EV + 弱反读 + 软选 top3 === */
export function aiPickActionAdept(myState, oppState, myHero, oppHero, history = [], myUlt) {
  // 技能 charged 时 95% 选对应动作（中阶高度倾向用好技能）
  const pref = ultPreferredAction(myUlt, myHero, myState);
  if (pref && Math.random() < 0.95) return pref;
  const recent = history.slice(0, 3).map(h => h.pAct);
  const dist = predictActionDist(oppState, myState, oppHero, myHero, recent);
  const cands = generateCandidates(myState);
  const scored = cands.map(c => ({
    a: c.a, s: c.s,
    score: evaluateEV(c.a, c.s, myState, oppState, myHero, oppHero, dist)
  })).sort((a, b) => b.score - a.score);
  const r = Math.random();
  const pick = r < 0.80 ? scored[0]
             : r < 0.95 ? (scored[1] || scored[0])
             : (scored[2] || scored[0]);
  return { action: pick.a, spend: pick.s };
}

/* === 高阶档：5 回合反读 + 95% 最优 === */
export function aiPickActionMaster(myState, oppState, myHero, oppHero, history = [], myUlt) {
  const pref = ultPreferredAction(myUlt, myHero, myState);
  if (pref) return pref; // 高阶必用对应动作
  const recent = history.slice(0, 5).map(h => h.pAct);
  const dist = predictActionDist(oppState, myState, oppHero, myHero, recent);
  const cands = generateCandidates(myState);
  const scored = cands.map(c => ({
    a: c.a, s: c.s,
    score: evaluateEV(c.a, c.s, myState, oppState, myHero, oppHero, dist)
  })).sort((a, b) => b.score - a.score);
  const pick = Math.random() < 0.95 ? scored[0] : (scored[1] || scored[0]);
  return { action: pick.a, spend: pick.s };
}

export function aiPickAction(myState, oppState, myHero, oppHero, history = [], difficulty = 'adept', myUlt) {
  if (difficulty === 'newbie') return aiPickActionNewbie(myState, oppState, myHero, oppHero, history, myUlt);
  if (difficulty === 'master') return aiPickActionMaster(myState, oppState, myHero, oppHero, history, myUlt);
  return aiPickActionAdept(myState, oppState, myHero, oppHero, history, myUlt);
}

// 战术提示
export function getTacticalHint(pSt, eSt, pH) {
  if (pSt.charge >= 5) return '蓄能领先 · 穿透阈值已达 · 可终结';
  if (eSt.charge >= 5) return '对方蓄能爆点 · 警戒穿透';
  if (eSt.charge >= 4 && pSt.energy >= 1) return '对方蓄能高 · 可散频偷点数';
  if (eSt.energy >= 2 && pSt.charge >= 3) return '对方凝固准备就绪 · 强攻试探';
  if (pSt.energy >= 2 && eSt.charge >= 3) return '可凝固反震对方爆响';
  if (pSt.combo >= 2) return '连击 ×' + pSt.combo + ' · 下次普攻翻倍';
  return '同时翻牌 · 快攻打断慢攻';
}

export function commitPreview(pAct, powerSpend, pSt, pH, defStreak = { block: 0, guard: 0 }) {
  if (!pAct) return null;
  if (pAct === 'attack') return { result: `伤害 ${pH.attackBase + Math.min(pSt.combo, pH.comboMax)}`, effect: '快攻 · 可被守护反' };
  if (pAct === 'power') return { result: `伤害 ${1 + powerSpend}`, effect: powerSpend >= 5 ? '穿透打断 · 凝固才能挡' : '可被普攻打断' };
  if (pAct === 'block') {
    const bonus = Math.min(defStreak.block || 0, 3);
    return { result: `反 ${pH.blockReflect}${bonus > 0 ? `+${bonus}谐振` : ''}`, effect: defStreak.block === 2 ? '⚡ 下次成功触发反震谐振' : '挡触达 · 挡不住强攻' };
  }
  if (pAct === 'guard') {
    const bonus = Math.min(defStreak.guard || 0, 3);
    return { result: `反 ${pH.guardReflect}+${bonus > 0 ? ` +${bonus}谐振` : ''}`, effect: defStreak.guard === 2 ? '⚡ 下次成功触发反震谐振' : '挡所有 · 消 2 能量' };
  }
  if (pAct === 'charge') return { result: `+${chargeInc(pSt.cstreak, pH)} 蓄能`, effect: '被散频清零（强攻只打断不清）' };
  if (pAct === 'break') return { result: '清对方蓄能 + 偷 2 点', effect: '消 1 能量 · 仅对方蓄能时' };
  return null;
}
