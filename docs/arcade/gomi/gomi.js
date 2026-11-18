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
let curLevelId = 0;   // Nivel activo sorteado por % (0 a 100)

// Tabla de puntos, Oro y ELO ganados al superar cada nivel según su bloque de dificultad (B1..B10)
const DIFF_CLEAR_BONUS = {
  1:  { pts: 350,   coins: 1,  elo: 4,  label: 'Muy Fácil' },
  2:  { pts: 700,   coins: 2,  elo: 7,  label: 'Fácil' },
  3:  { pts: 1100,  coins: 3,  elo: 11, label: 'Medio' },
  4:  { pts: 1600,  coins: 4,  elo: 15, label: 'Medio+' },
  5:  { pts: 2300,  coins: 6,  elo: 20, label: 'Difícil' },
  6:  { pts: 3200,  coins: 8,  elo: 26, label: 'Difícil+' },
  7:  { pts: 4400,  coins: 11, elo: 33, label: 'Muy Difícil' },
  8:  { pts: 6000,  coins: 15, elo: 42, label: 'Muy Difícil+' },
  9:  { pts: 8000,  coins: 20, elo: 55, label: 'Extremo' },
  10: { pts: 11000, coins: 28, elo: 75, label: 'Imposible' }
};

// Estado de la Partida continua (Run)
let runState = {
  active: false,
  stage: 1,
  stagesCleared: 0,
  totalScore: 0,
  totalTarget: 0,
  bonusCoins: 0,
  bonusElo: 0,
  startTime: 0,
  nextMs: 1000,
  playedLevels: new Set(),
  defeatPct: 12,
  pressure: 0,
  activeWeights: null,
  activeHeartRate: null,
  activeMask: null
};

/** Obtiene la configuración del nivel actual (0 a 100) desde GOMI_LEVELS */
function getActiveLevel() {
  if (window.GOMI_LEVELS && window.GOMI_LEVELS.length) {
    const idx = Math.min(window.GOMI_LEVELS.length - 1, Math.max(0, curLevelId | 0));
    return window.GOMI_LEVELS[idx];
  }
  return null;
}

/**
 * Sortea un nivel de los 10 bloques (B1..B10) por probabilidad (%) desde que empieza la partida.
 * Apenas inicia la partida (Etapa 1), todas las dificultades tienen un % de salir (mayor % en
 * Muy Fácil / Fácil / Medio, pero con posibilidad real de retos mayores), y conforme avanzas
 * de etapa el % se desplaza hacia Difícil, Extremo e Imposible. Nunca dos partidas son iguales.
 */
function rollLevelByProbability(stage) {
  const levels = window.GOMI_LEVELS || [];
  if (!levels.length) return { level: null, pressure: 0, rollPct: 100 };

  // Distribución de probabilidades (%) por bloque [B1..B10] según la etapa:
  // Desde Etapa 1 hay % de variedad en todos los tipos de dificultad para que ninguna partida sea igual
  const STAGE_DISTRIBUTIONS = [
    // Etapa 1 (inicio de partida: mayoría Fácil/Muy Fácil, pero puede sorprenderte Medio o Difícil)
    [38, 27, 15, 8, 5, 3, 2, 1, 0.7, 0.3],
    // Etapa 2
    [14, 28, 24, 15, 9, 5, 2.5, 1.3, 0.8, 0.4],
    // Etapa 3
    [5, 13, 24, 24, 16, 9, 5, 2.2, 1.2, 0.6],
    // Etapa 4
    [2, 5, 12, 20, 24, 18, 10, 5, 2.5, 1.5],
    // Etapa 5
    [1, 2, 6, 12, 19, 23, 18, 11, 5, 3],
    // Etapa 6
    [0.5, 1, 3, 6, 12, 18, 24, 19, 11, 5.5],
    // Etapa 7
    [0.2, 0.5, 1.5, 3, 7, 12, 20, 25, 19, 11.8],
    // Etapa 8+ (predominan Muy Difícil+, Extremo e Imposible)
    [0.1, 0.2, 0.7, 1.5, 3.5, 7, 14, 23, 27, 23]
  ];

  const distIdx = Math.min(STAGE_DISTRIBUTIONS.length - 1, Math.max(0, (stage | 0) - 1));
  const weights = STAGE_DISTRIBUTIONS[distIdx];
  let wTotal = 0;
  for (let i = 0; i < weights.length; i++) wTotal += weights[i];

  let r = Math.random() * (wTotal || 100);
  let chosenBlock = 1;
  let chosenW = weights[0];
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosenBlock = i + 1;
      chosenW = weights[i];
      break;
    }
  }

  let candidates = levels.filter(function (l) {
    return l.block === chosenBlock && !runState.playedLevels.has(l.id);
  });
  if (!candidates.length) {
    candidates = levels.filter(function (l) { return l.block === chosenBlock; });
  }
  if (!candidates.length) candidates = levels;

  const picked = candidates[(Math.random() * candidates.length) | 0];
  return {
    level: picked,
    pressure: Math.min(1.2, (chosenBlock - 1) / 8),
    rollPct: Number(((chosenW / (wTotal || 100)) * 100).toFixed(1))
  };
}

/** Indica si la celda (r, c) está activa en la máscara 8x8 del nivel actual */
function isMaskOpen(r, c) {
  if (r < 0 || r >= N || c < 0 || c >= N) return false;
  if (runState && runState.activeMask && runState.activeMask[r]) {
    return Boolean(runState.activeMask[r][c]);
  }
  const lvl = getActiveLevel();
  if (!lvl || !lvl.mask || !lvl.mask[r]) return true;
  return Boolean(lvl.mask[r][c]);
}

/** Genera un color aleatorio para piezas base (0 a K-1) respetando pesos dinámicos de la partida */
function randColor() {
  const lvl = getActiveLevel();
  const wArr = (runState && Array.isArray(runState.activeWeights))
    ? runState.activeWeights
    : (lvl && Array.isArray(lvl.weights) ? lvl.weights : null);
  if (wArr && wArr.length === K) {
    let sum = 0;
    for (let i = 0; i < K; i++) sum += wArr[i];
    if (sum > 0) {
      let r = Math.random() * sum;
      for (let i = 0; i < K; i++) {
        r -= wArr[i];
        if (r <= 0) return i;
      }
    }
  }
  return Math.floor(Math.random() * K);
}

/** Cuenta el número actual de corazones (Cartas de amor) en el tablero */
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
 * Controla la probabilidad de aparición de Cartas de amor (HEART).
 * Respeta la frecuencia configurada en la etapa actual.
 */
