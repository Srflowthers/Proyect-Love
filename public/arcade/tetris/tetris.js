/**
 * ============================================================================
 * TETRIS DE PAREJA - ARCADE DEL AMOR (LÓGICA DEL JUEGO)
 * ============================================================================
 * Tetris cooperativo para dos jugadores por turnos (Ella & Él).
 * Incluye física de remolinos gravitatorios, explosiones por coincidencia de color,
 * música y efectos sintetizados en tiempo real (Web Audio API), habilidad de
 * última salvación y aceleración dinámica a 60 FPS.
 */

/* ============================================================================
   1. CONFIGURACIÓN EDITABLE (CFG)
   ============================================================================ */
const CFG = {
  /* ---- DISEÑO ---- */
  colorElla: '#e8467c',      // Rosa: turno de Ella (contorno, brillo)
  colorEl: '#3b82f6',        // Azul: turno de Él
  colores: ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444'], // 5 colores: cian, amarillo, morado, verde, rojo
  nombresColores: ['Cian', 'Amarillo', 'Morado', 'Verde', 'Rojo'],
  colorBasura: '#64748b',    // Color de los bloques grises (filas basura)
  radioBloque: 6,            // Forma del bloque: bordes redondeados
  brilloBloque: true,        // Franjita blanca de brillo
  puntoDueno: true,          // Puntito blanco que marca quién puso cada bloque

  /* ---- VELOCIDAD Y DIFICULTAD (casillas por segundo) ---- */
  velInicial: 2.5,           // Velocidad inicial
  velFinal: 20,              // Velocidad a alcanzar en ptsLocura
  ptsLocura: 12000,          // Puntos para alcanzar velFinal
  velMax: 30,                // Tope absoluto de velocidad
  basuraCada: 4,             // Cada cuántas caídas sube una fila gris
  grisesIniciales: 4,        // Cuadrados grises iniciales

  /* ---- EVENTOS ---- */
  remolinoCada: 3,           // Cada cuántas caídas hay remolino
  megaCada: 10,              // Cada cuántas caídas hay super remolino invertido

  /* ---- PUNTOS Y HABILIDAD ---- */
  puntosLinea: [0, 150, 450, 750, 1200], // Puntos por 0, 1, 2, 3, 4 líneas
  puntosReventon: 15,        // Puntos por cada bloque que revienta
  salvacionBase: 1000,       // Puntos para cargar la 1ª salvación
  salvacionTope: 8000        // Coste máximo de recarga
};

{
  const st = document.documentElement.style;
  st.setProperty('--her', CFG.colorElla);
  st.setProperty('--him', CFG.colorEl);
}

/* ============================================================================
   2. CONSTANTES DEL TABLERO Y FIGURAS TETROMINÓS
   ============================================================================ */
const C = 30; // Tamaño de celda en píxeles
const W = 10; // Ancho del tablero (columnas)
const H = 20; // Alto del tablero (filas)

const $ = id => document.getElementById(id);
const cv = $('c');
const x = cv.getContext('2d');

const SH = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const KS = Object.keys(SH);
const NAMES = ['Ella', 'Él'];
const COL = [CFG.colorElla, CFG.colorEl];
const ICO = ['💗', '💙'];
const PAL = [...CFG.colores, CFG.colorBasura];
const CN = CFG.nombresColores;

const SPIN = 6 * Math.PI, TURN = 7 * Math.PI, DUR = 900;
const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());

/* ============================================================================
   3. ESTADO DEL JUEGO
   ============================================================================ */
let g, p, turn, sc, ln;
let run = false, over = false, busy = false, soft = false;
let now = 0, last = 0, spinT = -1e9, spinC = [5, 10];
let fN = 0, fT = 0, aS = 0, aE = 0, orient = 0, parts = [];
let AC = null, mute = false, lc = 0, epic = false, curDur = 900;
let marked = new Set(), rings = [], msg = '', msgC = '#fff', msgT = 0;
let playT = 0, tier = 0, lastSec = -1, gi, anim = null, animT = 0, pid = 0;
let canimDur = 900, lineFx = null, mega = false, canim = null, canimT = 0;
let rb0 = 0, flipMsg = false, saving = false, skBase = 0, skCost = CFG.salvacionBase;
let skReady = false, skUses = 0, saveFx = null, tl = 0, NB = null, mt = 0, ms = 0;
let GA = 1, shk = 0, lastHitSnd = 0;
let ANIM = 2400;

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ============================================================================
   4. SÍNTESIS DE AUDIO (WEB AUDIO API)
   ============================================================================ */
function snd(f, d, ty, v, to) {
  if (!AC || mute) return;
  const t = AC.currentTime, o = AC.createOscillator(), gn = AC.createGain();
  o.type = ty || 'sine';
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  gn.gain.setValueAtTime(v || 0.15, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(gn);
  gn.connect(AC.destination);
  o.start(t);
  o.stop(t + d);
}

function nz(d, f0, f1, v) {
  if (!AC || mute) return;
  if (!NB) {
    NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const a = NB.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  }
  const t = AC.currentTime, sr = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
  sr.buffer = NB;
  sr.loop = true;
  f.type = 'bandpass';
  f.Q.value = 1.5;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + d);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(v, t + d * 0.3);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  sr.connect(f);
  f.connect(gn);
  gn.connect(AC.destination);
  sr.start(t);
  sr.stop(t + d + 0.05);
}

const PR = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const mf = n => 440 * Math.pow(2, (n - 69) / 12);

function musicStart() {
  clearTimeout(mt);
  ms = 0;
  mtick();
}

function mtick() {
  if (!run) return;
  const bpm = 116 + Math.min(tier, 10) * 8;
  const st = 60 / bpm / 4;
  const ch = PR[(ms >> 4) & 3];
  const i = ms % 16;

  if (i % 4 === 0) snd(mf(ch[0] - 24), st * 3.5, 'sawtooth', 0.06, mf(ch[0] - 24) * 0.98);
  if (i % 8 === 0) snd(130, 0.16, 'sine', 0.3, 40);
  if (i % 8 === 4) nz(0.12, 1500, 3000, 0.12);
  if (i % 2 === 1) nz(0.04, 6000, 9000, 0.04);
  snd(mf(ch[ms % 3] + (i & 4 ? 24 : 12)), st * 1.6, 'triangle', 0.05);
  if (tier >= 2 && i % 8 === 0) snd(mf(ch[2] + 24), st * 6, 'square', 0.025);

  ms++;
  mt = setTimeout(mtick, st * 1000);
}

/* ============================================================================
   5. EFECTOS VISUALES, PARTÍCULAS Y VIBRACIÓN
   ============================================================================ */
function flipCss() {
  let deg = orient * 180, k = 1;
  if (anim && mega) {
    const e = ease(Math.min(1, (now - animT) / ANIM / 0.75));
    deg = rb0 + 900 * e;
    k = 1 - 0.45 * Math.sin(Math.PI * e);
  }
  cv.style.transform = 'rotate(' + deg + 'deg) scale(' + k + ')';
}

function tilt() {
  const w = cv.parentNode;
  if (anim) {
    const t = Math.min(1, (now - animT) / ANIM);
    const sn = Math.sin(Math.PI * t);
    w.style.transform = 'perspective(800px) rotateX(' + sn * 14 + 'deg) rotateZ(' + Math.sin(t * 12.566) * 3 * sn + 'deg) scale(' + (1 + 0.06 * sn) + ')';
    tl = 1;
  } else if (shk > 0.3) {
    w.style.transform = 'translate(' + Math.sin(now / 22) * shk * 0.5 + 'px,' + Math.sin(now / 17) * shk * 0.4 + 'px) rotate(' + Math.sin(now / 31) * shk * 0.07 + 'deg)';
    tl = 1;
  } else if (tl) {
    w.style.transform = '';
    tl = 0;
  }
}

