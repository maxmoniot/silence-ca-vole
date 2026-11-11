/* Tout le son est synthetise : pas un seul fichier audio.
   Une petite formation par region (accordeon dans le metro, oud en Tunisie, ukulele a Hawai...). */
'use strict';
(function () {
  const A = G.Audio = {};
  let ctx = null, master, musGain, sfxGain, filtre, noiseBuf, moteur, moteurGain;
  let style = null, pas = 0, tProchain = 0, compo = null, styleNom = '';

  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const GAMMES = {
    majeur: [0, 2, 4, 5, 7, 9, 11], mineur: [0, 2, 3, 5, 7, 8, 10], dorien: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10],
    hijaz: [0, 1, 4, 5, 7, 8, 10], penta: [0, 2, 4, 7, 9, 12, 14], pentam: [0, 3, 5, 7, 10, 12, 15],
  };
  const S = {
    musette: { bpm: 168, mes: 3, r: 57, g: 'mineur', prog: [0, 0, 3, 3, 4, 4, 0, 0], basse: 'o..', ac: '.xx', lead: 'accordeon', perc: '', swing: 0 },
    paris: { bpm: 118, mes: 4, r: 60, g: 'majeur', prog: [0, 5, 3, 4], basse: 'o.x.o.x.', ac: '..x...x.', lead: 'accordeon', perc: 'k.h.s.h.', swing: .1 },
    normandie: { bpm: 112, mes: 4, r: 62, g: 'majeur', prog: [0, 3, 4, 0], basse: 'o...x...', ac: '..x...x.', lead: 'flute', perc: 'k...s...', swing: 0 },
    camargue: { bpm: 128, mes: 4, r: 57, g: 'hijaz', prog: [0, 6, 5, 0], basse: 'o.o.x.x.', ac: 'x.xx.x.x', lead: 'pluck', perc: 'h.hsh.hs', swing: 0 },
    alpes: { bpm: 126, mes: 3, r: 60, g: 'majeur', prog: [0, 0, 4, 4, 4, 4, 0, 0], basse: 'o..', ac: '.xx', lead: 'flute', perc: '', swing: 0 },
    afrique: { bpm: 122, mes: 4, r: 60, g: 'penta', prog: [0, 3, 4, 3], basse: 'o..x..o.', ac: '.x.x.x.x', lead: 'marimba', perc: 'k.hsk.hs', swing: 0 },
    orient: { bpm: 110, mes: 4, r: 57, g: 'hijaz', prog: [0, 0, 6, 0], basse: 'o..o..x.', ac: '...x...x', lead: 'oud', perc: 'k.s.ks.s', swing: 0 },
    hawaii: { bpm: 96, mes: 4, r: 62, g: 'penta', prog: [0, 3, 4, 0], basse: 'o...x...', ac: 'x.xx.xx.', lead: 'pluck', perc: '..h...h.', swing: .15 },
    irlande: { bpm: 150, mes: 3, r: 62, g: 'dorien', prog: [0, 0, 6, 6, 0, 0, 4, 0], basse: 'o..', ac: '.x.', lead: 'flute', perc: 'k..', swing: 0 },
    mer: { bpm: 84, mes: 4, r: 57, g: 'dorien', prog: [0, 5, 3, 6], basse: 'o.......', ac: 'x...x...', lead: 'nappe', perc: '', swing: 0 },
    maloya: { bpm: 112, mes: 3, r: 57, g: 'mixo', prog: [0, 6, 0, 4], basse: 'o..o..', ac: '.xx.xx', lead: 'pluck', perc: 'k.sk.s', swing: 0 },
    epique: { bpm: 132, mes: 4, r: 55, g: 'mineur', prog: [0, 5, 2, 6], basse: 'oooooooo', ac: 'x..x..x.', lead: 'cuivre', perc: 'k.s.kks.', swing: 0 },
    stade: { bpm: 124, mes: 4, r: 60, g: 'majeur', prog: [0, 4, 5, 3], basse: 'o.o.o.o.', ac: '.x.x.x.x', lead: 'cuivre', perc: 'k.skk.s.', swing: 0 },
    eau: { bpm: 72, mes: 4, r: 60, g: 'penta', prog: [0, 3, 1, 4], basse: 'o.......', ac: 'x.x.x.x.', lead: 'nappe', perc: '', swing: 0 },
  };

  function seedRand(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296; }

  /* Melodie : un motif reconnaissable, repete et varie (A A' B A) */
  function composer(nom, s) {
    const r = seedRand(nom + 'x');
    const g = GAMMES[s.g];
    const parMes = s.mes === 3 ? 6 : 8;
    const motif = (len) => {
      const m = [];
      let d = Math.floor(r() * 5);
      for (let i = 0; i < len; i++) {
        const fort = i % (s.mes === 3 ? 3 : 2) === 0;
        if (r() < (fort ? .1 : .45)) { m.push(null); continue; }
        d = Math.max(0, Math.min(g.length + 3, d + Math.floor(r() * 5) - 2));
        m.push(d);
      }
      return m;
    };
    const a = motif(parMes * 2), b = motif(parMes * 2);
    const a2 = a.map((v, i) => i > parMes && v !== null && r() < .6 ? v + (r() < .5 ? 1 : -1) : v);
    return [].concat(a, a2, b, a);
  }

  function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f, t, dur, vol, dest, det) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
    env(g, t, .006, dur, vol);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + .05);
    return o;
  }
  function bruit(t, dur, vol, type, fq, dest) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = fq;
    env(g, t, .002, dur, vol);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  const TIMBRE = {
    accordeon(f, t, d, v, dest) { osc('sawtooth', f, t, d, v * .32, dest, -7); osc('sawtooth', f, t, d, v * .32, dest, 7); osc('square', f * 2, t, d, v * .08, dest); },
    flute(f, t, d, v, dest) { const o = osc('triangle', f, t, d, v * .6, dest); osc('sine', f * 2, t, d, v * .12, dest); const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = f * .01; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d); },
    pluck(f, t, d, v, dest) { osc('triangle', f, t, Math.min(d, .4), v * .7, dest); osc('square', f * 2, t, .06, v * .12, dest); },
    oud(f, t, d, v, dest) { osc('sawtooth', f, t, Math.min(d, .5), v * .34, dest); osc('triangle', f * 1.005, t, Math.min(d, .4), v * .4, dest); },
    marimba(f, t, d, v, dest) { osc('sine', f, t, .28, v * .8, dest); osc('sine', f * 4, t, .05, v * .2, dest); },
    nappe(f, t, d, v, dest) { const g = ctx.createGain(); env(g, t, .1, d * 1.6, v * .4); const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(dest); o.start(t); o.stop(t + d * 1.8); },
    cuivre(f, t, d, v, dest) { osc('square', f, t, d, v * .26, dest, -4); osc('sawtooth', f, t, d, v * .26, dest, 4); },
  };

  function jouerPas(t) {
    const s = style, dur16 = 60 / s.bpm / 2;
    const parMes = s.mes === 3 ? 6 : 8;
    const iMes = Math.floor(pas / parMes);
    const deg = s.prog[iMes % s.prog.length];
    const g = GAMMES[s.g];
    const note = d => s.r + g[((d % g.length) + g.length) % g.length] + 12 * Math.floor(d / g.length);
    const pm = pas % parMes;
    const tt = t + (pas % 2 ? s.swing * dur16 : 0);
    const bas = s.basse[pm % s.basse.length];
    if (bas === 'o') osc('triangle', NOTE(note(deg) - 24), tt, dur16 * 1.7, .34, musGain);
    if (bas === 'x') osc('triangle', NOTE(note(deg + 4) - 24), tt, dur16 * 1.2, .26, musGain);
    if (s.ac[pm % s.ac.length] === 'x') {
      for (const k of [0, 2, 4]) TIMBRE[s.lead === 'nappe' ? 'nappe' : 'pluck'](NOTE(note(deg + k) - 12), tt, dur16 * .9, .1, musGain);
    }
    const c = s.perc && s.perc[pm % s.perc.length];
    if (c === 'k') { const o = osc('sine', 110, tt, .08, .5, musGain); o.frequency.exponentialRampToValueAtTime(40, tt + .08); }
    if (c === 's') bruit(tt, .08, .16, 'highpass', 1600, musGain);
    if (c === 'h') bruit(tt, .03, .07, 'highpass', 6500, musGain);
    const m = compo[pas % compo.length];
    if (m !== null && m !== undefined) {
      // tous les 32 pas, la melodie laisse respirer
      if (Math.floor(pas / (parMes * 8)) % 3 !== 2) TIMBRE[s.lead](NOTE(note(m + deg)), tt, dur16 * 1.5, .3, musGain);
    }
  }

  function boucle() {
    if (!ctx || !style) return;
    while (tProchain < ctx.currentTime + .15) {
      jouerPas(tProchain);
      tProchain += 60 / style.bpm / 2;
      pas++;
    }
  }

  A.init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
      filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 18000; filtre.connect(master);
      musGain = ctx.createGain(); musGain.gain.value = G.sav.musique ? .5 : 0; musGain.connect(filtre);
      sfxGain = ctx.createGain(); sfxGain.gain.value = G.sav.son ? .7 : 0; sfxGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      moteur = ctx.createOscillator(); moteur.type = 'sawtooth'; moteur.frequency.value = 90;
      moteurGain = ctx.createGain(); moteurGain.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      moteur.connect(f); f.connect(moteurGain); moteurGain.connect(sfxGain); moteur.start();
      setInterval(boucle, 40);
      if (styleNom) A.region(styleNom);
    } catch (e) { ctx = null; }
  };
  A.pluie = k => {
    if (!ctx) return;
    if (!A._pluie) {
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .4;
      const g = ctx.createGain(); g.gain.value = 0;
      n.connect(f); f.connect(g); g.connect(sfxGain); n.start();
      A._pluie = g;
    }
    A._pluie.gain.setTargetAtTime(k * .1, ctx.currentTime, .4);
  };
  A.suspendre = () => { if (ctx && ctx.state === 'running') ctx.suspend(); };
  A.reglages = () => { if (!ctx) return; musGain.gain.value = G.sav.musique ? .5 : 0; sfxGain.gain.value = G.sav.son ? .7 : 0; };
  A.moteur = (on, h) => {
    if (!ctx) return;
    moteurGain.gain.setTargetAtTime(on ? (h ? .05 : .025) : 0, ctx.currentTime, .05);
    moteur.frequency.setTargetAtTime(h ? 165 : 110, ctx.currentTime, .08);
  };
  A.region = (nom, sous) => {
    styleNom = nom;
    if (!ctx) return;
    if (!S[nom]) nom = 'mer';
    filtre.frequency.setTargetAtTime(sous ? 900 : 18000, ctx.currentTime, .2);
    if (style === S[nom]) return;
    style = S[nom];
    compo = composer(nom, style);
    pas = 0;
    tProchain = Math.max(tProchain, ctx.currentTime + .05);
  };
  A.stop = () => { style = null; A.moteur(false); };
  A.sfx = k => {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, o = sfxGain;
    switch (k) {
      case 'bobine': osc('square', 1320 + Math.random() * 90, t, .05, .1, o); osc('square', 1760, t + .03, .05, .08, o); break;
      case 'frole': { const a = osc('sawtooth', 500, t, .14, .12, o); a.frequency.exponentialRampToValueAtTime(1600, t + .14); break; }
      case 'plan': [0, 4, 7, 12, 16].forEach((n, i) => osc('square', NOTE(72 + n), t + i * .07, .13, .14, o)); break;
      case 'pouvoir': [0, 5, 7, 12].forEach((n, i) => osc('triangle', NOTE(64 + n), t + i * .05, .14, .24, o)); break;
      case 'lettre': osc('square', NOTE(84), t, .09, .14, o); osc('square', NOTE(91), t + .07, .12, .14, o); break;
      case 'mission': [0, 7, 12].forEach((n, i) => osc('triangle', NOTE(76 + n), t + i * .09, .16, .22, o)); break;
      case 'tir': bruit(t, .04, .06, 'bandpass', 2600, o); break;
      case 'boum': bruit(t, .3, .32, 'lowpass', 900, o); { const a = osc('sine', 130, t, .24, .34, o); a.frequency.exponentialRampToValueAtTime(40, t + .24); } break;
      case 'crash': bruit(t, .6, .44, 'lowpass', 1400, o); { const a = osc('sawtooth', 320, t, .55, .2, o); a.frequency.exponentialRampToValueAtTime(40, t + .55); } break;
      case 'bouclier': { const a = osc('sine', 880, t, .3, .26, o); a.frequency.exponentialRampToValueAtTime(220, t + .3); } break;
      case 'siffle': { const a = osc('sine', 1500, t, .4, .08, o); a.frequency.exponentialRampToValueAtTime(600, t + .4); } break;
      case 'rayon': bruit(t, .5, .16, 'bandpass', 1400, o); osc('sawtooth', 110, t, .5, .1, o); break;
      case 'jet': bruit(t, .7, .14, 'bandpass', 1800, o); break;
      case 'splash': bruit(t, .55, .34, 'bandpass', 1300, o); bruit(t + .08, .35, .16, 'highpass', 3000, o); break;
      case 'clap': bruit(t, .06, .6, 'highpass', 900, o); osc('square', 180, t, .05, .3, o); break;
      case 'baleine': { const a = osc('sine', 150, t, 1.1, .3, o); a.frequency.linearRampToValueAtTime(330, t + .5); a.frequency.linearRampToValueAtTime(110, t + 1.1); break; }
      case 'bulles': for (let i = 0; i < 5; i++) { const a = osc('sine', 300 + Math.random() * 500, t + i * .05, .05, .12, o); a.frequency.exponentialRampToValueAtTime(1200, t + i * .05 + .05); } break;
      case 'tonnerre': bruit(t, 1.5, .5, 'lowpass', 180, o); bruit(t + .05, .3, .2, 'lowpass', 900, o); break;
      case 'clic': osc('square', 900, t, .03, .1, o); break;
    }
  };
})();