function spawnColor(hearts) {
  const lvl = getActiveLevel();
  const baseP = (runState && typeof runState.activeHeartRate === 'number')
    ? runState.activeHeartRate
    : ((lvl && typeof lvl.heartRate === 'number') ? lvl.heartRate : 0.03);
  const p = hearts < 3 ? baseP : hearts < 5 ? (baseP * 0.35) : 0;
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
      for (let k = 0; k < N * N; k++) {
        if (cellOf(b, k)) all.add(k);
      }
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
      if (!clear.has(j) && cellOf(b, j)) {
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
    for (let k = 0; k < N * N; k++) {
      if (cellOf(b, k)) set.add(k);
    }
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

/** Aplica gravedad al tablero haciendo caer piezas y rellenando los huecos superiores (respeta máscara del nivel) */
function gravity(b) {
  let hearts = countHearts(b);
  for (let c = 0; c < N; c++) {
    const activeRows = [];
    const col = [];
    for (let r = N - 1; r >= 0; r--) {
      if (isMaskOpen(r, c)) {
        activeRows.push(r);
        if (b[r][c]) col.push(b[r][c]);
      } else {
        b[r][c] = null;
      }
    }
    const missing = activeRows.length - col.length;
    for (let k = 0; k < col.length; k++) {
      b[activeRows[k]][c] = col[k];
    }
    for (let k = 0; k < missing; k++) {
      const targetR = activeRows[col.length + k];
      const col0 = spawnColor(hearts);
      if (col0 === HEART) hearts++;
      const t = mk(col0);
      t.x = c;
      t.y = -1 - k;
      b[targetR][c] = t;
    }
    for (let k = 0; k < activeRows.length; k++) {
      const r = activeRows[k];
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
      if (!b[r][c]) continue;
      const nbs = [];
      if (c + 1 < N && b[r][c + 1]) nbs.push([r, c + 1]);
      if (r + 1 < N && b[r + 1][c]) nbs.push([r + 1, c]);
      for (const n of nbs) {
        const a = b[r][c], o = b[n[0]][n[1]];
        if (!a || !o) continue;
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

/** Obtiene el ID de la única pieza que hay que mover para formar una combinación (pista) */
function findHintIds(b) {
  if (!b) return null;
  const moves = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const nbs = [];
      if (c + 1 < N) nbs.push([r, c + 1]);
      if (r + 1 < N) nbs.push([r + 1, c]);
      for (const n of nbs) {
        const a = b[r][c], o = b[n[0]][n[1]];
        if (!a || !o) continue;
        if (a.s === 3 || o.s === 3) {
          moves.push({ ids: new Set([(a.s === 3 ? a : o).id]), prio: 2 });
          continue;
        }
        const idxA = r * N + c, idxO = n[0] * N + n[1];
        b[r][c] = o; b[n[0]][n[1]] = a;
        const runs = findRuns(b);
        if (runs.length > 0) {
          let mover = null;
          let prio = 1;
          for (const run of runs) {
            const first = cellOf(b, run.cells[0]);
            if (first && first.t === HEART) prio = 10;
            else if (run.cells.length >= 4 && prio < 3) prio = 3;
            if (!mover) {
              if (run.cells.indexOf(idxO) >= 0) mover = a;
              else if (run.cells.indexOf(idxA) >= 0) mover = o;
            }
          }
          if (mover) moves.push({ ids: new Set([mover.id]), prio: prio });
        }
        b[r][c] = a; b[n[0]][n[1]] = o;
      }
    }
  }
  if (!moves.length) return null;
  moves.sort(function (x, y) { return y.prio - x.prio; });
  const bestPrio = moves[0].prio;
  const top = moves.filter(function (m) { return m.prio === bestPrio; });
  return top[(Math.random() * top.length) | 0].ids;
}

/** Genera un nuevo tablero garantizando que tenga movimientos válidos, sin matches iniciales y respetando la máscara del nivel */
function newBoard() {
  for (let guard = 0; guard < 120; guard++) {
    const b = Array.from({ length: N }, function () { return Array(N).fill(null); });
    let hearts = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!isMaskOpen(r, c)) {
          b[r][c] = null;
          continue;
        }
        let t, tries = 0;
        do {
          t = spawnColor(hearts);
          tries++;
        } while (
          tries < 40 && (
            (c >= 2 && b[r][c - 1] && b[r][c - 2] && b[r][c - 1].t === t && b[r][c - 2].t === t) ||
            (r >= 2 && b[r - 1][c] && b[r - 2][c] && b[r - 1][c].t === t && b[r - 2][c].t === t)
          )
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
  return Array.from({ length: N }, function (_, r) {
    return Array.from({ length: N }, function (__, c) {
      if (!isMaskOpen(r, c)) return null;
      const o = mk((r + c) % K);
      o.x = o.tx = c;
      o.y = o.ty = r;
      return o;
    });
  });
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
let idleTime = 0, hintIds = null;
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

// Rejilla 256x256 -> [-1, 1] centrada en (0,0)
function _u(c) { c.translate(-1, -1); c.scale(1 / 128, 1 / 128); }

// Anillo (corona circular): círculo exterior en un sentido, interior en el contrario
function _ring(c, cx, cy, ro, ri) {
  c.moveTo(cx + ro, cy); c.arc(cx, cy, ro, 0, Math.PI * 2, false);
  c.moveTo(cx + ri, cy); c.arc(cx, cy, ri, 0, Math.PI * 2, true);
}

function _rrect(c, x, y, w, h, r) {                   // rectángulo redondeado (horario)
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}

/* ======================= HELADO DE CONO BAÑADO ====================== */
const _HEL_TIERS = [[128, 108, 66, 26], [128, 78, 52, 24], [128, 52, 36, 20]];
const _HEL_GOTAS = [[84, 34], [112, 26], [138, 44], [164, 30], [184, 22]];   // [x, largo]

function _helCono(c) {
  c.moveTo(66, 118); c.lineTo(190, 118); c.lineTo(134, 236);
  c.quadraticCurveTo(128, 248, 122, 236); c.closePath();
}
function _helPunta(c) {
  c.moveTo(106, 42); c.bezierCurveTo(104, 26, 124, 22, 138, 6);
  c.bezierCurveTo(140, 18, 150, 28, 150, 42); c.closePath();
}

function pHelado(c) {
  c.save(); _u(c);
  c.beginPath();
  _helCono(c);
  for (const [x, y, rx, ry] of _HEL_TIERS) { c.moveTo(x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  _helPunta(c);
  c.restore();
}

function dHelado(c, p, deep) {
  const k = deep ? 1.4 : 1;
  c.save(); _u(c);
  c.lineJoin = 'round'; c.lineCap = 'round';

  // cono de barquillo
  let g = c.createLinearGradient(66, 0, 190, 0);
  g.addColorStop(0, '#e8b46a'); g.addColorStop(0.45, '#f6cf8c'); g.addColorStop(1, '#c98f4a');
  c.beginPath(); _helCono(c); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  // rejilla del barquillo
  c.strokeStyle = '#b9803f'; c.lineWidth = 2.5; c.globalAlpha = 0.7;
  c.beginPath();
  for (let x = -60; x <= 260; x += 24) { c.moveTo(x, 110); c.lineTo(x + 130, 250); c.moveTo(x, 110); c.lineTo(x - 130, 250); }
  c.stroke();
  c.globalAlpha = 1;
  // baño de chocolate con gotas
  g = c.createLinearGradient(0, 118, 0, 165);
  g.addColorStop(0, '#6b3a20'); g.addColorStop(1, '#3f1d0e');
  c.fillStyle = g; c.beginPath();
  _rrect(c, 56, 112, 150, 28, 4);
  for (const [x, l] of _HEL_GOTAS) _rrect(c, x - 8, 118, 16, l + 14, 8);
  c.fill();
  c.strokeStyle = '#d9a070'; c.lineWidth = 2.5; c.globalAlpha = 0.4; c.beginPath();
  for (const [x, l] of _HEL_GOTAS) { c.moveTo(x - 3, 128); c.lineTo(x - 3, 118 + l - 4); }
  c.stroke(); c.globalAlpha = 1;
  c.restore();
  // contorno del cono
  c.beginPath(); _helCono(c); c.strokeStyle = '#a8692c'; c.lineWidth = 4; c.stroke();

  // helado de chocolate: de abajo hacia arriba
  for (const [x, y, rx, ry] of _HEL_TIERS) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.strokeStyle = '#3d1c0e'; c.lineWidth = 5; c.stroke();
    g = c.createRadialGradient(x - rx * 0.3, y - ry * 0.5, 2, x, y, rx * 1.1);
    g.addColorStop(0, '#b87848'); g.addColorStop(0.5, '#7a4326'); g.addColorStop(1, '#4a2412');
    c.fillStyle = g; c.fill();
    // ranura de la espiral
    c.strokeStyle = '#3d1c0e'; c.lineWidth = 3; c.globalAlpha = 0.35 * k;
    c.beginPath(); c.moveTo(x - rx * 0.8, y + ry * 0.2); c.quadraticCurveTo(x, y + ry * 1.1, x + rx * 0.8, y - ry * 0.25); c.stroke();
    // sombra inferior y brillo superior
    c.lineWidth = 5; c.globalAlpha = 0.3 * k;
    c.beginPath(); c.ellipse(x, y, rx - 6, ry - 4, 0, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.strokeStyle = '#f1c79a'; c.lineWidth = 4; c.globalAlpha = 0.7;
    c.beginPath(); c.ellipse(x, y, rx - 8, ry - 6, 0, 1.05 * Math.PI, 1.5 * Math.PI); c.stroke();
    c.globalAlpha = 1;
  }
  // punta rizada
  c.beginPath(); _helPunta(c); c.strokeStyle = '#3d1c0e'; c.lineWidth = 5; c.stroke();
  g = c.createLinearGradient(106, 6, 150, 42);
  g.addColorStop(0, '#b87848'); g.addColorStop(1, '#6b3a20');
  c.fillStyle = g; c.fill();
  c.strokeStyle = '#f1c79a'; c.lineWidth = 3; c.globalAlpha = 0.7;
  c.beginPath(); c.moveTo(114, 36); c.quadraticCurveTo(116, 26, 130, 16); c.stroke();
  c.globalAlpha = 1;

  // destello
  c.fillStyle = '#fff'; c.globalAlpha = 0.9;
  c.beginPath(); c.moveTo(196, 56); c.lineTo(199, 65); c.lineTo(208, 68); c.lineTo(199, 71);
  c.lineTo(196, 80); c.lineTo(193, 71); c.lineTo(184, 68); c.lineTo(193, 65); c.closePath(); c.fill();
  c.restore();
}

/* ============================ GUSANO ÁCIDO ========================== */
const _GS_H = 24;   // mitad del ancho de la tira

function _gsPunto(t) {                                  // punto, tangente y normal de la curva central
  const a = t * Math.PI * 2;
  const x = 128 + 46 * Math.sin(a), y = 28 + 200 * t;
  const dx = 46 * Math.PI * 2 * Math.cos(a), dy = 200, l = Math.hypot(dx, dy);
  const tx = dx / l, ty = dy / l;
  return { x, y, tx, ty, nx: -ty, ny: tx };
}

function _gsContorno(c) {                               // silueta cerrada: lado, tapa, lado y tapa
  const N = 48, h = _GS_H, M = 10;
  const P0 = _gsPunto(0), P1 = _gsPunto(1);
  c.moveTo(P0.x + P0.nx * h, P0.y + P0.ny * h);
  for (let i = 1; i <= N; i++) { const q = _gsPunto(i / N); c.lineTo(q.x + q.nx * h, q.y + q.ny * h); }
  for (let i = 1; i <= M; i++) {                        // tapa redonda final
    const a = Math.PI * i / M;
    c.lineTo(P1.x + h * (Math.cos(a) * P1.nx + Math.sin(a) * P1.tx), P1.y + h * (Math.cos(a) * P1.ny + Math.sin(a) * P1.ty));
  }
  for (let i = N - 1; i >= 0; i--) { const q = _gsPunto(i / N); c.lineTo(q.x - q.nx * h, q.y - q.ny * h); }
  for (let i = 1; i < M; i++) {                         // tapa redonda inicial
    const a = Math.PI * i / M;
    c.lineTo(P0.x + h * (-Math.cos(a) * P0.nx - Math.sin(a) * P0.tx), P0.y + h * (-Math.cos(a) * P0.ny - Math.sin(a) * P0.ty));
  }
  c.closePath();
}

function pGusano(c) {
  c.save(); _u(c);
  c.beginPath(); _gsContorno(c);
  c.restore();
}

function _gsLinea(c, off, t0, t1) {                     // línea paralela a la curva central
  c.beginPath();
  for (let i = 0; i <= 40; i++) {
    const q = _gsPunto(t0 + (t1 - t0) * i / 40);
    const x = q.x + q.nx * off, y = q.y + q.ny * off;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
}

function dGusano(c, p, deep) {
  const k = deep ? 1.4 : 1;
  c.save(); _u(c);
  c.lineJoin = 'round'; c.lineCap = 'round';

  // contorno en tonos más oscuros del arcoíris
  let g = c.createLinearGradient(0, 14, 0, 242);
  g.addColorStop(0, '#d63a6c'); g.addColorStop(0.28, '#e08a1c'); g.addColorStop(0.5, '#e0c022');
  g.addColorStop(0.72, '#2f9f3a'); g.addColorStop(1, '#1488b8');
  c.beginPath(); _gsContorno(c); c.strokeStyle = g; c.lineWidth = 6; c.stroke();

  // cuerpo arcoíris
  g = c.createLinearGradient(0, 14, 0, 242);
  g.addColorStop(0, '#ff6f9c'); g.addColorStop(0.28, '#ffb340'); g.addColorStop(0.5, '#ffe94d');
  g.addColorStop(0.72, '#66d65f'); g.addColorStop(1, '#3cc0ee');
  c.beginPath(); _gsContorno(c); c.fillStyle = g; c.fill();

  // volumen: brillo a un lado y sombra al otro
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.globalAlpha = 0.5;
  _gsLinea(c, -_GS_H * 0.55, 0.04, 0.96); c.stroke();
  c.strokeStyle = '#6a2a5a'; c.lineWidth = 7; c.globalAlpha = 0.16 * k;
  _gsLinea(c, _GS_H * 0.6, 0.04, 0.96); c.stroke();
  c.globalAlpha = 1;

  // azúcar ácida: muchos cristalitos (posiciones fijas, siempre iguales)
  let s = 12345; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 190; i++) {
    const q = _gsPunto(0.02 + 0.96 * rnd()), off = (rnd() * 2 - 1) * _GS_H * 0.9;
    const x = q.x + q.nx * off, y = q.y + q.ny * off, r = 0.8 + rnd() * 1.4, al = 0.55 + rnd() * 0.4;
    if (Math.abs(x - 128) < 34 && y > 108 && y < 150) continue;    // deja libre la carita
    c.globalAlpha = 0.18 * k; c.fillStyle = '#5a2a6a';
    c.beginPath(); c.arc(x + 0.9, y + 0.9, r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = al; c.fillStyle = '#fff';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;

  // carita ácida y tierna: ojitos apretados, mejillas y boquita fruncida
  c.strokeStyle = '#5a2a3a'; c.lineWidth = 4.5;
  c.beginPath(); c.moveTo(110, 118); c.lineTo(121, 124); c.lineTo(110, 130);
  c.moveTo(146, 118); c.lineTo(135, 124); c.lineTo(146, 130); c.stroke();
  c.fillStyle = '#ff5f8a'; c.globalAlpha = 0.45;
  c.beginPath(); c.ellipse(104, 136, 7, 4.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(152, 136, 7, 4.5, 0, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1; c.fillStyle = '#5a2a3a';
  c.beginPath(); c.ellipse(128, 138, 5, 6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ff7a9a';
  c.beginPath(); c.ellipse(128, 141, 3, 2.4, 0, 0, Math.PI * 2); c.fill();

  // destellos de azúcar
  c.fillStyle = '#fff';
  [[66, 62, 10], [190, 196, 10], [214, 124, 6]].forEach(([x, y, r]) => {
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.28, y - r * 0.28); c.lineTo(x + r, y);
    c.lineTo(x + r * 0.28, y + r * 0.28); c.lineTo(x, y + r); c.lineTo(x - r * 0.28, y + r * 0.28);
    c.lineTo(x - r, y); c.lineTo(x - r * 0.28, y - r * 0.28); c.closePath(); c.fill();
  });
  c.restore();
}

/* ============================ ALGODÓN DE AZÚCAR ===================== */
const _ALGODON_PUFFS = [
  [128, 41, 27], [110, 62, 29], [147, 64, 29],
  [98, 94, 34], [158, 94, 34], [128, 86, 34],
  [84, 132, 37], [172, 132, 37], [128, 128, 42],
  [96, 168, 34], [160, 168, 34], [128, 170, 39],
  [128, 192, 23]
];

function _algodonPalito(c) {
  c.moveTo(122, 190); c.lineTo(134, 190); c.lineTo(139, 246);
  c.quadraticCurveTo(139, 251, 134, 251); c.lineTo(126, 251);
  c.quadraticCurveTo(121, 251, 121, 246); c.closePath();
}

function pAlgodon(c) {
  c.save(); _u(c);
  c.beginPath();
  for (const [x, y, r] of _ALGODON_PUFFS) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }
  _algodonPalito(c);
  c.restore();
}

function dAlgodon(c, p, deep) {
  const k = deep ? 1.4 : 1;
  c.save(); _u(c);

  // palito
  let g = c.createLinearGradient(121, 0, 139, 0);
  g.addColorStop(0, '#f0cf9a'); g.addColorStop(1, '#c8975a');
  c.beginPath(); _algodonPalito(c); c.fillStyle = g; c.fill();

  // contorno de las nubes
  c.beginPath();
  for (const [x, y, r] of _ALGODON_PUFFS) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }
  c.lineWidth = 6; c.strokeStyle = '#e9588f'; c.stroke();

  // cada nube con su propio degradado radial
  for (const [x, y, r] of _ALGODON_PUFFS) {
    const gx = x - 0.24 * r, gy = y - 0.4 * r;
    g = c.createRadialGradient(gx, gy, 0, gx, gy, 1.6 * r);
    g.addColorStop(0, '#ffd3e8'); g.addColorStop(0.5, '#ff9ccb'); g.addColorStop(1, '#f0629f');
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  }

  c.lineCap = 'round';
  // hebras claras
  c.strokeStyle = '#ffe3f1'; c.lineWidth = 3; c.globalAlpha = 0.7;
  c.beginPath(); c.moveTo(100, 60); c.quadraticCurveTo(122, 44, 144, 56);
  c.moveTo(70, 112); c.quadraticCurveTo(100, 94, 130, 108); c.quadraticCurveTo(158, 120, 184, 102);
  c.moveTo(66, 150); c.quadraticCurveTo(100, 134, 128, 150); c.quadraticCurveTo(160, 166, 188, 146);
  c.moveTo(84, 184); c.quadraticCurveTo(114, 170, 146, 186); c.stroke();
  // hebras oscuras
  c.strokeStyle = '#e5508d'; c.lineWidth = 2.5; c.globalAlpha = 0.45 * k;
  c.beginPath(); c.moveTo(92, 128); c.quadraticCurveTo(120, 118, 152, 132);
  c.moveTo(104, 166); c.quadraticCurveTo(130, 156, 158, 168); c.stroke();

  // brillos
  c.fillStyle = '#fff';
  c.globalAlpha = 0.85; c.beginPath(); c.ellipse(102, 74, 14, 7, -35 * Math.PI / 180, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.65; c.beginPath(); c.ellipse(74, 128, 7, 4, -50 * Math.PI / 180, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.9;  c.beginPath(); c.arc(116, 46, 3.5, 0, Math.PI * 2); c.fill();
  c.restore();
}

function el(c, x, y, rx, ry, rot) {
  rot = rot || 0;
  c.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/* ===================== SUSHI FRITO (un trozo de rollo) ============== */
const _SF = { x: 128, y: 120, r: 84, d: 10 };                  // centro, radio y grosor del trozo

function _uSushi(c) { _u(c); }

// contorno irregular (empanizado): círculo con ondulaciones suaves
function _sfBorde(c, cx, cy, r) {
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = r + 1.1 * Math.sin(a * 9 + 1) + 0.8 * Math.sin(a * 15 + 2) + 0.6 * Math.sin(a * 23);
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.closePath();
}

function pSushi(c) {
  c.save(); _uSushi(c);
  c.beginPath();
  _sfBorde(c, _SF.x, _SF.y, _SF.r + 2);
  _sfBorde(c, _SF.x, _SF.y + _SF.d, _SF.r + 2);
  c.restore();
}

function dSushi(c, p, deep) {
  const k = deep ? 1.4 : 1;
  const { x, y, r, d } = _SF;
  c.save(); _uSushi(c);
  c.lineJoin = 'round'; c.lineCap = 'round';
  let s = 77; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const migas = (rmin, rmax, n, cy) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.283, rr = rmin + rnd() * (rmax - rmin), mr = 1.5 + rnd() * 2, mx = x + Math.cos(a) * rr, my = cy + Math.sin(a) * rr;
      c.globalAlpha = 0.5; c.fillStyle = '#9a4f10'; c.beginPath(); c.arc(mx + 0.8, my + 1, mr, 0, 6.283); c.fill();
      c.globalAlpha = 1; c.fillStyle = rnd() < 0.5 ? '#fff3c0' : '#ffe08a'; c.beginPath(); c.arc(mx, my, mr * 0.78, 0, 6.283); c.fill();
    }
  };

  // sombra en el suelo
  c.globalAlpha = 0.25 * k; c.fillStyle = '#000';
  c.beginPath(); c.ellipse(x, y + d + r * 0.92, r * 0.8, 9, 0, 0, 6.283); c.fill(); c.globalAlpha = 1;

  // grosor del trozo (borde de abajo, más oscuro)
  let g = c.createLinearGradient(0, y, 0, y + d + r);
  g.addColorStop(0, '#d98f2c'); g.addColorStop(1, '#a8601a');
  c.beginPath(); _sfBorde(c, x, y + d, r + 2); c.fillStyle = g; c.fill();
  c.strokeStyle = '#6e3a0c'; c.lineWidth = 5; c.stroke();

  // cara: empanizado dorado
  g = c.createRadialGradient(x - 24, y - 30, 6, x, y, r * 1.3);
  g.addColorStop(0, '#ffeeb0'); g.addColorStop(0.5, '#f8c85a'); g.addColorStop(1, '#e19b2c');
  c.beginPath(); _sfBorde(c, x, y, r + 2); c.fillStyle = g; c.fill();
  c.strokeStyle = '#8f4d12'; c.lineWidth = 5; c.stroke();
  migas(r - 14, r - 2, 46, y);

  // arroz
  g = c.createLinearGradient(0, y - 60, 0, y + 60); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dde3ee');
  c.beginPath(); c.arc(x, y, 58, 0, 6.283); c.fillStyle = g; c.fill();
  c.strokeStyle = '#aab6cc'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = '#c3cde0';
  for (const rad of [51, 44]) for (let a = rnd() * 0.3; a < 6.283; a += 0.34 + rnd() * 0.08) {
    c.beginPath(); c.ellipse(x + Math.cos(a) * rad, y + Math.sin(a) * rad, 5, 2.2, a + Math.PI / 2, 0, 6.283); c.fill();
  }

  // alga nori
  c.beginPath(); c.arc(x, y, 38, 0, 6.283); c.fillStyle = '#14241b'; c.fill();
  c.strokeStyle = '#6a9c7a'; c.lineWidth = 3; c.globalAlpha = 0.6;
  c.beginPath(); c.arc(x, y, 34.5, -2.8, -1.5); c.stroke(); c.globalAlpha = 1;
  c.beginPath(); c.arc(x, y, 31, 0, 6.283); c.fillStyle = '#f7f9fc'; c.fill();

  // relleno: pollo y palta
  c.save(); c.translate(x, y); c.scale(1.05, 1.05);
  c.beginPath(); c.arc(0, 0, 29, 0, 6.283); c.clip();
  g = c.createLinearGradient(-24, -14, 8, 20); g.addColorStop(0, '#fff7ea'); g.addColorStop(1, '#ebcfa6');
  c.beginPath(); c.moveTo(-26, 2); c.bezierCurveTo(-26, -11, -12, -15, -2, -10);
  c.bezierCurveTo(8, -5, 9, 8, 2, 16); c.bezierCurveTo(-7, 25, -26, 19, -26, 2); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = '#c9a87a'; c.lineWidth = 2.5; c.stroke();
  c.strokeStyle = '#dcc093'; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(-19, -2); c.quadraticCurveTo(-10, -5, -3, 0); c.moveTo(-18, 9); c.quadraticCurveTo(-9, 6, -2, 10); c.stroke();
  const gajo = (pts, fill, hi, hx, hy) => {
    c.beginPath(); c.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i += 3) c.bezierCurveTo(...pts[i], ...pts[i + 1], ...pts[i + 2]);
    c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = '#4f8a22'; c.lineWidth = 2.5; c.stroke();
    c.beginPath(); c.ellipse(hx, hy, 5, 3.4, -0.5, 0, 6.283); c.fillStyle = hi; c.fill();
  };
  gajo([[5, -22], [16, -27], [27, -17], [23, -5], [21, 0], [8, -2], [5, -9], [3, -13], [3, -18], [5, -22]], '#b8e06c', '#e6f7ae', 13, -13);
  gajo([[8, 6], [19, 2], [28, 8], [23, 17], [19, 25], [6, 23], [6, 14], [6, 10], [6, 8], [8, 6]], '#9cd24a', '#d6ef8e', 14, 13);
  c.restore();

  // brillo de la cara
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.globalAlpha = 0.55;
  c.beginPath(); c.arc(x, y, r - 4, -2.7, -2.05); c.stroke(); c.globalAlpha = 1;

  // destellos
  c.fillStyle = '#fff'; c.globalAlpha = 0.9;
  const star = (sx, sy, z) => { c.beginPath(); c.moveTo(sx, sy - 12 * z); c.lineTo(sx + 3 * z, sy - 3 * z); c.lineTo(sx + 12 * z, sy);
    c.lineTo(sx + 3 * z, sy + 3 * z); c.lineTo(sx, sy + 12 * z); c.lineTo(sx - 3 * z, sy + 3 * z); c.lineTo(sx - 12 * z, sy);
    c.lineTo(sx - 3 * z, sy - 3 * z); c.closePath(); c.fill(); };
  star(226, 30, 1); star(30, 196, 0.6);
  c.restore();
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

/* ========================= ANILLO DE COMPROMISO ===================== */
function _gema(c) {   // diamante (sentido horario)
  c.moveTo(88, 62); c.lineTo(108, 30); c.lineTo(148, 30); c.lineTo(168, 62); c.lineTo(128, 118); c.closePath();
}
function _garras(c) {
  c.moveTo(96, 84); c.lineTo(116, 108); c.lineTo(104, 112); c.closePath();
  c.moveTo(160, 84); c.lineTo(152, 112); c.lineTo(140, 108); c.closePath();
}

function pAnilloCompromiso(c) {
  c.save(); _u(c);
  c.beginPath();
  _ring(c, 128, 174, 76, 44);
  _garras(c);
  _gema(c);
  c.restore();
}

function dAnilloCompromiso(c, p, deep) {
  const k = deep ? 1.4 : 1;
  c.save(); _u(c);

  // banda: borde oscuro + plata/oro blanco
  c.beginPath(); _ring(c, 128, 174, 76, 44); c.fillStyle = '#5b6a80'; c.fill();
  let g = c.createLinearGradient(78.3, 103, 177.7, 245);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#d6dfea'); g.addColorStop(1, '#8d9db3');
  c.beginPath(); _ring(c, 128, 174, 71, 39); c.fillStyle = g; c.fill();
  // brillo de la banda
  c.lineCap = 'round';
  c.beginPath(); c.arc(128, 174, 61, -2.95, -2.1);
  c.strokeStyle = '#fff'; c.lineWidth = 7; c.globalAlpha = 0.8; c.stroke();
  c.globalAlpha = 1;

  // garras
  c.beginPath(); _garras(c);
  c.fillStyle = '#c9d3df'; c.fill();
  c.lineWidth = 2; c.lineJoin = 'round'; c.strokeStyle = '#6b7a8f'; c.stroke();

  // diamante
  g = c.createLinearGradient(88, 30, 168, 118);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#bfeaff'); g.addColorStop(1, '#6cc4ee');
  c.beginPath(); _gema(c); c.fillStyle = g; c.fill();
  c.lineWidth = 3; c.strokeStyle = '#4aa9d6'; c.stroke();
  // facetas
  c.lineWidth = 2; c.globalAlpha = 0.8;
  c.beginPath();
  c.moveTo(88, 62); c.lineTo(168, 62);
  c.moveTo(108, 30); c.lineTo(118, 62); c.moveTo(148, 30); c.lineTo(138, 62);
  c.moveTo(118, 62); c.lineTo(128, 118); c.moveTo(138, 62); c.lineTo(128, 118);
  c.stroke();
  // mesa brillante
  c.globalAlpha = 0.55; c.fillStyle = '#fff';
  c.beginPath(); c.moveTo(108, 30); c.lineTo(148, 30); c.lineTo(138, 62); c.lineTo(118, 62); c.closePath(); c.fill();
  // destello
  c.globalAlpha = 0.9; c.strokeStyle = '#fff'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(98, 56); c.lineTo(112, 38); c.stroke();
  // estrellita
  c.fillStyle = '#fff';
  c.beginPath(); c.moveTo(176, 40); c.lineTo(180, 28); c.lineTo(184, 40); c.lineTo(196, 44);
  c.lineTo(184, 48); c.lineTo(180, 60); c.lineTo(176, 48); c.lineTo(164, 44); c.closePath(); c.fill();
  c.restore();
}

/* ================== ANILLO DE BODA (dos argollas de plata) ========== */
const _ARG_A = [98, 140], _ARG_B = [158, 116], _ARG_RO = 66, _ARG_RI = 40;

function pAnilloBoda(c) {
  c.save(); _u(c);
  c.beginPath();
  _ring(c, _ARG_A[0], _ARG_A[1], _ARG_RO, _ARG_RI);
  _ring(c, _ARG_B[0], _ARG_B[1], _ARG_RO, _ARG_RI);
  c.restore();
}

function _argolla(c, x, y, k) {
  const ro = _ARG_RO, ri = _ARG_RI, mid = (ro + ri) / 2;
  // borde oscuro (marca bien el contorno)
  c.beginPath(); _ring(c, x, y, ro, ri); c.fillStyle = '#5b6a80'; c.fill();
  // plata
  const g = c.createLinearGradient(x - ro * 0.7, y - ro, x + ro * 0.7, y + ro);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#d6dfea'); g.addColorStop(1, '#8d9db3');
  c.beginPath(); _ring(c, x, y, ro - 5, ri + 5); c.fillStyle = g; c.fill();
  // línea clara central
  c.beginPath(); c.arc(x, y, mid, 0, Math.PI * 2);
  c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.globalAlpha = 0.5; c.stroke();
  // brillo y sombra
  c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, mid, -2.7, -1.7);
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.globalAlpha = 0.95; c.stroke();
  c.beginPath(); c.arc(x, y, mid, 0.5, 1.3);
  c.strokeStyle = '#5b6a80'; c.lineWidth = 5; c.globalAlpha = 0.35 * k; c.stroke();
  c.globalAlpha = 1;
}

function dAnilloBoda(c, p, deep) {
  const k = deep ? 1.4 : 1;
  c.save(); _u(c);
  _argolla(c, _ARG_A[0], _ARG_A[1], k);
  _argolla(c, _ARG_B[0], _ARG_B[1], k);
  // entrelazado: la argolla A pasa por encima de B en el cruce inferior derecho
  c.save(); c.beginPath(); c.arc(143.6, 167, 34, 0, Math.PI * 2); c.clip();
  _argolla(c, _ARG_A[0], _ARG_A[1], k);
  c.restore();
  // destello
  c.fillStyle = '#fff'; c.globalAlpha = 0.95;
  c.beginPath(); c.moveTo(214, 52); c.lineTo(217, 61); c.lineTo(226, 64); c.lineTo(217, 67);
  c.lineTo(214, 76); c.lineTo(211, 67); c.lineTo(202, 64); c.lineTo(211, 61); c.closePath(); c.fill();
  c.restore();
}

/* ============================ CARTA DE AMOR ========================= */
function _uCarta(c) { _u(c); c.translate(0, 10); }   // centra el conjunto en (0,0)

function _corazon(c, cx, cy, s, rot) {                // corazón (horario), s = semiancho
  c.save(); c.translate(cx, cy); c.rotate(rot || 0); c.scale(s, s);
  c.moveTo(0, -0.35);
  c.bezierCurveTo(0, -0.9, 1, -0.9, 1, -0.3);
  c.bezierCurveTo(1, 0.2, 0.4, 0.55, 0, 1);
  c.bezierCurveTo(-0.4, 0.55, -1, 0.2, -1, -0.3);
  c.bezierCurveTo(-1, -0.9, 0, -0.9, 0, -0.35);
  c.closePath(); c.restore();
}

function pCarta(c) {
  c.save(); _uCarta(c);
  c.beginPath();
  _rrect(c, 28, 74, 200, 126, 14);
  _corazon(c, 128, 150, 24, 0);
  _corazon(c, 204, 56, 13, 0.24);
  _corazon(c, 172, 40, 8, -0.2);
  c.restore();
}

function dCarta(c, p, deep) {
  const k = deep ? 1.4 : 1;
  c.save(); _uCarta(c);
  c.lineJoin = 'round'; c.lineCap = 'round';

  // papel
  let g = c.createLinearGradient(0, 74, 0, 200);
  g.addColorStop(0, '#fff8f0'); g.addColorStop(1, '#ffc9d8');
  c.beginPath(); _rrect(c, 28, 74, 200, 126, 14); c.fillStyle = g; c.fill();

  // pliegues y solapa (recortados al sobre)
  c.save(); c.clip();
  c.fillStyle = '#ff9db9'; c.globalAlpha = 0.28;
  c.beginPath(); c.moveTo(28, 74); c.lineTo(128, 146); c.lineTo(28, 200); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(228, 74); c.lineTo(128, 146); c.lineTo(228, 200); c.closePath(); c.fill();
  c.globalAlpha = 0.35;
  c.beginPath(); c.moveTo(28, 200); c.lineTo(128, 146); c.lineTo(228, 200); c.closePath(); c.fill();
  c.globalAlpha = 0.6; c.strokeStyle = '#d4577a'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(28, 200); c.lineTo(128, 146); c.lineTo(228, 200); c.stroke();
  // sombra de la solapa
  c.globalAlpha = 0.22 * k; c.fillStyle = '#9a2a4f';
  c.beginPath(); c.moveTo(28, 80); c.lineTo(228, 80); c.lineTo(128, 152); c.closePath(); c.fill();
  // solapa
  c.globalAlpha = 1;
  g = c.createLinearGradient(0, 74, 0, 146);
  g.addColorStop(0, '#fffdf9'); g.addColorStop(1, '#ffdbe6');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(28, 74); c.lineTo(228, 74); c.lineTo(128, 146); c.closePath(); c.fill();
  c.restore();

  // contornos
  c.strokeStyle = '#d4577a'; c.lineWidth = 5;
  c.beginPath(); _rrect(c, 28, 74, 200, 126, 14); c.stroke();
  c.lineWidth = 4;
  c.save(); c.beginPath(); _rrect(c, 28, 74, 200, 126, 14); c.clip();
  c.beginPath(); c.moveTo(28, 74); c.lineTo(128, 146); c.lineTo(228, 74); c.stroke();
  c.restore();
  // brillo de la solapa
  c.strokeStyle = '#fff'; c.lineWidth = 3; c.globalAlpha = 0.7;
  c.beginPath(); c.moveTo(40, 84); c.lineTo(118, 140); c.stroke();
  c.globalAlpha = 1;

  // sello de corazón: sombra, contorno, cuerpo, relieve y brillo
  c.fillStyle = '#7a1236'; c.globalAlpha = 0.3 * k;
  c.beginPath(); _corazon(c, 128, 154, 24, 0); c.fill();
  c.globalAlpha = 1;
  c.strokeStyle = '#a3173d'; c.lineWidth = 6;
  c.beginPath(); _corazon(c, 128, 150, 24, 0); c.stroke();
  g = c.createRadialGradient(118, 140, 2, 128, 152, 36);
  g.addColorStop(0, '#ff8aa3'); g.addColorStop(0.5, '#e8325f'); g.addColorStop(1, '#b81f48');
  c.fillStyle = g; c.beginPath(); _corazon(c, 128, 150, 24, 0); c.fill();
  c.strokeStyle = '#ff9fb4'; c.lineWidth = 2.5; c.globalAlpha = 0.55;
  c.beginPath(); _corazon(c, 128, 152, 14, 0); c.stroke();
  c.globalAlpha = 0.85; c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(112, 138, 7, 4, -40 * Math.PI / 180, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;

  // corazoncitos flotando
  [[204, 56, 13, 0.24], [172, 40, 8, -0.2]].forEach(([x, y, s, r]) => {
    c.strokeStyle = '#c9335f'; c.lineWidth = 3;
    c.beginPath(); _corazon(c, x, y, s, r); c.stroke();
    c.fillStyle = '#ff6f95'; c.beginPath(); _corazon(c, x, y, s, r); c.fill();
    c.fillStyle = '#fff'; c.globalAlpha = 0.85;
    c.beginPath(); c.arc(x - s * 0.45, y - s * 0.35, s * 0.18, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  });
  c.restore();
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

function shadeCustom(c, pathFn, detailFn, p) {
  c.save();
  c.shadowColor = 'rgba(12,2,34,.5)';
  c.shadowBlur = curR * 0.2;
  c.shadowOffsetY = curR * 0.1;
  pathFn(c);
  c.fillStyle = p[2];
  c.fill();
  c.restore();
  detailFn(c, p, false);
}

function makeSprite(k, s, R, D) {
  const o = newSpriteCtx(R, D), c = o.c, p = PAL[k];
  let body;
  if (k === 0) {
    body = pHelado;
    shadeCustom(c, pHelado, dHelado, p);
  } else if (k === 1) {
    body = pAnilloCompromiso;
    shadeCustom(c, pAnilloCompromiso, dAnilloCompromiso, p);
  } else if (k === 2) {
    body = pSushi;
    shadeCustom(c, pSushi, dSushi, p);
  } else if (k === 3) {
    body = pAnilloBoda;
    shadeCustom(c, pAnilloBoda, dAnilloBoda, p);
  } else if (k === 4) {
    body = pGusano;
    shadeCustom(c, pGusano, dGusano, p);
  } else if (k === 5) {
    body = pAlgodon;
    shadeCustom(c, pAlgodon, dAlgodon, p);
  } else {
    body = pCarta;
    shadeCustom(c, pCarta, dCarta, p);
  }
  if (s && k < 6) bakeStripes(c, body, s);
  return o.cvs;
}

// Exponer las 7 figuras en window para el validador y el previsualizador de niveles
window.pHelado = pHelado; window.dHelado = dHelado;
window.pAnilloCompromiso = pAnilloCompromiso; window.dAnilloCompromiso = dAnilloCompromiso;
window.pSushi = pSushi; window.dSushi = dSushi;
window.pAnilloBoda = pAnilloBoda; window.dAnilloBoda = dAnilloBoda;
window.pGusano = pGusano; window.dGusano = dGusano;
window.pAlgodon = pAlgodon; window.dAlgodon = dAlgodon;
window.pCarta = pCarta; window.dCarta = dCarta;

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
  const isHint = !busy && !ended && !selected && idleTime >= 3 && hintIds && hintIds.has(t.id);
  if (isHint && !REDUCED) {
    const ph = (now % 2200) / 2200;
    if (ph < 0.22) {
      const env = Math.sin((ph / 0.22) * Math.PI);
      ctx.translate(Math.sin(now * 0.038) * cell * 0.018 * env, 0);
      ctx.rotate(Math.sin(now * 0.038) * 0.045 * env);
    }
  }
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

  if (busy || ended || moving || drag) {
    idleTime = 0;
    hintIds = null;
  } else {
    idleTime += dt;
    if (idleTime >= 3 && !hintIds && board) {
      hintIds = findHintIds(board);
    }
  }

  // Actualizar reloj en vivo y % de riesgo de la partida
  if (runState.active && !ended && (frameNo % 20 === 0)) {
    updateRunClockHud();
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
      if (!isMaskOpen(r, c)) {
        rr(ctx, pad + c * cell + 2, pad + r * cell + 2, cell - 4, cell - 4, cell * 0.22);
        ctx.fillStyle = 'rgba(10, 4, 22, 0.55)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if ((r + c) % 2) {
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

/** Evalúa si todos los objetivos de figuras del nivel actual se han cumplido */
function isLevelCompleted() {
  if (!round.objectives || !round.objectives.length) {
    return round.score >= round.target;
  }
  const collectObjs = round.objectives.filter(function (o) { return o.type === 'collect'; });
  if (collectObjs.length > 0) {
    for (let i = 0; i < collectObjs.length; i++) {
      const o = collectObjs[i];
      const got = (round.collected && round.collected[o.figureId]) || 0;
      if (got < o.target) return false;
    }
    return true;
  }
  return round.score >= round.target;
}

/** Calcula el porcentaje global de avance en las figuras de la misión del nivel */
function getLevelProgressPct() {
  if (!round.objectives || !round.objectives.length) {
    return Math.min(100, (round.score / Math.max(1, round.target)) * 100);
  }
  const collectObjs = round.objectives.filter(function (o) { return o.type === 'collect'; });
  if (collectObjs.length > 0) {
    let gotTotal = 0, reqTotal = 0;
    for (let i = 0; i < collectObjs.length; i++) {
      const o = collectObjs[i];
      gotTotal += Math.min(o.target, (round.collected && round.collected[o.figureId]) || 0);
      reqTotal += Math.max(1, o.target);
    }
    return Math.min(100, (gotTotal / Math.max(1, reqTotal)) * 100);
  }
  return Math.min(100, (round.score / Math.max(1, round.target)) * 100);
}

/** Dibuja un icono pequeño de figura en un canvas 2D */
function drawMiniFigureIcon(canvasEl, figId) {
  if (!canvasEl) return;
  const size = 22, dpr0 = window.devicePixelRatio || 1;
  canvasEl.width = size * dpr0;
  canvasEl.height = size * dpr0;
  canvasEl.style.width = size + 'px';
  canvasEl.style.height = size + 'px';
  const c = canvasEl.getContext('2d');
  c.scale(dpr0, dpr0);
  c.translate(size / 2, size / 2);
  c.scale(size / 2.15, size / 2.15);
  const fig = window.GOMI_FIGURES && window.GOMI_FIGURES[figId];
  if (fig && typeof window[fig.dFn] === 'function') {
    window[fig.dFn](c, PAL[figId] || PAL[0], false);
  }
}

function renderObjectivesHud() {
  const bar = $('objBar'), box = $('missionBox');
  if (!bar) return;
  const objs = round.objectives || [];
  const collectObjs = objs.filter(function (o) { return o.type === 'collect'; });
  if (!collectObjs.length) {
    if (box) box.hidden = true;
    bar.hidden = true;
    return;
  }
  if (box) box.hidden = false;
  bar.hidden = false;

  // Reconstruir chips si cambió el nivel
  if (bar.dataset.lvl !== String(round.levelId)) {
    bar.dataset.lvl = String(round.levelId);
    bar.innerHTML = '';
    collectObjs.forEach(function (o) {
      const chip = document.createElement('div');
      chip.className = 'obj-chip';
      chip.dataset.fid = String(o.figureId);
      chip.title = o.name;

      const left = document.createElement('span');
      left.className = 'obj-chip-left';
      const ic = document.createElement('canvas');
      drawMiniFigureIcon(ic, o.figureId);
      const nm = document.createElement('span');
      nm.className = 'obj-name';
      nm.textContent = o.shortName || o.name;
      left.append(ic, nm);

      const txt = document.createElement('span');
      txt.className = 'obj-cnt';
      chip.append(left, txt);
      bar.appendChild(chip);
    });
  }

  collectObjs.forEach(function (o) {
    const chip = bar.querySelector('.obj-chip[data-fid="' + o.figureId + '"]');
    if (!chip) return;
    const got = Math.min(o.target, (round.collected && round.collected[o.figureId]) || 0);
    const done = got >= o.target;
    chip.classList.toggle('done', done);
    const txt = chip.querySelector('.obj-cnt');
    if (txt) txt.textContent = done ? ('✓ ' + o.target + '/' + o.target) : (got + ' / ' + o.target);
  });
}

function formatMMSS(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function updateRunClockHud() {
  const pill = $('runRiskTxt');
  if (!pill) return;
  const lvl = getActiveLevel();
  const blk = lvl ? lvl.block : 1;
  const diffName = lvl ? lvl.difficulty : 'Muy Fácil';
  pill.textContent = diffName;
  pill.className = 'run-risk-pill ' + (
    blk <= 2 ? 'easy' :
    blk <= 4 ? 'mid' :
    blk <= 7 ? 'hard' : 'danger'
  );
}

function renderHud() {
  const totalSc = (runState.totalScore || 0) + (round.score || 0);
  if ($('score')) $('score').textContent = fmt(totalSc);
  if ($('target')) {
    $('target').textContent = fmt(runState.nextMs || 1000);
  }
  if ($('moves')) $('moves').textContent = round.moves;

  const doneAll = isLevelCompleted();
  const pct = Math.round(getLevelProgressPct());
  const p = $('prog');
  if (p) {
    p.style.width = pct + '%';
    p.classList.toggle('done', doneAll);
  }

  const lvl = getActiveLevel();
  if ($('lvlBadgeTxt')) {
    $('lvlBadgeTxt').textContent = 'ETAPA ' + runState.stage + (lvl ? (' · NIVEL #' + lvl.id) : '');
  }
  if ($('roundLbl')) {
    if (lvl) {
      $('roundLbl').textContent = lvl.name;
    } else {
      $('roundLbl').textContent = 'Etapa ' + runState.stage;
    }
  }

  updateRunClockHud();
  renderObjectivesHud();

  const kind = SKILL_ORDER[(runState.nextMs / 1000 - 1) % 3];
  if ($('msTxt')) $('msTxt').textContent = 'Próximo hito ' + fmt(runState.nextMs) + ' · ganas ' + SKILL_NAME[kind];
  if ($('msBar')) $('msBar').style.width = ((totalSc % 1000) / 10) + '%';

  let hn = 0;
  if (board) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] && board[r][c].t === HEART) hn++;
      }
    }
  }

  if ($('loveTxt')) $('loveTxt').textContent = 'Cartas en juego: ' + hn + ' · junta 3 y explota TODO';
  if ($('goalTxt')) {
    const collectObjs = (round.objectives || []).filter(function (o) { return o.type === 'collect'; });
    if (doneAll) {
      $('goalTxt').textContent = '¡Etapa superada! (100%)';
    } else if (collectObjs.length > 0) {
      let gotTotal = 0, reqTotal = 0;
      collectObjs.forEach(function (o) {
        gotTotal += Math.min(o.target, (round.collected && round.collected[o.figureId]) || 0);
        reqTotal += o.target;
      });
      $('goalTxt').textContent = gotTotal + ' / ' + reqTotal + ' figuras (' + pct + '%)';
    } else {
      $('goalTxt').textContent = pct + '% · Faltan ' + fmt(Math.max(0, round.target - round.score)) + ' pts';
    }
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
      if (!t) continue;
      t.y = r - N - 1 - c * 0.15;
      t.vy = 0;
      t.fall = true;
    }
  }
}

/**
 * Inicia una Partida nueva (newRun = true) o avanza a la siguiente etapa sorteada
 * por probabilidad (%) dentro de la misma Partida (newRun = false).
 */
async function startRound(first, forcedLevelId, continueRun) {
  busy = true;
  ended = false;
  sel = null;
  $('ov').hidden = true;

  const isContinuing = Boolean(continueRun) && runState.active;
  if (!isContinuing) {
    // Nueva Partida desde Etapa 1
    runState = {
      active: true,
      stage: 1,
      stagesCleared: 0,
      totalScore: 0,
      totalTarget: 0,
      bonusCoins: 0,
      bonusElo: 0,
      startTime: Date.now(),
      nextMs: 1000,
      playedLevels: new Set(),
      defeatPct: 12,
      pressure: 0,
      activeWeights: null,
      activeHeartRate: null,
      activeMask: null
    };
    skills = { hammer: 1, bolt: 0, rainbow: 0 };
  }

  const rolled = rollLevelByProbability(runState.stage);
  if (typeof forcedLevelId === 'number') {
    curLevelId = Math.min(100, Math.max(0, forcedLevelId | 0));
  } else if (rolled.level) {
    curLevelId = rolled.level.id;
  } else {
    curLevelId = 0;
  }
  runState.playedLevels.add(curLevelId);
  runState.pressure = rolled.pressure;

  const lvl = getActiveLevel();
  const blk = lvl ? lvl.block : 1;
  const clearReward = DIFF_CLEAR_BONUS[blk] || DIFF_CLEAR_BONUS[1];

  // Variación dinámica de figuras y distribución por partida:
  // Permuta aleatoriamente las 6 figuras base (0..5) en cada etapa para que aunque toque
  // un mismo bloque o nivel en otra partida, las figuras pedidas y el tablero cambien.
  const figPerm = [0, 1, 2, 3, 4, 5];
  for (let i = figPerm.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = figPerm[i]; figPerm[i] = figPerm[j]; figPerm[j] = tmp;
  }

  const stageMoves = lvl ? lvl.moves : MOVES;
  const stageObjectives = (lvl && lvl.objectives ? lvl.objectives : []).map(function (o) {
    if (o.type === 'collect' && o.figureId >= 0 && o.figureId < 6 && typeof forcedLevelId !== 'number') {
      const newFid = figPerm[o.figureId];
      const fMeta = window.GOMI_FIGURES && window.GOMI_FIGURES[newFid];
      return {
        type: 'collect',
        figureId: newFid,
        key: fMeta ? fMeta.key : o.key,
        name: fMeta ? fMeta.name : o.name,
        shortName: fMeta ? fMeta.shortName : o.shortName,
        target: o.target
      };
    }
    return Object.assign({}, o);
  });

  // Permutar también los pesos correspondientes a las figuras permutadas
  const rawW = (lvl && Array.isArray(lvl.weights)) ? lvl.weights : [1, 1, 1, 1, 1, 1];
  const permW = [1, 1, 1, 1, 1, 1];
  for (let i = 0; i < 6; i++) {
    permW[figPerm[i]] = rawW[i];
  }
  runState.activeWeights = typeof forcedLevelId === 'number' ? rawW.slice() : permW;
  runState.activeHeartRate = lvl ? lvl.heartRate : 0.03;
  runState.activeMask = lvl ? lvl.mask : null;

  const scoreObj = stageObjectives.find(function (o) { return o.type === 'score'; });
  const minScore = scoreObj ? scoreObj.target : 0;
  const tg = minScore > 0 ? minScore : (lvl ? 1000 + lvl.id * 80 : 1200);

  round = {
    levelId: lvl ? lvl.id : 0,
    levelName: lvl ? lvl.name : ('Etapa ' + runState.stage),
    difficulty: lvl ? lvl.difficulty : 'Medio',
    block: blk,
    clearBonusPts: clearReward.pts,
    clearBonusCoins: clearReward.coins,
    clearBonusElo: clearReward.elo,
    rollPct: rolled.rollPct || 25,
    score: 0,
    moves: stageMoves,
    minScore: minScore,
    target: tg,
    base: tg,
    no: runState.stage,
    objectives: stageObjectives.length ? stageObjectives : [{ type: 'score', target: tg }],
    collected: [0, 0, 0, 0, 0, 0, 0],
    reached: false,
    used: 0,
    lossMult: 1,
    nextMs: runState.nextMs,
    startTime: Date.now()
  };

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
  const totalSc = (runState.totalScore || 0) + (round.score || 0);
  while (totalSc >= runState.nextMs) {
    const idx = runState.nextMs / 1000, kind = SKILL_ORDER[(idx - 1) % 3];
    skills[kind]++;
    runState.nextMs += 1000;
    round.nextMs = runState.nextMs;
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
  if (!cellOf(board, i) || !cellOf(board, j)) return;
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
  const tile = cellOf(board, i);
  if (!tile) return;
  busy = true;
  sel = null;
  skillMode = null;
  skills[k]--;
  renderSkills();

  const r = (i / N) | 0, c = i % N, set = new Set([i]);
  const cx = px(c), cy = px(r);

  if (k === 'hammer') {
    hammers.push({ x: cx, y: cy, age: 0 });
    sfx.hammerWind();
    await wait(270);
    for (let x = 0; x < N; x++) {
      if (cellOf(board, r * N + x)) set.add(r * N + x);
      if (cellOf(board, x * N + c)) set.add(x * N + c);
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
        if (q[0] >= 0 && q[0] < N && q[1] >= 0 && q[1] < N && cellOf(board, q[0] * N + q[1])) {
          set.add(q[0] * N + q[1]);
        }
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
      if (t && t.t >= 0 && t.t <= 6 && round.collected) {
        round.collected[t.t] = (round.collected[t.t] || 0) + 1;
      }
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

    if (!round.reached && isLevelCompleted()) {
      round.reached = true;
      toast('¡Objetivos del nivel superados! Sigue sumando');
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

  // Si completó todos los objetivos de la etapa actual, gana el bono de puntos según la dificultad superada y pasa a la siguiente etapa
  if (isLevelCompleted()) {
    const blk = round.block || (getActiveLevel() ? getActiveLevel().block : 1);
    const diffBonus = DIFF_CLEAR_BONUS[blk] || DIFF_CLEAR_BONUS[1];
    const movesBonus = Math.max(0, round.moves) * 40;
    const stageClearPts = diffBonus.pts + movesBonus;

    round.score += stageClearPts;
    runState.totalScore += round.score;
    runState.totalTarget += round.target;
    runState.bonusCoins = (runState.bonusCoins || 0) + diffBonus.coins;
    runState.bonusElo = (runState.bonusElo || 0) + diffBonus.elo;
    runState.stagesCleared++;
    runState.stage++;
    roundNo++;
    checkMilestones();
    renderHud();
    save();

    floats.push({
      x: S / 2,
      y: S * 0.44,
      text: '¡' + diffBonus.label.toUpperCase() + ' SUPERADO!',
      col: '#4FD58F',
      age: 0,
      size: 0.85,
      big: true
    });
    floats.push({
      x: S / 2,
      y: S * 0.56,
      text: '+' + fmt(stageClearPts) + ' PTS  (+' + diffBonus.coins + ' Oro · +' + diffBonus.elo + ' ELO)',
      col: '#FFD066',
      age: 0,
      size: 0.52,
      big: true
    });
    toast('¡Superaste ' + diffBonus.label + '! +' + fmt(stageClearPts) + ' pts · +' + diffBonus.coins + ' Oro · +' + diffBonus.elo + ' ELO');
    await wait(950);
    await startRound(false, undefined, true);
    return;
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
   10. FIN DE LA PARTIDA (AL MORIR) Y ENTREGA DE RECOMPENSAS (ORO Y ELO)
   ============================================================================ */
function roundOver() {
  // En modo Partida, al quedarse sin movimientos sin completar la etapa el jugador muere y cobra sus recompensas
  endRound();
}

function showLastChance() {
  busy = true;
  const nt = round.minScore > 0 ? Math.round((round.target + round.base * 0.15) / 10) * 10 : round.target;
  const mult = 1 + 0.5 * (round.used + 1), extra = round.used === 0 ? 5 : 4;
  lc = { nt: nt, mult: mult, extra: extra };
  $('lcText').textContent = 'Aún faltan objetivos del Nivel ' + round.levelId + '. Te doy movimientos extra para completarlo.';
  $('lcMoves').textContent = '+' + extra;
  $('lcTarget').textContent = round.minScore > 0 ? fmt(nt) : 'Completar';
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
  if (round.objectives) {
    round.objectives.forEach(function (o) {
      if (o.type === 'score') o.target = lc.nt;
    });
  }
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
  runState.active = false;

  const totalRunScore = (runState.totalScore || 0) + (round.score || 0);
  const totalRunTarget = Math.max(1000, (runState.totalTarget || 0) + (round.target || 1000));
  const stagesCleared = runState.stagesCleared || 0;
  const durationMs = runState.startTime ? (Date.now() - runState.startTime) : 60000;
  const survivedGood = stagesCleared >= 1 || totalRunScore >= 1200;

  const before = rp, L0 = levelOf(rp);
  streak = survivedGood ? (streak + 1) : 0;
  roundNo++;

  // Calcular y enviar recompensas de la Partida al morir (incluyendo el Oro y ELO ganados por cada dificultad superada)
  const baseReward = window.enviarRecompensaGomi ? window.enviarRecompensaGomi({
    score: totalRunScore,
    target: totalRunTarget,
    win: survivedGood,
    streak: Math.max(streak, stagesCleared),
    round: curLevelId + 1,
    stagesCleared: stagesCleared,
    bonusCoins: runState.bonusCoins || 0,
    bonusElo: runState.bonusElo || 0,
    durationMs: durationMs
  }) : { earnedCoins: Math.max(1, (runState.bonusCoins || 0) + 1), lpAward: (runState.bonusElo || 0) };

  const earnedCoins = baseReward.earnedCoins;
  const lpAward = baseReward.lpAward;

  // Actualizar ELO / RP local sumando el bono acumulado por las dificultades superadas
  const rpDelta = survivedGood
    ? Math.max(4, lpAward)
    : -Math.min(20, Math.max(4, 12 - Math.floor(totalRunScore / 200)));
  rp = Math.max(0, rp + rpDelta);
  peak = Math.max(peak, rp);
  const L1 = levelOf(rp);
  const real = rp - before;

  hist.unshift({
    no: roundNo,
    score: totalRunScore,
    target: totalRunTarget,
    d: real
  });
  hist = hist.slice(0, 8);

  const title = stagesCleared >= 4
    ? '¡Partida Épica Finalizada!'
    : stagesCleared >= 1
      ? '¡Fin de la Partida!'
      : '¡Has Caído en la Etapa 1!';

  $('ovTitle').textContent = title;
  const dl = $('ovDelta');
  dl.textContent = '+' + earnedCoins + ' Oro  •  ' + (real >= 0 ? '+' : '−') + Math.abs(real) + ' ELO (LP)';
  dl.className = 'delta ' + (real >= 0 ? 'up' : 'down');
  $('ovLine').textContent =
    'Sobreviviste ' + formatMMSS(durationMs) +
    ' · ' + stagesCleared + (stagesCleared === 1 ? ' etapa superada' : ' etapas superadas') +
    ' · ' + fmt(totalRunScore) + ' pts totales (caíste en B' + (getActiveLevel() ? getActiveLevel().block : 1) + ' · ' + round.difficulty + ')';
  $('ovRank').textContent = 'Rango ELO: ' + rankOf(rp).name + ' (' + fmt(rp) + ' LP)';
  $('nextBtn').textContent = 'Jugar nueva partida';
  $('resCard').hidden = false;
  $('lcCard').hidden = true;
  $('ov').hidden = false;
  save();
  renderRank();

  if (survivedGood) {
    sfx.win(L1 > L0);
    confettiRain(L1 > L0 ? 220 : 120);
    flashFx('255,209,102', 0.65);
  } else {
    sfx.lose(rp === 0 && before > 0);
    shake = Math.max(shake, 12);
    flashFx('255,60,90', 0.6);
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
  if (c < 0 || c >= N || r < 0 || r >= N) return -1;
  if (!isMaskOpen(r, c)) return -1;
  return r * N + c;
}

function adjacent(a, b) {
  const ra = (a / N) | 0, ca = a % N, rb = (b / N) | 0, cb = b % N;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

cv.addEventListener('pointerdown', function (e) {
  ac();
  if (busy || ended) return;
  idleTime = 0;
  hintIds = null;
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
  startRound(false, undefined, false);
});

/* ============================================================================
   11.B INTERFAZ DE ADMINISTRACIÓN Y VISUALIZACIÓN DE LOS 101 NIVELES
   ============================================================================ */
let adminSelectedLvl = 0, adminBlockFilter = 0, adminValidationCache = null;

function drawLevelBoardPreview(level) {
  const pcv = $('lvlPreviewCv');
  if (!pcv || !level) return;
  const size = 180, dpr0 = window.devicePixelRatio || 1;
  pcv.width = size * dpr0;
  pcv.height = size * dpr0;
  pcv.style.width = size + 'px';
  pcv.style.height = size + 'px';
  const c = pcv.getContext('2d');
  c.scale(dpr0, dpr0);

  c.clearRect(0, 0, size, size);
  rr(c, 0, 0, size, size, 12);
  c.fillStyle = C.board || '#2B2044';
  c.fill();

  const pPad = 5, pCell = (size - pPad * 2) / N;
  const sim = window.GOMI_VALIDATOR ? window.GOMI_VALIDATOR.simulateLevelBoard(level, level.id * 997 + 77) : null;
  const simBoard = sim && sim.board;

  for (let r = 0; r < N; r++) {
    for (let col = 0; col < N; col++) {
      const open = level.mask && level.mask[r] ? Boolean(level.mask[r][col]) : true;
      const x = pPad + col * pCell, y = pPad + r * pCell;
      if (!open) {
        rr(c, x + 1.5, y + 1.5, pCell - 3, pCell - 3, 4);
        c.fillStyle = 'rgba(8, 3, 18, 0.65)';
        c.fill();
        continue;
      }
      if ((r + col) % 2) {
        rr(c, x + 1, y + 1, pCell - 2, pCell - 2, 4);
        c.fillStyle = C.board2 || '#34274F';
        c.fill();
      }
      const tile = simBoard && simBoard[r] && simBoard[r][col];
      if (tile && tile.t >= 0) {
        const fig = window.GOMI_FIGURES && window.GOMI_FIGURES[tile.t];
        if (fig && typeof window[fig.dFn] === 'function') {
          c.save();
          c.translate(x + pCell / 2, y + pCell / 2);
          c.scale(pCell * 0.42, pCell * 0.42);
          window[fig.dFn](c, PAL[tile.t] || PAL[0], false);
          c.restore();
        }
      }
    }
  }
}

function selectAdminLevel(id) {
  if (!window.GOMI_LEVELS) return;
  adminSelectedLvl = Math.min(100, Math.max(0, id | 0));
  const lvl = window.GOMI_LEVELS[adminSelectedLvl];
  if (!lvl) return;

  const val = adminValidationCache && adminValidationCache.details
    ? adminValidationCache.details[adminSelectedLvl]
    : (window.GOMI_VALIDATOR ? window.GOMI_VALIDATOR.validateLevel(lvl) : { ok: true, activeCells: 64, initialValidMoves: 6 });

  if ($('admLvlTitle')) $('admLvlTitle').textContent = 'Nivel ' + lvl.id + ' · ' + lvl.name;
  if ($('admLvlSub')) $('admLvlSub').textContent = 'Bloque ' + lvl.block + ' · ' + lvl.difficulty + ' · Tablero: ' + lvl.layoutName + ' (' + val.activeCells + ' celdas)';
  if ($('admLvlDesc')) $('admLvlDesc').textContent = lvl.description || '';
  if ($('admLvlMoves')) $('admLvlMoves').textContent = lvl.moves + ' movimientos';
  if ($('admLvlScore')) $('admLvlScore').textContent = lvl.minScore > 0 ? (fmt(lvl.minScore) + ' pts') : 'Sin mínimo fijo';
  if ($('admLvlVal')) {
    $('admLvlVal').textContent = val.ok ? ('✓ Válido (' + val.initialValidMoves + ' jugadas)') : ('⚠ ' + val.errors.join(', '));
    $('admLvlVal').className = 'adm-val ' + (val.ok ? 'ok' : 'err');
  }
  if ($('playSelectedLvlBtn')) {
    $('playSelectedLvlBtn').textContent = '▶ Jugar Nivel ' + lvl.id;
  }

  const figsWrap = $('admLvlFigs');
  if (figsWrap) {
    figsWrap.innerHTML = '';
    if (!lvl.requiredFigures.length) {
      const sp = document.createElement('span');
      sp.className = 'adm-empty-fig';
      sp.textContent = 'Objetivo libre de figuras (solo alcanzar la puntuación mínima)';
      figsWrap.appendChild(sp);
    } else {
      lvl.requiredFigures.forEach(function (rf) {
        const tag = document.createElement('div');
        tag.className = 'adm-fig-tag';
        const cvI = document.createElement('canvas');
        drawMiniFigureIcon(cvI, rf.figureId);
        const lb = document.createElement('span');
        lb.textContent = rf.count + ' × ' + rf.name;
        tag.append(cvI, lb);
        figsWrap.appendChild(tag);
      });
    }
  }

  drawLevelBoardPreview(lvl);

  const list = $('admLvlList');
  if (list) {
    list.querySelectorAll('.adm-row').forEach(function (el) {
      const isAct = Number(el.dataset.id) === adminSelectedLvl;
      el.classList.toggle('active', isAct);
    });
  }
}

function renderAdminModal() {
  if (!window.GOMI_LEVELS) return;
  if (!adminValidationCache && window.GOMI_VALIDATOR) {
    adminValidationCache = window.GOMI_VALIDATOR.validateAllLevels();
  }
  if ($('admSummary') && adminValidationCache) {
    $('admSummary').textContent = '✓ ' + adminValidationCache.passed + '/' + adminValidationCache.total + ' niveles validados · 10 bloques de dificultad · 7 figuras activas';
  }

  const filterWrap = $('admBlocks');
  if (filterWrap && !filterWrap.children.length) {
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'adm-blk-btn on';
    allBtn.dataset.blk = '0';
    allBtn.textContent = 'Todos (0–100)';
    filterWrap.appendChild(allBtn);

    (window.GOMI_BLOCKS || []).forEach(function (b) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'adm-blk-btn';
      btn.dataset.blk = String(b.block);
      btn.title = 'Niveles ' + b.range[0] + ' al ' + b.range[1] + ' · ' + b.difficulty;
      btn.textContent = 'B' + b.block + ' · ' + b.difficulty + ' (' + b.range[0] + '-' + b.range[1] + ')';
      filterWrap.appendChild(btn);
    });

    filterWrap.addEventListener('click', function (e) {
      const btn = e.target.closest('.adm-blk-btn');
      if (!btn) return;
      adminBlockFilter = Number(btn.dataset.blk) || 0;
      filterWrap.querySelectorAll('.adm-blk-btn').forEach(function (el) {
        el.classList.toggle('on', el === btn);
      });
      renderAdminList();
    });
  }

  renderAdminList();
  selectAdminLevel(curLevelId);
  const activeRow = $('admLvlList') && $('admLvlList').querySelector('.adm-row.active');
  if (activeRow) {
    try { activeRow.scrollIntoView({ block: 'nearest' }); } catch (e) { }
  }
}

function renderAdminList() {
  const list = $('admLvlList');
  if (!list || !window.GOMI_LEVELS) return;
  list.innerHTML = '';

  window.GOMI_LEVELS.forEach(function (lvl) {
    if (adminBlockFilter > 0 && lvl.block !== adminBlockFilter) return;
    const val = adminValidationCache && adminValidationCache.details ? adminValidationCache.details[lvl.id] : { ok: true };
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'adm-row' + (lvl.id === adminSelectedLvl ? ' active' : '');
    row.dataset.id = String(lvl.id);

    const num = document.createElement('span');
    num.className = 'adm-no';
    num.textContent = '#' + lvl.id;

    const info = document.createElement('div');
    info.className = 'adm-info';
    const nm = document.createElement('b');
    nm.textContent = lvl.name;
    const meta = document.createElement('small');
    const objSummary = lvl.objectives.map(function (o) {
      return o.type === 'score' ? (fmt(o.target) + ' pts') : (o.target + ' ' + o.shortName);
    }).join(' · ');
    meta.textContent = lvl.difficulty + ' · ' + lvl.moves + ' movs · ' + objSummary;
    info.append(nm, meta);

    const st = document.createElement('span');
    st.className = 'adm-st ' + (val.ok ? 'ok' : 'err');
    st.textContent = val.ok ? '✓' : '!';

    row.append(num, info, st);
    row.addEventListener('click', function () {
      selectAdminLevel(lvl.id);
    });
    list.appendChild(row);
  });
}

function toggleLevelsModal(show) {
  const m = $('lvlModal');
  if (!m) return;
  const next = typeof show === 'boolean' ? show : m.hidden;
  m.hidden = !next;
  if (next) renderAdminModal();
}

if ($('openLevelsBtn')) {
  $('openLevelsBtn').addEventListener('click', function () {
    ac();
    sfx.click();
    toggleLevelsModal(true);
  });
}
if ($('closeLevelsBtn')) {
  $('closeLevelsBtn').addEventListener('click', function () {
    toggleLevelsModal(false);
  });
}
if ($('playSelectedLvlBtn')) {
  $('playSelectedLvlBtn').addEventListener('click', function () {
    ac();
    sfx.click();
    toggleLevelsModal(false);
    startRound(false, adminSelectedLvl);
  });
}

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