function dust(S) {
  p.m[0].forEach((_, c) => {
    let r = p.m.length - 1;
    while (r >= 0 && !p.m[r][c]) r--;
    if (r < 0) return;
    for (let i = 0; i < 4 * S; i++) {
      parts.push({
        x: (p.x + c + 0.5) * C + (Math.random() - 0.5) * C,
        y: (p.y + r + 1) * C,
        vx: (Math.random() - 0.5) * 170 * S,
        vy: -Math.random() * 80,
        l: 1,
        c: '#d9cbbd'
      });
    }
  });
}

function toast(t, c) {
  msg = t;
  msgC = c;
  msgT = now + 1500;
}

function burst(px, py, col, n, v) {
  for (let i = 0; i < n; i++) {
    const an = Math.random() * 6.283;
    const sp = v * 0.25 + Math.random() * v;
    parts.push({
      x: px,
      y: py,
      vx: Math.cos(an) * sp,
      vy: Math.sin(an) * sp,
      l: 1,
      c: i % 3 ? col : '#fff'
    });
  }
}

/* ============================================================================
   6. REGLAS BÁSICAS Y COLISIONES
   ============================================================================ */
function fits(m, px, py) {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (m[r][c]) {
        const a = px + c, b = py + r;
        if (a < 0 || a >= W || b >= H || (b >= 0 && g[b][a] !== null)) return false;
      }
    }
  }
  return true;
}

function reset() {
  cv.parentNode.classList.remove('warn');
  skBase = 0;
  skCost = CFG.salvacionBase;
  skUses = 0;
  skReady = false;
  saving = false;
  saveFx = null;
  lineFx = null;
  aS = aE = 0;
  orient = 0;
  parts = [];
  rings = [];
  marked = new Set();
  lc = 0;
  epic = false;
  mega = false;
  canim = null;
  playT = 0;
  tier = 0;
  lastSec = -1;
  anim = null;
  g = Array.from({ length: H }, () => Array(W).fill(null));
  gi = Array.from({ length: H }, () => Array(W).fill(null));
  sc = [0, 0];
  ln = [0, 0];
  turn = 0;
  over = false;
  busy = false;
  initGray();
  spawn();
  ui();
}

function spawn() {
  const k = KS[Math.random() * KS.length | 0];
  const m = SH[k];
  const px = (W - m[0].length) / 2 | 0;
  p = { m, k, id: ++pid, col: Math.random() * 5 | 0, x: px, vx: px, y: 0, f: 0, hard: false };
  if (!fits(p.m, p.x, p.y)) {
    if (!(saveReady() && fireSave(true, spawn))) end();
  }
  ui();
}

let maxScore = 0;
try { maxScore = parseInt(localStorage.getItem('tetris_max_score') || '0', 10) || 0; } catch (e) {}

function end() {
  over = true;
  run = false;
  const tot = sc[0] + sc[1];
  if (tot > maxScore) {
    maxScore = tot;
    try { localStorage.setItem('tetris_max_score', maxScore); } catch (e) {}
  }
  const isNewRec = tot >= maxScore && tot > 0;

  // Calibración horaria equivalente a Rompecabezas (~450-550 LP / hora y ~100-130 monedas / hora):
  // 1.500 - 3.500 pts (~2-3 min): 20 - 30 LP · 6 - 9 monedas
  // 3.500 - 7.000 pts (~5-7 min): 45 - 65 LP · 14 - 18 monedas
  // 7.000 - 12.000 pts (~8-12 min, como 9k): 85 - 120 LP · 22 - 32 monedas
  // 12.000+ pts (15+ min): 140 - 200 LP · 38 - 50 monedas
  const durationMs = tetrisSessionStartTime ? (Date.now() - tetrisSessionStartTime) : Math.max(60000, Math.round(tot * 15));
  const minutes = Math.min(durationMs / 60000, 30); // Cap de 30 min anti-AFK

  // Rescate y envío desacoplado de monedas y LP (ver reward-config.js)
  const { earnedCoins, lpAward: lpEarned } = window.enviarRecompensaTetris ? window.enviarRecompensaTetris({
    score: tot,
    durationMs: durationMs
  }) : { earnedCoins: 2, lpAward: 5 };

  $('ovt').innerHTML = 'Fin de la partida<br><span style="font-size:1.4rem;font-weight:800;color:#f43f5e;margin-top:4px;display:block;">Puntaje: ' +
    tot.toLocaleString('es') + '</span><span style="font-size:0.95rem;color:#fbbf24;margin-top:3px;display:block;">Récord: ' +
    maxScore.toLocaleString('es') + (isNewRec ? ' (¡Nuevo récord!)' : '') + '</span>' +
    '<div style="margin-top:8px;font-size:1rem;color:#facc15;font-weight:700;">+' + earnedCoins + ' monedas ganadas</div>';
  $('start').textContent = 'Jugar de nuevo';
  $('start').style.display = 'block';
  if ($('mode-options')) $('mode-options').style.display = 'none';
  $('ov').style.display = 'flex';
  const recEl = $('sc-record');
  if (recEl) recEl.textContent = maxScore.toLocaleString('es');
}

function level() {
  return 1 + ((ln[0] + ln[1]) / 10 | 0);
}

function ui() {
  const btnDown = document.querySelector('[data-a=D]');
  if (btnDown) btnDown.textContent = orient ? '▲' : '▼';

  const tot = sc[0] + sc[1];
  if (tot > maxScore) {
    maxScore = tot;
    try { localStorage.setItem('tetris_max_score', maxScore); } catch (e) {}
  }

  const recEl = $('sc-record');
  if (recEl) recEl.textContent = maxScore.toLocaleString('es');
  const totEl = $('sc-total');
  if (totEl) totEl.textContent = tot.toLocaleString('es');
  const lnEl = $('sc-lines');
  if (lnEl) lnEl.textContent = (ln[0] + ln[1]) + ' líneas';
  const lvEl = $('sc-level');
  if (lvEl) lvEl.textContent = 'Nivel ' + level();
  const spEl = $('sc-speed');
  if (spEl) spEl.textContent = '⚡ Vel ' + (tier + 1);

  const ch = Math.min(1, Math.max(0, (tot - skBase) / skCost));
  $('skf').style.width = (ch * 100) + '%';
  $('sk').classList.toggle('ready', ch >= 1);
  $('sku').disabled = !(ch >= 1 && run && !over);
  $('skt').textContent = ch >= 1 ? '¡LISTA! (tecla E o botón)' : Math.max(0, tot - skBase) + ' / ' + skCost + ' pts';

  if (ch >= 1 && !skReady) {
    skReady = true;
    if (run) {
      toast('🛟 ¡Salvación lista! Pulsa E', '#facc15');
      snd(880, 0.2, 'triangle', 0.12, 1320);
    }
  }

  const de = document.documentElement.style;
  de.setProperty('--glow', '#f43f5e');
  de.setProperty('--gb', (22 + tier * 6) + 'px');
  if ($('banner')) $('banner').style.display = 'none';

  for (const i of [0, 1]) {
    if ($('s' + i)) $('s' + i).textContent = sc[i];
    if ($('l' + i)) $('l' + i).textContent = ln[i] + ' líneas';
  }
  if ($('st')) $('st').textContent = tot;
  if ($('lv')) $('lv').textContent = 'Nivel ' + level();
  if ($('sp')) $('sp').textContent = '⚡ Vel ' + (tier + 1);
}

