/**
 * ============================================================================
 * GOMINOLA - ARCADE DEL AMOR (LÓGICA DEL JUEGO)
 * ============================================================================
 * Match-3 romántico de caramelos, ositos y corazones explosivos en Canvas 2D.
 * Incluye motor de síntesis de audio (Web Audio API), renderizado procedural
 * de sprites vectoriales a 60 FPS, poderes especiales y sistema de rangos.
 */

/* ============================================================================
   1. CONSTANTES Y CONFIGURACIÓN DE TABLERO
   ============================================================================ */
const N = 8;          // Dimensión de cuadrícula: 8x8
const K = 6;          // Cantidad de tipos de dulces base
const HEART = 6;      // Tipo especial de pieza rara: Corazón del Amor
const MOVES = 25;     // Movimientos iniciales por ronda
let uid = 0;          // Contador para identificadores únicos de piezas

/** Genera un color aleatorio para piezas base (0 a K-1) */
function randColor() {
  return Math.floor(Math.random() * K);
}

/** Cuenta el número actual de corazones en el tablero */
function countHearts(b) {
  let n = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] && b[r][c].t === HEART) n++;
    }
  }
  return n;
}

/**
 * Controla la probabilidad de aparición de corazones raros.
 * Mantiene una tendencia a tener al menos 3 en el tablero.
 */
function spawnColor(hearts) {
  const p = hearts < 3 ? 0.03 : hearts < 5 ? 0.01 : 0;
  return Math.random() < p ? HEART : randColor();
}

/** Crea una nueva instancia de pieza de dulce */
function mk(t, s) {
  return {
    id: ++uid,
    t: t,           // Tipo de dulce / color (o -1 para bomba)
    s: s || 0,      // Especial: 0 = normal, 1 = rayada horiz, 2 = rayada vert, 3 = bomba
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    vy: 0,
    fall: false,
    born: 0
  };
}

/** Obtiene la pieza en el índice lineal i (de 0 a N*N - 1) */
function cellOf(b, i) {
  return b[(i / N) | 0][i % N];
}

/* ============================================================================
   2. MOTOR DE MATCH-3: BÚSQUEDA Y RESOLUCIÓN DE COMBINACIONES
   ============================================================================ */

/** Busca combinaciones de 3 o más piezas consecutivas horizontales y verticales */
function findRuns(b) {
  const runs = [];

  // Búsqueda horizontal
  for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
      const a = b[r][c];
      if (!a || a.t < 0) { c++; continue; }
      let e = c + 1;
      while (e < N && b[r][e] && b[r][e].t === a.t) e++;
      if (e - c >= 3) {
        const cells = [];
        for (let k = c; k < e; k++) cells.push(r * N + k);
        runs.push({ dir: 'h', cells: cells });
      }
      c = e;
    }
  }

  // Búsqueda vertical
  for (let c = 0; c < N; c++) {
    let r = 0;
    while (r < N) {
      const a = b[r][c];
      if (!a || a.t < 0) { r++; continue; }
      let e = r + 1;
      while (e < N && b[e][c] && b[e][c].t === a.t) e++;
      if (e - r >= 3) {
        const cells = [];
        for (let k = r; k < e; k++) cells.push(k * N + c);
        runs.push({ dir: 'v', cells: cells });
      }
      r = e;
    }
  }

  return runs;
}

/**
 * Resuelve las combinaciones encontradas.
 * - Detecta si se juntaron 3 corazones (explosión amorosa total).
 * - Crea piezas especiales si el match es de 4 (rayada) o 5+ (bomba arcoíris).
 */
function resolveMatches(b, hint) {
  const runs = findRuns(b);
  if (!runs.length) return null;

  // Explosión total con 3 corazones
  for (const run of runs) {
    if (cellOf(b, run.cells[0]).t === HEART) {
      const all = new Set();
      for (let k = 0; k < N * N; k++) all.add(k);
      return { runs: runs, clear: all, specials: [], love: true };
    }
  }

  const clear = new Set();
  const specials = [];
  const taken = new Set();

  for (const run of runs) {
    for (const i of run.cells) clear.add(i);
  }

  for (const run of runs) {
    if (run.cells.length < 4) continue;
    let pos;
    if (hint) pos = run.cells.find(function (i) { return hint.indexOf(i) >= 0; });
    if (pos === undefined) pos = run.cells[Math.floor(run.cells.length / 2)];
    if (taken.has(pos)) continue;
    taken.add(pos);
    const tile = cellOf(b, pos);

    // Corrida horizontal -> raya vertical (s=2 limpia columna); corrida vertical -> raya horizontal (s=1 limpia fila)
    specials.push({
      idx: pos,
      t: tile.t,
      s: run.cells.length >= 5 ? 3 : (run.dir === 'h' ? 2 : 1)
    });
  }

  return { runs: runs, clear: clear, specials: specials };
}

/** Expande las áreas de destrucción si se activaron piezas especiales rayadas o bombas */
function expand(b, clear) {
  const q = Array.from(clear);
  while (q.length) {
    const i = q.pop(), r = (i / N) | 0, c = i % N, t = b[r][c];
    if (!t || !t.s) continue;
    const add = [];
    if (t.s === 1) {
      // Limpia fila entera
      for (let k = 0; k < N; k++) add.push(r * N + k);
    } else if (t.s === 2) {
      // Limpia columna entera
      for (let k = 0; k < N; k++) add.push(k * N + c);
    } else if (t.s === 3) {
      // Explosión en área 3x3
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N) add.push(rr * N + cc);
        }
      }
    }
    for (const j of add) {
      if (!clear.has(j)) {
        clear.add(j);
        q.push(j);
      }
    }
  }
  return clear;
}

/** Calcula el área de destrucción al activar una bomba arcoíris */
function bombSet(b, i, j) {
  const a = cellOf(b, i), o = cellOf(b, j), set = new Set([i, j]);
  if (a.s === 3 && o.s === 3) {
    for (let k = 0; k < N * N; k++) set.add(k);
    return set;
  }
  const color = a.s === 3 ? o.t : a.t;
  for (let k = 0; k < N * N; k++) {
    const t = cellOf(b, k);
    if (t && t.t === color) set.add(k);
  }
  return set;
}

/** Aplica la eliminación física de piezas en la matriz del tablero */
function applyClear(b, clear, specials) {
  const removed = [];
  for (const i of clear) {
    const r = (i / N) | 0, c = i % N;
    if (b[r][c]) {
      removed.push(b[r][c]);
      b[r][c] = null;
    }
  }
  for (const s of specials) {
    const t = cellOf(b, s.idx);
    if (t) {
      t.s = s.s;
      if (s.s === 3) t.t = -1;
    }
  }
  return removed;
}

/** Ejecuta un paso de resolución completo. Retorna null si no hay matches */
function step(b, hint, forced) {
  let clear, specials = [], bonus = 0, love = false;
  if (forced) {
    clear = new Set(forced);
  } else {
    const res = resolveMatches(b, hint);
    if (!res) return null;
    clear = res.clear;
    specials = res.specials;
    if (res.love) {
      love = true;
      bonus = 1360;
    }
    for (const run of res.runs) {
      if (run.cells.length === 4) bonus += 40;
      else if (run.cells.length >= 5) bonus += 100;
    }
  }

  expand(b, clear);
  for (const s of specials) clear.delete(s.idx);
  const cells = Array.from(clear);
  const removed = applyClear(b, clear, specials);

  return {
    removed: removed,
    cells: cells,
    count: cells.length,
    specials: specials,
    bonus: bonus,
    love: love
  };
}

/** Aplica gravedad al tablero haciendo caer piezas y rellenando los huecos superiores */
function gravity(b) {
  let hearts = countHearts(b);
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = N - 1; r >= 0; r--) {
      if (b[r][c]) col.push(b[r][c]);
    }
    const missing = N - col.length;
    for (let k = 0; k < col.length; k++) {
      b[N - 1 - k][c] = col[k];
    }
    for (let r = missing - 1; r >= 0; r--) {
      const col0 = spawnColor(hearts);
      if (col0 === HEART) hearts++;
      const t = mk(col0);
      t.x = c;
      t.y = r - missing;
      b[r][c] = t;
    }
    for (let r = 0; r < N; r++) {
      const t = b[r][c];
      t.tx = c;
      t.ty = r;
      t.fall = t.ty > t.y + 1e-6;
      if (t.fall && t.vy < 0) t.vy = 0;
    }
  }
}

/** Intercambia dos posiciones en el tablero */
function swapInBoard(b, i, j) {
  const r1 = (i / N) | 0, c1 = i % N, r2 = (j / N) | 0, c2 = j % N;
  const tmp = b[r1][c1];
  b[r1][c1] = b[r2][c2];
  b[r2][c2] = tmp;
}

/** Comprueba si existe al menos un movimiento válido que produzca combinación */
function hasMatchMove(b) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const nbs = [];
      if (c + 1 < N) nbs.push([r, c + 1]);
      if (r + 1 < N) nbs.push([r + 1, c]);
      for (const n of nbs) {
        const a = b[r][c], o = b[n[0]][n[1]];
        if (a.s === 3 || o.s === 3) return true;
        b[r][c] = o; b[n[0]][n[1]] = a;
        const ok = findRuns(b).length > 0;
        b[r][c] = a; b[n[0]][n[1]] = o;
        if (ok) return true;
      }
    }
  }
  return false;
}

function hasMove(b) {
  return hasMatchMove(b);
}

/** Genera un nuevo tablero garantizando que tenga movimientos válidos y sin matches iniciales */
function newBoard() {
  for (;;) {
    const b = Array.from({ length: N }, function () { return Array(N).fill(null); });
    let hearts = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let t;
        do {
          t = spawnColor(hearts);
        } while (
          (c >= 2 && b[r][c - 1].t === t && b[r][c - 2].t === t) ||
          (r >= 2 && b[r - 1][c].t === t && b[r - 2][c].t === t)
        );
        if (t === HEART) hearts++;
        const o = mk(t);
        o.x = o.tx = c;
        o.y = o.ty = r;
        b[r][c] = o;
      }
    }
    if (hasMatchMove(b)) return b;
  }
}

/* ============================================================================
   3. MATEMÁTICAS DE RANGO Y PROGRESIÓN
   ============================================================================ */
const TIERS = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro', 'Gran Maestro', 'Leyenda'];
const DIVS = ['III', 'II', 'I'];

function levelOf(rp) {
  return Math.floor(rp / 100);
}

