/* ═══════════════════════════════════════════════════════════════
   SUDOKU DE A DOS 💞 — Lógica de Alto Rendimiento (60 FPS)
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   A) ESTADO DEL JUEGO
   ───────────────────────────────────────────────────────────── */
let N,            // tamaño del tablero (6, 9 o 12)
    BR, BC,       // alto y ancho de cada caja
    sol,          // solución completa
    grid,         // estado actual del tablero (0 = vacía)
    given,        // true en casillas dadas
    owner,        // quién puso cada número (-1 nadie, 0 J1, 1 J2)
    turn = 0,     // turno actual (0 o 1)
    score = [0, 0], // puntajes
    sel = -1,     // casilla seleccionada (-1 = ninguna)
    errs = 0,     // errores cometidos
    over = false, // true cuando se completa el tablero
    hintsLeft = 3, // pistas disponibles
    hc = -1,      // casilla con pista activa
    hu = [];      // casillas que ya fueron pista

let peerMask = null; // Matriz precalculada de pares O(1)

const $ = id => document.getElementById(id);

/* ─────────────────────────────────────────────────────────────
   B) SONIDO Y EFECTOS (Ligeros y sin sobrecarga)
   ───────────────────────────────────────────────────────────── */
let snd = true, AC,
    PI = 0, PK = 0;

function tone(f, d = 0.12, t = 'sine', v = 0.08, dl = 0) {
  if (!snd) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator();
    const g = AC.createGain();
    const T = AC.currentTime + dl;
    o.type = t;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, T);
    g.gain.exponentialRampToValueAtTime(0.0001, T + d);
    o.connect(g);
    g.connect(AC.destination);
    o.start(T);
    o.stop(T + d);
  } catch (e) {}
}

const sfx = {
  ok() { tone(660); tone(880, 0.15, 'sine', 0.08, 0.08); },
  bad() { tone(180, 0.25, 'sawtooth', 0.06); },
  tap() { tone(420, 0.04, 'triangle', 0.04); },
  hint() { tone(780); tone(990, 0.1, 'sine', 0.08, 0.1); tone(1320, 0.18, 'sine', 0.08, 0.2); },
  line() { tone(988, 0.08); tone(1318, 0.12, 'sine', 0.08, 0.07); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'sine', 0.09, i * 0.12)); }
};

/* burst: genera emojis livianos al acertar o fallar */
function burst(x, y, em, n = 8) {
  for (let i = 0; i < n; i++) {
    const e = document.createElement('div');
    e.className = 'pt';
    e.textContent = em[i % em.length];
    e.style.left = x + 'px';
    e.style.top = y + 'px';
    document.body.appendChild(e);
    const a = Math.random() * 6.28;
    const r = 35 + Math.random() * 60;
    const an = e.animate([
      { transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 },
      {
        transform: `translate(calc(-50% + ${Math.cos(a) * r}px),calc(-50% + ${Math.sin(a) * r - 25}px)) scale(${1 + Math.random() * 0.5}) rotate(${Math.random() * 90 - 45}deg)`,
        opacity: 0
      }
    ], {
      duration: 600 + Math.random() * 300,
      easing: 'cubic-bezier(.2,.8,.3,1)'
    });
    an.onfinish = () => e.remove();
  }
}

/* rain: confeti de victoria optimizado */
function rain() {
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const e = document.createElement('div');
      e.className = 'pt';
      e.textContent = ['💖', '✨', '🎉', '💜', '💗', '⭐'][i % 6];
      e.style.left = Math.random() * 100 + 'vw';
      e.style.top = '-25px';
      e.style.fontSize = 16 + Math.random() * 14 + 'px';
      document.body.appendChild(e);
      const an = e.animate([
        { transform: 'translateY(0) rotate(0)' },
        { transform: `translateY(${innerHeight + 40}px) rotate(${Math.random() * 540 - 270}deg)` }
      ], {
        duration: 2000 + Math.random() * 1200,
        easing: 'ease-in'
      });
      an.onfinish = () => e.remove();
    }, i * 50);
  }
}

const cc = i => {
  const r = $('board').children[i].getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};

function units(i) {
  const r = (i / N) | 0;
  const c = i % N;
  const u = [[], [], []];
  for (let k = 0; k < N; k++) {
    u[0].push(r * N + k);
    u[1].push(k * N + c);
  }
  const r0 = r - (r % BR);
  const c0 = c - (c % BC);
  for (let a = 0; a < BR; a++) {
    for (let b = 0; b < BC; b++) {
      u[2].push((r0 + a) * N + c0 + b);
    }
  }
  return u;
}