function kick(nm) {
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0]]) {
    if (fits(nm, p.x + dx, p.y + dy)) {
      p.m = nm;
      p.x += dx;
      p.y += dy;
      return true;
    }
  }
  return false;
}

function land() {
  if (busy) return;
  busy = true;
  p.f = 0;
  p.vx = p.x;
  lc++;
  mega = lc % CFG.megaCada === 0;
  epic = mega || lc % CFG.remolinoCada === 0;
  curDur = 340;
  spinT = now;
  spinC = [p.x + p.m[0].length / 2, p.y + p.m.length / 2];

  const S = Math.min(2.2, (p.hard ? 1.7 : 1) * (1 + Math.min(p.v || 0, 25) * 0.02));
  shk = Math.max(shk, 9 * S);
  snd(62, 0.7, 'sine', 0.65, 26);
  snd(42, 1, 'sawtooth', 0.1 * Math.min(S, 1.6), 28);
  nz(0.55, 500, 70, 0.4 * Math.min(S, 1.6));
  burst(spinC[0] * C, spinC[1] * C, PAL[p.col], 14, 150);
  dust(S);
  setTimeout(lock, curDur * 0.9);
  ui();
}

/* ============================================================================
   7. REVENTÓN POR COLOR Y CADENAS
   ============================================================================ */
function sameGroup(pc) {
  const k = (r, c) => r * W + c;
  const inP = new Set(pc.map(a => k(a[0], a[1])));
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const nb = (r, c) => D.map(d => [r + d[0], c + d[1]]).filter(a => a[0] >= 0 && a[0] < H && a[1] >= 0 && a[1] < W);
  const sm = b => ((g[b[0]][b[1]] ?? -2) >> 1) === p.col;

  if (!pc.some(a => nb(a[0], a[1]).some(b => sm(b) && !inP.has(k(b[0], b[1]))))) return [];
  const seen = new Set(), st = pc.slice(), out = [];
  while (st.length) {
    const a = st.pop(), id = k(a[0], a[1]);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(a);
    nb(a[0], a[1]).forEach(b => {
      if (sm(b) && !seen.has(k(b[0], b[1]))) st.push(b);
    });
  }
  return out;
}

function lock() {
  p.done = true;
  const pc = [];
  p.m.forEach((row, r) => row.forEach((v, c) => {
    if (v && p.y + r >= 0) {
      g[p.y + r][p.x + c] = p.col * 2 + turn;
      gi[p.y + r][p.x + c] = p.id;
      pc.push([p.y + r, p.x + c]);
    }
  }));

  const grp = sameGroup(pc);
  if (!grp.length) {
    settle(false);
    return;
  }

  const q = spinC;
  const d = a => Math.hypot(a[1] + 0.5 - q[0], a[0] + 0.5 - q[1]);
  grp.sort((a, b) => d(a) - d(b));
  marked = new Set(grp.map(a => a[0] * W + a[1]));
  toast('💥 ¡' + CN[p.col] + ' con ' + CN[p.col].toLowerCase() + '! ×' + grp.length, PAL[p.col]);
  snd(300, 0.3, 'square', 0.08, 900);

  let i = 0;
  const step = () => {
    if (i >= grp.length) {
      marked.clear();
      setTimeout(() => settle(true), 220);
      return;
    }
    const r = grp[i][0], c = grp[i][1];
    g[r][c] = null;
    gi[r][c] = null;
    marked.delete(r * W + c);
    burst((c + 0.5) * C, (r + 0.5) * C, PAL[p.col], 16, 200);
    rings.push({ x: (c + 0.5) * C, y: (r + 0.5) * C, l: 1, c: PAL[p.col] });
    snd(420 + Math.min(i, 14) * 55, 0.14, 'triangle', 0.22, 90);
    sc[turn] += CFG.puntosReventon;
    i++;
    ui();
    setTimeout(step, Math.max(55, 140 - i * 4));
  };
  setTimeout(step, 380);
}

function clearAnim(cb) {
  const rows = [];
  for (let r = 0; r < H; r++) {
    if (g[r].every(v => v !== null)) rows.push(r);
  }
  if (!rows.length) { cb(); return; }

  const n = rows.length;
  const gray = rows.reduce((a, r) => a + g[r].filter(v => (v >> 1) === 5).length, 0);
  ln[turn] += n;
  sc[turn] += CFG.puntosLinea[n] * level();
  snd(520, 0.5, 'triangle', 0.2, 1300);
  if (gray) snd(180, 0.3, 'square', 0.1, 60);
  lineFx = { rows, t: now };

  toast(gray ? '🧹 ¡Fila completa! Se borran ' + gray + ' bloques grises' : '✨ ¡Fila completa!', gray ? '#cbd5e1' : '#fde047');
  rows.forEach(r => g[r].forEach((v, c) => burst((c + 0.5) * C, (r + 0.5) * C, PAL[v >> 1], (v >> 1) === 5 ? 5 : 9, 200)));

  setTimeout(() => {
    rows.forEach(r => g[r].forEach((v, c) => burst((c + 0.5) * C, (r + 0.5) * C, '#fff', 3, 320)));
    const mv = [];
    for (let r = 0; r < H; r++) {
      if (rows.includes(r)) continue;
      const k = rows.filter(q => q > r).length;
      g[r].forEach((v, c) => {
        if (v !== null) mv.push({ v, c, r0: r, r1: r + k, d: 0 });
      });
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      g.splice(rows[i], 1);
      gi.splice(rows[i], 1);
    }
    for (let i = 0; i < n; i++) {
      g.unshift(Array(W).fill(null));
      gi.unshift(Array(W).fill(null));
    }
    shk = Math.max(shk, 8);
    canim = mv;
    canimT = now;
    canimDur = 380;
    snd(110, 0.3, 'sine', 0.4, 45);
    setTimeout(() => {
      canim = null;
      lineFx = null;
      cb();
    }, 400);
  }, 650);
}

function initGray() {
  [...Array(W).keys()].sort(() => Math.random() - 0.5).slice(0, CFG.grisesIniciales).forEach(c => {
    g[H - 1][c] = 10;
    gi[H - 1][c] = ++pid;
  });
}

function garbage() {
  const o = g[0].some(v => v !== null);
  for (let r = 0; r < H - 1; r++) {
    g[r] = g[r + 1];
    gi[r] = gi[r + 1];
  }
  const h = Math.random() * W | 0;
  g[H - 1] = Array.from({ length: W }, (_, c) => c === h ? null : 10);
  gi[H - 1] = Array.from({ length: W }, (_, c) => c === h ? null : ++pid);
  return o;
}

function finish() {
  sc[turn] += 10;
  turn = 1 - turn;
  busy = false;

  if (lc % CFG.basuraCada === 0 && lc > 0) {
    toast('⬆️ ¡Fila basura!', '#64748b');
    snd(110, 0.25, 'square', 0.12, 60);
    shk = Math.max(shk, 7);
    if (garbage()) { end(); return; }
  }

  spawn();
  const mg = (lc + 1) % CFG.megaCada === 0;
  const w = mg || (lc + 1) % CFG.remolinoCada === 0;
  cv.parentNode.classList.toggle('warn', w);

  if (w) {
    toast(mg ? '⚠️ ¡SUPER REMOLINO! Se invierte la gravedad' : '⚠️ ¡Próxima caída: REMOLINO!', mg ? '#ef4444' : '#f59e0b');
    snd(70, 0.5, 'sine', 0.3, 60);
  }
  if (flipMsg) {
    flipMsg = false;
    toast(orient ? '🙃 ¡MUNDO AL REVÉS! Caen de abajo hacia arriba' : '🙂 ¡Mundo derecho otra vez!', orient ? '#ef4444' : '#22c55e');
  }
}