function rankOf(rp) {
  const L = levelOf(rp);
  if (L < 24) {
    return {
      L: L,
      tier: Math.floor(L / 3),
      name: TIERS[Math.floor(L / 3)] + ' ' + DIVS[L % 3],
      badge: DIVS[L % 3]
    };
  }
  return {
    L: L,
    tier: 8,
    name: 'Eterno ' + (L - 23),
    badge: String(L - 23)
  };
}

function targetFor(L) {
  return Math.round((1200 + 150 * L) / 10) * 10;
}

function roundDelta(score, target, L, streakAfterWin) {
  const r = score / target;
  if (score >= target) {
    return 25 + Math.round(Math.min(r - 1, 1.5) * 40) + Math.min(Math.max(streakAfterWin - 1, 0), 5) * 5;
  }
  return -Math.min(120, Math.max(5, Math.round((20 + Math.min(L, 40) * 2) * Math.max(0, 1.2 - r))));
}

/* ============================================================================
   4. MOTOR DE AUDIO SINTETIZADO (WEB AUDIO API - CERO ARCHIVOS EXTERNOS)
   ============================================================================ */
const $ = function (id) { return document.getElementById(id); };
const fmt = function (n) { return Number(n).toLocaleString('es-CL'); };

const TIER_COL = ['#C47A3D', '#A9B4C2', '#E5B22E', '#2FBFB4', '#4C9BF0', '#A15CF0', '#F0518A', '#FF6A3D'];
const ETERNO = 'conic-gradient(from 0deg,#ff5a6e,#ffae1a,#3cc47c,#22b8e8,#8b5cf6,#e64cc2,#ff5a6e)';
const PAL = [
  ['#FF8A97', '#F2475A', '#B8283A'],
  ['#FFD066', '#FFAE1A', '#C77A00'],
  ['#86E8A8', '#3CC47C', '#1F8A53'],
  ['#7FDDFF', '#22B8E8', '#1481A8'],
  ['#B79BFF', '#8B5CF6', '#5B34B8'],
  ['#FF92E0', '#E64CC2', '#A92A8C'],
  ['#FF6FA0', '#D81B60', '#7B0F3A']
];

const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'gominola-rank-v1';
const SKEY = 'gominola-sound-v1';

let AC = null, master = null, muted = false, noiseBuf = null;

function ac() {
  if (!AC) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      AC = new Ctor();
      const comp = AC.createDynamicsCompressor();
      master = AC.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(AC.destination);
    } catch (e) {
      AC = null;
      return null;
    }
  }
  if (AC.state === 'suspended') {
    try { AC.resume(); } catch (e) { }
  }
  return AC;
}

function tone(f, dur, o) {
  if (muted || !AC || !master) return;
  o = o || {};
  try {
    const t0 = AC.currentTime + (o.at || 0);
    const osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.16, t0 + (o.atk || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (e) { }
}

function noise(dur, o) {
  if (muted || !AC || !master) return;
  o = o || {};
  try {
    if (!noiseBuf) {
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = AC.currentTime + (o.at || 0);
    const src = AC.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const fl = AC.createBiquadFilter();
    fl.type = o.filter || 'lowpass';
    fl.frequency.setValueAtTime(o.f0 || 2000, t0);
    if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    const g = AC.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch (e) { }
}

const SCALE = [0, 2, 4, 7, 9];
function noteHz(i) {
  return 392 * Math.pow(2, (SCALE[i % 5] + 12 * Math.floor(i / 5)) / 12);
}

const sfx = {
  click: function () { tone(660, 0.07, { type: 'triangle', vol: 0.1 }); },
  swap: function () { tone(320, 0.09, { to: 520, vol: 0.1 }); },
  nope: function () { tone(170, 0.16, { type: 'square', to: 110, vol: 0.07 }); },
  pop: function (combo, count) {
    const i = Math.min(combo - 1, 10) + 1;
    tone(noteHz(i), 0.22, { type: 'triangle', vol: 0.17 });
    tone(noteHz(i) * 2, 0.12, { vol: 0.07, at: 0.02 });
    noise(0.08, { f0: 3500, f1: 900, vol: 0.12 });
    if (count >= 5) tone(noteHz(i + 2), 0.24, { type: 'triangle', vol: 0.12, at: 0.05 });
    if (count >= 8) tone(noteHz(i + 4), 0.28, { type: 'triangle', vol: 0.1, at: 0.1 });
  },
  special: function () {
    for (let k = 0; k < 4; k++) tone(noteHz(6 + k), 0.16, { vol: 0.12, at: k * 0.05 });
  },
  zap: function () {
    tone(1500, 0.3, { type: 'sawtooth', to: 160, vol: 0.08 });
    noise(0.28, { filter: 'bandpass', f0: 4000, f1: 300, vol: 0.18 });
  },
  boom: function () {
    tone(140, 0.7, { to: 36, vol: 0.4 });
    noise(0.7, { f0: 1800, f1: 80, vol: 0.4 });
    for (let k = 0; k < 5; k++) tone(900 + k * 260, 0.25, { vol: 0.07, at: 0.08 + k * 0.05 });
  },
  shuffle: function () {
    noise(0.35, { filter: 'bandpass', f0: 300, f1: 3000, vol: 0.15 });
  },
  love: function () {
    tone(80, 1.2, { to: 30, vol: 0.5 });
    noise(0.9, { f0: 2500, f1: 80, vol: 0.4 });
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach(function (f, k) {
      tone(f, 0.5, { type: 'triangle', vol: 0.15, at: 0.05 + k * 0.07 });
      tone(f * 2, 0.4, { vol: 0.05, at: 0.07 + k * 0.07 });
    });
    [1047, 1319, 1568].forEach(function (f) {
      tone(f, 1.6, { vol: 0.1, at: 0.6 });
    });
    for (let k = 0; k < 12; k++) {
      tone(1800 + Math.random() * 1800, 0.2, { vol: 0.05, at: 0.4 + Math.random() * 1.0 });
    }
  },
  milestone: function () {
    [523, 659, 784, 1047, 1319].forEach(function (f, k) {
      tone(f, 0.18, { type: 'triangle', vol: 0.14, at: k * 0.06 });
      tone(f * 2, 0.12, { vol: 0.05, at: k * 0.06 });
    });
  },
  chance: function () {
    tone(330, 0.5, { type: 'sawtooth', to: 660, vol: 0.08 });
    [392, 523, 659].forEach(function (f, k) {
      tone(f, 0.3, { type: 'triangle', vol: 0.14, at: 0.1 + k * 0.1 });
    });
  },
  hammerWind: function () {
    noise(0.28, { filter: 'bandpass', f0: 300, f1: 2400, vol: 0.2 });
    tone(180, 0.28, { type: 'sawtooth', to: 520, vol: 0.05 });
  },
  hammer: function () {
    tone(120, 0.7, { to: 34, vol: 0.5 });
    noise(0.5, { f0: 2200, f1: 90, vol: 0.45 });
    tone(1500, 0.35, { type: 'triangle', vol: 0.12 });
    tone(2250, 0.25, { vol: 0.07, at: 0.02 });
    for (let k = 0; k < 4; k++) tone(700 + k * 220, 0.18, { vol: 0.06, at: 0.12 + k * 0.05 });
  },
  goal: function () {
    [659, 784, 988, 1319].forEach(function (f, k) {
      tone(f, 0.22, { type: 'triangle', vol: 0.15, at: k * 0.07 });
    });
  },
  win: function (up) {
    [523, 659, 784, 1047].forEach(function (f, k) {
      tone(f, 0.22, { type: 'triangle', vol: 0.2, at: k * 0.11 });
      tone(f, 0.18, { type: 'square', vol: 0.04, at: k * 0.11 });
    });
    [1047, 1319, 1568].forEach(function (f) {
      tone(f, 0.9, { type: 'triangle', vol: 0.12, at: 0.46 });
    });
    for (let k = 0; k < 10; k++) {
      noise(0.05, { filter: 'highpass', f0: 3000, vol: 0.08, at: 0.5 + Math.random() * 1.1 });
    }
    if (up) {
      tone(400, 0.7, { to: 1800, vol: 0.1, at: 0.5 });
      [1568, 1976, 2349, 2637].forEach(function (f, k) {
        tone(f, 0.3, { vol: 0.08, at: 0.9 + k * 0.08 });
      });
    }
  },
  lose: function (all) {
    [392, 349, 311, 262].forEach(function (f, k) {
      tone(f, 0.28, { type: 'sawtooth', vol: 0.08, at: k * 0.2 });
    });
    tone(130, 0.9, { to: 60, vol: 0.2, at: 0.7 });
    if (all) {
      tone(220, 1.4, { type: 'sawtooth', to: 45, vol: 0.12, at: 0.6 });
      noise(1.2, { f0: 600, f1: 60, vol: 0.3, at: 0.6 });
    }
  }
};

/* ============================================================================
   5. ESTADO GLOBAL Y PERSISTENCIA
   ============================================================================ */
let rp = 0, peak = 0, streak = 0, roundNo = 0, hist = [];
let board = null, round = { score: 0, moves: MOVES, target: 1200, no: 1, reached: false };
let busy = true, ended = false, sel = null, drag = null;
let ghosts = [], parts = [], floats = [], waiters = [];
let rings = [], beams = [], confetti = [], shake = 0, flash = 0, flashCol = '255,255,255';
let glints = [], glintT = 1, hammers = [];
let skills = { hammer: 1, bolt: 0, rainbow: 0 }, skillMode = null, lc = null;
let C = { board: '#3A2A5C', board2: '#443268', ink: '#241A38' };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && typeof d.rp === 'number') {
      rp = Math.max(0, d.rp | 0);
      peak = Math.max(rp, d.peak | 0);
      streak = d.streak | 0;
      roundNo = d.roundNo | 0;
      hist = Array.isArray(d.hist) ? d.hist.slice(0, 8) : [];
    }

    // Si viene la ronda o los LP desde la cuenta/Firebase mediante URL params, sincronizarlos
    const urlParams = new URLSearchParams(window.location.search);
    const paramRound = parseInt(urlParams.get('round') || '0', 10);
    const paramLp = parseInt(urlParams.get('lp') || '0', 10);
    if (paramRound > 0 && paramRound > roundNo) {
      roundNo = paramRound;
    }
    if (paramLp > 0 && (paramLp > rp || rp === 0)) {
      rp = paramLp;
      peak = Math.max(peak, rp);
    }
  } catch (e) { }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      rp: rp,
      peak: peak,
      streak: streak,
      roundNo: roundNo,
      hist: hist
    }));
  } catch (e) { }
}