function celebrate(i) {
  let any = false;
  for (const u of units(i)) {
    if (u.every(k => grid[k])) {
      any = true;
      u.forEach((k, j) => {
        const e = $('board').children[k];
        setTimeout(() => {
          e.classList.remove('wave');
          void e.offsetWidth;
          e.classList.add('wave');
        }, j * 40);
      });
    }
  }
  if (any) {
    sfx.line();
    const [x, y] = cc(i);
    burst(x, y, ['✨', '💫', '⭐'], 10);
  }
}

function bump(w) {
  const s = $(w ? 'sb' : 'sa');
  s.classList.remove('bump');
  void s.offsetWidth;
  s.classList.add('bump');
}

function after(who) {
  const e = $('board').children[PI];
  if (!e) return;
  if (PK) {
    e.classList.add('pop');
    const [x, y] = cc(PI);
    burst(x, y, who ? ['💜', '✨'] : ['💗', '✨'], 8);
    sfx.ok();
    bump(who);
    celebrate(PI);
  } else {
    e.classList.add('bad');
    const b = $('board');
    b.classList.remove('err');
    void b.offsetWidth;
    b.classList.add('err');
    sfx.bad();
    if (navigator.vibrate) navigator.vibrate(80);
    const [x, y] = cc(PI);
    burst(x, y, ['💔'], 4);
  }
}

$('mute').onclick = () => {
  snd = !snd;
  $('mute').textContent = snd ? '🔊' : '🔇';
};

/* ─────────────────────────────────────────────────────────────
   C) GENERACIÓN DE TABLEROS
   ───────────────────────────────────────────────────────────── */
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function ok(g, i, v) {
  const r = (i / N) | 0;
  const c = i % N;
  for (let k = 0; k < N; k++) {
    if (g[r * N + k] === v || g[k * N + c] === v) return false;
  }
  const r0 = r - (r % BR);
  const c0 = c - (c % BC);
  for (let a = 0; a < BR; a++) {
    for (let b = 0; b < BC; b++) {
      if (g[(r0 + a) * N + c0 + b] === v) return false;
    }
  }
  return true;
}

function fill(g) {
  const i = g.indexOf(0);
  if (i < 0) return true;
  for (const v of shuffle([...Array(N).keys()].map(x => x + 1))) {
    if (ok(g, i, v)) {
      g[i] = v;
      if (fill(g)) return true;
      g[i] = 0;
    }
  }
  return false;
}

let nodes = 0, NL = 30000;
function count(g, lim) {
  if (++nodes > NL) return lim;
  let best = -1, bc = 99, bo = null;
  for (let i = 0; i < g.length; i++) {
    if (!g[i]) {
      const o = [];
      for (let v = 1; v <= N; v++) {
        if (ok(g, i, v)) o.push(v);
      }
      if (o.length < bc) {
        bc = o.length;
        best = i;
        bo = o;
        if (bc <= 1) break;
      }
    }
  }
  if (best < 0) return 1;
  let n = 0;
  for (const v of bo) {
    g[best] = v;
    n += count(g, lim - n);
    g[best] = 0;
    if (n >= lim) break;
  }
  return n;
}

function pat() {
  const rs = [], cs = [];
  for (const b of shuffle([...Array(N / BR).keys()])) {
    for (const r of shuffle([...Array(BR).keys()])) rs.push(b * BR + r);
  }
  for (const s of shuffle([...Array(N / BC).keys()])) {
    for (const c of shuffle([...Array(BC).keys()])) cs.push(s * BC + c);
  }
  const nums = shuffle([...Array(N).keys()].map(x => x + 1));
  const g = [];
  for (const r of rs) {
    for (const c of cs) {
      g.push(nums[(BC * (r % BR) + ((r / BR) | 0) + c) % N]);
    }
  }
  return g;
}