function fall(cb) {
  const mv = [], moved = new Set();
  for (let c = 0; c < W; c++) {
    const a = [];
    for (let r = H - 1; r >= 0; r--) {
      if (g[r][c] !== null) a.push([r, g[r][c], gi[r][c]]);
    }
    a.forEach((e, i) => {
      const r1 = H - 1 - i;
      mv.push({ v: e[1], c, r0: e[0], r1, d: e[0] === r1 ? 0 : 0.3 * (1 - r1 / H) });
      if (e[0] !== r1) moved.add(r1 * W + c);
    });
    for (let r = H - 1, i = 0; r >= 0; r--, i++) {
      g[r][c] = i < a.length ? a[i][1] : null;
      gi[r][c] = i < a.length ? a[i][2] : null;
    }
  }
  if (!moved.size) { cb(moved); return; }
  canim = mv;
  canimT = now;
  canimDur = 900;
  snd(120, 0.35, 'sine', 0.3, 50);
  setTimeout(() => {
    canim = null;
    shk = Math.max(shk, 6);
    cb(moved);
  }, 950);
}

function contactGroups(moved) {
  const seen = Array.from({ length: H }, () => Array(W).fill(false)), out = [];
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (g[r][c] === null || seen[r][c]) continue;
      const col = g[r][c] >> 1;
      if (col > 4) continue;
      const cells = [], st = [[r, c]];
      seen[r][c] = true;
      let hit = false;
      while (st.length) {
        const [a, b] = st.pop();
        cells.push([a, b]);
        for (const [dr, dc] of D) {
          const ra = a + dr, ca = b + dc;
          if (ra < 0 || ra >= H || ca < 0 || ca >= W || g[ra][ca] === null || (g[ra][ca] >> 1) !== col) continue;
          if (gi[ra][ca] !== gi[a][b] && (moved.has(a * W + b) || moved.has(ra * W + ca))) hit = true;
          if (!seen[ra][ca]) {
            seen[ra][ca] = true;
            st.push([ra, ca]);
          }
        }
      }
      if (hit) out.push({ col, cells });
    }
  }
  return out;
}

function chain(moved, n, done) {
  const gs = contactGroups(moved);
  if (!gs.length || n >= 8) { done(); return; }
  const list = [];
  gs.forEach(G => G.cells.forEach(([r, c]) => list.push({ r, c, col: G.col })));
  list.sort((a, b) => a.r - b.r || a.c - b.c);
  marked = new Set(list.map(o => o.r * W + o.c));

  toast('⚡ ¡CADENA ×' + (n + 2) + '!', PAL[list[0].col]);
  snd(300, 0.3, 'square', 0.08, 900 + n * 200);

  let i = 0;
  const step = () => {
    if (i >= list.length) {
      marked.clear();
      setTimeout(() => fall(m2 => chain(m2, n + 1, done)), 160);
      return;
    }
    const o = list[i];
    g[o.r][o.c] = null;
    gi[o.r][o.c] = null;
    marked.delete(o.r * W + o.c);
    burst((o.c + 0.5) * C, (o.r + 0.5) * C, PAL[o.col], 16, 200);
    rings.push({ x: (o.c + 0.5) * C, y: (o.r + 0.5) * C, l: 1, c: PAL[o.col] });
    snd(420 + Math.min(i, 14) * 55 + n * 40, 0.14, 'triangle', 0.22, 90);
    sc[turn] += CFG.puntosReventon * (n + 2);
    i++;
    ui();
    setTimeout(step, Math.max(45, 120 - i * 4));
  };
  setTimeout(step, 300);
}

function settle(popped) {
  const go = () => clearAnim(() => {
    if (!(epic && spinEvent())) finish();
  });
  if (popped) fall(m => chain(m, 0, go));
  else go();
}

/* ============================================================================
   8. COMPONENTES Y GIROS RÍGIDOS (REMOLINOS)
   ============================================================================ */
function comps() {
  const seen = Array.from({ length: H }, () => Array(W).fill(false)), out = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (g[r][c] === null || seen[r][c]) continue;
      const id = gi[r][c], st = [[r, c]], cells = [];
      seen[r][c] = true;
      while (st.length) {
        const [a, b] = st.pop();
        cells.push([a, b]);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ra = a + dr, ca = b + dc;
          if (ra >= 0 && ra < H && ca >= 0 && ca < W && !seen[ra][ca] && g[ra][ca] !== null && gi[ra][ca] === id) {
            seen[ra][ca] = true;
            st.push([ra, ca]);
          }
        }
      }
      out.push(cells);
    }
  }
  return out;
}

const saveReady = () => sc[0] + sc[1] - skBase >= skCost;

function fireSave(auto, cb) {
  let br = -1, bc = 0;
  for (let r = 0; r < H; r++) {
    const n = g[r].filter(v => v !== null).length;
    if (n > 0 && n >= bc) {
      bc = n;
      br = r;
    }
  }
  if (br < 0) return false;

  saving = true;
  busy = true;
  if (auto && p) p.done = true;

  skBase = sc[0] + sc[1];
  skUses++;
  skCost = Math.min(CFG.salvacionTope, CFG.salvacionBase * Math.pow(2, skUses));
  skReady = false;

  const f = $('skf');
  f.style.transition = 'width 1.3s ease-in';
  ui();
  setTimeout(() => { f.style.transition = ''; }, 1400);

  saveFx = { r: br, t: now, auto };
  toast(auto ? '🛟 ¡Te salvó de perder!' : '🛟 ¡Fila borrada!', '#facc15');
  snd(200, 0.65, 'sawtooth', 0.08, 1600);
  nz(0.7, 400, 6000, 0.3);

  [72, 76, 79, 84].forEach((n, i) => setTimeout(() => snd(mf(n), 0.9, 'triangle', 0.12), i * 140));

  setTimeout(() => {
    g[br].forEach((v, c) => {
      if (v !== null) burst((c + 0.5) * C, (br + 0.5) * C, PAL[v >> 1], 8, 260);
      burst((c + 0.5) * C, (br + 0.5) * C, '#fde047', 3, 320);
    });
    g.splice(br, 1);
    g.unshift(Array(W).fill(null));
    gi.splice(br, 1);
    gi.unshift(Array(W).fill(null));
    shk = 14;
    snd(70, 0.8, 'sine', 0.55, 28);
    nz(0.6, 3000, 150, 0.45);
    [84, 88, 91, 96].forEach((n, i) => setTimeout(() => snd(mf(n), 0.7, 'triangle', 0.09), i * 90));
  }, 650);

  setTimeout(() => {
    saveFx = null;
    saving = false;
    busy = false;
    if (!auto && p && !p.done) {
      while (!fits(p.m, p.x, p.y) && p.y > -4) p.y--;
    }
    ui();
    if (cb) cb();
  }, 1500);

  return true;
}

function useSave() {
  if (!run || over || busy || anim || canim || saving || (p && p.hard) || !saveReady()) return;
  fireSave(false);
}