/* ============================================================================
   6. RENDERIZADO CANVAS Y SPRITES PROCEDURALES DE PIEZAS
   ============================================================================ */
const cv = $('cv'), ctx = cv.getContext('2d');
const fx = $('fx'), fctx = fx.getContext('2d'), bwEl = $('bw');
let S = 480, dpr = 1, cell = 50, pad = 8;

function resize() {
  const w = Math.max(200, Math.floor($('bw').clientWidth));
  dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  S = w;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(w * dpr);
  cv.style.width = w + 'px';
  cv.style.height = w + 'px';
  fx.width = cv.width;
  fx.height = cv.height;
  pad = Math.max(6, w * 0.018);
  cell = (S - 2 * pad) / N;
  buildSprites();
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  C.board = cs.getPropertyValue('--board').trim() || C.board;
  C.board2 = cs.getPropertyValue('--board2').trim() || C.board2;
}

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function hex2rgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return '#' + [0, 1, 2].map(function (i) {
    return Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  }).join('');
}

function rgba(h, a) {
  const A = hex2rgb(h);
  return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')';
}

function tri(c, a, b, d, fill) {
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.lineTo(d[0], d[1]);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

let curR = 40;

function shade(c, pathFn, p, detail, soft) {
  const deep = mix(p[2], '#1a0a2a', 0.4);
  c.save();
  c.shadowColor = 'rgba(12,2,34,.5)';
  c.shadowBlur = curR * 0.2;
  c.shadowOffsetY = curR * 0.1;
  pathFn(c);
  const g = c.createRadialGradient(-0.25, -0.35, 0.05, 0, 0.05, 1.2);
  g.addColorStop(0, mix(p[0], '#ffffff', 0.3));
  g.addColorStop(0.4, p[1]);
  g.addColorStop(0.85, p[2]);
  g.addColorStop(1, deep);
  if (pathFn.merged) {
    c.lineJoin = 'round';
    c.lineWidth = 0.1;
    c.strokeStyle = rgba(deep, 0.9);
    c.stroke();
  }
  c.fillStyle = g;
  c.fill();
  c.restore();

  c.save();
  pathFn(c);
  c.clip();
  const rl = c.createRadialGradient(0.15, 1.05, 0.05, 0.15, 0.95, 0.95);
  rl.addColorStop(0, rgba(p[0], 0.75));
  rl.addColorStop(1, rgba(p[0], 0));
  c.fillStyle = rl;
  c.fillRect(-2, -2, 4, 4);

  if (!pathFn.merged) {
    pathFn(c);
    c.lineWidth = 0.2;
    c.strokeStyle = rgba(deep, 0.5);
    c.stroke();
  }

  if (detail) detail(c, p, deep);

  if (!soft) {
    const gl = c.createLinearGradient(0, -0.95, 0, 0.05);
    gl.addColorStop(0, 'rgba(255,255,255,.62)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl;
    c.beginPath();
    c.ellipse(-0.1, -0.5, 0.64, 0.42, -0.3, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = 'rgba(255,255,255,.96)';
    c.beginPath();
    c.ellipse(-0.44, -0.56, 0.13, 0.065, -0.6, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = 'rgba(255,255,255,.7)';
    c.beginPath();
    c.arc(-0.22, -0.7, 0.04, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  if (!pathFn.merged) {
    pathFn(c);
    c.lineWidth = 0.05;
    c.strokeStyle = rgba(deep, 0.85);
    c.stroke();
  }
}

function pHeart(c) {
  c.beginPath();
  c.moveTo(0, 0.9);
  c.bezierCurveTo(-0.15, 0.74, -1.0, 0.27, -1.0, -0.27);
  c.bezierCurveTo(-1.0, -0.72, -0.64, -0.93, -0.33, -0.93);
  c.bezierCurveTo(-0.15, -0.93, -0.04, -0.81, 0, -0.62);
  c.bezierCurveTo(0.04, -0.81, 0.15, -0.93, 0.33, -0.93);
  c.bezierCurveTo(0.64, -0.93, 1.0, -0.72, 1.0, -0.27);
  c.bezierCurveTo(1.0, 0.27, 0.15, 0.74, 0, 0.9);
  c.closePath();
}

function miniHeart(c, x, y, s, fill) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  pHeart(c);
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

// 0 manzana (la fruta prohibida, con mordisco)
function pApple(c) {
  c.beginPath();
  c.moveTo(0, -0.62);
  c.bezierCurveTo(-0.25, -0.86, -0.98, -0.8, -0.98, -0.05);
  c.bezierCurveTo(-0.98, 0.56, -0.52, 0.98, -0.2, 0.94);
  c.bezierCurveTo(-0.1, 0.92, -0.06, 0.84, 0, 0.84);
  c.bezierCurveTo(0.06, 0.84, 0.1, 0.92, 0.2, 0.94);
  c.bezierCurveTo(0.52, 0.98, 0.98, 0.56, 0.98, -0.05);
  c.lineTo(0.98, -0.08);
  c.quadraticCurveTo(0.74, -0.05, 0.8, -0.3);
  c.quadraticCurveTo(0.58, -0.24, 0.66, -0.52);
  c.quadraticCurveTo(0.42, -0.5, 0.5, -0.74);
  c.bezierCurveTo(0.36, -0.8, 0.12, -0.72, 0, -0.62);
  c.closePath();
}

function biteLine(c) {
  c.beginPath();
  c.moveTo(0.98, -0.08);
  c.quadraticCurveTo(0.74, -0.05, 0.8, -0.3);
  c.quadraticCurveTo(0.58, -0.24, 0.66, -0.52);
  c.quadraticCurveTo(0.42, -0.5, 0.5, -0.74);
}

function dApple(c) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  biteLine(c);
  c.lineWidth = 0.2;
  c.strokeStyle = 'rgba(255,238,196,.95)';
  c.stroke();
  biteLine(c);
  c.lineWidth = 0.06;
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.stroke();
  c.restore();
}

function appleExtras(c) {
  c.save();
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0.02, -0.55);
  c.quadraticCurveTo(0.02, -0.85, 0.16, -1.06);
  c.lineWidth = 0.13;
  c.strokeStyle = '#5A3418';
  c.stroke();
  c.lineWidth = 0.06;
  c.strokeStyle = '#A8723A';
  c.stroke();
  const lg = c.createLinearGradient(0.1, -1.1, 0.8, -0.8);
  lg.addColorStop(0, '#7BE08F');
  lg.addColorStop(1, '#2C9A55');
  c.beginPath();
  c.moveTo(0.16, -0.9);
  c.bezierCurveTo(0.34, -1.2, 0.78, -1.18, 0.86, -1.0);
  c.bezierCurveTo(0.7, -0.78, 0.32, -0.74, 0.16, -0.9);
  c.closePath();
  c.fillStyle = lg;
  c.fill();
  c.lineWidth = 0.04;
  c.strokeStyle = '#1B6B3A';
  c.stroke();
  c.beginPath();
  c.moveTo(0.2, -0.9);
  c.quadraticCurveTo(0.5, -1.02, 0.8, -1.0);
  c.strokeStyle = 'rgba(255,255,255,.5)';
  c.lineWidth = 0.025;
  c.stroke();
  c.restore();
}

// Gusano de goma y menta
function wormPt(t) {
  return [-0.78 + 1.56 * t, -0.36 * Math.sin(t * Math.PI * 2 + 0.3) + 0.05 * (t - 0.5)];
}

function wormR(t) {
  return 0.27 + 0.05 * Math.sin(t * Math.PI);
}

function pWorm(c) {
  c.beginPath();
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, q = wormPt(t);
    el(c, q[0], q[1], wormR(t), wormR(t));
  }
}
pWorm.merged = true;

function dWorm(c, p, deep) {
  c.lineCap = 'round';
  for (let i = 2; i < 28; i += 3) {
    const t = i / 28, q = wormPt(t), q2 = wormPt(t + 0.01), a = Math.atan2(q2[1] - q[1], q2[0] - q[0]), r = wormR(t);
    c.strokeStyle = rgba(deep, 0.35);
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(q[0] - Math.sin(a) * r, q[1] + Math.cos(a) * r);
    c.lineTo(q[0] + Math.sin(a) * r, q[1] - Math.cos(a) * r);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,.45)';
  c.lineWidth = 0.06;
  c.beginPath();
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, q = wormPt(t);
    const x = q[0] - 0.03, y = q[1] - wormR(t) * 0.5;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
  const h = wormPt(1);
  c.fillStyle = '#2b1030';
  c.beginPath();
  el(c, h[0] - 0.05, h[1] - 0.08, 0.045, 0.06);
  el(c, h[0] + 0.07, h[1] - 0.05, 0.045, 0.06);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  el(c, h[0] - 0.06, h[1] - 0.1, 0.015, 0.015);
  el(c, h[0] + 0.06, h[1] - 0.07, 0.015, 0.015);
  c.fill();
  c.strokeStyle = '#2b1030';
  c.lineWidth = 0.025;
  c.beginPath();
  c.moveTo(h[0] - 0.05, h[1] + 0.07);
  c.quadraticCurveTo(h[0] + 0.02, h[1] + 0.13, h[0] + 0.09, h[1] + 0.05);
  c.stroke();
}

function pMint(c) {
  c.beginPath();
  [[0, -0.1, 0.5], [-0.52, 0.0, 0.38], [0.52, 0.0, 0.38], [-0.32, -0.5, 0.38], [0.32, -0.5, 0.38], [-0.34, 0.4, 0.38], [0.34, 0.4, 0.38], [0, 0.2, 0.5], [0, -0.62, 0.34]].forEach(function (a) {
    c.moveTo(a[0] + a[2], a[1]);
    c.arc(a[0], a[1], a[2], 0, Math.PI * 2);
  });
}

function dMint(c, p, deep) {
  c.lineCap = 'round';
  c.strokeStyle = rgba(deep, 0.28);
  c.lineWidth = 0.05;
  [[-0.3, 0.55, 0.3, 0.1, 3.6], [0.35, 0.5, 0.28, 0.2, 5.2], [0, 0.78, 0.4, 0.1, 3.9]].forEach(function (a) {
    c.beginPath();
    c.arc(a[0], a[1], a[2], a[4], a[4] + 2.2);
    c.stroke();
  });
  c.strokeStyle = 'rgba(255,255,255,.62)';
  c.lineWidth = 0.055;
  [[-0.35, -0.3, 0.3, 3.5], [0.33, -0.2, 0.26, 0.2], [-0.05, -0.55, 0.28, 3.9], [0.0, 0.05, 0.34, 5.0], [-0.45, 0.2, 0.22, 4.4], [0.45, 0.25, 0.2, 5.4], [-0.05, 0.4, 0.26, 0.5]].forEach(function (a) {
    c.beginPath();
    c.arc(a[0], a[1], a[2], a[3], a[3] + 2.4);
    c.stroke();
  });
  c.fillStyle = 'rgba(255,255,255,.4)';
  c.beginPath();
  el(c, -0.28, -0.52, 0.2, 0.12, -0.5);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.9)';
  [[-0.5, -0.12, 0.035], [0.12, -0.7, 0.03], [0.55, 0.18, 0.03], [-0.15, 0.62, 0.03]].forEach(function (a) {
    c.beginPath();
    c.arc(a[0], a[1], a[2], 0, Math.PI * 2);
    c.fill();
  });
}

function el(c, x, y, rx, ry, rot) {
  rot = rot || 0;
  c.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function pBear(c) {
  c.beginPath();
  el(c, -0.36, -0.8, 0.2, 0.2);
  el(c, 0.36, -0.8, 0.2, 0.2);
  el(c, 0, -0.42, 0.46, 0.4);
  el(c, 0, 0.3, 0.5, 0.5);
  el(c, -0.6, 0.08, 0.2, 0.3, 0.5);
  el(c, 0.6, 0.08, 0.2, 0.3, -0.5);
  el(c, -0.32, 0.8, 0.26, 0.2);
  el(c, 0.32, 0.8, 0.26, 0.2);
}
pBear.merged = true;

function dBear(c, p, deep) {
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath();
  el(c, -0.36, -0.8, 0.1, 0.1);
  el(c, 0.36, -0.8, 0.1, 0.1);
  c.fill();
  c.fillStyle = rgba(deep, 0.28);
  c.beginPath();
  el(c, 0, 0.42, 0.28, 0.28);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)';
  c.beginPath();
  el(c, 0, -0.3, 0.22, 0.16);
  c.fill();
  c.fillStyle = '#2b1030';
  c.beginPath();
  el(c, -0.2, -0.5, 0.06, 0.075);
  el(c, 0.2, -0.5, 0.06, 0.075);
  c.fill();
  c.beginPath();
  el(c, 0, -0.36, 0.07, 0.05);
  c.fill();
  c.strokeStyle = '#2b1030';
  c.lineWidth = 0.03;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -0.32);
  c.lineTo(0, -0.26);
  c.moveTo(-0.08, -0.22);
  c.quadraticCurveTo(0, -0.15, 0.08, -0.22);
  c.stroke();
  c.strokeStyle = rgba(deep, 0.35);
  c.lineWidth = 0.035;
  c.beginPath();
  c.moveTo(-0.5, 0.0);
  c.lineTo(-0.44, 0.0);
  c.moveTo(0, 0.0);
  c.lineTo(0, 0);
  c.stroke();
}

function pDuck(c) {
  c.beginPath();
  el(c, -0.12, 0.38, 0.8, 0.54);
  el(c, 0.2, -0.38, 0.46, 0.44);
  el(c, 0.74, -0.28, 0.27, 0.13, 0.15);
  c.moveTo(-0.78, 0.22);
  c.lineTo(-1.02, -0.05);
  c.lineTo(-0.6, 0.0);
  c.closePath();
}
pDuck.merged = true;

function dDuck(c, p, deep) {
  c.fillStyle = '#FF7A1A';
  c.beginPath();
  el(c, 0.76, -0.26, 0.24, 0.11, 0.15);
  c.fill();
  c.strokeStyle = 'rgba(120,40,0,.6)';
  c.lineWidth = 0.03;
  c.beginPath();
  c.moveTo(0.56, -0.26);
  c.lineTo(0.98, -0.24);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)';
  c.beginPath();
  el(c, -0.18, 0.4, 0.42, 0.26, -0.2);
  c.fill();
  c.strokeStyle = rgba(deep, 0.5);
  c.lineWidth = 0.04;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-0.52, 0.42);
  c.quadraticCurveTo(-0.2, 0.7, 0.2, 0.42);
  c.stroke();
  c.fillStyle = 'rgba(255,90,90,.45)';
  c.beginPath();
  el(c, 0.38, -0.18, 0.09, 0.06);
  c.fill();
  c.fillStyle = '#2b1030';
  c.beginPath();
  el(c, 0.34, -0.5, 0.06, 0.075);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  el(c, 0.32, -0.53, 0.02, 0.02);
  c.fill();
}

