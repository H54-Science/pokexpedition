// Audio 100 % procédural (WebAudio) : bruitages de combat et musiques générées.
let ctx = null, master, sfxBus, musBus, comp;
const cfg = { sound: true, music: true };
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function init() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
  ctx = new C();
  master = ctx.createGain(); master.gain.value = 0.85;
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
  musBus = ctx.createGain(); musBus.gain.value = 0; musBus.connect(master);
  return ctx;
}
function tone(f, t, d, o = {}) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t + (o.slideT || d));
  if (o.detune) osc.detune.value = o.detune;
  const v = o.vol == null ? 0.3 : o.vol, a = o.a || 0.004;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let out = g;
  if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = o.lp; g.connect(f2); out = f2; }
  osc.connect(g); out.connect(o.bus || sfxBus); osc.start(t); osc.stop(t + d + 0.05);
}
let nbuf = null;
function noise(t, d, o = {}) {
  if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const x = nbuf.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass"; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || 1;
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + d);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(o.bus || sfxBus); s.start(t, Math.random()); s.stop(t + d + 0.05);
}
const thump = (t, f = 110, v = 0.5, d = 0.18) => tone(f, t, d, { slide: 0.35, vol: v });

const TYPE_CAST = {
  Feu: (t) => { noise(t, 0.45, { type: "lowpass", f: 600, sweep: 3000, vol: 0.28, a: 0.06 }); },
  Eau: (t) => { for (let i = 0; i < 6; i++) tone(300 + Math.random() * 500, t + i * 0.04, 0.08, { slide: 2.2, vol: 0.09 }); noise(t, 0.3, { f: 1200, q: 0.6, vol: 0.08 }); },
  Plante: (t) => { noise(t, 0.35, { type: "highpass", f: 3000, vol: 0.1, a: 0.04 }); for (let i = 0; i < 4; i++) noise(t + i * 0.05, 0.05, { f: 5000, q: 2, vol: 0.06 }); },
  Électrik: (t) => { for (let i = 0; i < 5; i++) tone(120 + Math.random() * 80, t + i * 0.035, 0.05, { type: "sawtooth", vol: 0.1, lp: 3000 }); noise(t, 0.2, { type: "highpass", f: 5000, vol: 0.12 }); },
  Glace: (t) => { [96, 100, 103, 108].forEach((n, i) => tone(midi(n), t + i * 0.035, 0.3, { type: "triangle", vol: 0.06 })); noise(t, 0.25, { type: "highpass", f: 7000, vol: 0.08 }); },
  Vol: (t) => noise(t, 0.4, { f: 400, q: 1.5, sweep: 2500, vol: 0.2, a: 0.08 }),
  Roche: (t) => { thump(t, 90, 0.4, 0.25); noise(t, 0.2, { type: "lowpass", f: 500, vol: 0.2 }); },
  Sol: (t) => { thump(t, 70, 0.45, 0.35); noise(t, 0.4, { type: "lowpass", f: 300, vol: 0.25 }); },
  Psy: (t) => { tone(midi(72), t, 0.4, { vol: 0.1, slide: 1.5 }); tone(midi(79), t, 0.4, { vol: 0.08, slide: 0.66, detune: 20 }); },
  Spectre: (t) => { tone(midi(64), t, 0.5, { type: "triangle", vol: 0.1, slide: 0.5 }); tone(midi(65), t, 0.5, { type: "triangle", vol: 0.08, slide: 0.5 }); },
  Poison: (t) => { for (let i = 0; i < 5; i++) tone(150 + Math.random() * 120, t + i * 0.06, 0.1, { slide: 1.6, vol: 0.1 }); },
  Fée: (t) => { [84, 88, 91, 96].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.4, { vol: 0.07 })); },
  Dragon: (t) => { tone(220, t, 0.5, { type: "sawtooth", slide: 0.4, vol: 0.12, lp: 1200 }); noise(t, 0.4, { type: "lowpass", f: 800, vol: 0.15 }); },
  Combat: (t) => noise(t, 0.12, { f: 1500, q: 0.8, vol: 0.18 }),
  Normal: (t) => noise(t, 0.15, { f: 2200, q: 0.7, vol: 0.14, sweep: 900 }),
  Insecte: (t) => { for (let i = 0; i < 8; i++) tone(600 + (i % 2) * 80, t + i * 0.025, 0.03, { type: "square", vol: 0.04 }); },
  Acier: (t) => { tone(midi(88), t, 0.35, { type: "triangle", vol: 0.1 }); tone(midi(95), t, 0.25, { vol: 0.06, detune: 15 }); },
  Ténèbres: (t) => noise(t, 0.4, { type: "lowpass", f: 400, vol: 0.2 }),
};

