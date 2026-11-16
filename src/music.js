/* Original generative background music: guzheng-style plucks, dizi-style flute and a drone,
   on a pentatonic scale. Synthesised live with Web Audio — no recordings, no licences. */
const Music = (() => {
  let ctx = null, master = null, verb = null, timer = null, playing = false, nextT = 0, step = 0, droneNodes = [], phrase = [], phraseRest = 0;
  const LS = (k, d) => { try { const v = localStorage.getItem('paisho.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const SS = (k, v) => { try { localStorage.setItem('paisho.' + k, JSON.stringify(v)); } catch (e) {} };
  let vol = LS('musicVol', 0.5);
  const enabled = () => LS('music', true);
  const BPM = 66, BEAT = 60 / BPM, EIGHTH = BEAT / 2;
  // D gong mode pentatonic: D E F# A B
  const ROOT = 146.83; // D3
  const DEG = [0, 2, 4, 7, 9];
  const freq = (deg, oct) => ROOT * Math.pow(2, (DEG[((deg % 5) + 5) % 5] + 12 * (oct + Math.floor(deg / 5))) / 12);
  const bufCache = new Map();

  function makeReverb() {
    const len = ctx.sampleRate * 3.2, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const c = ctx.createConvolver(); c.buffer = b; return c;
  }
  // Karplus–Strong plucked string, rendered once per pitch
  function pluckBuf(f) {
    const key = Math.round(f * 10); if (bufCache.has(key)) return bufCache.get(key);
    const sr = ctx.sampleRate, len = Math.floor(sr * 3), N = Math.max(2, Math.round(sr / f));
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin((Math.PI * i) / N));
    let idx = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx], nxt = ring[(idx + 1) % N];
      const v = 0.4985 * (cur + nxt) + 0.002 * last; last = v;
      ring[idx] = v; d[i] = cur; idx = (idx + 1) % N;
    }
    bufCache.set(key, b); return b;
  }
  function pluck(t, f, g = 0.5, bend = 0) {
    const src = ctx.createBufferSource(); src.buffer = pluckBuf(f);
    if (bend) { src.playbackRate.setValueAtTime(1, t + 0.18); src.playbackRate.linearRampToValueAtTime(Math.pow(2, bend / 12), t + 0.42); src.playbackRate.linearRampToValueAtTime(1, t + 0.9); }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const amp = ctx.createGain(); amp.gain.setValueAtTime(g, t); amp.gain.exponentialRampToValueAtTime(0.0008, t + 2.8);
    src.connect(lp).connect(amp); amp.connect(master); amp.connect(verb);
    src.start(t); src.stop(t + 3);
  }
  function flute(t, f, dur, g = 0.11) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
    vib.connect(vg).connect(o.frequency);
    const h = ctx.createOscillator(); h.type = 'sine'; h.frequency.value = f * 2; const hg = ctx.createGain(); hg.gain.value = 0.18;
    const noise = ctx.createBufferSource(); const nb = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; noise.buffer = nb; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3; const ng = ctx.createGain(); ng.gain.value = 0.25;
    const amp = ctx.createGain(); amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(g, t + 0.12); amp.gain.setValueAtTime(g, t + dur - 0.25); amp.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(amp); h.connect(hg).connect(amp); noise.connect(bp).connect(ng).connect(amp);
    amp.connect(master); amp.connect(verb);
    [o, h, vib, noise].forEach((n) => { n.start(t); n.stop(t + dur + 0.05); });
  }
  function startDrone() {
    stopDrone();
    [[ROOT / 2, 0.05], [ROOT * 0.75, 0.03], [ROOT, 0.02]].forEach(([f, g]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const amp = ctx.createGain(); amp.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05; const lg = ctx.createGain(); lg.gain.value = g * 0.4;
      lfo.connect(lg).connect(amp.gain);
      amp.gain.setValueAtTime(0, ctx.currentTime); amp.gain.linearRampToValueAtTime(g, ctx.currentTime + 4);
      o.connect(amp); amp.connect(master); amp.connect(verb);
      o.start(); lfo.start(); droneNodes.push(o, lfo, amp);
    });
  }
  function stopDrone() { droneNodes.forEach((n) => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }); droneNodes = []; }

  let deg = 5; // melodic position (degree index across octaves)
  function newPhrase() {
    const len = 4 + Math.floor(Math.random() * 5), out = [];
    for (let i = 0; i < len; i++) {
      deg += [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
      deg = Math.max(2, Math.min(12, deg));
      out.push({ deg, dur: [1, 1, 2, 2, 3, 4][Math.floor(Math.random() * 6)] });
    }
    out[out.length - 1].dur = 4 + Math.floor(Math.random() * 3);
    return out;
  }
  let pending = 0, fluteNext = 32;
  function tick() {
    if (!playing) return;
    while (nextT < ctx.currentTime + 0.4) {
      const t = nextT;
      // bass pluck every 8 eighths (one bar), occasional fifth
      if (step % 8 === 0) pluck(t, freq(0, -1) * (step % 32 === 16 ? 1.5 : 1), 0.32);
      if (step % 16 === 6 && Math.random() < 0.5) pluck(t, freq(3, -1), 0.18);
      // melody
      if (pending > 0) pending--;
      else if (phraseRest > 0) phraseRest--;
      else {
        if (!phrase.length) { phrase = newPhrase(); }
        const n = phrase.shift();
        const f = freq(n.deg, 0);
        const bend = Math.random() < 0.18 ? (Math.random() < 0.5 ? 2 : 1) : 0;
        pluck(t, f, 0.42, bend);
        if (n.dur >= 3 && Math.random() < 0.35) for (let k = 1; k <= 5; k++) pluck(t + k * 0.075, f, 0.16 - k * 0.02); // tremolo flourish
        if (Math.random() < 0.12) pluck(t + EIGHTH * 0.5, freq(n.deg + 2, 0), 0.2);
        pending = n.dur - 1;
        if (!phrase.length) phraseRest = 4 + Math.floor(Math.random() * 8);
      }
      // occasional flute line
      if (step === fluteNext) {
        let fd = 7 + Math.floor(Math.random() * 3), tt = t;
        for (let k = 0; k < 3 + Math.floor(Math.random() * 3); k++) { const d = EIGHTH * (2 + Math.floor(Math.random() * 3)); flute(tt, freq(fd, 0), d * 0.98); tt += d; fd += [-1, 1, -2, 1][Math.floor(Math.random() * 4)]; }
        fluteNext = step + 48 + Math.floor(Math.random() * 64);
      }
      nextT += EIGHTH; step++;
    }
  }
  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = vol * 0.55;
    verb = makeReverb(); const vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg).connect(master);
    master.connect(ctx.destination);
    return true;
  }
  function start() {
    if (!enabled() || playing) return;
    if (!ensure()) return;
    try { ctx.resume(); } catch (e) {}
    playing = true; nextT = ctx.currentTime + 0.3; step = 0; phrase = []; phraseRest = 2;
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0, ctx.currentTime); master.gain.linearRampToValueAtTime(vol * 0.55, ctx.currentTime + 2);
    startDrone();
    timer = setInterval(tick, 100); tick();
  }
  function stop() {
    if (!playing) return;
    playing = false; clearInterval(timer); timer = null;
    try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8); } catch (e) {}
    setTimeout(() => { if (!playing) stopDrone(); }, 900);
  }
  function setEnabled(on) { SS('music', !!on); if (on) start(); else stop(); }
  function setVolume(v) { vol = Math.max(0, Math.min(1, v)); SS('musicVol', vol); if (master && playing) master.gain.setTargetAtTime(vol * 0.55, ctx.currentTime, 0.1); }
  // pause when the app is hidden, resume when back
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { try { ctx.suspend(); } catch (e) {} } else if (playing) { try { ctx.resume(); } catch (e) {} } });
  return { start, stop, setEnabled, setVolume, enabled, get volume() { return vol; }, get playing() { return playing; } };
})();