function pRing(c) {
  c.beginPath();
  c.arc(0, 0.32, 0.76, 0, Math.PI * 2);
  c.moveTo(0.46, 0.32);
  c.arc(0, 0.32, 0.46, 0, Math.PI * 2, true);
  c.moveTo(-0.42, -0.72);
  c.lineTo(-0.22, -1.0);
  c.lineTo(0.22, -1.0);
  c.lineTo(0.42, -0.72);
  c.lineTo(0, -0.22);
  c.closePath();
}

function dRing(c, p, deep) {
  const A = [-0.42, -0.72], B = [-0.22, -1.0], C = [0.22, -1.0], D = [0.42, -0.72], E = [0, -0.22], M = [0, -0.7];
  c.beginPath();
  c.moveTo(A[0], A[1]);
  c.lineTo(B[0], B[1]);
  c.lineTo(C[0], C[1]);
  c.lineTo(D[0], D[1]);
  c.lineTo(E[0], E[1]);
  c.closePath();
  c.fillStyle = 'rgba(236,250,255,.92)';
  c.fill();
  tri(c, A, B, M, 'rgba(255,255,255,.85)');
  tri(c, B, C, M, 'rgba(190,232,252,.8)');
  tri(c, C, D, M, 'rgba(120,190,230,.65)');
  tri(c, A, M, E, 'rgba(120,190,230,.55)');
  tri(c, D, M, E, 'rgba(255,255,255,.4)');
  c.beginPath();
  c.moveTo(A[0], A[1]);
  c.lineTo(B[0], B[1]);
  c.lineTo(C[0], C[1]);
  c.lineTo(D[0], D[1]);
  c.lineTo(E[0], E[1]);
  c.closePath();
  c.lineWidth = 0.035;
  c.strokeStyle = rgba(deep, 0.75);
  c.stroke();
  c.lineCap = 'round';
  c.beginPath();
  c.arc(0, 0.32, 0.61, Math.PI * 1.1, Math.PI * 1.42);
  c.lineWidth = 0.07;
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.stroke();
}

function dHeart(c) {
  const T = [0, -0.62], L = [-1, -0.27], R = [1, -0.27], B = [0, 0.9], C0 = [0, 0.05];
  tri(c, L, T, C0, 'rgba(255,255,255,.2)');
  tri(c, T, R, C0, 'rgba(0,0,0,.12)');
  tri(c, L, C0, B, 'rgba(0,0,0,.16)');
  tri(c, C0, R, B, 'rgba(255,255,255,.12)');
}

function pBomb(c) {
  c.beginPath();
  c.arc(0, 0, 0.9, 0, Math.PI * 2);
}

function dBomb(c) {
  c.fillStyle = 'rgba(255,255,255,.55)';
  [[-0.5, 0.35, 0.03], [0.55, 0.25, 0.04], [0.2, 0.62, 0.025], [-0.25, -0.1, 0.02], [0.45, -0.35, 0.025]].forEach(function (q) {
    c.beginPath();
    c.arc(q[0], q[1], q[2], 0, Math.PI * 2);
    c.fill();
  });
}