function collapse() {
  const mv = [];
  for (let c = 0; c < W; c++) {
    const a = [];
    for (let r = H - 1; r >= 0; r--) {
      if (g[r][c] !== null) a.push([r, g[r][c], gi[r][c]]);
    }
    a.forEach((e, i) => {
      const r1 = H - 1 - i;
      mv.push({ v: e[1], c, r0: e[0], r1, d: e[0] === r1 ? 0 : 0.35 * (1 - r1 / H) });
    });
    for (let r = H - 1, i = 0; r >= 0; r--, i++) {
      g[r][c] = i < a.length ? a[i][1] : null;
      gi[r][c] = i < a.length ? a[i][2] : null;
    }
  }
  if (!mv.some(m => m.r0 !== m.r1)) return false;

  canim = mv;
  canimT = now;
  canimDur = 900;
  snd(60, 0.9, 'sine', 0.4, 30);
  nz(0.9, 2500, 200, 0.3);
  toast('⬇️ ¡Todo cae!', '#ef4444');

  setTimeout(() => {
    canim = null;
    shk = 14;
    snd(55, 1, 'sine', 0.6, 22);
    nz(0.8, 2000, 90, 0.5);
    burst(150, 560, '#fff', 60, 380);
    clearAnim(finish);
  }, 1100);
  return true;
}

function spinEvent() {
  let top = H;
  for (let r = 0; r < H; r++) {
    if (g[r].some(v => v !== null)) { top = r; break; }
  }
  const rows = H - top;
  if (rows <= 0 && !mega) return false;

  const heavy = rows > H / 2 || mega, turns = heavy ? 2 : 1;
  const groups = comps().map(cells => {
    let r0 = 99, r1 = -1, c0 = 99, c1 = -1;
    cells.forEach(([r, c]) => {
      r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c);
    });
    const h = r1 - r0 + 1, w = c1 - c0 + 1;
    const m = Array.from({ length: h }, () => Array(w).fill(0));
    cells.forEach(([r, c]) => m[r - r0][c-c0] = 1);
    return {
      cells, r0, r1, c0, c1, m,
      val: g[cells[0][0]][cells[0][1]],
      id: gi[cells[0][0]][cells[0][1]]
    };
  });

  groups.sort((a, b) => b.r1 - a.r1);
  groups.forEach(G => G.cells.forEach(([r, c]) => { g[r][c] = null; gi[r][c] = null; }));

  const cellsOf = (m, l, t) => {
    const o = [];
    m.forEach((row, i) => row.forEach((v, j) => { if (v) o.push([t + i, l + j]); }));
    return o;
  };

  const ok = cl => cl.every(([r, c]) => c >= 0 && c < W && r >= 0 && r < H && g[r][c] === null);
  const ok2 = cl => ok(cl) && cl.every(([r]) => r >= top);
  const put = (G, cl, th) => {
    G.final = cl;
    G.th = th;
    cl.forEach(([r, c]) => { g[r][c] = G.val; gi[r][c] = G.id; });
  };

  const res = new Set();
  groups.forEach(G => G.cells.forEach(([r, c]) => res.add(r * W + c)));
  const okR = cl => ok2(cl) && cl.every(([r, c]) => !res.has(r * W + c));

  for (const G of groups) {
    G.cells.forEach(([r, c]) => res.delete(r * W + c));
    const cand = [];
    for (const rc of (turns === 1 ? [1, 2] : [2])) {
      let mm = G.m;
      for (let i = 0; i < rc; i++) mm = rot(mm);
      const nh = mm.length, nw = mm[0].length;
      const nl = Math.round((G.c0 + G.c1 + 1) / 2 - nw / 2), nt = G.r1 + 1 - nh;
      for (const dx of [0, -1, 1, -2, 2, -3, 3]) cand.push([mm, nl + dx, nt, rc * Math.PI / 2]);
    }
    cand.push([G.m, G.c0, G.r0, 0]);

    let done = false;
    for (const [m, l, t, th] of cand) {
      const cl = cellsOf(m, l, t);
      if (okR(cl)) { put(G, cl, th); done = true; break; }
    }
    for (let up = 1; !done && up < H; up++) {
      const cl = cellsOf(G.m, G.c0, G.r0 - up);
      if (okR(cl)) { put(G, cl, 0); done = true; }
    }
    for (let t = H - G.m.length; t >= 0 && !done; t--) {
      for (let l = 0; l <= W - G.m[0].length && !done; l++) {
        const cl = cellsOf(G.m, l, t);
        if (ok(cl)) { put(G, cl, 0); done = true; }
      }
    }
  }

  const fin = groups.filter(G => G.final);
  let moved = true;
  while (moved) {
    moved = false;
    fin.sort((a, b) => Math.max(...b.final.map(z => z[0])) - Math.max(...a.final.map(z => z[0])));
    for (const G of fin) {
      for (;;) {
        const own = new Set(G.final.map(([r, c]) => r * W + c));
        if (!G.final.every(([r, c]) => r + 1 < H && (g[r + 1][c] === null || own.has((r + 1) * W + c)))) break;
        G.final.forEach(([r, c]) => { g[r][c] = null; gi[r][c] = null; });
        G.final = G.final.map(([r, c]) => [r + 1, c]);
        G.final.forEach(([r, c]) => { g[r][c] = G.val; gi[r][c] = G.id; });
        moved = true;
      }
    }
  }

  const bb = cl => {
    let r0 = 99, r1 = -1, c0 = 99, c1 = -1;
    cl.forEach(([r, c]) => {
      r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c);
    });
    return [(c0 + c1 + 1) / 2, (r0 + r1 + 1) / 2];
  };

  anim = fin.map(G => {
    const o = bb(G.cells);
    const n = bb(G.final);
    return {
      val: G.val,
      th: G.th,
      o,
      n,
      dl: 0.22 * (1 - n[1] / H),
      sp: mega ? 5 : heavy ? 3 : 2,
      fell: n[1] - o[1] > 0.4,
      hh: (Math.max(...G.final.map(z => z[0])) - Math.min(...G.final.map(z => z[0])) + 1) / 2,
      off: G.cells.map(([r, c]) => [c + 0.5 - o[0], r + 0.5 - o[1]])
    };
  });

  ANIM = mega ? 3000 : 2400;
  animT = now;
  if (mega) {
    rb0 = orient * 180;
    orient ^= 1;
    flipMsg = true;
  }
  burst(150, 300, '#fff', mega ? 90 : 50, mega ? 420 : 320);
  toast(mega ? '🌪️ ¡SUPER REMOLINO!' : heavy ? '⚠️ ¡Giro doble y se pone peor!' : '↻ ¡Todo gira a la derecha!', heavy ? '#ef4444' : '#f59e0b');

  const L = mega ? 3 : 1.4;
  snd(80, L, 'sawtooth', 0.1, mega ? 1100 : 700);
  snd(300, L, 'square', 0.04, 1800);
  nz(L + 0.1, 200, mega ? 7000 : 5000, 0.35);
  snd(50, L + 0.6, 'sine', 0.35, 35);

  setTimeout(() => {
    anim = null;
    snd(70, 1, 'sine', 0.55, 25);
    nz(0.9, 3000, 120, 0.5);
    toast('💥 ¡BOOM!', '#f59e0b');
    shk = 9;
    if (mega && collapse()) return;
    clearAnim(finish);
  }, ANIM + 200);

  return true;
}

/* ============================================================================
   9. ACTUALIZACIÓN DE FOTOGRAMAS Y DIBUJO EN CANVAS
   ============================================================================ */