const SFX = {
  tap() { const t = ctx.currentTime; tone(880, t, 0.05, { type: "triangle", vol: 0.1 }); tone(1320, t + 0.015, 0.04, { vol: 0.05 }); },
  soft() { tone(520, ctx.currentTime, 0.07, { vol: 0.09 }); },
  back() { const t = ctx.currentTime; tone(660, t, 0.06, { type: "triangle", vol: 0.08 }); tone(440, t + 0.04, 0.06, { type: "triangle", vol: 0.07 }); },
  open() { const t = ctx.currentTime; noise(t, 0.16, { f: 800, sweep: 3000, vol: 0.06 }); tone(midi(79), t + 0.03, 0.12, { type: "triangle", vol: 0.06 }); },
  coin() { const t = ctx.currentTime; tone(midi(88), t, 0.07, { type: "square", vol: 0.05 }); tone(midi(95), t + 0.06, 0.3, { type: "square", vol: 0.05 }); },
  cast(type) { (TYPE_CAST[type] || TYPE_CAST.Normal)(ctx.currentTime); },
  hit(k) { const t = ctx.currentTime; thump(t, 140, 0.35 + 0.2 * (k || 0)); noise(t, 0.09, { f: 1800, q: 0.7, vol: 0.22 }); },
  crit() { const t = ctx.currentTime; thump(t, 120, 0.6, 0.25); noise(t, 0.15, { f: 2500, q: 0.5, vol: 0.3 }); tone(midi(96), t + 0.02, 0.25, { type: "square", vol: 0.05 }); },
  superEff() { const t = ctx.currentTime; [76, 83, 88].forEach((n, i) => tone(midi(n), t + i * 0.04, 0.18, { type: "square", vol: 0.05 })); },
  weak() { tone(200, ctx.currentTime, 0.15, { type: "triangle", vol: 0.12, slide: 0.7 }); },
  reaction(id) {
    const t = ctx.currentTime, root = { vapeur: 62, fonte: 64, combustion: 57, surcharge: 55, electro: 60, floraison: 67, gel: 72, supra: 69, catalyse: 66, dispersion: 71, cristal: 74 }[id] || 64;
    [0, 4, 7, 12].forEach((iv, i) => tone(midi(root + iv), t + i * 0.025, 0.6, { type: i % 2 ? "square" : "triangle", vol: 0.06 }));
    noise(t, 0.5, { type: "highpass", f: 6000, vol: 0.08 }); thump(t, 90, 0.4, 0.3);
  },
  shield() { const t = ctx.currentTime; tone(midi(91), t, 0.4, { type: "triangle", vol: 0.08 }); tone(midi(98), t + 0.05, 0.4, { vol: 0.05 }); },
  heal() { const t = ctx.currentTime; [72, 76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.06, 0.35, { vol: 0.07 })); },
  buff() { const t = ctx.currentTime; [67, 71, 74, 79].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.2, { type: "square", vol: 0.04 })); },
  debuff() { const t = ctx.currentTime; [74, 70, 67, 62].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.2, { type: "square", vol: 0.04 })); },
  ko() { const t = ctx.currentTime; tone(midi(67), t, 0.5, { type: "square", vol: 0.06, slide: 0.25 }); noise(t + 0.1, 0.3, { type: "lowpass", f: 600, vol: 0.12 }); },
  ultReady() { const t = ctx.currentTime; [79, 83, 86, 91].forEach((n, i) => tone(midi(n), t + i * 0.04, 0.3, { type: "triangle", vol: 0.06 })); },
  ultStart() { const t = ctx.currentTime; noise(t, 0.7, { f: 300, sweep: 6000, q: 0.8, vol: 0.18, a: 0.5 }); tone(55, t, 0.9, { type: "sawtooth", vol: 0.08, lp: 600, slide: 2 }); },
  boom() { const t = ctx.currentTime; thump(t, 80, 0.8, 0.5); noise(t, 0.6, { type: "lowpass", f: 900, vol: 0.4 }); },
  throw() { noise(ctx.currentTime, 0.3, { f: 900, sweep: 2500, vol: 0.12 }); },
  wobble() { const t = ctx.currentTime; tone(300, t, 0.06, { type: "square", vol: 0.05 }); tone(240, t + 0.07, 0.06, { type: "square", vol: 0.05 }); },
  click() { const t = ctx.currentTime; tone(1200, t, 0.03, { type: "square", vol: 0.06 }); },
  captured() { const t = ctx.currentTime; [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(midi(n), t + i * 0.09, 0.25, { type: "square", vol: 0.06 })); },
  escape() { const t = ctx.currentTime; noise(t, 0.2, { f: 2000, vol: 0.2 }); tone(midi(60), t, 0.3, { type: "square", vol: 0.05, slide: 0.5 }); },
  victory() { const t = ctx.currentTime; [[72, 0], [72, 0.12], [72, 0.24], [76, 0.36], [79, 0.6], [84, 0.84]].forEach(([n, d]) => { tone(midi(n), t + d, 0.3, { type: "square", vol: 0.06 }); tone(midi(n - 12), t + d, 0.3, { type: "triangle", vol: 0.08 }); }); },
  defeat() { const t = ctx.currentTime; [[67, 0], [63, 0.3], [60, 0.6], [55, 0.9]].forEach(([n, d]) => tone(midi(n), t + d, 0.5, { type: "triangle", vol: 0.1 })); },
  levelup() { const t = ctx.currentTime; [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.06, 0.4, { type: "square", vol: 0.045 })); },
  step() { noise(ctx.currentTime, 0.05, { f: 600, vol: 0.06 }); },
  rare() { const t = ctx.currentTime; for (let i = 0; i < 8; i++) tone(midi(84 + (i % 4) * 3), t + i * 0.05, 0.4, { vol: 0.05 }); },
  shiny() { const t = ctx.currentTime; for (let i = 0; i < 10; i++) tone(midi(88 + (i % 5) * 2), t + i * 0.05, 0.35, { vol: 0.06 }); },
  encounter() { const t = ctx.currentTime; for (let i = 0; i < 6; i++) tone(midi(60 + i * 2), t + i * 0.035, 0.08, { type: "square", vol: 0.05 }); noise(t, 0.3, { f: 600, sweep: 4000, vol: 0.1 }); },
  purr() { const t = ctx.currentTime; tone(midi(84), t, 0.1, { vol: 0.09, slide: 1.25 }); tone(midi(88), t + 0.08, 0.14, { vol: 0.07 }); },
  pts() { tone(midi(93), ctx.currentTime, 0.12, { type: "triangle", vol: 0.06 }); },
  perfect() { const t = ctx.currentTime; [84, 88, 91, 96, 100].forEach((n, i) => tone(midi(n), t + i * 0.035, 0.32, { type: i % 2 ? "square" : "triangle", vol: 0.07 })); noise(t, 0.25, { type: "highpass", f: 6000, vol: 0.12 }); thump(t, 160, 0.35, 0.14); },
  good() { const t = ctx.currentTime; [79, 86].forEach((n, i) => tone(midi(n), t + i * 0.04, 0.2, { type: "triangle", vol: 0.07 })); },
};