function bakeStripes(c, body, s) {
  c.save();
  body(c);
  c.clip();
  for (let i = -1; i <= 1; i++) {
    const w = 0.2, o = i * 0.55, h = s === 1;
    c.fillStyle = 'rgba(10,0,30,.28)';
    if (h) c.fillRect(-1.3, o - w / 2 - 0.04, 2.6, w + 0.08);
    else c.fillRect(o - w / 2 - 0.04, -1.3, w + 0.08, 2.6);
    const g = h ? c.createLinearGradient(0, o - w / 2, 0, o + w / 2) : c.createLinearGradient(o - w / 2, 0, o + w / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,.55)');
    c.fillStyle = g;
    if (h) c.fillRect(-1.3, o - w / 2, 2.6, w);
    else c.fillRect(o - w / 2, -1.3, w, 2.6);
  }
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.beginPath();
  c.ellipse(-0.44, -0.56, 0.12, 0.06, -0.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function newSpriteCtx(R, D) {
  const cvs = document.createElement('canvas');
  cvs.width = D;
  cvs.height = D;
  const c = cvs.getContext('2d');
  c.translate(D / 2, D / 2);
  c.scale(R, R);
  curR = R;
  return { cvs: cvs, c: c };
}

function makeSprite(k, s, R, D) {
  const o = newSpriteCtx(R, D), c = o.c, p = PAL[k];
  let body;
  if (k === 0) {
    body = pApple;
    shade(c, pApple, p, dApple);
    appleExtras(c);
  } else if (k === 1) {
    body = pDuck;
    shade(c, pDuck, p, dDuck);
  } else if (k === 2) {
    body = pBear;
    shade(c, pBear, p, dBear);
  } else if (k === 3) {
    body = pRing;
    shade(c, pRing, p, dRing);
  } else if (k === 4) {
    body = pWorm;
    shade(c, pWorm, p, dWorm);
  } else if (k === 5) {
    body = pMint;
    shade(c, pMint, p, dMint);
  } else {
    body = pHeart;
    shade(c, pHeart, p, dHeart);
    c.save();
    c.lineJoin = 'round';
    pHeart(c);
    c.lineWidth = 0.08;
    c.strokeStyle = '#FFD36B';
    c.stroke();
    pHeart(c);
    c.lineWidth = 0.025;
    c.strokeStyle = '#FFF4C8';
    c.stroke();
    c.restore();
  }
  if (s && k < 6) bakeStripes(c, body, s);
  return o.cvs;
}

function makeBomb(R, D) {
  const o = newSpriteCtx(R, D);
  shade(o.c, pBomb, ['#8A6BC8', '#43307A', '#1E1236'], dBomb);
  return o.cvs;
}

let SPR = {}, SPRD = 60;

function buildSprites() {
  const R = cell * 0.43 * dpr, D = Math.ceil(R * 2.9);
  SPRD = D / dpr;
  SPR = {};
  for (let k = 0; k < 6; k++) {
    for (let s = 0; s < 3; s++) {
      SPR[k * 3 + s] = makeSprite(k, s, R, D);
    }
  }
  SPR[HEART * 3] = makeSprite(HEART, 0, R, D);
  SPR.bomb = makeBomb(R, D);
}

function drawTile(t, pxx, pyy, scale, alpha, selected, now) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(pxx, pyy);
  ctx.globalAlpha = alpha;
  let sx = scale, sy = scale;
  if (selected) {
    const b = 1.1 + (REDUCED ? 0 : Math.sin(now / 120) * 0.04);
    sx *= b;
    sy *= b;
  }
  const age = now - (t.born || 0);
  if (t.born && age < 350 && !REDUCED) {
    const k = 1 + Math.sin(age / 350 * Math.PI) * 0.28;
    sx *= k;
    sy *= k;
  }
  const la = now - (t.land || 0);
  if (t.land && la < 220 && !REDUCED) {
    const q = Math.sin(la / 220 * Math.PI);
    ctx.translate(0, cell * 0.43 * 0.13 * q);
    sx *= 1 + 0.09 * q;
    sy *= 1 - 0.13 * q;
  }
  const R = cell * 0.43;
  let beat = 0;
  if (t.t === HEART && !REDUCED) {
    const ph = (now % 1100) / 1100;
    beat = ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : (ph > 0.2 && ph < 0.34 ? Math.sin((ph - 0.2) / 0.14 * Math.PI) * 0.65 : 0);
    sx *= 1 + 0.1 * beat;
    sy *= 1 + 0.1 * beat;
  }
  ctx.scale(sx, sy);
  if (t.t === HEART) {
    const glow = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.7);
    glow.addColorStop(0, 'rgba(255,120,170,' + (0.5 + 0.3 * beat) + ')');
    glow.addColorStop(0.6, 'rgba(255,200,120,.18)');
    glow.addColorStop(1, 'rgba(255,120,170,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t.s === 3) {
    const pulse = REDUCED ? 1 : 1 + Math.sin(now / 260) * 0.05;
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.5);
    glow.addColorStop(0, 'rgba(255,255,255,.4)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (SPR.bomb) ctx.drawImage(SPR.bomb, -SPRD / 2, -SPRD / 2, SPRD, SPRD);
    ctx.save();
    ctx.rotate(REDUCED ? 0 : now / 900);
    ctx.lineCap = 'round';
    ctx.lineWidth = R * 0.17;
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = PAL[i][1];
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, i * Math.PI / 3 + 0.1, (i + 1) * Math.PI / 3 - 0.1);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.17, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const spr = SPR[t.t * 3 + (t.t === HEART ? 0 : t.s)];
    if (spr) ctx.drawImage(spr, -SPRD / 2, -SPRD / 2, SPRD, SPRD);
    if (t.t === HEART && !REDUCED) {
      const a = now / 650, sx2 = Math.cos(a) * R * 1.0, sy2 = Math.sin(a) * R * 0.7, q = R * 0.22 * (0.6 + 0.4 * Math.sin(now / 130));
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(sx2, sy2 - q);
      ctx.quadraticCurveTo(sx2, sy2, sx2 + q, sy2);
      ctx.quadraticCurveTo(sx2, sy2, sx2, sy2 + q);
      ctx.quadraticCurveTo(sx2, sy2, sx2 - q, sy2);
      ctx.quadraticCurveTo(sx2, sy2, sx2, sy2 - q);
      ctx.fill();
    }
  }
  if (selected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function px(x) {
  return pad + (x + 0.5) * cell;
}

/* ============================================================================
   7. BUCLE PRINCIPAL DE ANIMACIÓN Y FÍSICAS (GAME LOOP)
   ============================================================================ */
let frameNo = 0, last = performance.now();

function update(dt, now) {
  let moving = false;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const t = board && board[r][c];
      if (!t) continue;
      if (t.fall && t.y < t.ty) {
        t.vy += 60 * dt;
        t.y += t.vy * dt;
        if (t.y >= t.ty) {
          t.y = t.ty;
          t.vy = 0;
          t.fall = false;
          t.land = now;
        } else {
          moving = true;
        }
      } else {
        const k = Math.min(1, dt * 20);
        t.x += (t.tx - t.x) * k;
        t.y += (t.ty - t.y) * k;
        if (Math.abs(t.tx - t.x) < 0.003) t.x = t.tx;
        if (Math.abs(t.ty - t.y) < 0.003) t.y = t.ty;
        if (t.x !== t.tx || t.y !== t.ty) moving = true;
      }
    }
  }

  for (const p of parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 900 * dt;
    p.life -= dt;
    p.rot = (p.rot || 0) + (p.vr || 0) * dt;
  }
  parts = parts.filter(function (p) { return p.life > 0; });

  for (const r of rings) r.life -= dt;
  rings = rings.filter(function (r) { return r.life > 0; });

  for (const b of beams) b.life -= dt;
  beams = beams.filter(function (b) { return b.life > 0; });

  for (const h of hammers) h.age += dt;
  hammers = hammers.filter(function (h) { return h.age < 0.6; });

  for (const c of confetti) {
    c.vy += 600 * dt;
    c.vx *= Math.max(0, 1 - 1.4 * dt);
    c.vy *= Math.max(0, 1 - 1.2 * dt);
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
    c.life -= dt;
  }
  confetti = confetti.filter(function (c) { return c.life > 0 && c.y < S + 40; });

  flash = Math.max(0, flash - dt * 2.2);

  for (const g of glints) g.age += dt;
  glints = glints.filter(function (g) { return g.age < 0.55; });

  glintT -= dt;
  if (glintT <= 0 && board && !REDUCED) {
    glintT = 0.35 + Math.random() * 0.9;
    let t = board[(Math.random() * N) | 0][(Math.random() * N) | 0];
    if (Math.random() < 0.45) {
      const hs = [];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (board[r][c] && board[r][c].t === HEART) hs.push(board[r][c]);
        }
      }
      if (hs.length) t = hs[(Math.random() * hs.length) | 0];
    }
    if (t && t.s !== 3 && !t.fall) glints.push({ t: t, age: 0 });
  }

  if (shake > 0.3 && !REDUCED) {
    bwEl.style.transform = 'translate(' + ((Math.random() - 0.5) * 2 * shake).toFixed(1) + 'px,' + ((Math.random() - 0.5) * 2 * shake).toFixed(1) + 'px)';
    shake *= Math.pow(0.02, dt);
  } else if (shake !== 0 || bwEl.style.transform) {
    shake = 0;
    bwEl.style.transform = '';
  }

  for (const f of floats) f.age += dt;
  floats = floats.filter(function (f) { return f.age < 1; });

  ghosts = ghosts.filter(function (g) { return now - g.born < 230; });

  if (!moving && waiters.length) {
    const w = waiters;
    waiters = [];
    w.forEach(function (f) { f(); });
  }
}

function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, S, S);
  rr(ctx, 0, 0, S, S, S * 0.045);
  ctx.fillStyle = C.board;
  ctx.fill();

  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, 'rgba(255,255,255,.09)');
  bg.addColorStop(0.5, 'rgba(255,255,255,0)');
  bg.addColorStop(1, 'rgba(0,0,0,.18)');
  rr(ctx, 0, 0, S, S, S * 0.045);
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.save();
  rr(ctx, 0, 0, S, S, S * 0.045);
  ctx.clip();

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if ((r + c) % 2) {
        rr(ctx, pad + c * cell + 1, pad + r * cell + 1, cell - 2, cell - 2, cell * 0.2);
        ctx.fillStyle = C.board2;
        ctx.fill();
      }
    }
  }

  if (board) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const t = board[r][c];
        if (t) drawTile(t, px(t.x), px(t.y), 1, 1, sel === r * N + c, now);
      }
    }
  }

  for (const gl of glints) {
    const q = Math.sin(gl.age / 0.55 * Math.PI), s = cell * 0.2 * q;
    const gx = px(gl.t.x) - cell * 0.17, gy = px(gl.t.y) - cell * 0.2;
    ctx.globalAlpha = q;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(gx, gy - s);
    ctx.quadraticCurveTo(gx, gy, gx + s, gy);
    ctx.quadraticCurveTo(gx, gy, gx, gy + s);
    ctx.quadraticCurveTo(gx, gy, gx - s, gy);
    ctx.quadraticCurveTo(gx, gy, gx, gy - s);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  for (const g of ghosts) {
    const p = Math.min(1, (now - g.born) / 230), gx = px(g.t.x), gy = px(g.t.y);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, cell * (0.35 + p * 0.9));
    glow.addColorStop(0, 'rgba(255,255,255,' + (0.85 * (1 - p)) + ')');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gx, gy, cell * (0.35 + p * 0.9), 0, Math.PI * 2);
    ctx.fill();
    drawTile(g.t, gx, gy, 1 + 0.12 * p - p * p * 1.1, 1 - p * 0.7, false, now);
  }

  for (const b of beams) {
    const p = 1 - b.life / b.max, th = cell * (0.95 * (1 - p * p) + 0.05) * (b.k || 1);
    ctx.globalAlpha = 1 - p;
    if (b.dir === 'd1' || b.dir === 'd2') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.dir === 'd1' ? Math.PI / 4 : -Math.PI / 4);
      const dg = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
      dg.addColorStop(0, 'rgba(255,255,255,0)');
      dg.addColorStop(0.5, 'rgba(255,255,255,1)');
      dg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = dg;
      ctx.fillRect(-S * 1.5, -th / 2, S * 3, th);
      ctx.restore();
    } else {
      const horiz = b.dir === 'h';
      const g = horiz ? ctx.createLinearGradient(0, b.pos - th / 2, 0, b.pos + th / 2) : ctx.createLinearGradient(b.pos - th / 2, 0, b.pos + th / 2, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      if (horiz) ctx.fillRect(0, b.pos - th / 2, S, th);
      else ctx.fillRect(b.pos - th / 2, 0, th, S);
    }
  }

  for (const h of hammers) {
    const p = Math.min(h.age / 0.26, 1), e = p * p;
    const fade = h.age > 0.26 ? Math.max(0, 1 - (h.age - 0.26) / 0.3) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(h.x, h.y - cell * 2.4 * (1 - e));
    ctx.rotate(-1.15 * (1 - e));
    const sc = 1.55 - 0.55 * e;
    ctx.scale(sc, sc);
    const hw = cell * 1.05, hh = cell * 0.62, hl = cell * 1.9;
    const wg = ctx.createLinearGradient(-cell * 0.1, 0, cell * 0.1, 0);
    wg.addColorStop(0, '#8A5A2B');
    wg.addColorStop(0.5, '#C28A4B');
    wg.addColorStop(1, '#6B4220');
    rr(ctx, -cell * 0.1, -hl, cell * 0.2, hl, cell * 0.08);
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(30,12,4,.7)';
    ctx.stroke();
    const hg = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
    hg.addColorStop(0, '#F2F5FB');
    hg.addColorStop(0.35, '#B8C1D6');
    hg.addColorStop(1, '#5D6882');
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    rr(ctx, -hw / 2, -hh / 2, hw, hh, cell * 0.14);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2E3550';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    rr(ctx, -hw / 2 + cell * 0.1, -hh / 2 + cell * 0.06, hw - cell * 0.2, cell * 0.1, cell * 0.05);
    ctx.fill();
    ctx.restore();
  }

  for (const r of rings) {
    const p = 1 - r.life / r.max, e = 1 - (1 - p) * (1 - p);
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = r.col;
    ctx.lineWidth = r.w * (1 - p) + 1;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col;
    if (p.kind === 2) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.scale(p.s, p.s);
      pHeart(ctx);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === 1) {
      const s = p.s * 1.4;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
  }

  ctx.globalAlpha = 1;
  if (flash > 0.01) {
    ctx.fillStyle = 'rgba(' + flashCol + ',' + (flash * 0.6).toFixed(3) + ')';
    ctx.fillRect(0, 0, S, S);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const f of floats) {
    const a = f.big ? 1 - Math.max(0, f.age - 0.55) / 0.45 : 1 - f.age * f.age;
    const k = f.big ? 1 + Math.max(0, 0.25 - f.age) * 3 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = '800 ' + Math.round(cell * f.size * k) + 'px Figtree, system-ui, sans-serif';
    const y = f.y - f.age * cell * (f.big ? 0.4 : 0.9);
    ctx.lineWidth = f.big ? 8 : 5;
    ctx.strokeStyle = 'rgba(20,10,40,.85)';
    ctx.strokeText(f.text, f.x, y);
    ctx.fillStyle = f.col;
    ctx.fillText(f.text, f.x, y);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (++frameNo % 45 === 1) readColors();
  update(dt, now);
  draw(now);
  drawFx();
  requestAnimationFrame(frame);
}

