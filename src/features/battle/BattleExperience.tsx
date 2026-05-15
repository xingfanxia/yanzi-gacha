// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTION_LABEL,
  ACTIONS,
  ActionGlyph,
  HEROES,
  MAX_CHARGE,
  MAX_ENERGY,
  MAX_HP,
  aiPickAction,
  chargeInc,
  commitPreview,
  evaluateEV,
  generateCandidates,
  getTacticalHint,
  predictActionDist,
  resolveTurn,
  scoreOutcome,
  ultPreferredAction,
} from "./model";

// === 音效系统 ===
const sfx = {
  ctx: null, master: null, reverb: null, muted: false,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
      comp.connect(this.master); this.master.connect(this.ctx.destination);
      const sr = this.ctx.sampleRate; const len = Math.floor(sr * 2.5);
      const impulse = this.ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      }
      this.reverb = this.ctx.createConvolver(); this.reverb.buffer = impulse;
      this.reverbSend = this.ctx.createGain(); this.reverbSend.gain.value = 1;
      this.reverb.connect(this.reverbSend); this.reverbSend.connect(comp);
      this.dryOut = comp;
    } catch(e){}
  },
  tone({ freq=440, freqEnd, dur=0.4, type='sine', vol=0.12, delay=0, attack=0.06, release=0.3, reverb=0.5, detune=0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.value = detune;
    if (freqEnd != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    const total = dur + release;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + total);
    o.connect(g);
    const dry = this.ctx.createGain(); dry.gain.value = 1 - reverb; g.connect(dry); dry.connect(this.dryOut);
    if (reverb > 0) { const wet = this.ctx.createGain(); wet.gain.value = reverb; g.connect(wet); wet.connect(this.reverb); }
    o.start(t); o.stop(t + total + 0.1);
  },
  noise({ dur=0.2, vol=0.1, freq=1000, q=1, delay=0, attack=0.02, reverb=0.5 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay; const total = dur + 0.4;
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * total)), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filter = this.ctx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=freq; filter.Q.value=q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g);
    const dry = this.ctx.createGain(); dry.gain.value = 1 - reverb; g.connect(dry); dry.connect(this.dryOut);
    if (reverb > 0) { const wet = this.ctx.createGain(); wet.gain.value = reverb; g.connect(wet); wet.connect(this.reverb); }
    src.start(t);
  },
  play(name) {
    this.init(); if (!this.ctx || this.muted) return;
    switch (name) {
      case 'select': this.tone({ freq: 1760, dur: 0.06, vol: 0.06, attack: 0.005, release: 0.2, reverb: 0.7 }); break;
      case 'attack': this.tone({ freq: 1320, dur: 0.08, vol: 0.1, attack: 0.005, release: 0.4, reverb: 0.7 }); this.tone({ freq: 2640, dur: 0.06, vol: 0.05, attack: 0.01, release: 0.5, reverb: 0.7, delay: 0.02 }); break;
      case 'power': this.tone({ freq: 80, dur: 0.6, vol: 0.16, attack: 0.04, release: 0.8, reverb: 0.6 }); this.tone({ freq: 120, dur: 0.6, vol: 0.1, attack: 0.05, release: 0.8, reverb: 0.7 }); this.tone({ freq: 200, dur: 0.5, vol: 0.06, attack: 0.06, release: 0.8, reverb: 0.7 }); break;
      case 'block': this.tone({ freq: 440, dur: 0.3, vol: 0.09, attack: 0.04, release: 0.5, reverb: 0.6 }); this.tone({ freq: 660, dur: 0.3, vol: 0.06, attack: 0.04, release: 0.5, reverb: 0.6 }); break;
      case 'guard': this.tone({ freq: 880, dur: 0.5, vol: 0.06, attack: 0.03, release: 0.8, reverb: 0.7 }); this.tone({ freq: 1320, dur: 0.5, vol: 0.04, attack: 0.04, release: 0.8, reverb: 0.7, delay: 0.02 }); this.tone({ freq: 1760, dur: 0.45, vol: 0.03, attack: 0.05, release: 0.8, reverb: 0.8, delay: 0.04 }); break;
      case 'charge': this.tone({ freq: 220, freqEnd: 660, dur: 0.5, vol: 0.08, attack: 0.05, release: 0.5, reverb: 0.6 }); this.tone({ freq: 440, freqEnd: 1320, dur: 0.5, vol: 0.04, attack: 0.06, release: 0.5, reverb: 0.7 }); break;
      case 'break': this.tone({ freq: 1200, freqEnd: 60, dur: 0.18, vol: 0.12, attack: 0.005, release: 0.5, reverb: 0.6 }); this.noise({ dur: 0.1, vol: 0.05, freq: 3500, q: 6, reverb: 0.5 }); break;
      case 'hit': this.tone({ freq: 60, dur: 0.18, vol: 0.22, attack: 0.005, release: 0.3, reverb: 0.3 }); this.tone({ freq: 90, dur: 0.18, vol: 0.12, attack: 0.005, release: 0.3, reverb: 0.4 }); break;
      case 'burst': this.tone({ freq: 55, dur: 1.4, vol: 0.22, attack: 0.04, release: 1.2, reverb: 0.7 }); this.tone({ freq: 82, dur: 1.4, vol: 0.14, attack: 0.05, release: 1.2, reverb: 0.7 }); this.tone({ freq: 165, dur: 1.2, vol: 0.08, attack: 0.06, release: 1.2, reverb: 0.8 }); this.noise({ dur: 0.5, vol: 0.08, freq: 600, q: 0.3, reverb: 0.8, attack: 0.05 }); break;
      case 'slash': this.tone({ freq: 2200, freqEnd: 110, dur: 0.22, vol: 0.1, attack: 0.005, release: 0.6, reverb: 0.7 }); this.noise({ dur: 0.15, vol: 0.08, freq: 5500, q: 8, reverb: 0.5 }); break;
      case 'win': [880, 1320, 1760, 2200, 2640].forEach((f, i) => this.tone({ freq: f, dur: 1.6 - i*0.15, vol: 0.07 - i*0.008, attack: 0.15, release: 1.2, reverb: 0.85, delay: i*0.18 })); break;
      case 'lose': this.tone({ freq: 220, freqEnd: 55, dur: 1.2, vol: 0.14, attack: 0.08, release: 1.0, reverb: 0.75 }); this.tone({ freq: 110, freqEnd: 40, dur: 1.4, vol: 0.08, attack: 0.1, release: 1.2, reverb: 0.8, delay: 0.15 }); break;
    }
  },
};

// ============ App ============
export function BattleExperience({ embedded = false } = {}) {
  useEffect(() => {
    if (embedded) return;
    if (new URLSearchParams(location.search).get('embed') === '1' || window.parent !== window) {
      document.body.classList.add('embed-mode');
    }
    return () => document.body.classList.remove('embed-mode');
  }, []);

  const handleBack = (event) => {
    if (window.parent && window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage({ type: 'memoria-battle-back' }, '*');
    }
  };

  return (
    <div className={`battle-root${embedded ? " embedded" : ""}`}>
      {!embedded && (
        <a href="/" className="back-to-home" id="back-to-home-link" title="返回卡池" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>卡池</span>
        </a>
      )}
      <BattleApp />
    </div>
  );
}

function BattleApp() {
  const [scene, setScene] = useState('prep');
  const [selectedHero, setSelectedHero] = useState(null);
  const [enemyHero, setEnemyHero] = useState(null);
  const [difficulty, setDifficulty] = useState('adept');
  const [winner, setWinner] = useState(null);
  const [stats, setStats] = useState({ rounds: 0 });
  return (
    <div className="phone-shell">
      <div className="aurora" />
      <div className="scan-lines" />
      <div className="grain" />
      <Particles />
      <div className="atmosphere-vignette" />
      {scene === 'prep' && <PrepScreen selected={selectedHero} onSelect={setSelectedHero} difficulty={difficulty} onDifficulty={setDifficulty} onStart={() => { if (selectedHero != null) { setEnemyHero(pickEnemyHero(selectedHero)); setScene('bp'); } }} />}
      {scene === 'bp' && <BpScreen playerHero={selectedHero} enemyHero={enemyHero} onDone={() => setScene('battle')} />}
      {scene === 'battle' && <BattleScreen playerHero={selectedHero} enemyHero={enemyHero} difficulty={difficulty} onEnd={(w, s) => {
        setWinner(w); setStats(s); setScene('result');
        // 通知主游戏更新战斗统计（iframe 模式）
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: w === 'player' ? 'memoria-battle-win' : 'memoria-battle-loss', stats: s }, '*');
        }
      }} />}
      {scene === 'result' && <ResultScreen winner={winner} stats={stats} onReplay={() => { setScene('prep'); setWinner(null); setEnemyHero(null); }} />}
    </div>
  );
}
function pickEnemyHero(playerIdx) {
  const others = [0, 1, 2].filter(i => i !== playerIdx);
  return others[Math.floor(Math.random() * others.length)];
}
function Particles() {
  const particles = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const left = (i * 37 + 13) % 100;
    const delay = ((i * 19) % 90) / 10;
    const duration = 7 + ((i * 11) % 40) / 10;
    const color = i % 3 === 0 ? 'var(--echo)' : i % 3 === 1 ? 'var(--charge)' : 'var(--signal)';
    return {
      left: `${left}%`,
      delay: `${delay}s`,
      duration: `${duration}s`,
      color,
    };
  }), []);
  return (
    <div className="particles">
      {particles.map((p, i) => (
        <div key={i} className="particle" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
      ))}
    </div>
  );
}