function newGame() {
  sudokuStartTime = Date.now();
  N = +$('size').value;
  BR = N === 6 ? 2 : 3;
  BC = N === 12 ? 4 : 3;
  const d = +$('diff').value;
  NL = N === 12 ? 500 : N === 9 ? 8000 : 30000;
  if (N === 12) sol = pat();
  else {
    sol = Array(N * N).fill(0);
    fill(sol);
  }
  grid = sol.slice();
  const target = Math.round(N * N * (N === 12 ? [0.4, 0.5, 0.58] : [0.45, 0.55, 0.65])[d]);
  let removed = 0, fails = 0;
  for (const i of shuffle([...grid.keys()])) {
    if (removed >= target) break;
    const t = grid[i];
    grid[i] = 0;
    nodes = 0;
    if (count(grid.slice(), 2) === 1) {
      removed++;
    } else {
      grid[i] = t;
      if (++fails > 40) break;
    }
  }
  given = grid.map(v => v > 0);
  owner = Array(N * N).fill(-1);
  turn = Math.random() < 0.5 ? 0 : 1;
  score = [0, 0];
  sel = -1;
  errs = 0;
  over = false;
  hintsLeft = 3;
  hc = -1;
  hu = [];
  build();
  render();

  say(`💗 Empieza ${name(turn)}`);
}

/* ─────────────────────────────────────────────────────────────
   D) INTERFAZ OPTIMIZADA: DIBUJAR Y ACTUALIZAR CON CERO LAG
   ───────────────────────────────────────────────────────────── */
const name = t => $(t ? 'nb' : 'na').value || ('Jugador ' + (t + 1));

function say(t) {
  const m = $('msg');
  m.textContent = t;
}

/* build: construye casillas y precalcula tabla de pares O(1) */
function build() {
  const b = $('board');
  const total = N * N;
  b.innerHTML = '';
  b.classList.toggle('big', N === 12);
  b.setAttribute('data-n', N);
  b.style.gridTemplateColumns = `repeat(${N}, 1fr)`;

  // Precalcular mapa de casillas relacionadas (peerMask)
  peerMask = new Array(total);
  for (let i = 0; i < total; i++) {
    peerMask[i] = new Uint8Array(total);
    const r = (i / N) | 0;
    const c = i % N;
    const r0 = r - (r % BR);
    const c0 = c - (c % BC);
    for (let j = 0; j < total; j++) {
      if (i === j) continue;
      const jr = (j / N) | 0;
      const jc = j % N;
      if (r === jr || c === jc || (jr >= r0 && jr < r0 + BR && jc >= c0 && jc < c0 + BC)) {
        peerMask[i][j] = 1;
      }
    }
  }

  // Fragmento de documento para inserción rápida de una sola vez
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const e = document.createElement('button');
    e.className = 'c';
    e.dataset.i = i;
    const r = (i / N) | 0;
    const c = i % N;
    if (c % BC === BC - 1 && c < N - 1) e.style.borderRight = '3px solid rgba(255,255,255,0.45)';
    if (r % BR === BR - 1 && r < N - 1) e.style.borderBottom = '3px solid rgba(255,255,255,0.45)';
    e.onclick = () => pick(i);
    frag.appendChild(e);
  }
  b.appendChild(frag);

  // Teclado numérico
  const p = $('pad');
  p.innerHTML = '';
  p.style.gridTemplateColumns = `repeat(${N === 12 ? 6 : N}, 1fr)`;
  const padFrag = document.createDocumentFragment();
  for (let v = 1; v <= N; v++) {
    const e = document.createElement('button');
    e.textContent = v;
    e.dataset.v = v;
    e.onclick = () => place(v);
    padFrag.appendChild(e);
  }
  p.appendChild(padFrag);
}

/* render: comparación granular de nodos (DOM Diffing) */
function render() {
  const cs = $('board').children;
  const total = N * N;
  const selRow = (sel >= 0 && peerMask) ? peerMask[sel] : null;
  const selVal = sel >= 0 ? grid[sel] : 0;

  // Conteo en una sola pasada para los botones del teclado
  const counts = new Uint8Array(N + 1);

  for (let i = 0; i < total; i++) {
    const val = grid[i];
    if (val) counts[val]++;

    const e = cs[i];
    const nextTxt = val ? String(val) : (i === hc ? String(sol[i]) : '');
    if (e.textContent !== nextTxt) {
      e.textContent = nextTxt;
    }

    const isPeer = selRow ? (selRow[i] === 1) : false;
    const isHl = selVal > 0 && i !== sel && val === selVal;

    const nextClass = 'c' +
      (given[i] ? ' g' : '') +
      (owner[i] >= 0 ? ' p' + (owner[i] + 1) : '') +
      (i === sel ? ' sel' : '') +
      (i === hc ? ' hint' : '') +
      (isPeer ? ' peer' : '') +
      (isHl ? ' hl' : '');

    if (e.className !== nextClass) {
      e.className = nextClass;
    }
  }

  // Actualizar botones completados sin allocations
  const padButtons = $('pad').children;
  for (let k = 0; k < padButtons.length; k++) {
    const b = padButtons[k];
    const v = +b.dataset.v;
    b.classList.toggle('done', counts[v] === N);
  }

  $('hint').textContent = hintsLeft ? `💡 Pista (${hintsLeft} de 3)` : '💡 Pistas usadas';
  $('hint').disabled = !hintsLeft || over;
  $('sa').textContent = score[0];
  $('sb').textContent = score[1];
  $('pa').classList.toggle('on', turn === 0);
  $('pb').classList.toggle('on', turn === 1);
}