let fxDirty = false;

function drawFx() {
  if (!confetti.length) {
    if (fxDirty) {
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, fx.width, fx.height);
      fxDirty = false;
    }
    return;
  }
  fxDirty = true;
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fctx.clearRect(0, 0, S, S);
  for (const c of confetti) {
    fctx.save();
    fctx.translate(c.x, c.y);
    fctx.rotate(c.rot);
    fctx.scale(1, Math.cos(c.rot * 1.3));
    fctx.globalAlpha = Math.min(1, c.life * 2);
    fctx.fillStyle = c.col;
    fctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    fctx.restore();
  }
}

const CONF_COL = ['#F2475A', '#FFAE1A', '#3CC47C', '#22B8E8', '#8B5CF6', '#E64CC2', '#FFD066', '#FFFFFF'];

function confettiBurst(x, y, n, v, angle, spread) {
  n = REDUCED ? Math.min(n, 20) : n;
  for (let k = 0; k < n && confetti.length < 420; k++) {
    const a = angle + (Math.random() - 0.5) * spread, sp = v * (0.45 + Math.random() * 0.55);
    confetti.push({
      x: x,
      y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 16,
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      col: CONF_COL[(Math.random() * CONF_COL.length) | 0],
      life: 3 + Math.random() * 1.5
    });
  }
}

function confettiRain(n) {
  n = REDUCED ? Math.min(n, 20) : n;
  for (let k = 0; k < n && confetti.length < 420; k++) {
    confetti.push({
      x: Math.random() * S,
      y: -20 - Math.random() * S * 0.6,
      vx: (Math.random() - 0.5) * 80,
      vy: 80 + Math.random() * 200,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 14,
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      col: CONF_COL[(Math.random() * CONF_COL.length) | 0],
      life: 4 + Math.random() * 1.5
    });
  }
}

function flashFx(col, amt) {
  flashCol = col;
  flash = Math.max(flash, amt);
}

function settle() {
  return new Promise(function (res) { waiters.push(res); });
}

function wait(ms) {
  return new Promise(function (res) { setTimeout(res, ms); });
}

/* ============================================================================
   8. CONTROLADOR DE INTERFAZ DE USUARIO (HUD & FEEDBACK)
   ============================================================================ */
let toastT = 0;

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(function () { el.classList.remove('on'); }, 1900);
}

function renderHud() {
  if ($('score')) $('score').textContent = fmt(round.score);
  if ($('target')) $('target').textContent = fmt(round.target);
  if ($('moves')) $('moves').textContent = round.moves;

  const p = $('prog');
  if (p) {
    p.style.width = Math.min(100, round.score / round.target * 100) + '%';
    p.classList.toggle('done', round.score >= round.target);
  }

  if ($('roundLbl')) {
    $('roundLbl').textContent = 'Ronda ' + round.no + (round.used ? ' · última oportunidad ' + round.used : '');
  }

  const kind = SKILL_ORDER[(round.nextMs / 1000 - 1) % 3];
  if ($('msTxt')) $('msTxt').textContent = 'Próximo hito ' + fmt(round.nextMs) + ' · ganas ' + SKILL_NAME[kind];
  if ($('msBar')) $('msBar').style.width = ((round.score % 1000) / 10) + '%';

  let hn = 0;
  if (board) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] && board[r][c].t === HEART) hn++;
      }
    }
  }

  if ($('loveTxt')) $('loveTxt').textContent = 'Corazones en juego: ' + hn + ' · junta 3 y explota TODO';
  if ($('goalTxt')) {
    $('goalTxt').textContent = round.score >= round.target
      ? 'Meta superada: cada punto extra suma'
      : 'Faltan ' + fmt(round.target - round.score) + ' puntos';
  }
}

function renderRank() {
  const k = rankOf(rp), into = rp - k.L * 100, nx = rankOf((k.L + 1) * 100);
  if ($('rkName')) $('rkName').textContent = k.name;
  if ($('badge')) {
    $('badge').textContent = k.badge;
    $('badge').style.setProperty('--tier', k.tier >= 8 ? ETERNO : TIER_COL[k.tier]);
  }
  if ($('rpNum')) $('rpNum').textContent = fmt(rp);
  if ($('bar')) $('bar').style.width = into + '%';
  if ($('nextTxt')) $('nextTxt').textContent = 'Faltan ' + (100 - into) + ' para ' + nx.name;
  if ($('cushion')) $('cushion').textContent = into === 0 ? 'Al borde de bajar' : 'Colchón: ' + into;
  if ($('peak')) $('peak').textContent = fmt(peak);
  if ($('streak')) $('streak').textContent = streak;
  if ($('rounds')) $('rounds').textContent = roundNo;

  const ul = $('hist');
  if (ul) {
    ul.innerHTML = '';
    if ($('histEmpty')) $('histEmpty').hidden = hist.length > 0;
    for (const h of hist) {
      const li = document.createElement('li');
      const a = document.createElement('span'); a.className = 'no'; a.textContent = '#' + h.no;
      const b = document.createElement('span'); b.className = 'sc'; b.textContent = fmt(h.score) + ' de ' + fmt(h.target);
      const d = document.createElement('span'); d.className = 'd ' + (h.d >= 0 ? 'up' : 'down');
      d.textContent = (h.d > 0 ? '+' : h.d < 0 ? '−' : '') + Math.abs(h.d);
      li.append(a, b, d);
      ul.append(li);
    }
  }
}

/* ============================================================================
   9. FLUJO DE JUEGO, HABILIDADES Y CASCADAS
   ============================================================================ */
function dropIn(b) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const t = b[r][c];
      t.y = r - N - 1 - c * 0.15;
      t.vy = 0;
      t.fall = true;
    }
  }
}

async function startRound(first) {
  busy = true;
  ended = false;
  sel = null;
  $('ov').hidden = true;
  const tg = targetFor(levelOf(rp));
  round = {
    score: 0,
    moves: MOVES,
    target: tg,
    base: tg,
    no: roundNo + 1,
    reached: false,
    used: 0,
    lossMult: 1,
    nextMs: 1000,
    startTime: Date.now()
  };
  skills = { hammer: 1, bolt: 0, rainbow: 0 };
  skillMode = null;
  lc = null;
  $('lcCard').hidden = true;
  $('resCard').hidden = false;
  board = newBoard();
  if (!first) {
    dropIn(board);
  }
  renderHud();
  renderSkills();
  renderRank();
  save();
  await settle();
  busy = false;
}

function swapCells(i, j) {
  swapInBoard(board, i, j);
  for (const k of [i, j]) {
    const t = cellOf(board, k);
    t.tx = k % N;
    t.ty = (k / N) | 0;
    t.fall = false;
  }
}

function popFx(t, combo) {
  const x = px(t.x), y = px(t.y), pal = PAL[Math.max(0, t.t)];
  const col = t.s === 3 ? '#FFFFFF' : pal[1], lt = t.s === 3 ? '#FFFFFF' : pal[0];
  rings.push({
    x: x,
    y: y,
    r0: cell * 0.2,
    r1: cell * (0.9 + Math.min(combo, 5) * 0.12),
    life: 0.38,
    max: 0.38,
    col: lt,
    w: 4
  });
  if (REDUCED) return;
  const n = 8 + Math.min(combo * 2, 10);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = 140 + Math.random() * 300, life = 0.5 + Math.random() * 0.35;
    parts.push({
      x: x,
      y: y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 160,
      s: 4 + Math.random() * 6,
      life: life,
      max: life,
      col: Math.random() < 0.4 ? lt : col,
      kind: Math.random() < 0.35 ? 1 : 0,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 12
    });
  }
}

function beamFx(t) {
  const horiz = t.s === 1;
  beams.push({
    dir: horiz ? 'h' : 'v',
    pos: horiz ? px(t.ty) : px(t.tx),
    life: 0.4,
    max: 0.4
  });
}