function update(dt) {
  const s = dt / 1000;
  parts.forEach(o => { o.x += o.vx * s; o.y += o.vy * s; o.l -= s * 1.2; });
  parts = parts.filter(o => o.l > 0);
  rings.forEach(o => o.l -= s * 2.5);
  rings = rings.filter(o => o.l > 0);
  shk = Math.max(0, shk - s * 9);

  if (anim) {
    const t = (now - animT) / ANIM;
    anim.forEach(G => {
      if (!G.hit && Math.min(1, Math.max(0, (t - G.dl) / 0.78)) >= 0.8) {
        G.hit = true;
        if (G.fell) {
          shk = 5;
          burst(G.n[0] * C, (G.n[1] + G.hh) * C, PAL[G.val >> 1], 8, 160);
          if (now - lastHitSnd > 70) {
            lastHitSnd = now;
            snd(90 + Math.random() * 50, 0.12, 'sine', 0.22, 45);
          }
        }
      }
    });
  }

  if (!run || over) return;

  playT += dt;
  const tr = Math.min(30, (sc[0] + sc[1]) / 1200 | 0);
  const sec = playT / 1000 | 0;

  if (tr !== tier) {
    tier = tr;
    toast('⚡ ¡Más rápido!', '#f59e0b');
    snd(300, 0.35, 'sawtooth', 0.12, 1200);
  }
  if (sec !== lastSec) {
    lastSec = sec;
    ui();
  }
  if (busy) return;

  p.vx += (p.x - p.vx) * Math.min(1, s * 28);
  const base = Math.min(
    CFG.velMax,
    CFG.velInicial + (sc[0] + sc[1]) * (CFG.velFinal - CFG.velInicial) / CFG.ptsLocura
  );
  const v = p.hard ? 75 : soft ? Math.max(18, base * 2) : base;
  p.v = v;

  if (!fits(p.m, p.x, p.y + 1)) { land(); return; }
  p.f += v * s;
  while (p.f >= 1) {
    if (fits(p.m, p.x, p.y + 1)) {
      p.y++;
      p.f -= 1;
    } else {
      land();
      return;
    }
  }
}

const ok = () => run && !busy && !over && !p.hard;

function move(d) {
  d = orient ? -d : d;
  if (ok() && fits(p.m, p.x + d, p.y)) p.x += d;
}

function turnPiece() {
  if (ok() && kick(rot(p.m))) {
    nz(0.14, 600, 2600, 0.12);
    snd(520, 0.07, 'triangle', 0.08, 780);
  }
}

function hard() {
  if (ok()) {
    p.hard = true;
    nz(0.3, 3500, 500, 0.18);
    snd(900, 0.3, 'sine', 0.05, 200);
  }
}

function cellAt(cx, cy, col, own, glow, ang) {
  x.save();
  x.globalAlpha = GA;
  x.translate(cx * C + C / 2, cy * C + C / 2);
  if (ang) x.rotate(ang);
  x.fillStyle = col;
  x.beginPath();
  x.roundRect(-C / 2 + 1, -C / 2 + 1, C - 2, C - 2, CFG.radioBloque);
  x.fill();

  if (CFG.brilloBloque) {
    x.globalAlpha = 0.35 * GA;
    x.fillStyle = '#fff';
    x.fillRect(-C / 2 + 5, -C / 2 + 5, C - 14, 4);
  }
  x.globalAlpha = GA;

  if (own !== undefined && CFG.puntoDueno && col !== PAL[5]) {
    x.fillStyle = '#fff';
    x.strokeStyle = COL[own];
    x.lineWidth = 2;
    x.beginPath();
    x.arc(0, 2, 4, 0, 6.283);
    x.fill();
    x.stroke();
  }

  if (glow) {
    x.strokeStyle = COL[own];
    x.lineWidth = 2.5;
    x.beginPath();
    x.roundRect(-C / 2 + 1, -C / 2 + 1, C - 2, C - 2, CFG.radioBloque);
    x.stroke();
  }
  x.restore();
}

function pose(G, t) {
  const tg = Math.min(1, Math.max(0, (t - G.dl) / 0.78));
  const ea = ease(Math.min(1, tg / 0.65));
  const fe = Math.min(1, Math.max(0, (tg - 0.45) / 0.35));
  const ep = fe * fe;
  const ph = Math.max(0, (tg - 0.8) / 0.2);
  const hop = G.fell ? 0.4 * Math.abs(Math.sin(2 * Math.PI * ph)) * (1 - ph) : 0;
  return {
    a: (G.th + 6.2832 * G.sp) * ea,
    px: G.o[0] + (G.n[0] - G.o[0]) * ep,
    py: G.o[1] + (G.n[1] - G.o[1]) * ep - hop
  };
}

function drawG(G, t) {
  const q = pose(G, t), cs = Math.cos(q.a), sn = Math.sin(q.a);
  G.off.forEach(([ox, oy]) => cellAt(
    q.px + ox * cs - oy * sn - 0.5,
    q.py + ox * sn + oy * cs - 0.5,
    PAL[G.val >> 1],
    G.val & 1,
    false,
    q.a
  ));
}