// ───────── musique ─────────
// Séquenceur simple : progression d'accords + basse + arpèges + mélodie à graine + batterie.
const TRACKS = {
  camp: { bpm: 74, lofi: true },
  map: { bpm: 104, prog: [[60, "M"], [57, "m"], [65, "M"], [67, "M"]], lead: "triangle", arp: 0.03, drums: 0.5, scale: [0, 2, 4, 7, 9], swing: 0.08 },
  battle: { bpm: 142, prog: [[57, "m"], [53, "M"], [48, "M"], [55, "M"]], lead: "square", arp: 0.035, drums: 1, scale: [0, 3, 5, 7, 10], bass8: true },
  boss: { bpm: 158, prog: [[52, "m"], [48, "M"], [50, "M"], [47, "M"]], lead: "sawtooth", arp: 0.04, drums: 1.2, scale: [0, 2, 3, 7, 8], bass8: true, dark: true },
  victory: { bpm: 120, prog: [[60, "M"], [65, "M"], [67, "M"], [60, "M"]], lead: "square", arp: 0.03, drums: 0.6, scale: [0, 4, 7, 9, 12] },
};
const CH = { M: [0, 4, 7, 11], m: [0, 3, 7, 10] };
let mus = null;
function seededR(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }
function startTrack(name, variant = 0) {
  if (!init()) return;
  stopMusic(0.4);
  const tr = TRACKS[name]; if (!tr) return;
  const c = ctx, bus = c.createGain(); bus.gain.value = 0; bus.connect(musBus);
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = tr.lofi ? 1800 : 5200; lp.connect(bus);
  musBus.gain.cancelScheduledValues(c.currentTime); musBus.gain.setValueAtTime(musBus.gain.value, c.currentTime); musBus.gain.linearRampToValueAtTime(0.42, c.currentTime + 0.8);
  bus.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
  const beat = 60 / tr.bpm; let step = 0, next = c.currentTime + 0.15;
  const r = seededR(1000 + variant * 77 + name.length * 13);
  const transpose = [0, 2, -3, 5, -2, 3, -5][variant % 7];
  const motif = Array.from({ length: 16 }, () => (r() < 0.62 ? (r() * 5) | 0 : -1)); // mélodie à graine (répétée)
  const motifB = motif.map((x) => (x < 0 ? (r() < 0.4 ? (r() * 5) | 0 : -1) : (x + ((r() * 3) | 0)) % 5));
  function bar(t, b) {
    if (tr.lofi) return lofiBar(t, b, beat, lp, bus);
    const [root, q] = tr.prog[b % tr.prog.length], chord = CH[q].map((n) => n + root + transpose);
    const sw = tr.swing || 0;
    // basse
    for (let i = 0; i < (tr.bass8 ? 8 : 4); i++) {
      const tt = t + i * beat * (tr.bass8 ? 0.5 : 1);
      const n = chord[0] - 24 + (tr.bass8 && i % 2 ? 12 : 0);
      tone(midi(n), tt, beat * (tr.bass8 ? 0.45 : 0.9), { type: tr.dark ? "sawtooth" : "triangle", vol: 0.16, bus: lp, lp: tr.dark ? 900 : undefined });
    }
    // arpège
    for (let i = 0; i < 16; i++) tone(midi(chord[i % 4] + 12), t + i * beat * 0.25 + (i % 2 ? sw * beat : 0), beat * 0.22, { type: "square", vol: tr.arp, bus: lp });
    // mélodie
    const mot = (Math.floor(b / 4) % 2 ? motifB : motif);
    for (let i = 0; i < 8; i++) {
      const d = mot[(b % 2) * 8 + i]; if (d < 0) continue;
      const n = 60 + transpose + tr.scale[d] + (tr.dark ? -12 : 0) + (b % 8 >= 6 ? 12 : 0);
      const tt = t + i * beat * 0.5 + (i % 2 ? sw * beat : 0);
      tone(midi(n + 12), tt, beat * 0.45, { type: tr.lead, vol: 0.055, bus: lp, lp: tr.lead === "sawtooth" ? 2400 : undefined });
    }
    // batterie
    const dv = tr.drums;
    for (let i = 0; i < 8; i++) {
      const tt = t + i * beat * 0.5;
      if (i % 4 === 0 || (tr.bass8 && i === 6)) tone(130, tt, 0.16, { slide: 0.3, vol: 0.32 * dv, bus });
      if (i % 4 === 2) noise(tt, 0.13, { f: 1700, q: 0.6, vol: 0.12 * dv, bus });
      noise(tt, 0.03, { type: "highpass", f: 8000, vol: 0.035 * dv, bus });
    }
  }
  const tick = setInterval(() => { if (!mus || mus.tick !== tick) return; while (next < c.currentTime + 1.2) { bar(next, step); step++; next += beat * 4; } }, 300);
  mus = { tick, bus, name, variant };
}
const LOFI = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
function lofiBar(t, b, beat, lp, bus) {
  const ch = LOFI[b % 4], sw = 0.06;
  const ep = (f, tt, d, v) => { tone(f, tt, d, { vol: v, bus: lp, a: 0.01 }); tone(f * 2, tt, d * 0.5, { vol: v * 0.25, bus: lp }); };
  ch.forEach((n, i) => ep(midi(n + 12), t + (i ? sw * i : 0), beat * 3.6, 0.07));
  tone(midi(ch[0] - 12), t, beat * 1.8, { vol: 0.18, bus });
  tone(midi(ch[0] - 12), t + beat * 2.5, beat * 1.2, { vol: 0.14, bus });
  const pent = [69, 72, 74, 76, 79, 81];
  for (let i = 0; i < 4; i++) if (Math.random() < 0.5) ep(midi(pent[(Math.random() * 6) | 0] + (Math.random() < 0.25 ? 12 : 0)), t + i * beat + (Math.random() < 0.4 ? beat / 2 : 0), beat * 1.4, 0.05);
  for (let i = 0; i < 4; i++) { const tt = t + i * beat; if (i % 2 === 0) tone(120, tt, 0.18, { slide: 0.4, vol: 0.26, bus }); else noise(tt, 0.14, { f: 1500, q: 0.6, vol: 0.08, bus: lp }); noise(tt, 0.04, { type: "highpass", f: 7000, vol: 0.025, bus }); }
}
function stopMusic(fade = 0.8) {
  if (!mus || !ctx) return; const m = mus; mus = null; clearInterval(m.tick);
  const t = ctx.currentTime; m.bus.gain.cancelScheduledValues(t); m.bus.gain.setValueAtTime(m.bus.gain.value, t); m.bus.gain.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => { try { m.bus.disconnect(); } catch (e) {} }, fade * 1000 + 200);
}

let wanted = null;
export const Sfx = {
  config(o) { Object.assign(cfg, o); if (!cfg.music) stopMusic(); else if (wanted) Sfx.music(...wanted); },
  unlock() { if (cfg.sound || cfg.music) init(); if (cfg.music && wanted && !mus) startTrack(...wanted); },
  play(name, a) { if (!cfg.sound || !init() || !SFX[name]) return; try { SFX[name](a); } catch (e) {} },
  music(name, variant = 0) {
    wanted = name ? [name, variant] : null;
    if (!name) return stopMusic();
    if (!cfg.music || !ctx) return;
    if (mus && mus.name === name && mus.variant === variant) return;
    startTrack(name, variant);
  },
  suspend(v) { try { if (ctx) v ? ctx.suspend() : ctx.resume(); } catch (e) {} },
};
document.addEventListener("visibilitychange", () => Sfx.suspend(document.hidden));