function bombFx(t) {
  const x = px(t.x), y = px(t.y);
  [0.45, 0.65, 0.85].forEach(function (l, k) {
    rings.push({
      x: x,
      y: y,
      r0: cell * 0.3,
      r1: S * (0.7 + k * 0.25),
      life: l,
      max: l,
      col: k === 1 ? '#FFD066' : '#FFFFFF',
      w: 10 - k * 2
    });
  });
  flashFx('255,255,255', 0.9);
  if (REDUCED) return;
  for (let k = 0; k < 36; k++) {
    const a = Math.random() * Math.PI * 2, v = 250 + Math.random() * 600, life = 0.6 + Math.random() * 0.5;
    parts.push({
      x: x,
      y: y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      s: 5 + Math.random() * 6,
      life: life,
      max: life,
      col: CONF_COL[(Math.random() * 7) | 0],
      kind: 1,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 14
    });
  }
}

function sparkFx(t) {
  const x = px(t.x), y = px(t.y);
  rings.push({
    x: x,
    y: y,
    r0: cell * 0.2,
    r1: cell * 1.3,
    life: 0.5,
    max: 0.5,
    col: '#FFD066',
    w: 6
  });
  if (REDUCED) return;
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 200, life = 0.6 + Math.random() * 0.3;
    parts.push({
      x: x,
      y: y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 60,
      s: 4 + Math.random() * 4,
      life: life,
      max: life,
      col: Math.random() < 0.5 ? '#FFD066' : '#FFFFFF',
      kind: 1,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 10
    });
  }
}

function loveFx() {
  flashFx('255,105,160', 1);
  shake = 20;
  floats.push({ x: S / 2, y: S / 2, text: '¡AMOR TOTAL!', col: '#FF7AB6', age: 0, size: 1.15, big: true });
  toast('¡Tres corazones! Todo el tablero explota');
  sfx.love();
  [0.5, 0.7, 0.9, 1.1].forEach(function (l, n) {
    rings.push({
      x: S / 2,
      y: S / 2,
      r0: cell * 0.3,
      r1: S * (0.8 + n * 0.3),
      life: l,
      max: l,
      col: n % 2 ? '#FFD066' : '#FF7AB6',
      w: 14 - n * 2
    });
  });
  if (!REDUCED) {
    for (let n = 0; n < 90; n++) {
      const life = 1.2 + Math.random() * 1.0;
      parts.push({
        x: Math.random() * S,
        y: S * (0.4 + Math.random() * 0.7),
        vx: (Math.random() - 0.5) * 120,
        vy: -200 - Math.random() * 500,
        s: 6 + Math.random() * 10,
        life: life,
        max: life,
        col: ['#FF4F8B', '#FF7AB6', '#FFD066', '#FFFFFF'][(Math.random() * 4) | 0],
        kind: 2,
        rot: (Math.random() - 0.5) * 0.8,
        vr: (Math.random() - 0.5) * 2
      });
    }
  }
  confettiRain(140);
}

const WORDS = ['', '', '¡Dulce!', '¡Genial!', '¡Increíble!', '¡ÉPICO!'];
const SKILL_ORDER = ['bolt', 'rainbow', 'hammer'];
const SKILL_NAME = { hammer: 'Martillo', bolt: 'Rayo', rainbow: 'Arcoíris' };
const SKILL_DESC = {
  hammer: 'Martillo: toca una pieza y revienta su fila y su columna, una cruz completa.',
  bolt: 'Rayo: toca una pieza y revienta sus dos diagonales.',
  rainbow: 'Arcoíris: toca una pieza y se rompen todas las de su color.'
};

function renderSkills() {
  ['hammer', 'bolt', 'rainbow'].forEach(function (k) {
    const b = $('sk-' + k);
    if (!b) return;
    $('ct-' + k).textContent = skills[k];
    b.classList.toggle('empty', skills[k] <= 0);
    b.classList.toggle('on', skillMode === k);
    b.setAttribute('aria-pressed', String(skillMode === k));
  });
  cv.classList.toggle('aim', !!skillMode);
  if ($('skillHint')) {
    $('skillHint').textContent = skillMode ? SKILL_DESC[skillMode] : 'Toca una habilidad y luego una pieza. No gastan movimientos.';
  }
}

function setSkillMode(k) {
  if (busy || ended) return;
  if (skills[k] <= 0) {
    toast('No tienes ' + SKILL_NAME[k] + '. Se gana en los hitos de 1.000 puntos');
    return;
  }
  skillMode = (skillMode === k) ? null : k;
  sel = null;
  renderSkills();
}

function checkMilestones() {
  while (round.score >= round.nextMs) {
    const idx = round.nextMs / 1000, kind = SKILL_ORDER[(idx - 1) % 3];
    skills[kind]++;
    round.nextMs += 1000;
    floats.push({ x: S / 2, y: S * 0.28, text: 'HITO ' + fmt(idx * 1000), col: '#7FDDFF', age: 0, size: 0.8, big: true });
    toast('Hito ' + fmt(idx * 1000) + ': ganaste ' + SKILL_NAME[kind]);
    sfx.milestone();
    flashFx('127,221,255', 0.45);
    confettiBurst(S / 2, S * 0.35, 36, 800, -Math.PI / 2, 2.4);
    renderSkills();
  }
}

async function trySwap(i, j) {
  if (busy || ended) return;
  busy = true;
  sel = null;
  sfx.swap();
  swapCells(i, j);
  await settle();

  const a = cellOf(board, i), b = cellOf(board, j);
  const res = (a.s === 3 || b.s === 3) ? step(board, null, bombSet(board, i, j)) : step(board, [i, j]);
  if (!res) {
    sfx.nope();
    swapCells(i, j);
    await settle();
    busy = false;
    return;
  }

  round.moves--;
  renderHud();
  await cascade(res);
}

async function useSkill(i) {
  const k = skillMode;
  if (!k || busy || ended || skills[k] <= 0) return;
  busy = true;
  sel = null;
  skillMode = null;
  skills[k]--;
  renderSkills();

  const r = (i / N) | 0, c = i % N, set = new Set([i]), tile = cellOf(board, i);
  const cx = px(c), cy = px(r);

  if (k === 'hammer') {
    hammers.push({ x: cx, y: cy, age: 0 });
    sfx.hammerWind();
    await wait(270);
    for (let x = 0; x < N; x++) {
      set.add(r * N + x);
      set.add(x * N + c);
    }
    beams.push({ dir: 'h', pos: cy, life: 0.6, max: 0.6, k: 1.7 });
    beams.push({ dir: 'v', pos: cx, life: 0.6, max: 0.6, k: 1.7 });
    [0.35, 0.55, 0.8].forEach(function (l, n) {
      rings.push({
        x: cx,
        y: cy,
        r0: cell * 0.3,
        r1: S * (0.5 + n * 0.25),
        life: l,
        max: l,
        col: n === 1 ? '#FFD066' : '#FFFFFF',
        w: 12 - n * 3
      });
    });
    if (!REDUCED) {
      for (let n = 0; n < 40; n++) {
        const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 500, life = 0.5 + Math.random() * 0.5;
        parts.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 120,
          s: 4 + Math.random() * 7,
          life: life,
          max: life,
          col: Math.random() < 0.5 ? '#FFD066' : '#FFFFFF',
          kind: Math.random() < 0.5 ? 1 : 0,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 12
        });
      }
    }
    floats.push({ x: S / 2, y: S / 2, text: '¡MARTILLAZO!', col: '#FFD066', age: 0, size: 1.0, big: true });
    sfx.hammer();
    flashFx('255,255,255', 0.8);
    shake = Math.max(shake, 18);
  } else if (k === 'bolt') {
    for (let d = -N; d <= N; d++) {
      [[r + d, c + d], [r + d, c - d]].forEach(function (q) {
        if (q[0] >= 0 && q[0] < N && q[1] >= 0 && q[1] < N) set.add(q[0] * N + q[1]);
      });
    }
    beams.push({ dir: 'd1', x: cx, y: cy, life: 0.5, max: 0.5, k: 1.2 });
    beams.push({ dir: 'd2', x: cx, y: cy, life: 0.5, max: 0.5, k: 1.2 });
    floats.push({ x: S / 2, y: S / 2, text: '¡RAYO!', col: '#7FDDFF', age: 0, size: 1.0, big: true });
    sfx.zap();
    flashFx('127,221,255', 0.5);
    shake = Math.max(shake, 10);
  } else {
    if (tile.t >= 0) {
      for (let x = 0; x < N * N; x++) {
        const t2 = cellOf(board, x);
        if (t2 && t2.t === tile.t) set.add(x);
      }
    }
    flashFx('255,255,255', 0.5);
    sfx.special();
    sfx.zap();
    shake = Math.max(shake, 6);
  }

  await cascade(step(board, null, set));
}

async function cascade(res) {
  let combo = 0;
  while (res) {
    combo++;
    const mult = 1 + 0.6 * (combo - 1);
    const gain = Math.round((res.count * 10 + res.bonus) * mult);
    round.score += gain;
    const now = performance.now();
    let sx = 0, sy = 0, hitStripe = false, hitBomb = false;

    for (const t of res.removed) {
      ghosts.push({ t: t, born: now });
      popFx(t, combo);
      if (t.s === 1 || t.s === 2) { hitStripe = true; beamFx(t); }
      if (t.s === 3) { hitBomb = true; bombFx(t); }
      sx += px(t.x);
      sy += px(t.y);
    }

    for (const s of res.specials) {
      const t = cellOf(board, s.idx);
      if (t) { t.born = now; sparkFx(t); }
    }

    if (res.love) loveFx();

    const n = Math.max(1, res.removed.length);
    floats.push({ x: sx / n, y: sy / n, text: '+' + gain, col: '#FFD066', age: 0, size: 0.5 });
    if (combo >= 2) floats.push({ x: sx / n, y: sy / n + cell * 0.55, text: 'Cascada ×' + combo, col: '#7FDDFF', age: 0, size: 0.4 });
    if (hitBomb) floats.push({ x: S / 2, y: S / 2, text: '¡BOOM!', col: '#FFFFFF', age: 0, size: 1.1, big: true });
    else if (combo >= 2) floats.push({ x: S / 2, y: S / 2, text: WORDS[Math.min(combo, 5)], col: '#FFD066', age: 0, size: 0.95, big: true });

    if (!res.love) sfx.pop(combo, res.count);
    if (hitStripe) sfx.zap();
    if (hitBomb) sfx.boom();
    if (res.specials.length) sfx.special();

    const sk = (res.count >= 6 ? 3 + res.count * 0.5 : 0) + (combo >= 3 ? combo * 1.5 : 0) + (hitStripe ? 5 : 0) + (hitBomb ? 12 : 0);
    if (sk) shake = Math.max(shake, Math.min(16, sk));

    checkMilestones();
    renderHud();

    if (!round.reached && round.score >= round.target) {
      round.reached = true;
      toast('¡Meta superada! Sigue sumando puntos');
      sfx.goal();
      flashFx('255,209,102', 0.6);
      confettiBurst(S * 0.1, S, 40, 1100, -Math.PI / 2 + 0.45, 0.7);
      confettiBurst(S * 0.9, S, 40, 1100, -Math.PI / 2 - 0.45, 0.7);
    }

    await wait(210);
    gravity(board);
    await settle();
    res = step(board, null);
  }

  while (!hasMove(board)) {
    toast('Sin movimientos posibles. Mezclando el tablero');
    sfx.shuffle();
    board = newBoard();
    dropIn(board);
    await settle();
  }

  if (round.moves <= 0) {
    await wait(450);
    roundOver();
    return;
  }
  busy = false;
}

