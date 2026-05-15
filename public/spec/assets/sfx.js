// 妍子抽卡音效 · 二次元甜美心动风
// 设计原则:
//   - 完全砍掉 sub-bass (<200Hz),低频会产生恐怖/紧张感
//   - 短混响 (300-500ms),避免阴森空旷
//   - 大调上扬旋律,只用 harmonic 谐波
//   - 高频 chime/glockenspiel + 软 sine,听起来像水晶风铃
//   - 心跳感而非威严感
(function(){
  let ctx = null;
  let masterGain = null;
  let dryGain = null;
  let wetGain = null;
  let reverb = null;
  let unlocked = false;
  let muted = false;
  let bgmEl = null;
  let bgmCurrent = null;

  // 短甜美混响 IR (400ms,细颗粒高频)
  function makeImpulseResponse(c, duration, decay){
    const len = Math.floor(c.sampleRate * duration);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++){
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++){
        const fade = Math.pow(1 - i / len, decay);
        data[i] = (Math.random() * 2 - 1) * fade * 0.6;
      }
    }
    return ir;
  }

  function ensureCtx(){
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);

    dryGain = ctx.createGain();
    dryGain.gain.value = 0.85;
    dryGain.connect(masterGain);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulseResponse(ctx, 0.4, 2.5);  // 400ms 短甜混响
    wetGain = ctx.createGain();
    wetGain.gain.value = 0.18;
    reverb.connect(wetGain);
    wetGain.connect(masterGain);

    return ctx;
  }

  document.addEventListener('pointerdown', () => {
    if (unlocked) return;
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
    unlocked = true;
  }, { once: false, passive: true });

  function bus(reverbAmt = 0.2){
    const c = ensureCtx(); if (!c) return null;
    const g = c.createGain();
    g.connect(dryGain);
    if (reverbAmt > 0){
      const sendG = c.createGain();
      sendG.gain.value = reverbAmt;
      g.connect(sendG);
      sendG.connect(reverb);
    }
    return g;
  }

  // 软 sine 音 (温柔甜美的主体)
  function tone({ freq, type = 'sine', start = 0, dur = 0.2, vol = 0.22, attack = 0.005, release = 0.18, reverbAmt = 0.2, freqEnd = null }){
    if (muted) return;
    const c = ensureCtx(); if (!c) return;
    const t0 = c.currentTime + start;
    const out = bus(reverbAmt);
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, freqEnd), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur + release);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + dur + release + 0.05);
  }

  // Chime 音 (基频 + 第二/第三谐波 harmonic 叠加,像玻璃风铃)
  function chime({ freq, start = 0, dur = 0.3, vol = 0.2, attack = 0.003, release = 0.5, reverbAmt = 0.25 }){
    tone({ freq: freq, type: 'sine', start, dur, vol, attack, release, reverbAmt });
    tone({ freq: freq * 2, type: 'sine', start, dur: dur * 0.8, vol: vol * 0.45, attack, release: release * 0.7, reverbAmt });
    tone({ freq: freq * 3, type: 'sine', start, dur: dur * 0.5, vol: vol * 0.18, attack, release: release * 0.5, reverbAmt: reverbAmt + 0.1 });
  }

  // === 8 种音效 (二次元甜美版) ===

  // 1. tap: 清脆水滴叮
  function tap(){
    tone({ freq: 2349, type: 'sine', dur: 0.04, vol: 0.13, attack: 0.001, release: 0.08, reverbAmt: 0.15 });
    tone({ freq: 3520, type: 'sine', dur: 0.03, vol: 0.05, attack: 0.001, release: 0.1, reverbAmt: 0.2 });
  }

  // 2. swipe: 可爱"啾"上扬
  function swipe(){
    tone({ freq: 1318, freqEnd: 2093, type: 'sine', dur: 0.12, vol: 0.16, attack: 0.005, release: 0.15, reverbAmt: 0.2 });
  }

  // 3. pullCharge: 心动期待 - 八度上扬 chime
  function pullCharge(){
    chime({ freq: 880, dur: 0.15, vol: 0.16, release: 0.25, reverbAmt: 0.2 });
    chime({ freq: 1318, start: 0.1, dur: 0.18, vol: 0.16, release: 0.3, reverbAmt: 0.2 });
    chime({ freq: 1760, start: 0.2, dur: 0.2, vol: 0.14, release: 0.35, reverbAmt: 0.25 });
  }

  // 4. pullRelease: 闪亮"哇" - 高频颗粒上升
  function pullRelease(){
    tone({ freq: 1568, freqEnd: 2637, type: 'sine', dur: 0.3, vol: 0.18, attack: 0.01, release: 0.3, reverbAmt: 0.25 });
    // 高频闪烁颗粒
    for (let i = 0; i < 6; i++){
      tone({ freq: 2349 + Math.random() * 1500, type: 'sine', start: i * 0.05, dur: 0.06, vol: 0.06, release: 0.2, reverbAmt: 0.3 });
    }
  }

  // 5. revealSignal (R): 温柔 do-mi-sol (C 大调三和弦)
  function revealSignal(){
    chime({ freq: 523.25, dur: 0.3, vol: 0.18, release: 0.5, reverbAmt: 0.25 });    // C5
    chime({ freq: 659.25, start: 0.08, dur: 0.3, vol: 0.16, release: 0.45, reverbAmt: 0.25 }); // E5
    chime({ freq: 783.99, start: 0.16, dur: 0.32, vol: 0.16, release: 0.5, reverbAmt: 0.3 });  // G5
  }

  // 6. revealEcho (SR): 心动魔法 arpeggio - C 大调上行 + 高频闪
  function revealEcho(){
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C-E-G-C-E
    notes.forEach((f, i) => {
      chime({ freq: f, start: i * 0.07, dur: 0.2, vol: 0.16, release: 0.45, reverbAmt: 0.25 });
    });
    // 上方 sparkle
    [2093, 2637, 3136].forEach((f, i) => {
      tone({ freq: f, type: 'sine', start: 0.35 + i * 0.05, dur: 0.1, vol: 0.07, release: 0.3, reverbAmt: 0.35 });
    });
  }

  // 7. revealResonance (SSR): 闪亮上扬 - 大七和弦 + 礼花高频
  function revealResonance(){
    // 主和弦 Cmaj7 (C-E-G-B) 快速叠加,但全是 octave 5-6 高频段,不要低音
    const fundamentals = [523.25, 659.25, 783.99, 987.77]; // C5-E5-G5-B5
    fundamentals.forEach((f, i) => {
      chime({ freq: f, start: i * 0.05, dur: 0.5, vol: 0.2, release: 0.7, reverbAmt: 0.3 });
    });
    // 上方 octave 加强
    [1046.5, 1318.51, 1568, 1975.53].forEach((f, i) => {
      chime({ freq: f, start: 0.25 + i * 0.04, dur: 0.4, vol: 0.12, release: 0.55, reverbAmt: 0.3 });
    });
    // 礼花式 sparkle storm - 全 4kHz+ 高频
    for (let i = 0; i < 15; i++){
      const f = 2349 + Math.random() * 2000;
      tone({ freq: f, type: 'sine', start: 0.15 + i * 0.05 + Math.random() * 0.03, dur: 0.06, vol: 0.05 + Math.random() * 0.04, release: 0.3, reverbAmt: 0.4 });
    }
    // 最后一击 "叮~" 高频 bell
    chime({ freq: 2637, start: 0.7, dur: 0.4, vol: 0.18, release: 0.6, reverbAmt: 0.35 });
  }

  // 8. complete: 胜利上扬二音 (do-sol 完美八度)
  function complete(){
    chime({ freq: 783.99, dur: 0.15, vol: 0.18, release: 0.3, reverbAmt: 0.2 });
    chime({ freq: 1318.51, start: 0.08, dur: 0.25, vol: 0.2, release: 0.4, reverbAmt: 0.25 });
  }

  // BGM 接口
  function bgm(name){
    if (bgmCurrent === name) return;
    stopBGM();
    if (!name) return;
    bgmEl = new Audio(`assets/audio/bgm-${name}.mp3`);
    bgmEl.loop = true;
    bgmEl.volume = 0.32;
    bgmEl.play().catch(() => {});
    bgmCurrent = name;
  }
  function stopBGM(){
    if (bgmEl){ bgmEl.pause(); bgmEl = null; }
    bgmCurrent = null;
  }

  function reveal(tier){
    if (tier === 'resonance' || tier === 'ssr') revealResonance();
    else if (tier === 'echo' || tier === 'sr') revealEcho();
    else revealSignal();
  }

  function toggleMute(){
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
    if (bgmEl) bgmEl.muted = muted;
    return muted;
  }

  window.SFX = {
    tap, swipe, pullCharge, pullRelease,
    revealSignal, revealEcho, revealResonance, reveal,
    complete, bgm, stopBGM, toggleMute,
    isMuted: () => muted
  };
})();