function draw() {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, 300, 600);

  const q = Math.min(1, Math.max(0, (now - spinT) / curDur));
  const sp = q > 0 && q < 1;
  const sh = (sp ? (1 - q) * 2.5 : 0) + shk;

  x.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  x.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid');
  x.lineWidth = 1;

  for (let i = 1; i < W; i++) {
    x.beginPath();
    x.moveTo(i * C, 0);
    x.lineTo(i * C, 600);
    x.stroke();
  }
  for (let i = 1; i < H; i++) {
    x.beginPath();
    x.moveTo(0, i * C);
    x.lineTo(300, i * C);
    x.stroke();
  }

  if (canim) {
    const u = (now - canimT) / canimDur;
    canim.forEach(m => {
      const tt = Math.min(1, Math.max(0, (u - m.d) / (1 - m.d)));
      cellAt(m.c, m.r0 + (m.r1 - m.r0) * tt * tt, PAL[m.v >> 1], m.v & 1);
    });
  } else if (anim) {
    const t = (now - animT) / ANIM;
    for (let gh = 2; gh >= 0; gh--) {
      GA = gh ? 0.14 / gh : 1;
      const tt = t - gh * 0.022;
      anim.forEach(G => drawG(G, tt));
    }
    GA = 1;
  } else {
    g.forEach((row, r) => row.forEach((v, c) => {
      if (v !== null) {
        const w = shk > 0.3 ? Math.sin(now / 38 - Math.hypot(c + 0.5 - spinC[0], r + 0.5 - spinC[1]) * 1.1) * shk * 0.45 / C : 0;
        cellAt(c, r + w, PAL[v >> 1], v & 1);
      }
    }));
  }

  marked.forEach(id => {
    const r = id / W | 0, c = id % W;
    x.save();
    x.globalAlpha = 0.5 + 0.5 * Math.sin(now / 45);
    x.strokeStyle = '#fff';
    x.lineWidth = 3;
    x.strokeRect(c * C + 3, r * C + 3, C - 6, C - 6);
    x.restore();
  });

  if (p && !over && !marked.size && !anim && !busy) {
    const tl2 = Math.min(5, (p.v || 0) * 0.07);
    if (tl2 > 0.1) {
      for (let k2 = 4; k2 >= 1; k2--) {
        GA = 0.2 / k2;
        p.m.forEach((row, r) => row.forEach((v, c) => {
          if (v) cellAt(p.vx + c, p.y + p.f + r - tl2 * k2 / 4, PAL[p.col]);
        }));
      }
      GA = 1;
    }
  }

  if (p && !over && !marked.size && !anim && !canim && !p.done) {
    p.m.forEach((row, r) => row.forEach((v, c) => {
      if (v) cellAt(p.vx + c, p.y + p.f + r, PAL[p.col], turn, true);
    }));
  }

  if (sp) {
    x.strokeStyle = PAL[p.col];
    x.globalAlpha = 1 - q;
    x.lineWidth = 5 * (1 - q);
    x.beginPath();
    x.arc(spinC[0] * C, spinC[1] * C, q * 140, 0, 6.283);
    x.stroke();
    x.globalAlpha = 1;
  }

  if (lineFx && !canim) {
    const t = Math.min(1, (now - lineFx.t) / 650);
    lineFx.rows.forEach(r => {
      x.save();
      x.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(now / 45));
      x.fillStyle = '#fff';
      x.fillRect(0, r * C, 300 * Math.min(1, t * 3), C);
      x.globalAlpha = 1;
      x.strokeStyle = '#fde047';
      x.lineWidth = 2;
      x.strokeRect(1, r * C + 1, 298, C - 2);
      x.restore();
    });
  }

  if (saveFx) {
    const t = Math.min(1, (now - saveFx.t) / 1500);
    const y0 = saveFx.r * C, bp = Math.min(1, t / 0.4), fd = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
    x.save();
    x.globalAlpha = fd;
    x.fillStyle = 'rgba(250,204,21,.35)';
    x.fillRect(0, y0 - 6, bp * 300, C + 12);
    x.shadowColor = '#facc15';
    x.shadowBlur = 26;
    x.fillStyle = '#fff';
    x.fillRect(0, y0 + C / 2 - 2, bp * 300, 4);
    if (t < 0.43) {
      x.shadowBlur = 0;
      x.strokeStyle = '#fff';
      x.lineWidth = 2;
      for (let c = 0; c < W; c++) {
        if (g[saveFx.r][c] !== null && c * C < bp * 300) x.strokeRect(c * C + 3, y0 + 3, C - 6, C - 6);
      }
    }
    if (t < 0.12) {
      x.shadowBlur = 0;
      x.globalAlpha = 0.4 * (1 - t / 0.12);
      x.fillStyle = '#fde047';
      x.fillRect(0, 0, 300, 600);
    }
    x.restore();
  }

  rings.forEach(o => {
    x.globalAlpha = o.l;
    x.strokeStyle = o.c;
    x.lineWidth = 3 * o.l;
    x.beginPath();
    x.arc(o.x, o.y, (1 - o.l) * 50 + 6, 0, 6.283);
    x.stroke();
  });

  parts.forEach(o => {
    x.globalAlpha = Math.max(0, o.l);
    x.fillStyle = o.c;
    x.beginPath();
    x.arc(o.x, o.y, 2 + 3 * o.l, 0, 6.283);
    x.fill();
  });
  x.globalAlpha = 1;

  x.setTransform(1, 0, 0, 1, 0, 0);

  if (anim) {
    const t = (now - animT) / ANIM;
    if (t < 0.25) {
      x.globalAlpha = 0.4 * (1 - t / 0.25);
      x.fillStyle = '#fff';
      x.fillRect(0, 0, 300, 600);
      x.globalAlpha = 1;
    }
  }

  if (saveFx) {
    const t = Math.min(1, (now - saveFx.t) / 1500);
    if (t < 0.85) {
      x.save();
      if (orient) { x.translate(300, 600); x.rotate(Math.PI); }
      const a = t < 0.1 ? t / 0.1 : t > 0.7 ? (0.85 - t) / 0.15 : 1;
      const sz = 22 + 5 * Math.sin(Math.min(1, t / 0.3) * Math.PI / 2);
      x.globalAlpha = Math.max(0, a);
      x.textAlign = 'center';
      x.lineWidth = 6;
      x.strokeStyle = '#92400e';
      x.shadowColor = '#facc15';
      x.shadowBlur = 24;
      x.font = '900 46px system-ui';
      x.strokeText('🛟', 150, 262);
      x.fillText('🛟', 150, 262);
      x.font = '900 ' + sz + 'px system-ui';
      x.strokeText('ÚLTIMA SALVACIÓN', 150, 306);
      x.fillStyle = '#fde047';
      x.fillText('ÚLTIMA SALVACIÓN', 150, 306);
      if (saveFx.auto) {
        x.font = 'bold 15px system-ui';
        x.lineWidth = 4;
        x.strokeText('¡Te salvó de perder!', 150, 338);
        x.fillText('¡Te salvó de perder!', 150, 338);
      }
      x.restore();
    }
  }

  if (now < msgT) {
    x.save();
    if (orient) { x.translate(300, 600); x.rotate(Math.PI); }
    x.globalAlpha = Math.min(1, (msgT - now) / 500);
    x.font = 'bold 20px system-ui';
    x.textAlign = 'center';
    x.lineWidth = 4;
    x.strokeStyle = '#fff';
    x.strokeText(msg, 150, 70);
    x.fillStyle = msgC;
    x.fillText(msg, 150, 70);
    x.globalAlpha = 1;
    x.restore();
  }
}

function loop(t) {
  if (window.TetrisVersus1v1 && window.TetrisVersus1v1.active) {
    requestAnimationFrame(loop);
    return;
  }
  now = t;
  const dt = Math.min(50, t - last);
  last = t;
  fN++;
  if (t - fT >= 1000) {
    const fpsEl = $('fps');
    if (fpsEl) fpsEl.textContent = Math.round(fN * 1000 / (t - fT)) + ' FPS';
    fN = 0;
    fT = t;
  }
  update(dt);
  draw();
  tilt();
  flipCss();
  requestAnimationFrame(loop);
}

/* ============================================================================
   10. CONTROLADORES DE EVENTOS Y ENTRADA DE USUARIO
   ============================================================================ */
let tetrisSessionStartTime = 0;

function showModeSelector() {
  const startB = $('start');
  if (startB) startB.style.display = 'none';
  const modeOpt = $('mode-options');
  if (modeOpt) modeOpt.style.display = 'flex';
  const ovt = $('ovt');
  if (ovt) ovt.textContent = 'ELIGE EL MODO';
}

function start() {
  try {
    if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); }
    if (AC && AC.state === 'suspended') { AC.resume(); }
  } catch (e) {}
  tetrisSessionStartTime = Date.now();
  reset();
  run = true;
  const ovEl = $('ov');
  if (ovEl) ovEl.style.display = 'none';
  try { musicStart(); } catch (e) {}
}

const startBtn = $('start');
if (startBtn) {
  startBtn.onclick = (e) => {
    e.stopPropagation();
    showModeSelector();
  };
  startBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    showModeSelector();
  });
}

// Botón 1 Jugador (Clásico)
const btnSolo = $('btn-play-solo');
if (btnSolo) {
  btnSolo.onclick = (e) => {
    e.stopPropagation();
    ['boardwrap-2', 'p1-badge', 'p1-score-card', 'p1-ctrl-card', 'p2-score-card', 'p2-ctrl-card'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    ['classic-controls-card', 'classic-score-card', 'classic-record-card', 'card-level', 'sk', 'classic-pad-card'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'block';
    });
    if (window.TetrisVersus1v1) window.TetrisVersus1v1.stop();
    start();
  };
}