/* ============================================================================
   10. SISTEMA DE ÚLTIMA OPORTUNIDAD Y CIERRE DE RONDA
   ============================================================================ */
function roundOver() {
  if (round.score < round.target && round.used < 2) showLastChance();
  else endRound();
}

function showLastChance() {
  busy = true;
  const nt = Math.round((round.target + round.base * 0.2) / 10) * 10;
  const mult = 1 + 0.5 * (round.used + 1), extra = round.used === 0 ? 5 : 4;
  lc = { nt: nt, mult: mult, extra: extra };
  $('lcText').textContent = 'Te quedaste en ' + fmt(round.score) + ' de ' + fmt(round.target) + '. Te doy movimientos extra, pero la meta sube.';
  $('lcMoves').textContent = '+' + extra;
  $('lcTarget').textContent = fmt(nt);
  $('lcRisk').textContent = 'x' + String(mult).replace('.', ',');
  $('resCard').hidden = true;
  $('lcCard').hidden = false;
  $('ov').hidden = false;
  sfx.chance();
  flashFx('255,209,102', 0.4);
  setTimeout(function () { try { $('lcYes').focus({ preventScroll: true }); } catch (e) { } }, 50);
}

$('lcYes').addEventListener('click', function () {
  if (!lc) return;
  ac();
  sfx.click();
  round.used++;
  round.moves += lc.extra;
  round.target = lc.nt;
  round.lossMult = lc.mult;
  round.reached = false;
  $('ov').hidden = true;
  $('lcCard').hidden = true;
  $('resCard').hidden = false;
  toast('¡Última oportunidad! +' + lc.extra + ' movimientos');
  lc = null;
  renderHud();
  busy = false;
});

$('lcNo').addEventListener('click', function () {
  ac();
  sfx.click();
  lc = null;
  endRound();
});

['hammer', 'bolt', 'rainbow'].forEach(function (k) {
  const btn = $('sk-' + k);
  if (btn) {
    btn.addEventListener('click', function () {
      ac();
      sfx.click();
      setSkillMode(k);
    });
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && skillMode) {
    skillMode = null;
    renderSkills();
  }
});

function endRound() {
  ended = true;
  busy = true;
  const before = rp, L0 = levelOf(rp), win = round.score >= round.target;
  streak = win ? streak + 1 : 0;
  roundNo++;

  let delta = roundDelta(round.score, round.target, L0, streak);
  if (delta < 0) delta = -Math.min(150, Math.round(-delta * round.lossMult));
  else delta += 5 * round.used;

  rp = Math.max(0, rp + delta);
  const real = rp - before;

  // Calibración horaria equivalente a Rompecabezas (~450-550 LP / hora):
  // Rondas duran ~1.5 a 2.5 min.
  // Rondas 1-5 (~2 min c/u): 10 - 18 LP · 3 - 5 monedas
  // Rondas 10-20 (~2 min c/u): 25 - 45 LP · 6 - 9 monedas
  // Rondas 30+ (~2.5 min c/u): 60 - 75 LP · 10 - 14 monedas
  // Jugando 20 rondas en 1 hora = ~500 LP y ~110 monedas
  // Rescate y envío desacoplado de monedas y LP (ver reward-config.js)
  const { earnedCoins, lpAward } = window.enviarRecompensaGomi ? window.enviarRecompensaGomi({
    score: round.score,
    target: round.target,
    win: win,
    streak: streak,
    round: roundNo,
    durationMs: round.startTime ? (Date.now() - round.startTime) : 120000
  }) : { earnedCoins: 1, lpAward: 0 };

  let title;
  if (!win && rp === 0 && before > 0) title = 'Meta no alcanzada';
  else if (L1 > L0) title = '¡Ronda superada!';
  else if (L1 < L0) title = 'Meta no alcanzada';
  else title = win ? 'Ronda superada' : 'Meta no alcanzada';

  $('ovTitle').textContent = title;
  const dl = $('ovDelta');
  dl.textContent = (real > 0 ? '+' : real < 0 ? '−' : '') + Math.abs(real) + ' RP  •  +' + earnedCoins + ' monedas';
  dl.className = 'delta ' + (real >= 0 ? 'up' : 'down');
  $('ovLine').textContent = fmt(round.score) + ' puntos de ' + fmt(round.target) + ' pedidos' + (win && streak > 1 ? ' · racha de ' + streak : '') + ' · +' + earnedCoins + ' monedas ganadas';
  $('ovRank').textContent = (rp === 0 && !win && before > 0 ? 'Vuelves a ' : 'Ahora eres ') + rankOf(rp).name + ' con ' + fmt(rp) + ' puntos de rango';
  if (round.used) $('ovLine').textContent += ' · última oportunidad x' + round.used;
  $('nextBtn').textContent = 'Siguiente ronda';
  $('resCard').hidden = false;
  $('lcCard').hidden = true;
  $('ov').hidden = false;
  save();
  renderRank();

  if (win) {
    sfx.win(L1 > L0);
    confettiRain(L1 > L0 ? 260 : 160);
    confettiBurst(S * 0.08, S, 60, 1300, -Math.PI / 2 + 0.5, 0.8);
    confettiBurst(S * 0.92, S, 60, 1300, -Math.PI / 2 - 0.5, 0.8);
    flashFx('255,209,102', 0.7);
  } else {
    sfx.lose(rp === 0 && before > 0);
    shake = Math.max(shake, rp === 0 && before > 0 ? 16 : 7);
    flashFx('255,60,90', rp === 0 && before > 0 ? 0.8 : 0.45);
  }

  const bd = $('badge');
  if (bd) {
    bd.classList.remove('pop');
    if (L1 !== L0) { void bd.offsetWidth; bd.classList.add('pop'); }
  }
  setTimeout(function () { try { $('nextBtn').focus({ preventScroll: true }); } catch (e) { } }, 50);
}

/* ============================================================================
   11. CONTROL DE ENTRADA Y GESTOS (MOUSE / TOUCH)
   ============================================================================ */
function pos(e) {
  const r = cv.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (S / r.width),
    y: (e.clientY - r.top) * (S / r.height)
  };
}

function cellAt(p) {
  const c = Math.floor((p.x - pad) / cell), r = Math.floor((p.y - pad) / cell);
  return (c < 0 || c >= N || r < 0 || r >= N) ? -1 : r * N + c;
}

function adjacent(a, b) {
  const ra = (a / N) | 0, ca = a % N, rb = (b / N) | 0, cb = b % N;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

cv.addEventListener('pointerdown', function (e) {
  ac();
  if (busy || ended) return;
  const p = pos(e), i = cellAt(p);
  if (i < 0) return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { }
  drag = { i: i, x: p.x, y: p.y, done: false };
});

cv.addEventListener('pointermove', function (e) {
  if (!drag || drag.done || busy || skillMode) return;
  const p = pos(e), dx = p.x - drag.x, dy = p.y - drag.y;
  if (Math.hypot(dx, dy) < cell * 0.35) return;
  drag.done = true;
  const r = (drag.i / N) | 0, c = drag.i % N;
  let nr = r, nc = c;
  if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1;
  else nr += dy > 0 ? 1 : -1;
  if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
  sel = null;
  trySwap(drag.i, nr * N + nc);
});

cv.addEventListener('pointerup', function (e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.done || busy || ended) return;
  const i = cellAt(pos(e));
  if (i < 0) return;
  if (skillMode) { useSkill(i); return; }
  if (sel === null) sel = i;
  else if (sel === i) sel = null;
  else if (adjacent(sel, i)) { const s = sel; sel = null; trySwap(s, i); }
  else sel = i;
});

cv.addEventListener('pointercancel', function () { drag = null; });

$('nextBtn').addEventListener('click', function () {
  ac();
  sfx.click();
  startRound(false);
});

function renderSnd() {
  const b = $('sndBtn');
  if (!b) return;
  b.textContent = muted ? 'Sonido apagado' : 'Sonido activado';
  b.setAttribute('aria-pressed', String(!muted));
}

if ($('sndBtn')) {
  $('sndBtn').addEventListener('click', function () {
    muted = !muted;
    try { localStorage.setItem(SKEY, muted ? '0' : '1'); } catch (e) { }
    renderSnd();
    if (!muted) { ac(); sfx.click(); }
  });
}

let resetArm = 0;
if ($('resetBtn')) {
  $('resetBtn').addEventListener('click', function () {
    const b = $('resetBtn');
    if (!resetArm) {
      resetArm = setTimeout(function () {
        resetArm = 0;
        b.textContent = 'Reiniciar rango a cero';
        b.classList.remove('warn');
      }, 3500);
      b.textContent = 'Toca de nuevo para borrar todo';
      b.classList.add('warn');
      return;
    }
    clearTimeout(resetArm);
    resetArm = 0;
    b.textContent = 'Reiniciar rango a cero';
    b.classList.remove('warn');
    rp = 0;
    peak = 0;
    streak = 0;
    roundNo = 0;
    hist = [];
    save();
    startRound(false);
  });
}

/* ============================================================================
   12. ARRANQUE E INICIALIZACIÓN
   ============================================================================ */
load();
try { muted = localStorage.getItem(SKEY) === '0'; } catch (e) { }
renderSnd();
resize();
readColors();
if (window.ResizeObserver) {
  new ResizeObserver(function () { resize(); }).observe($('bw'));
}
window.addEventListener('resize', resize);
try { document.fonts.load('800 20px Figtree'); } catch (e) { }
requestAnimationFrame(frame);
startRound(true);