const DIFFICULTIES = [
  { id: 'newbie', cn: '新手', en: 'NEWBIE',  hint: '会防穿透 · 强攻智能分配' },
  { id: 'adept',  cn: '中阶', en: 'ADEPT',   hint: 'EV 评估 · 反读最近 3 招' },
  { id: 'master', cn: '高阶', en: 'MASTER',  hint: '5 招建模 · 95% 选最优' },
];
function PrepScreen({ selected, onSelect, difficulty, onDifficulty, onStart }) {
  const diffMeta = DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[1];
  return (
    <div className="scene">
      <div className="brand-row">
        <div className="brand">Memoria · 频率战</div>
        <div className="brand-meta">v3.15</div>
      </div>
      <div className="scene-title">选 一 位 出 战</div>
      <div className="scene-sub">CHOOSE · ONE KEEPER</div>
      <div className="prep-list">
        {HEROES.map((h, i) => (
          <div key={h.id} className={`choose-card ${h.id} ${selected === i ? 'selected' : ''}`} onClick={() => onSelect(i)}>
            <div className="choose-portrait"><img src={h.skinImage} alt={h.nameCN} /></div>
            <div className="choose-info">
              <div>
                <div className="choose-cn">{h.nameCN}<span className="ascript">{h.letter}</span></div>
                <div className="choose-arch">{h.archetype}</div>
              </div>
              <div className="choose-desc">{h.desc}</div>
              {h.ultimate && (
                <div className="choose-ult" style={{ '--ult-color': h.ultimate.color }}>
                  <span className="ult-mark">✦</span>
                  <span className="ult-name">{h.ultimate.cn}</span>
                  <span className="ult-cond">{h.ultimate.triggerCN}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="choose-card locked-slot">
          <div className="choose-portrait empty">?</div>
          <div className="choose-info">
            <div>
              <div className="choose-cn">即将加入<span className="ascript">···</span></div>
              <div className="choose-arch">COMING · SOON</div>
            </div>
            <div className="choose-desc">下一位 Memoria 频率正在校准中…</div>
          </div>
        </div>
      </div>
      <div className="diff-block">
        <div className="diff-head">
          <span className="diff-label">对 手 频 段</span>
          <span className="diff-hint">{diffMeta.hint}</span>
        </div>
        <div className="diff-seg">
          {DIFFICULTIES.map(d => (
            <button
              key={d.id}
              className={`diff-pill ${difficulty === d.id ? 'active' : ''}`}
              onClick={() => onDifficulty(d.id)}>
              <span className="diff-cn">{d.cn}</span>
              <span className="diff-en">{d.en}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`cta-hero ${selected == null ? 'disabled' : ''}`} onClick={onStart}>
        <div>
          <div className="cta-name">进 入 共 鸣</div>
          <div className="cta-sub">START · ENTER ARENA</div>
        </div>
        <div className="cta-arrow">→</div>
      </div>
    </div>
  );
}

function BpScreen({ playerHero, enemyHero, onDone }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count <= 0) { onDone(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 850);
    return () => clearTimeout(t);
  }, [count]);
  const pH = HEROES[playerHero];
  const eH = HEROES[enemyHero];
  return (
    <div className="scene bp-scene">
      <div className="bp-bg-energy"></div>
      <div className="bp-bg-rays"></div>
      <div className="brand-row">
        <div className="brand">频率即将对撞</div>
        <div className="brand-meta">BP · LOCK-IN</div>
      </div>
      <div className="bp-content">
        <div className="bp-label enemy">— OPPONENT · STATIC —</div>
        <div className={`bp-portrait ${eH.id} bp-enter-left`}>
          <img src={eH.skinImage} alt={eH.nameCN} />
          <div className="bp-portrait-glow"></div>
        </div>
        <div className="bp-vs-wrap">
          <div className="bp-vs-clash bp-clash-left"></div>
          <div className="bp-vs-clash bp-clash-right"></div>
          <div className="bp-vs">VS</div>
          <div className="bp-vs-spark"></div>
        </div>
        <div className={`bp-portrait ${pH.id} bp-enter-right`}>
          <img src={pH.skinImage} alt={pH.nameCN} />
          <div className="bp-portrait-glow"></div>
        </div>
        <div className="bp-label player">— YOU · KEEPER —</div>
        <div className="bp-countdown">{count > 0 ? `STARTING · ${count}` : 'GO'}</div>
      </div>
    </div>
  );
}

function checkUltTrigger(ult, state) {
  if (!ult) return false;
  const t = ult.trigger;
  if (t.type === 'combo') return state.combo >= t.value;
  if (t.type === 'hp_lte') return state.hp <= t.value;
  if (t.type === 'charge') return state.charge >= t.value;
  return false;
}

const ULT_NEXT_ACTION = { blaze: '触达', echo: '防御', overflow: '爆响' };
function UltPill({ ult, hero, side, onActivate }) {
  if (!hero?.ultimate) return null;
  const u = hero.ultimate;
  const style = { '--ult-color': u.color };
  let cls = 'locked', status = u.triggerCN;
  if (ult.used) { cls = 'used'; status = '已 用 完'; }
  else if (ult.charged) {
    cls = 'charged';
    const act = ULT_NEXT_ACTION[u.id] || '';
    status = ult.remaining > 1 ? `下次${act}生效 · ${ult.remaining}回合` : `下次${act}生效`;
  }
  else if (ult.available) { cls = 'ready'; status = side === 'player' ? '· 点 击 激 活 ·' : '· 待 激 活 ·'; }
  return (
    <div
      className={`ult-pill ${cls}`}
      style={style}
      onClick={cls === 'ready' && onActivate ? onActivate : undefined}>
      <span className="ult-cn">{u.cn}</span>
      <span className="ult-status">{status}</span>
    </div>
  );
}

function HeroInfoPopup({ hero, side, onClose }) {
  if (!hero) return null;
  const u = hero.ultimate;
  const sideColor = side === 'enemy' ? 'var(--danger)' : 'var(--signal)';
  return (
    <div className="hero-info-overlay" onClick={onClose}>
      <div className="hero-info-card" style={{ '--info-color': sideColor, '--ult-color': u?.color }} onClick={e => e.stopPropagation()}>
        <button className="hero-info-close" onClick={onClose}>×</button>
        <div className="hero-info-portrait">
          <img src={hero.skinImage} alt={hero.nameCN} />
          <div className="hero-info-letter">{hero.letter}</div>
        </div>
        <div className="hero-info-body">
          <div className="hero-info-namecn">{hero.nameCN}</div>
          <div className="hero-info-arch">{hero.archetype}</div>
          <div className="hero-info-section">
            <div className="hero-info-label">被 动 · 角 色 特 性</div>
            <div className="hero-info-desc">{hero.desc}</div>
          </div>
          {u && (
            <div className="hero-info-ult">
              <div className="hero-info-ult-head">
                <span className="hero-info-ult-mark">✦</span>
                <span className="hero-info-ult-name">{u.cn}</span>
                <span className="hero-info-ult-cond">{u.triggerCN}</span>
              </div>
              <div className="hero-info-ult-effect">{u.effect}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UltCardOverlay({ hero }) {
  if (!hero?.ultimate) return null;
  const u = hero.ultimate;
  const bgClass = u.id === 'blaze' ? 'ult-bg-blaze' : u.id === 'echo' ? 'ult-bg-echo' : 'ult-bg-overflow';
  // 粒子
  const particles = [];
  if (u.id === 'blaze') {
    for (let i = 0; i < 14; i++) {
      particles.push(<div key={i} className="ember" style={{
        left: `${Math.random()*100}%`,
        '--ex': '0px',
        '--ed': `${(Math.random()-0.5)*60}px`,
        animationDelay: `${Math.random()*1.2}s`,
      }} />);
    }
  } else if (u.id === 'echo') {
    for (let i = 0; i < 4; i++) {
      particles.push(<div key={i} className="ripple" style={{ animationDelay: `${i*0.32}s` }} />);
    }
  } else {
    for (let i = 0; i < 16; i++) {
      particles.push(<div key={i} className="flake" style={{
        left: `${Math.random()*100}%`,
        '--fx': '0px',
        '--fd': `${(Math.random()-0.5)*50}px`,
        animationDelay: `${Math.random()*1.4}s`,
      }} />);
    }
  }
  return (
    <div className="ult-spotlight" style={{ '--ult-color': u.color }}>
      <div className={`ult-spotlight-bg ${bgClass}`}>{particles}</div>
      <div className="ult-spotlight-figure">
        <div className="ult-spotlight-portrait">
          <img src={hero.skinImage} alt={hero.nameCN} />
        </div>
      </div>
      <div className="ult-spotlight-text">
        <div className="letter">{hero.letter} · {hero.archetype.split(' · ')[1] || ''}</div>
        <div className="name">{u.cn}</div>
        <div className="en">{u.en}</div>
        <div className="divider" />
        <div className="tagline">「 {u.tagline} 」</div>
        <div className="effect">{u.effect}</div>
      </div>
    </div>
  );
}

function IdlePreview({ pSt, eSt, pH, hint }) {
  // 优先级：穿透警告 > 终结时机 > 散频时机 > 凝固时机 > 反震时机 > 默认
  const hints = [];
  if (eSt.charge >= 5) hints.push({ text: '对方蓄能 5+ · 警惕穿透', color: 'gold', icon: '⚠' });
  if (pSt.charge >= 5) hints.push({ text: `你 ✦${pSt.charge} · 可终结`, color: 'cyan', icon: '✦' });
  if (eSt.charge >= 4 && pSt.energy >= 1 && hints.length < 2) hints.push({ text: '可散频偷点数', color: 'cyan', icon: '⌁' });
  if (eSt.energy >= 2 && pSt.charge >= 3 && hints.length < 2) hints.push({ text: '对方凝固就绪 · 强攻试探', color: 'risk', icon: '⌁' });
  if (pSt.energy >= 2 && eSt.charge >= 3 && hints.length < 2) hints.push({ text: '可凝固反震', color: 'gold', icon: '◇' });
  if (hints.length === 0) hints.push({ text: hint || '同时翻牌 · 快攻打断慢攻', color: '', icon: '⚖' });
  return (
    <div className="commit-preview tactical">
      <span className="arrow">{hints[0].icon}</span>
      {hints.map((h, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="dot">·</span>}
          <span className={`effect ${h.color}`}>{h.text}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function BattleScreen({ playerHero, enemyHero, difficulty = 'adept', onEnd }) {
  // MAX_HP/ENERGY/CHARGE 已提到模块作用域
  const pH = HEROES[playerHero], eH = HEROES[enemyHero];
  const [pSt, setPSt] = useState({ hp: MAX_HP, energy: 0, charge: 0, combo: 0, cstreak: 0 });
  const [eSt, setESt] = useState({ hp: MAX_HP, energy: 0, charge: 0, combo: 0, cstreak: 0 });
  const [pHitCount, setPHitCount] = useState(0);
  const [eHitCount, setEHitCount] = useState(0);
  const [pDefStreak, setPDefStreak] = useState({ block: 0, guard: 0 });
  const [eDefStreak, setEDefStreak] = useState({ block: 0, guard: 0 });
  const [round, setRound] = useState(1);
  const [pending, setPending] = useState(null);
  const [powerSpend, setPowerSpend] = useState(1);
  const [phase, setPhase] = useState('idle');
  const [reveal, setReveal] = useState(null);
  const [hit, setHit] = useState({ player: false, enemy: false });
  const [msg, setMsg] = useState('选你的频率 · 同时回响');
  const [msgTone, setMsgTone] = useState('');
  const [special, setSpecial] = useState(null);
  const [slash, setSlash] = useState(false);
  const [comboFx, setComboFx] = useState(null);
  const [guardFx, setGuardFx] = useState(null);
  const [resonFx, setResonFx] = useState(null);
  const [atkResonFx, setAtkResonFx] = useState(null);
  const [pUlt, setPUlt] = useState({ available: false, charged: false, used: false, remaining: 0 });
  const [eUlt, setEUlt] = useState({ available: false, charged: false, used: false, remaining: 0 });
  const [heroInfo, setHeroInfo] = useState(null); // { hero, side }
  const [ultCard, setUltCard] = useState(null); // { side, hero }
  // === 双阶段博弈 · 预演 / 反应窗 ===
  const [pFeint, setPFeint] = useState(null);   // 玩家预演（真实选择，用于 resolve）
  const [eFeint, setEFeint] = useState(null);   // 敌方预演（真实选择，用于 resolve）
  const [eFeintShown, setEFeintShown] = useState(null); // 敌方初次预演（仅展示，换招不更新）
  const aiRealActRef = useRef(null); // AI 真招意图（若 feint != realAct）
  const [revealMs, setRevealMs] = useState(0);
  const [pSwitched, setPSwitched] = useState(false); // 玩家本回合是否换过招
  const [eSwitched, setESwitched] = useState(false); // 敌方本回合是否换过招（玩家可见提示）
  const [pCommitted, setPCommitted] = useState(false); // 玩家是否坚守（锁死换招）
  const [eCommitted, setECommitted] = useState(false); // 敌方是否坚守（玩家不可见）
  const [ultFireFx, setUltFireFx] = useState(null); // { side, ultId } 命中演出
  const [damageFloats, setDamageFloats] = useState([]);
  const floatIdRef = useRef(0);
  const [history, setHistory] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  function pushFloat(side, value, type = 'dmg') {
    const id = ++floatIdRef.current;
    setDamageFloats(arr => [...arr, { id, side, value, type }]);
    setTimeout(() => setDamageFloats(arr => arr.filter(f => f.id !== id)), 1100);
  }

  function pickable(actId) {
    if (actId === 'power' && pSt.charge < 1) return false;
    if (actId === 'guard' && pSt.energy < 2) return false;
    if (actId === 'break' && pSt.energy < 1) return false;
    return true;
  }
  function handlePick(actId) {
    if (phase === 'idle') {
      if (!pickable(actId)) return;
      sfx.play('select');
      if (pending === actId) { setPending(null); return; }
      setPending(actId);
      if (actId === 'power') setPowerSpend(pSt.charge);
      return;
    }
    if (phase === 'reveal') {
      // 玩家坚守 → 锁死换招
      if (pCommitted) return;
      if (!pFeint) return;
      if (actId === pFeint.act) return;
      if (pSt.energy < 1) return;
      if (!pickableForFeint(actId)) return;
      sfx.play('select');
      const newSpend = actId === 'power' ? Math.max(1, pSt.charge) : 0;
      setPFeint({ act: actId, spend: newSpend });
      setPSwitched(true);
    }
  }
  function pickableForFeint(actId) {
    // reveal 期间换招：资源检查（power 要 charge≥1，guard 要先扣过 1 能量后还有 ≥2，break 要 ≥1）
    // 注：换招本身已经消 1 能量。这里检查动作自身资源（基于换招后剩余能量计算）
    const afterSwitchEnergy = pSt.energy - 1;
    if (actId === 'power' && pSt.charge < 1) return false;
    if (actId === 'guard' && afterSwitchEnergy < 2) return false;
    if (actId === 'break' && afterSwitchEnergy < 1) return false;
    return true;
  }
  function handleFire(committed = false) {
    if (!pending || phase !== 'idle') return;
    setPCommitted(committed);
    doFeint(pending, pending === 'power' ? powerSpend : 0);
  }

  // 进入反应窗：双方公开预演 + 1.5s 倒计时
  function doFeint(pAct, pSpendVal) {
    // 绝境窗：任一方 HP ≤ 5 时反应窗 ×1.5、所有伤害 +1
    const inCrisis = pSt.hp <= 7 || eSt.hp <= 7;
    // 难度差异化反应窗
    let revealDuration = difficulty === 'newbie' ? 7000 : difficulty === 'master' ? 3600 : 5000;
    if (inCrisis) revealDuration = Math.round(revealDuration * 1.5);
    // AI 选真招
    const ai = aiPickAction(eSt, pSt, eH, pH, history, difficulty, eUlt);
    // AI 主动诱饵：按难度概率选假动作作为预演，reveal 内换回真招
    const feintProb = difficulty === 'master' ? 0.6 : difficulty === 'adept' ? 0.3 : 0;
    let feintAct = ai.action, feintSpend = ai.spend || 0;
    let willSwitch = false;
    // 资源检查：诱饵后还要够执行真招（真招消能量 + 换招扣 1 能量）
    const realEnergyCost = ai.action === 'guard' ? 2 : ai.action === 'break' ? 1 : 0;
    const decoyTotalCost = realEnergyCost + 1; // 换招本身 1 能量
    if (Math.random() < feintProb && eSt.energy >= decoyTotalCost) {
      const decoy = pickDecoyAction(ai.action, eSt, pSt, eH, pH);
      if (decoy && decoy.act !== ai.action) {
        feintAct = decoy.act;
        feintSpend = decoy.spend || 0;
        willSwitch = true;
        aiRealActRef.current = { act: ai.action, spend: ai.spend || 0 };
      }
    }
    if (!willSwitch) aiRealActRef.current = null;
    // AI 坚守：诱饵和坚守互斥（诱饵注定要换招），仅在非诱饵 + 真招高 EV 时选坚守
    const commitProb = difficulty === 'master' ? 0.4 : difficulty === 'adept' ? 0.2 : 0;
    const aiWantsCommit = !willSwitch && Math.random() < commitProb;
    setECommitted(aiWantsCommit);
    const eInitial = { act: feintAct, spend: feintSpend };
    setPFeint({ act: pAct, spend: pSpendVal });
    setEFeint(eInitial);
    setEFeintShown(eInitial);
    setPSwitched(false);
    setESwitched(false);
    setPhase('reveal');
    setRevealMs(revealDuration);
    setMsg(`双方预演 · 反应窗 · ${(revealDuration/1000).toFixed(1)} 秒`);
    setMsgTone('');
  }

  // AI 选诱饵：选个 != 真招的可执行动作，加权偏向迷惑性（让玩家误判）
  function pickDecoyAction(realAct, mySt, oppSt, myH, oppH) {
    // 列出所有可行动作（资源约束）
    const pool = [];
    pool.push({ act: 'attack', spend: 0, w: 3 });   // 攻击威胁：让玩家想防
    pool.push({ act: 'block', spend: 0, w: 2 });    // 防御：让玩家觉得自己可以打你
    pool.push({ act: 'charge', spend: 0, w: 2 });   // 蓄能：让玩家以为可以散频
    if (mySt.charge >= 1) pool.push({ act: 'power', spend: Math.max(1, mySt.charge), w: 3 });
    if (mySt.energy >= 2) pool.push({ act: 'guard', spend: 0, w: 2 });
    if (mySt.energy >= 1 && oppSt.charge >= 1) pool.push({ act: 'break', spend: 0, w: 2 });
    // 排除真招
    const choices = pool.filter(p => p.act !== realAct);
    if (!choices.length) return null;
    // 加权抽样
    const totalW = choices.reduce((a, c) => a + c.w, 0);
    let r = Math.random() * totalW;
    for (const c of choices) { r -= c.w; if (r <= 0) return c; }
    return choices[0];
  }

  // 反应窗倒计时
  useEffect(() => {
    if (phase !== 'reveal') return;
    if (revealMs <= 0) {
      // 时间到 → 真招翻牌
      doResolve(pFeint.act, pFeint.spend, eFeint.act, eFeint.spend);
      return;
    }
    const t = setTimeout(() => setRevealMs(m => Math.max(0, m - 50)), 50);
    return () => clearTimeout(t);
  }, [phase, revealMs]);

  // AI 反读 + 诱饵切换：玩家换招后 OR AI 诱饵需要切回真招
  useEffect(() => {
    if (phase !== 'reveal') return;
    if (!pFeint || !eFeint) return;
    if (eSwitched) return;
    if (eCommitted) return; // AI 坚守 → 不换招
    // AI 思考延迟（难度差异）
    const thinkDelay = difficulty === 'master' ? 300 + Math.random() * 400
                     : difficulty === 'adept' ? 800 + Math.random() * 700
                     : 1500 + Math.random() * 1000;
    // 优先：诱饵 → 真招（开局已存意图）
    if (aiRealActRef.current && eSt.energy >= 1) {
      const real = aiRealActRef.current;
      const t = setTimeout(() => {
        setEFeint({ act: real.act, spend: real.spend });
        setESwitched(true);
        aiRealActRef.current = null;
      }, thinkDelay);
      return () => clearTimeout(t);
    }
    // 非诱饵：基于玩家预演重新评估是否换招
    if (eSt.energy < 1) return;
    const cands = generateCandidates(eSt);
    const scored = cands.map(c => ({
      a: c.a, s: c.s,
      score: scoreOutcome(c.a, c.s, pFeint.act, eSt, pSt, eH, pH)
    })).sort((x, y) => y.score - x.score);
    const cur = scored.find(s => s.a === eFeint.act) || { score: -999 };
    const best = scored[0];
    const switchProb = difficulty === 'master' ? 1.0 : difficulty === 'adept' ? 0.75 : 0.4;
    if (best.score - cur.score > 1.2 && Math.random() < switchProb && best.a !== eFeint.act) {
      const t = setTimeout(() => {
        setEFeint({ act: best.a, spend: best.s });
        setESwitched(true);
      }, thinkDelay);
      return () => clearTimeout(t);
    }
  }, [phase, pFeint, eSwitched]);

  function doResolve(pAct, pSpendVal, eAct, eSpendVal) {
    // 玩家换招消能量
    let pEnergyAfterSwitch = pSt.energy;
    let eEnergyAfterSwitch = eSt.energy;
    if (pSwitched) pEnergyAfterSwitch = Math.max(0, pSt.energy - 1);
    if (eSwitched) eEnergyAfterSwitch = Math.max(0, eSt.energy - 1);
    // 用调整后的能量做 resolveTurn
    const pStAdjusted = { ...pSt, energy: pEnergyAfterSwitch };
    const eStAdjusted = { ...eSt, energy: eEnergyAfterSwitch };
    doCommit(pAct, pSpendVal, eAct, eSpendVal, pStAdjusted, eStAdjusted);
  }

  // === PC 端键盘快捷键：1-6 选动作，Space/Enter 确认 ===
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const map = { '1': 'attack', '2': 'power', '3': 'block', '4': 'guard', '5': 'charge', '6': 'break' };
      if (map[e.key]) { e.preventDefault(); handlePick(map[e.key]); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFire(); return; }
      if (e.key === 'Escape' && pending) { e.preventDefault(); setPending(null); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, phase, powerSpend, pSt.charge]);
  function doCommit(pAct, pSpendVal, eActParam, eSpendParam, pStOverride, eStOverride) {
    // 兼容旧调用（无 feint）：现场调 AI
    let eAct, eSpendVal;
    if (eActParam !== undefined) {
      eAct = eActParam;
      eSpendVal = eSpendParam || 0;
    } else {
      const ai = aiPickAction(eSt, pSt, eH, pH, history, difficulty, eUlt);
      eAct = ai.action;
      eSpendVal = ai.spend || 0;
    }
    const pStUsed = pStOverride || pSt;
    const eStUsed = eStOverride || eSt;
    const r = resolveTurn(pAct, eAct, pStUsed, eStUsed, pH, eH, { pSpend: pSpendVal, eSpend: eSpendVal });
    // 技能生效（resolveTurn 后覆盖伤害/穿透/回血）
    let pUltFired = false, eUltFired = false;
    if (pUlt.charged && pUlt.remaining > 0) {
      const uid = pH.ultimate.id;
      if (uid === 'blaze' && pAct === 'attack') {
        const dmg = pH.attackBase + Math.min(pSt.combo, pH.comboMax) + 2;
        if (eAct === 'block') { r.eDmg = dmg; r.pDmg = 0; r.pCb = pSt.combo + 1; r.msg = `烈触达 · 穿透普防 · 对方扣 ${dmg}`; }
        else if (eAct === 'guard') { r.eDmg = dmg; r.pDmg = eH.guardReflect; r.eE = Math.max(0, eSt.energy - 2); r.msg = `烈触达 vs 凝固 · 对方扣 ${dmg} · 你扣 ${r.pDmg}`; }
        else { r.eDmg = dmg; r.pCb = pSt.combo + 1; r.msg = `烈触达 · 对方扣 ${dmg}`; }
        pUltFired = true;
      } else if (uid === 'echo' && (pAct === 'block' || pAct === 'guard') && r.eDmg > 0) {
        r._pHeal = Math.ceil(r.eDmg * 1.5) + 2;
        r.msg = `${r.msg} · 共鸣回响 · 回血 ${r._pHeal}`;
        pUltFired = true;
      } else if (uid === 'overflow' && pAct === 'power') {
        const dmg = 1 + pSpendVal;
        if (eAct === 'guard') { const bonus = Math.floor(pSpendVal / 3); r.pDmg = eH.guardReflect + bonus; r.eDmg = dmg; r.eE = Math.max(0, eSt.energy - 2); r.msg = `共鸣溢出 vs 凝固 · 对方扣 ${dmg} · 你扣 ${r.pDmg}`; }
        else { r.pDmg = 0; r.eDmg = dmg; r.msg = `共鸣溢出 · 穿透 · 对方扣 ${dmg}`; }
        r.pC = pSt.charge;
        pUltFired = true;
      }
    }
    if (eUlt.charged && eUlt.remaining > 0) {
      const uid = eH.ultimate.id;
      if (uid === 'blaze' && eAct === 'attack') {
        const dmg = eH.attackBase + Math.min(eSt.combo, eH.comboMax) + 2;
        if (pAct === 'block') { r.pDmg = dmg; r.eDmg = 0; r.eCb = eSt.combo + 1; r.msg = `对方烈触达 · 穿透普防 · 你扣 ${dmg}`; }
        else if (pAct === 'guard') { r.pDmg = dmg; r.eDmg = pH.guardReflect; r.pE = Math.max(0, pSt.energy - 2); r.msg = `对方烈触达 vs 凝固 · 你扣 ${dmg} · 对方扣 ${r.eDmg}`; }
        else { r.pDmg = dmg; r.eCb = eSt.combo + 1; r.msg = `对方烈触达 · 你扣 ${dmg}`; }
        eUltFired = true;
      } else if (uid === 'echo' && (eAct === 'block' || eAct === 'guard') && r.pDmg > 0) {
        r._eHeal = Math.ceil(r.pDmg * 1.5) + 2;
        r.msg = `${r.msg} · 对方共鸣回响 · 回血 ${r._eHeal}`;
        eUltFired = true;
      } else if (uid === 'overflow' && eAct === 'power') {
        const dmg = 1 + eSpendVal;
        if (pAct === 'guard') { const bonus = Math.floor(eSpendVal / 3); r.eDmg = pH.guardReflect + bonus; r.pDmg = dmg; r.pE = Math.max(0, pSt.energy - 2); r.msg = `对方共鸣溢出 vs 凝固 · 你扣 ${dmg} · 对方扣 ${r.eDmg}`; }
        else { r.eDmg = 0; r.pDmg = dmg; r.msg = `对方共鸣溢出 · 穿透 · 你扣 ${dmg}`; }
        r.eC = eSt.charge;
        eUltFired = true;
      }
    }
    // 反震谐振：连续同种防御成功 → 反伤递增 (+0 / +1 / +2 / +3 上限)
    const pDefSucc = (pAct === 'block' || pAct === 'guard') && r.eDmg > 0;
    const eDefSucc = (eAct === 'block' || eAct === 'guard') && r.pDmg > 0;
    const pPrev = pDefSucc ? (pDefStreak[pAct] || 0) : 0;
    const ePrev = eDefSucc ? (eDefStreak[eAct] || 0) : 0;
    const pBonus = Math.min(pPrev, 3);
    const eBonus = Math.min(ePrev, 3);
    if (pBonus > 0) r.eDmg += pBonus;
    if (eBonus > 0) r.pDmg += eBonus;
    // 绝境窗加伤：进入战斗前判断 (用 pStUsed/eStUsed)
    const inCrisis = pStUsed.hp <= 7 || eStUsed.hp <= 7;
    if (inCrisis) {
      if (r.pDmg > 0) r.pDmg += 1;
      if (r.eDmg > 0) r.eDmg += 1;
    }
    // 坚守奖励：显式声明 commit 的一方收益 +1（伤害/反伤/蓄能/偷蓄能）
    let pCommitBonus = false, eCommitBonus = false;
    if (pCommitted) {
      if (r.eDmg > 0) { r.eDmg += 1; pCommitBonus = true; }
      else if (pAct === 'charge' && r.pC > pStUsed.charge) { r.pC = Math.min(MAX_CHARGE, r.pC + 1); pCommitBonus = true; }
      else if (pAct === 'break' && r.event === 'break_success') { r.pC = Math.min(MAX_CHARGE, r.pC + 1); pCommitBonus = true; }
    }
    if (eCommitted) {
      if (r.pDmg > 0) { r.pDmg += 1; eCommitBonus = true; }
      else if (eAct === 'charge' && r.eC > eStUsed.charge) { r.eC = Math.min(MAX_CHARGE, r.eC + 1); eCommitBonus = true; }
      else if (eAct === 'break' && r.event === 'break_success') { r.eC = Math.min(MAX_CHARGE, r.eC + 1); eCommitBonus = true; }
    }
    const newPDef = { block: 0, guard: 0 };
    const newEDef = { block: 0, guard: 0 };
    if (pDefSucc) newPDef[pAct] = pPrev + 1;
    if (eDefSucc) newEDef[eAct] = ePrev + 1;
    const pResonance = pDefSucc && pPrev + 1 === 3;
    const eResonance = eDefSucc && ePrev + 1 === 3;
    setReveal({ pAct, eAct });
    setPhase('clash');
    setMsg(r.msg);
    if (r.event === 'burst' || /穿透|爆发|破/.test(r.msg)) setMsgTone('crit');
    else setMsgTone('');
    // 记录历史
    setHistory(arr => [{
      round, pAct, eAct,
      pDmg: r.pDmg, eDmg: r.eDmg,
      msg: r.msg, hit: (r.pDmg > 0 || r.eDmg > 0),
      pUlt: pUltFired ? pH.ultimate.id : null,
      eUlt: eUltFired ? eH.ultimate.id : null,
      pUltColor: pUltFired ? pH.ultimate.color : null,
      eUltColor: eUltFired ? eH.ultimate.color : null,
    }, ...arr].slice(0, 30));
    sfx.play(pAct);
    setTimeout(() => sfx.play(eAct), 120);
    if (r.event === 'burst') {
      setTimeout(() => { setSpecial('burst'); sfx.play('burst'); setTimeout(() => setSpecial(null), 1400); }, 600);
    } else if (r.event === 'break_success') {
      setTimeout(() => { setSlash(true); sfx.play('slash'); setTimeout(() => setSlash(false), 700); }, 500);
    }
    // 连击频率涟漪：连击 ≥2 且确实命中
    const playerCombo = r.pCb >= 2 && r.eDmg > 0;
    const enemyCombo = r.eCb >= 2 && r.pDmg > 0;
    if (playerCombo) setTimeout(() => { setComboFx({ side: 'enemy', n: r.pCb }); sfx.play('select'); setTimeout(() => setComboFx(null), 1000); }, 650);
    else if (enemyCombo) setTimeout(() => { setComboFx({ side: 'player', n: r.eCb }); setTimeout(() => setComboFx(null), 1000); }, 650);
    // 触达谐振：连续 3 次触达命中（仅在 ===3 时演出一次）
    const playerAtkReson = pAct === 'attack' && r.eDmg > 0 && r.pCb === 3;
    const enemyAtkReson = eAct === 'attack' && r.pDmg > 0 && r.eCb === 3;
    if (playerAtkReson) setTimeout(() => { setComboFx(null); setAtkResonFx({ side: 'enemy' }); sfx.play('burst'); setTimeout(() => setAtkResonFx(null), 1600); }, 700);
    else if (enemyAtkReson) setTimeout(() => { setComboFx(null); setAtkResonFx({ side: 'player' }); sfx.play('burst'); setTimeout(() => setAtkResonFx(null), 1600); }, 700);
    // 防御反震：block 反伤 / guard 反震 都触发动画（type 决定演出风格）
    const playerReflected = (pAct === 'block' || pAct === 'guard') && r.eDmg > 0;
    const enemyReflected = (eAct === 'block' || eAct === 'guard') && r.pDmg > 0;
    if (playerReflected) setTimeout(() => { setGuardFx({ side: 'player', type: pAct }); sfx.play(pAct === 'guard' ? 'guard' : 'block'); setTimeout(() => setGuardFx(null), 900); }, 550);
    else if (enemyReflected) setTimeout(() => { setGuardFx({ side: 'enemy', type: eAct }); sfx.play(eAct === 'guard' ? 'guard' : 'block'); setTimeout(() => setGuardFx(null), 900); }, 550);
    // 反震谐振演出（覆盖 guard 演出）
    if (pResonance) setTimeout(() => { setGuardFx(null); setResonFx({ side: 'player', n: pPrev + 1 }); sfx.play('burst'); setTimeout(() => setResonFx(null), 1600); }, 600);
    else if (eResonance) setTimeout(() => { setGuardFx(null); setResonFx({ side: 'enemy', n: ePrev + 1 }); sfx.play('burst'); setTimeout(() => setResonFx(null), 1600); }, 600);
    // 技能命中演出（橙/紫/金对应色全屏闪）
    if (pUltFired) setTimeout(() => { setUltFireFx({ side: 'player', color: pH.ultimate.color }); sfx.play('burst'); setTimeout(() => setUltFireFx(null), 700); }, 500);
    else if (eUltFired) setTimeout(() => { setUltFireFx({ side: 'enemy', color: eH.ultimate.color }); sfx.play('burst'); setTimeout(() => setUltFireFx(null), 700); }, 500);
    setTimeout(() => {
      let newPHp = Math.max(0, pSt.hp - r.pDmg);
      let newEHp = Math.max(0, eSt.hp - r.eDmg);
      // 回血生效
      if (r._pHeal) { newPHp = Math.min(MAX_HP, newPHp + r._pHeal); pushFloat('player', `+${r._pHeal} HP`, 'reflect'); }
      if (r._eHeal) { newEHp = Math.min(MAX_HP, newEHp + r._eHeal); pushFloat('enemy', `+${r._eHeal} HP`, 'reflect'); }
      setHit({ player: r.pDmg > 0, enemy: r.eDmg > 0 });
      if (r.pDmg > 0 || r.eDmg > 0) sfx.play('hit');
      if (r.pDmg > 0) pushFloat('player', `-${r.pDmg}`, 'dmg');
      if (r.eDmg > 0) pushFloat('enemy', `-${r.eDmg}`, 'dmg');
      let bBonusP = 0, bBonusE = 0;
      let newPHC = pHitCount, newEHC = eHitCount;
      if (pH.id === 'B' && r.pDmg > 0) {
        newPHC = pHitCount + 1;
        if (newPHC >= 2) { bBonusP = 1; newPHC = 0; pushFloat('player', '+1 EN', 'reflect'); }
      }
      if (eH.id === 'B' && r.eDmg > 0) {
        newEHC = eHitCount + 1;
        if (newEHC >= 2) { bBonusE = 1; newEHC = 0; pushFloat('enemy', '+1 EN', 'reflect'); }
      }
      setPHitCount(newPHC); setEHitCount(newEHC);
      setPDefStreak(newPDef);
      setEDefStreak(newEDef);
      // 谐振反伤加成飘字
      if (pBonus > 0) pushFloat('enemy', `+${pBonus} 谐振`, 'reflect');
      if (eBonus > 0) pushFloat('player', `+${eBonus} 谐振`, 'reflect');
      // 坚守飘字
      if (pCommitBonus) pushFloat('enemy', '+1 坚守', 'reflect');
      if (eCommitBonus) pushFloat('player', '+1 坚守', 'reflect');
      const nextPE = Math.min(MAX_ENERGY, r.pE + 1 + bBonusP);
      const nextEE = Math.min(MAX_ENERGY, r.eE + 1 + bBonusE);
      setPSt({ hp: newPHp, energy: nextPE, charge: r.pC, combo: r.pCb, cstreak: r.pCs });
      setESt({ hp: newEHp, energy: nextEE, charge: r.eC, combo: r.eCb, cstreak: r.eCs });
      // 技能状态推进：fired 即耗尽；charged 但未 fire 则减 remaining，到 0 视为过期
      if (pUlt.charged) {
        if (pUltFired) setPUlt({ available: false, charged: false, used: true, remaining: 0 });
        else {
          const left = pUlt.remaining - 1;
          if (left <= 0) setPUlt({ available: false, charged: false, used: true, remaining: 0 });
          else setPUlt(s => ({ ...s, remaining: left }));
        }
      }
      if (eUlt.charged) {
        if (eUltFired) setEUlt({ available: false, charged: false, used: true, remaining: 0 });
        else {
          const left = eUlt.remaining - 1;
          if (left <= 0) setEUlt({ available: false, charged: false, used: true, remaining: 0 });
          else setEUlt(s => ({ ...s, remaining: left }));
        }
      }
      if (newPHp <= 0 || newEHp <= 0) {
        setTimeout(() => onEnd(newEHp <= 0 ? 'player' : 'enemy', { rounds: round, hpRemaining: newEHp <= 0 ? newPHp : newEHp }), 1300);
        return;
      }
      setTimeout(() => {
        setReveal(null); setHit({ player: false, enemy: false });
        setPending(null); setPhase('idle');
        setRound(r2 => r2 + 1);
        setMsg('选你的频率 · 同时回响');
        setMsgTone('');
      }, 1700);
    }, 600);
  }

  // 同步技能可激活状态
  useEffect(() => {
    if (pUlt.used || pUlt.charged) return;
    const triggered = checkUltTrigger(pH.ultimate, pSt);
    if (triggered !== pUlt.available) setPUlt(s => ({ ...s, available: triggered }));
  }, [pSt.hp, pSt.combo, pSt.charge, pUlt.used, pUlt.charged]);
  useEffect(() => {
    if (eUlt.used || eUlt.charged) return;
    const triggered = checkUltTrigger(eH.ultimate, eSt);
    if (triggered !== eUlt.available) setEUlt(s => ({ ...s, available: triggered }));
  }, [eSt.hp, eSt.combo, eSt.charge, eUlt.used, eUlt.charged]);
  // AI 自动激活技能：idle 阶段满足条件时按难度概率激活
  useEffect(() => {
    if (phase !== 'idle' || ultCard) return;
    if (!eUlt.available || eUlt.charged || eUlt.used) return;
    const actProb = difficulty === 'master' ? 0.9 : difficulty === 'adept' ? 0.7 : 0.5;
    if (Math.random() < actProb) {
      // 缩短延迟避免玩家快速出招打断 AI 激活窗口
      const t = setTimeout(() => activateUlt('enemy'), 180 + Math.random() * 220);
      return () => clearTimeout(t);
    }
  }, [eUlt.available, phase, ultCard]);

  function activateUlt(side) {
    if (phase !== 'idle') return;
    const ult = side === 'player' ? pUlt : eUlt;
    if (!ult.available || ult.used || ult.charged) return;
    const hero = side === 'player' ? pH : eH;
    sfx.play('burst');
    setPhase('ult');  // 锁 phase 防止演出期间出招
    setUltCard({ side, hero });
    setTimeout(() => {
      setUltCard(null);
      const remaining = hero.ultimate.id === 'echo' ? 2 : 1;
      if (side === 'player') setPUlt({ available: false, charged: true, used: false, remaining });
      else setEUlt({ available: false, charged: true, used: false, remaining });
      setPhase('idle');
    }, 2200);
  }

  const lowHpP = pSt.hp / MAX_HP < 0.25;
  const preview = commitPreview(pending, powerSpend, pSt, pH, pDefStreak);
  const tacticalHint = getTacticalHint(pSt, eSt, pH);

  return (
    <div className="scene">
      <div className={`danger-vignette ${lowHpP ? 'active' : ''}`} />
      {(pSt.hp <= 7 || eSt.hp <= 7) && pSt.hp > 0 && eSt.hp > 0 && (
        <>
          <div className="crisis-vignette active" />
          <div className="crisis-banner">CRISIS · 绝 境 共 鸣</div>
        </>
      )}
      <div className="brand-row">
        <div className="brand">Memoria · 频率战</div>
        <div className="brand-tools">
          <button className="history-btn-top" onClick={() => setDrawerOpen(true)} title="出招回顾">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="7.5"/><path d="M 10 6 V 10 L 13 12"/>
            </svg>
            <span>R{round}</span>
          </button>
          <button className="help-btn-top" onClick={() => setHelpOpen(true)} title="技能解说">?</button>
        </div>
      </div>

      {/* 敌方 */}
      <div className="fighter-stage enemy">
        <div
          className={`stage-half-bg ${hit.enemy ? 'hit' : ''}`}
          onClick={() => setHeroInfo({ hero: eH, side: 'enemy' })}
          style={{ cursor: 'pointer' }}>
          <img src={eH.skinImage} alt={eH.nameCN} />
        </div>
        <div className="hud-side hud-stack-left">
          <div className="name-block">
            <span className="side">STATIC</span>
            <span className="name-cn">{eH.nameCN}</span>
            <span className="arch">{eH.archetype}</span>
          </div>
          <div className={`hud-charge-h ${eSt.charge >= 5 ? 'peak' : ''}`}>
            <span className="icon">✦</span>
            <div className="bar-h"><div className="fill-h" style={{ width: `${(eSt.charge/MAX_CHARGE)*100}%` }} /></div>
            <span className="num">{eSt.charge}</span>
          </div>
          <div className="hud-energy-row">
            {Array.from({length: MAX_ENERGY}).map((_, i) => (
              <span key={i} className={`pip ${i < eSt.energy ? 'on' : 'off'}`} />
            ))}
          </div>
          {eSt.combo >= 1 && <div className="combo-pill">连击 ×{eSt.combo}</div>}
          {eSt.cstreak >= 1 && <div className="streak-pill">连蓄 ×{eSt.cstreak}</div>}
          {(eDefStreak.block + eDefStreak.guard) >= 1 && (
            <div className={`reson-pill ${(eDefStreak.block + eDefStreak.guard) >= 2 ? 'peak' : ''}`}>
              连防 ×{eDefStreak.block + eDefStreak.guard}
            </div>
          )}
          <UltPill ult={eUlt} hero={eH} side="enemy" />
        </div>
        <div className={`hp-anchor ${eSt.hp / MAX_HP < 0.25 ? 'critical' : ''}`}>
          <span className="lbl">♥</span>
          <span className="num">{eSt.hp}</span>
          <span className="max">/{MAX_HP}</span>
        </div>
        <div className="damage-float-layer">
          {damageFloats.filter(f => f.side === 'enemy').map(f => (
            <div key={f.id} className={`damage-float ${f.type}`} style={{ top: '50%' }}>{f.value}</div>
          ))}
        </div>
        {comboFx?.side === 'enemy' && (
          <div className="fx-combo enemy">
            <div className="bar-v l" /><div className="bar-v r" />
            <div className="ring" /><div className="ring" /><div className="ring" />
            <div className="combo-label">频 率 同 步 · ×{comboFx.n}</div>
          </div>
        )}
        {guardFx?.side === 'enemy' && (
          <div className={`fx-guard enemy ${guardFx.type || 'guard'}`}>
            <div className="freeze-flash" />
            <div className="hex"><svg viewBox="-65 -65 130 130"><polygon points="0,-58 50,-29 50,29 0,58 -50,29 -50,-29"/></svg></div>
            <div className="hex inner"><svg viewBox="-45 -45 90 90"><polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20"/></svg></div>
            <div className="guard-label">{guardFx.type === 'block' ? '镜 像 反 射' : '瞬 间 守 护'}</div>
          </div>
        )}
        {resonFx?.side === 'enemy' && (
          <div className="fx-resonance enemy">
            <div className="core" />
            <div className="pulse" /><div className="pulse" /><div className="pulse" />
            {[0,45,90,135,180,225,270,315].map(deg => {
              const rad = deg * Math.PI / 180;
              return <div key={deg} className="mirror-shard" style={{ '--tx': `${Math.cos(rad)*20}px`, '--ty': `${Math.sin(rad)*20}px`, '--rot': `${deg+90}deg` }} />;
            })}
            <div className="reson-label">反 震 谐 振</div>
          </div>
        )}
        {atkResonFx?.side === 'enemy' && (
          <div className="fx-atk-reson enemy">
            <div className="core" />
            <div className="pulse" /><div className="pulse" /><div className="pulse" />
            {[0,60,120,180,240,300].map(deg => {
              const rad = deg * Math.PI / 180;
              return <div key={deg} className="arrow-shard" style={{ '--tx': `${Math.cos(rad)*18}px`, '--ty': `${Math.sin(rad)*18}px`, '--rot': `${deg+90}deg` }} />;
            })}
            <div className="atk-label">触 达 谐 振</div>
          </div>
        )}
      </div>

      {/* 中间局势卡 */}
      <div className="momentum-card">
        <div className="momentum-head">
          <span>MOMENTUM · 局 势</span>
          <span className="round-num">R{round}</span>
        </div>
        <div className={`momentum-msg ${msgTone}`}>{msg}</div>
        <div className="tactical-hint">
          <span className="warn-dot">·</span>
          <span>{tacticalHint}</span>
        </div>
      </div>

      {/* 玩家 */}
      <div className="fighter-stage player">
        <div
          className={`stage-half-bg ${hit.player ? 'hit' : ''}`}
          onClick={() => setHeroInfo({ hero: pH, side: 'player' })}
          style={{ cursor: 'pointer' }}>
          <img src={pH.skinImage} alt={pH.nameCN} />
        </div>
        <div className="hud-side hud-stack-right">
          <div className="name-block">
            <span className="side">YOU</span>
            <span className="name-cn">{pH.nameCN}</span>
            <span className="arch">{pH.archetype}</span>
          </div>
          <div className={`hud-charge-h ${pSt.charge >= 5 ? 'peak' : ''}`}>
            <span className="icon">✦</span>
            <div className="bar-h"><div className="fill-h" style={{ width: `${(pSt.charge/MAX_CHARGE)*100}%` }} /></div>
            <span className="num">{pSt.charge}</span>
          </div>
          <div className="hud-energy-row">
            {Array.from({length: MAX_ENERGY}).map((_, i) => (
              <span key={i} className={`pip ${i < pSt.energy ? 'on' : 'off'}`} />
            ))}
          </div>
          {pSt.combo >= 1 && <div className="combo-pill">连击 ×{pSt.combo}</div>}
          {pSt.cstreak >= 1 && <div className="streak-pill">连蓄 ×{pSt.cstreak}</div>}
          {(pDefStreak.block + pDefStreak.guard) >= 1 && (
            <div className={`reson-pill ${(pDefStreak.block + pDefStreak.guard) >= 2 ? 'peak' : ''}`}>
              连防 ×{pDefStreak.block + pDefStreak.guard}
            </div>
          )}
          <UltPill ult={pUlt} hero={pH} side="player" onActivate={() => activateUlt('player')} />
        </div>
        <div className={`hp-anchor ${lowHpP ? 'critical' : ''}`}>
          <span className="lbl">♥</span>
          <span className="num">{pSt.hp}</span>
          <span className="max">/{MAX_HP}</span>
        </div>
        <div className="damage-float-layer">
          {damageFloats.filter(f => f.side === 'player').map(f => (
            <div key={f.id} className={`damage-float ${f.type}`} style={{ top: '50%' }}>{f.value}</div>
          ))}
        </div>
        {comboFx?.side === 'player' && (
          <div className="fx-combo player">
            <div className="bar-v l" /><div className="bar-v r" />
            <div className="ring" /><div className="ring" /><div className="ring" />
            <div className="combo-label">频 率 同 步 · ×{comboFx.n}</div>
          </div>
        )}
        {guardFx?.side === 'player' && (
          <div className={`fx-guard player ${guardFx.type || 'guard'}`}>
            <div className="freeze-flash" />
            <div className="hex"><svg viewBox="-65 -65 130 130"><polygon points="0,-58 50,-29 50,29 0,58 -50,29 -50,-29"/></svg></div>
            <div className="hex inner"><svg viewBox="-45 -45 90 90"><polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20"/></svg></div>
            <div className="guard-label">{guardFx.type === 'block' ? '镜 像 反 射' : '瞬 间 守 护'}</div>
          </div>
        )}
        {resonFx?.side === 'player' && (
          <div className="fx-resonance player">
            <div className="core" />
            <div className="pulse" /><div className="pulse" /><div className="pulse" />
            {[0,45,90,135,180,225,270,315].map(deg => {
              const rad = deg * Math.PI / 180;
              return <div key={deg} className="mirror-shard" style={{ '--tx': `${Math.cos(rad)*20}px`, '--ty': `${Math.sin(rad)*20}px`, '--rot': `${deg+90}deg` }} />;
            })}
            <div className="reson-label">反 震 谐 振</div>
          </div>
        )}
        {atkResonFx?.side === 'player' && (
          <div className="fx-atk-reson player">
            <div className="core" />
            <div className="pulse" /><div className="pulse" /><div className="pulse" />
            {[0,60,120,180,240,300].map(deg => {
              const rad = deg * Math.PI / 180;
              return <div key={deg} className="arrow-shard" style={{ '--tx': `${Math.cos(rad)*18}px`, '--ty': `${Math.sin(rad)*18}px`, '--rot': `${deg+90}deg` }} />;
            })}
            <div className="atk-label">触 达 谐 振</div>
          </div>
        )}
      </div>

      {/* 撞击 zone */}
      {phase === 'clash' && reveal && (
        <div className="clash-zone">
          <div className="action-icon from-top" style={{ color: `var(--${ACTIONS.find(a => a.id === reveal.eAct).cls})` }}>
            <ActionGlyph action={reveal.eAct} size={84} />
          </div>
          <div className="action-icon from-bottom" style={{ color: `var(--${ACTIONS.find(a => a.id === reveal.pAct).cls})` }}>
            <ActionGlyph action={reveal.pAct} size={84} />
          </div>
          <div className="clash-burst fire" />
        </div>
      )}

      {/* 反应窗预演展示 */}
      {phase === 'reveal' && pFeint && eFeintShown && (
        <div className="reveal-zone">
          <div className={`feint-card enemy ${eSwitched ? 'switched' : ''}`} style={{ color: `var(--${ACTIONS.find(a => a.id === eFeintShown.act).cls})` }}>
            <div className="feint-label">敌 · 预演{eSwitched ? ' · 已换招' : ''}</div>
            <div className="feint-icon"><ActionGlyph action={eFeintShown.act} size={56} /></div>
            <div className="feint-name">{ACTION_LABEL[eFeintShown.act]}</div>
          </div>
          <div className="reveal-timer">
            <div className="reveal-timer-bar" style={{ width: `${(revealMs / (() => { const base = difficulty === 'newbie' ? 7000 : difficulty === 'master' ? 3600 : 5000; return (pSt.hp <= 7 || eSt.hp <= 7) ? base * 1.5 : base; })()) * 100}%` }} />
            <div className="reveal-timer-text">{(revealMs / 1000).toFixed(1)}s</div>
          </div>
          <div className={`feint-card player ${pSwitched ? 'switched' : ''} ${pCommitted ? 'committed' : ''}`} style={{ color: `var(--${ACTIONS.find(a => a.id === pFeint.act).cls})` }}>
            <div className="feint-icon"><ActionGlyph action={pFeint.act} size={56} /></div>
            <div className="feint-name">{ACTION_LABEL[pFeint.act]}{pFeint.act === 'power' ? ` ${pFeint.spend}✦` : ''}</div>
            <div className="feint-label">你 · 预演{pSwitched ? ' · 已换招' : ''}</div>
          </div>
        </div>
      )}
      <div className={`break-slash ${slash ? 'fire' : ''}`} />

      {/* 底部动作 */}
      <div className="actions-tray">
        <div className="tray-head">
          <div className="label">choose your frequency</div>
        </div>
        <div className={`action-strip ${pending || (phase === 'reveal' && pFeint) ? 'has-selected' : ''}`}>
          {ACTIONS.flatMap((a, i) => {
            // idle 阶段：用 pickable + pending
            // reveal 阶段：用 pickableForFeint + pFeint，pFeint.act 视为 selected
            let isSelected, isDisabled;
            if (phase === 'reveal' && pFeint) {
              isSelected = pFeint.act === a.id;
              isDisabled = !pickableForFeint(a.id) && a.id !== pFeint.act;
            } else {
              isSelected = pending === a.id;
              isDisabled = !pickable(a.id) || phase !== 'idle';
            }
            const btn = (
              <button key={a.id} className={`act-ico ${a.cls} ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`} onClick={() => handlePick(a.id)} title={a.name}>
                <div className="icon-wrap"><ActionGlyph action={a.id} size={36} /></div>
                <div className="en-tag">{a.en}</div>
              </button>
            );
            return (i === 1 || i === 3) ? [btn, <div key={`gap-${i}`} className="gap" />] : [btn];
          })}
        </div>

        {pending === 'power' && pSt.charge >= 1 && phase === 'idle' && (
          <div className="power-spend">
            <div className="spend-label">消耗 {powerSpend} / {pSt.charge} 点 → 伤害 {1 + powerSpend} {powerSpend >= 5 ? '· 穿透' : ''}</div>
            <div className="spend-row">
              {Array.from({length: pSt.charge}, (_, i) => i + 1).map(n => (
                <button key={n} className={`spend-btn ${powerSpend === n ? 'selected' : ''}`} onClick={() => setPowerSpend(n)}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {phase === 'reveal' ? (
          <div className="commit-preview tactical">
            {pCommitted ? (
              <>
                <span className="arrow">⚔</span>
                <span className="effect gold">坚 守 中</span>
                <span className="dot">·</span>
                <span className="effect gold">放 弃 换 招 · 结 算 +1</span>
              </>
            ) : (
              <>
                <span className="arrow">⟳</span>
                <span className="effect gold">反 应 窗</span>
                <span className="dot">·</span>
                <span className={`effect ${pSt.energy >= 1 ? 'cyan' : 'risk'}`}>
                  {pSt.energy >= 1 ? '点其他动作换招 · 消 1 能量' : '能量 0 · 锁死预演'}
                </span>
              </>
            )}
          </div>
        ) : preview ? (
          <div className="commit-preview">
            <span className="arrow">→</span>
            <span className="result">{preview.result}</span>
            <span className="dot">·</span>
            <span className={`effect ${preview.effect && /反震谐振|穿透/.test(preview.effect) ? 'gold' : (preview.effect && /可被反|可被打断|被强攻可/.test(preview.effect) ? 'risk' : '')}`}>{preview.effect}</span>
          </div>
        ) : (
          <IdlePreview pSt={pSt} eSt={eSt} pH={pH} hint={tacticalHint} />
        )}

        {phase === 'idle' && pending ? (
          <div className="commit-row">
            <button className="commit-btn lock" onClick={() => handleFire(false)}>
              {pending === 'power' ? `锁 定 · 爆 响 ${powerSpend} ✦` : `锁 定 · ${ACTION_LABEL[pending]}`}
            </button>
            <button className="commit-btn commit" onClick={() => handleFire(true)} title="坚守：放弃换招权 · 结算 +1 伤害/反伤/蓄能">
              <span className="commit-mark">⚔</span>
              <span>坚 守</span>
              <span className="commit-bonus">+1</span>
            </button>
          </div>
        ) : (
          <button
            className={`commit-btn ${(!pending || phase !== 'idle') ? 'disabled' : ''}`}
            onClick={undefined}>
            {phase === 'reveal'
              ? (pCommitted ? `坚 守 中 · ${(revealMs / 1000).toFixed(1)}s` : `等 待 翻 牌 · ${(revealMs / 1000).toFixed(1)}s`)
              : '选 一 个 动 作'}
          </button>
        )}
      </div>

      {special === 'burst' && (
        <>
          <div className="fx-burst-aurora" />
          <div className="fx-burst-rays">
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <div key={deg} className="ray" style={{ '--rot': `${deg}deg` }} />
            ))}
          </div>
          <div className="special-overlay burst">
            <div className="special-text">
              <div className="main">BURST</div>
              <div className="sub">· 共 鸣 爆 响 ·</div>
            </div>
          </div>
        </>
      )}

      {resonFx && <div className="fx-resonance-flash" />}
      {atkResonFx && <div className="fx-atk-reson-flash" />}
      {ultCard && <UltCardOverlay hero={ultCard.hero} />}
      {ultFireFx && <div className="ult-fire-burst" style={{ '--ult-color': ultFireFx.color }} />}
      {heroInfo && <HeroInfoPopup hero={heroInfo.hero} side={heroInfo.side} onClose={() => setHeroInfo(null)} />}

      {/* 出招回顾 drawer */}
      <div className={`history-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-handle" onClick={() => setDrawerOpen(false)}><div className="drawer-bar" /></div>
        <div className="drawer-head">
          <span className="drawer-title">出 招 回 顾</span>
          <span className="drawer-sub">{history.length} 回合 · 频率战</span>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>×</button>
        </div>
        <div className="timeline">
          {history.length === 0 && <div className="timeline-empty">尚无对局记录</div>}
          {history.map(h => {
            const labelP = ACTION_LABEL[h.pAct];
            const labelE = ACTION_LABEL[h.eAct];
            let result;
            if (h.pDmg > 0 && h.eDmg > 0) result = `互殴 -${h.pDmg}/-${h.eDmg}`;
            else if (h.pDmg > 0) result = `你 -${h.pDmg}`;
            else if (h.eDmg > 0) result = `对方 -${h.eDmg}`;
            else result = '无伤';
            return (
              <div key={h.round} className={`t-row ${(h.pUlt || h.eUlt) ? 'ult-fired' : ''}`}>
                <div className="t-round">R{h.round}</div>
                <div className="t-action enemy">
                  {h.eUlt && <span className="t-ult-mark" style={{ color: h.eUltColor }} title={`敌方触发签名技能`}>✦</span>}
                  {labelE}
                </div>
                <div className={`t-vs ${h.hit ? 'hit' : ''}`}>{h.hit ? '⚡' : '·'}</div>
                <div className="t-action player">
                  {labelP}
                  {h.pUlt && <span className="t-ult-mark" style={{ color: h.pUltColor, marginLeft: 4 }} title={`你触发签名技能`}>✦</span>}
                </div>
                <div className="t-result">{result}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 技能解说 modal */}
      {helpOpen && (
        <div className="help-modal">
          <div className="help-head">
            <span className="help-title">动 作 解 说</span>
            <span className="help-sub">6 ACTIONS · 36 MATRIX</span>
            <button className="help-close" onClick={() => setHelpOpen(false)}>×</button>
          </div>
          <div className="help-content">
            <div className="help-section-title">— 6 动作 —</div>
            {[
              {id:'attack', cn:'触达', en:'attack 快攻', desc:'快动作 · 基础伤害 2（A 角色 3）· 连续触达伤害递增 · 被反伤打断连击'},
              {id:'power', cn:'爆响', en:'power 强攻', desc:'慢动作 · 消耗 1-N 蓄能 · 伤害 = 1+消耗 · 消耗 ≥ 5 触达打不断（穿透）· 被触达打断蓄能保留'},
              {id:'block', cn:'守护', en:'block 普防', desc:'快动作 · 挡触达反伤 1（B 角色 2）· 挡不住爆响'},
              {id:'guard', cn:'凝固', en:'guard 有效防', desc:'慢动作 · 消 2 能量 · 挡所有攻击 · 反伤 1+蓄能/3（克爆响）'},
              {id:'charge', cn:'聚频', en:'charge 蓄能', desc:'慢动作 · 共鸣+N（连蓄 1/3/6/10）· 被触达扣血但点数照收 · 被爆响打断（已有蓄能保留，本回合 +0）· 仅被散频清零'},
              {id:'break', cn:'散频', en:'break 破蓄', desc:'慢动作 · 消 1 能量 · 仅对方蓄能时生效 · 成功清零对方蓄能 + 自己偷 3 点'},
            ].map(a => (
              <div key={a.id} className={`help-row ${a.id}`}>
                <div className="h-icon"><ActionGlyph action={a.id} size={28} /></div>
                <div className="h-info">
                  <div className="h-name">{a.cn}<span className="h-en">{a.en}</span></div>
                  <div className="h-desc">{a.desc}</div>
                </div>
              </div>
            ))}
            <div className="help-section-title">— 核 心 规 则 —</div>
            <div className="help-rules">
              <div className="rule-item"><strong>速度决定打断</strong> · 快动作（触达 / 守护）打断慢动作。被打断方资源保留。</div>
              <div className="rule-item"><strong>穿透打断</strong> · 爆响消耗 ≥ 5 点时（伤害 ≥ 6），触达打不断——双方都打中。</div>
              <div className="rule-item"><strong>强攻穿透普防</strong> · 守护挡不住爆响。挡爆响必须用凝固。</div>
              <div className="rule-item"><strong>凝固反震递增</strong> · 凝固挡爆响时反伤 = 基础反伤 + ⌊对方蓄能/3⌋。蓄能越大反越疼。</div>
              <div className="rule-item"><strong>蓄能进帐</strong> · 被触达扣血但点数照收（小骚扰）· 被爆响打断点数不进帐（真正打断）。</div>
              <div className="rule-item"><strong>共鸣等级</strong> · 越险胜等级越高（HP 剩 1-2 = Resonance SSR）。</div>
            </div>
            <div className="help-section-title">— 谐 振 演 出 —</div>
            <div className="help-rules">
              <div className="rule-item"><strong>触达谐振</strong> · 连续 3 次触达成功命中触发 · 不增伤但有仪式感演出。</div>
              <div className="rule-item"><strong>反震谐振</strong> · 连续 3 次同种防御（block 或 guard）成功反伤触发 · 反伤值在第 2/3 次开始递增 +1/+2，上限 +3。</div>
            </div>
            <div className="help-section-title">— 签 名 技 能 · 每 局 一 次 —</div>
            <div className="help-rules">
              {HEROES.map(h => h.ultimate && (
                <div key={h.id} className="rule-item" style={{ borderLeftColor: h.ultimate.color }}>
                  <span style={{ color: h.ultimate.color, fontWeight: 500 }}>{h.letter} · {h.ultimate.cn}</span>
                  <span style={{ color: 'var(--text-faint)', marginLeft: 8 }}>{h.ultimate.triggerCN}</span>
                  <br />
                  <span style={{ color: 'var(--text-dim)' }}>{h.ultimate.effect}</span>
                </div>
              ))}
              <div className="rule-item" style={{ color: 'var(--text-faint)' }}>条件满足时 HUD 卡片闪亮 · 点击进入特写演出 · 紧接的下一回合（B 是两回合内首次）触发对应动作即生效。</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultScreen({ winner, stats, onReplay }) {
  const isWin = winner === 'player';
  useEffect(() => { sfx.play(isWin ? 'win' : 'lose'); }, []);
  return (
    <div className="scene">
      <div className="brand-row">
        <div className="brand">共鸣结束</div>
        <div className="brand-meta">ROUND {stats.rounds}</div>
      </div>
      <div className="result-content">
        <div className={`result-headline ${isWin ? 'win' : 'lose'}`}>{isWin ? 'RESONANCE' : 'STATIC'}</div>
        <div className="result-quote">{isWin ? '"你听见我了——这个瞬间属于你。"' : '"频率断了——下一次再试。"'}</div>
        <div className="result-stats">{stats.rounds} ROUNDS · {isWin ? 'VICTORY' : 'DEFEAT'}</div>
        <button className="result-btn" onClick={onReplay}>RESTART</button>
      </div>
    </div>
  );
}