// Botón 1v1 Local (2 Tableros)
const btn1v1 = $('btn-play-1v1');
if (btn1v1) {
  btn1v1.onclick = (e) => {
    e.stopPropagation();
    run = false;
    ['classic-controls-card', 'classic-score-card', 'classic-record-card', 'card-level', 'sk', 'classic-pad-card'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    ['boardwrap-2', 'p1-badge', 'p1-score-card', 'p1-ctrl-card', 'p2-score-card', 'p2-ctrl-card'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'block';
    });
    if ($('ov')) $('ov').style.display = 'none';
    if (window.TetrisVersus1v1) window.TetrisVersus1v1.start();
  };
}

$('sku').onclick = () => {
  useSave();
  $('sku').blur();
};

const kd = k => orient ? ({ ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' }[k] || k) : k;

window.addEventListener('keydown', e => {
  if (window.TetrisVersus1v1 && window.TetrisVersus1v1.active) return;
  if (e.target && e.target.id === 'nm') return;
  const k = kd(e.key);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(k)) e.preventDefault();
  if (!run && (k === 'Enter' || k === ' ') && $('ov') && $('ov').style.display !== 'none') {
    showModeSelector();
    return;
  }
  if (k === 'ArrowLeft') move(-1);
  else if (k === 'ArrowRight') move(1);
  else if (k === 'ArrowDown') soft = true;
  else if ((k === 'ArrowUp' || k === ' ') && !e.repeat) turnPiece();
  else if (k === 'Enter') hard();
  else if (k === 'e' || k === 'E') useSave();
});

window.addEventListener('keyup', e => {
  if (kd(e.key) === 'ArrowDown') soft = false;
});

document.querySelectorAll('.pad button').forEach(b => {
  const a = b.dataset.a;
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (a === 'D') soft = true;
    else ({
      L: () => move(-1),
      R: () => move(1),
      T: turnPiece,
      H: hard,
      M: () => {
        mute = !mute;
        document.querySelectorAll('[data-a=M]').forEach(mb => { mb.textContent = mute ? '🔇' : '🔊'; });
      }
    })[a]();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => {
    if (a === 'D') soft = false;
  }));
});

/* ============================================================================
   CONTROLES TÁCTILES GESTUALES EN PANTALLA (SWIPES / TOQUES PARA MÓVILES)
   - Deslizar izquierda/derecha: mueve la pieza celda por celda
   - Deslizar hacia arriba o toque rápido: rota la pieza (cambia de figura)
   - Deslizar hacia abajo con fuerza: caída de golpe (hard drop)
   - Mantener abajo / arrastre suave abajo: caída suave acelerada
   ============================================================================ */
(function setupTouchGestures() {
  let touchStartX = 0, touchStartY = 0;
  let lastSwipeX = 0, lastSwipeY = 0;
  let touchStartTime = 0;
  let hasMovedHorizontally = false;
  let hasHardDropped = false;

  const targetEl = document.body;

  targetEl.addEventListener('touchstart', e => {
    // Si se toca un botón específico del HUD, no interferir
    if (e.target.closest('button') || e.target.closest('#ov') || e.target.closest('input')) return;
    if (!run || over) return;

    const t = e.touches[0];
    touchStartX = lastSwipeX = t.clientX;
    touchStartY = lastSwipeY = t.clientY;
    touchStartTime = performance.now();
    hasMovedHorizontally = false;
    hasHardDropped = false;
  }, { passive: true });

  targetEl.addEventListener('touchmove', e => {
    if (!run || over || hasHardDropped) return;
    if (e.target.closest('button') || e.target.closest('#ov')) return;

    const t = e.touches[0];
    const dx = t.clientX - lastSwipeX;
    const dy = t.clientY - lastSwipeY;
    const totalDx = t.clientX - touchStartX;
    const totalDy = t.clientY - touchStartY;

    // Sensibilidad horizontal: ~22px de desplazamiento por cada celda de movimiento
    const CELL_THRESHOLD = 22;
    if (Math.abs(dx) >= CELL_THRESHOLD) {
      const steps = Math.trunc(dx / CELL_THRESHOLD);
      if (steps !== 0) {
        move(steps > 0 ? 1 : -1);
        lastSwipeX += (steps > 0 ? 1 : -1) * CELL_THRESHOLD;
        hasMovedHorizontally = true;
      }
    }

    // Swipe vertical rápido hacia abajo: caída de golpe
    if (totalDy > 55 && Math.abs(totalDy) > Math.abs(totalDx) * 1.5 && !hasHardDropped) {
      hasHardDropped = true;
      soft = false;
      hard();
      return;
    }

    // Desplazamiento hacia abajo moderado: caída suave
    if (totalDy > 25 && Math.abs(totalDy) > Math.abs(totalDx)) {
      soft = true;
    }
  }, { passive: true });

  targetEl.addEventListener('touchend', e => {
    soft = false;
    if (!run || over || hasHardDropped) return;
    if (e.target.closest('button') || e.target.closest('#ov')) return;

    const touchDuration = performance.now() - touchStartTime;
    const changeX = (e.changedTouches[0]?.clientX || lastSwipeX) - touchStartX;
    const changeY = (e.changedTouches[0]?.clientY || lastSwipeY) - touchStartY;
    const dist = Math.hypot(changeX, changeY);

    // 1. Swipe hacia arriba: rotar pieza
    if (changeY < -35 && Math.abs(changeY) > Math.abs(changeX) * 1.2) {
      turnPiece();
      return;
    }

    // 2. Toque rápido (tap) sin arrastre: también rota la pieza para máxima agilidad
    if (touchDuration < 280 && dist < 16 && !hasMovedHorizontally) {
      turnPiece();
    }
  }, { passive: true });
})();

/* ============================================================================
   11. INICIALIZACIÓN
   ============================================================================ */
g = Array.from({ length: H }, () => Array(W).fill(null));
sc = [0, 0];
ln = [0, 0];
turn = 0;
gi = Array.from({ length: H }, () => Array(W).fill(null));
ui();
requestAnimationFrame(loop);

// Detección automática del modo seleccionado afuera en el catálogo Arcade
(function checkInitialMode() {
  const p = new URLSearchParams(window.location.search);
  const mode = p.get('mode');
  if (mode === '1v1') {
    // Si eligió 1v1 Local afuera en el catálogo, activar directamente los 2 tableros
    setTimeout(() => {
      run = false;
      if ($('start')) $('start').style.display = 'none';
      if ($('mode-options')) $('mode-options').style.display = 'none';
      ['classic-controls-card', 'classic-score-card', 'classic-record-card', 'card-level', 'sk', 'classic-pad-card'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = 'none';
      });
      ['boardwrap-2', 'p1-badge', 'p1-score-card', 'p1-ctrl-card', 'p2-score-card', 'p2-ctrl-card'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = 'block';
      });
      if ($('ov')) $('ov').style.display = 'none';
      if (window.TetrisVersus1v1) window.TetrisVersus1v1.start();
    }, 150);
  } else if (mode === 'solo') {
    // Si eligió 1 Jugador afuera en el catálogo, arrancar directamente
    setTimeout(() => {
      ['boardwrap-2', 'p1-badge', 'p1-score-card', 'p1-ctrl-card', 'p2-score-card', 'p2-ctrl-card'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = 'none';
      });
      ['classic-controls-card', 'classic-score-card', 'classic-record-card', 'card-level', 'sk', 'classic-pad-card'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = 'block';
      });
      start();
    }, 150);
  }
})();