/* ─────────────────────────────────────────────────────────────
   E) JUGADAS
   ───────────────────────────────────────────────────────────── */
function pick(i) {
  if (over || given[i] || grid[i]) return;
  sel = i;
  sfx.tap();
  render();
}

function place(v) {
  if (over) return;
  if (sel < 0 || grid[sel]) {
    say('👆 Primero toca una casilla vacía');
    return;
  }
  const who = turn;
  if (sol[sel] === v) {
    PI = sel;
    PK = 1;
    if (sel === hc) hc = -1;
    grid[sel] = v;
    owner[sel] = who;
    score[who]++;
    if (grid.every(x => x)) {
      finish();
      return;
    }
    say(`✅ ¡Bien, ${name(who)}! Sigue ${name(1 - who)}`);
  } else {
    PI = sel;
    PK = 0;
    errs++;
    say(`❌ Ese no va, ${name(who)}. Pierdes el turno`);
  }
  turn = 1 - who;
  sel = -1;
  render();
  after(who);
}

let sudokuStartTime = Date.now();

function finish() {
  over = true;
  render();
  sfx.win();
  rain();
  const [a, b] = score;
  const tot = a + b;

  // Calibración horaria equivalente a Rompecabezas (~450-550 LP / hora):
  // 6x6 (Fácil ~2.5 min): 20 LP · 6 monedas
  // 9x9 (Normal ~6-8 min): 55 LP · 16 monedas
  // 12x12 (Difícil ~14-16 min): 120 LP · 36 monedas
  const durationMs = sudokuStartTime ? (Date.now() - sudokuStartTime) : 180000;
  const minutes = Math.min(durationMs / 60000, 30);
  
  // Rescate y envío desacoplado de monedas y LP (ver reward-config.js)
  const { earnedCoins, lpAward: lpEarned } = window.enviarRecompensaSudoku ? window.enviarRecompensaSudoku({
    score: tot,
    gridSize: N,
    durationMs: durationMs
  }) : { earnedCoins: 6, lpAward: 20 };

  const w = a === b ? '¡Empate perfecto, son un equipo!' : `Gana ${name(a > b ? 0 : 1)}... ¡pero el amor gana siempre!`;
  say(`¡Completado! ${w} • +${earnedCoins} monedas ganadas`);
}

$('hint').onclick = () => {
  if (over || !hintsLeft) return;
  let c = -1;
  if (sel >= 0 && !grid[sel] && !hu.includes(sel)) {
    c = sel;
  } else {
    let m = 99;
    for (let i = 0; i < N * N; i++) {
      if (!grid[i] && !hu.includes(i)) {
        let k = 0;
        for (let v = 1; v <= N; v++) {
          if (ok(grid, i, v)) k++;
        }
        if (k < m) {
          m = k;
          c = i;
        }
      }
    }
  }
  if (c < 0) return;
  hintsLeft--;
  hc = sel = c;
  hu.push(c);
  render();
  sfx.hint();
  const [x, y] = cc(c);
  burst(x, y, ['💡', '✨'], 6);
  say(`💡 Pista: en la casilla marcada va el ${sol[c]}. ¡Ponlo, ${name(turn)}!`);
};

/* ─────────────────────────────────────────────────────────────
   F) EVENTOS E INICIO
   ───────────────────────────────────────────────────────────── */
$('new').onclick = newGame;
$('size').onchange = () => {
  const s = $('size').value;
  $('diff').value = s === '6' ? '0' : s === '9' ? '1' : '2';
  newGame();
};
$('diff').onchange = newGame;

try {
  const urlParams = new URLSearchParams(window.location.search);
  const qSize = urlParams.get('size');
  if (qSize && ['6', '9', '12'].includes(qSize)) {
    $('size').value = qSize;
    $('diff').value = qSize === '6' ? '0' : qSize === '9' ? '1' : '2';
  }
} catch (e) {}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key >= '1' && e.key <= '9' && +e.key <= N) {
    place(+e.key);
  }
});

newGame();
