/**
 * ============================================================================
 * TETRIS DE PAREJA - MODO 1v1 LOCAL (MOTOR IDÉNTICO AL TETRIS ANTERIOR/CLÁSICO)
 * ============================================================================
 * Carpeta: modes/versus-1v1.js
 * 
 * Corre 2 tableros en paralelo con el MISMO MOTOR del juego clásico:
 * - Remolinos gravitatorios con giro de bloques rígidos (spinEvent / comps)
 * - Super remolino con giro de 900° e inversión de gravedad (mundo al revés)
 * - Perspectiva 3D y tambaleo con perspectiva en el contenedor (tilt / perspective)
 * - Efecto de caída animada de bloques flotantes con easing cuadrático (fall / canim)
 * - Reventón por coincidencia de color (sameGroup) con ondas y chispas
 * - Cadenas de caída libre (chain / contactGroups)
 * - Colapso masivo (collapse: "¡Todo cae!")
 * - Habilidad de última salvación (fireSave / useSave con rayo dorado y salvavidas 🛟)
 * - Partículas de polvo al aterrizar (dust) y explosiones radiales (burst)
 * - Música chiptune y síntesis en tiempo real con Web Audio API
 * - Traspaso de filas grises basura (garbage) al rival al hacer combos y líneas
 * 
 * Controles simultáneos:
 * - P1 (Ella - Rosa): A/D (mover), S (bajar suave), W (rotar), Espacio (caída de golpe), E (salvación)
 * - P2 (Él - Azul): Flechas ◀/▶ (mover), ▼ (bajar suave), ▲ (rotar), Enter (caída de golpe), Shift/L (salvación)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TetrisVersus1v1 = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {

  const CFG = {
    colorElla: '#e8467c',
    colorEl: '#3b82f6',
    colores: ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444'],
    nombresColores: ['Cian', 'Amarillo', 'Morado', 'Verde', 'Rojo'],
    colorBasura: '#64748b',
    radioBloque: 6,
    brilloBloque: true,
    puntoDueno: true,

    velInicial: 2.5,
    velFinal: 20,
    ptsLocura: 12000,
    velMax: 30,
    basuraCada: 4,
    grisesIniciales: 4,

    remolinoCada: 3,
    megaCada: 10,

    puntosLinea: [0, 150, 450, 750, 1200],
    puntosReventon: 15,
    salvacionBase: 1000,
    salvacionTope: 8000
  };

  const C = 30;
  const W = 10;
  const H = 20;

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
  const COL = [CFG.colorElla, CFG.colorEl];
  const PAL = [...CFG.colores, CFG.colorBasura];
  const CN = CFG.nombresColores;

  const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // --- SÍNTESIS DE AUDIO COMPARTIDA (WEB AUDIO API) ---
  class SharedVersusAudio {
    constructor() {
      this.AC = null;
      this.mute = false;
      this.NB = null;
      this.mt = 0;
      this.ms = 0;
      this.PR = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    }

    init() {
      if (!this.AC) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.AC = new AudioCtx();
      }
      if (this.AC && this.AC.state === 'suspended') {
        this.AC.resume();
      }
    }

    mf(n) {
      return 440 * Math.pow(2, (n - 69) / 12);
    }

    snd(f, d, ty = 'sine', v = 0.15, to = null) {
      if (!this.AC || this.mute) return;
      try {
        const t = this.AC.currentTime;
        const o = this.AC.createOscillator();
        const gn = this.AC.createGain();
        o.type = ty;
        o.frequency.setValueAtTime(f, t);
        if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + d);
        gn.gain.setValueAtTime(v, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(gn);
        gn.connect(this.AC.destination);
        o.start(t);
        o.stop(t + d);
      } catch (e) {}
    }

    nz(d, f0, f1, v) {
      if (!this.AC || this.mute) return;
      try {
        if (!this.NB) {
          this.NB = this.AC.createBuffer(1, this.AC.sampleRate, this.AC.sampleRate);
          const a = this.NB.getChannelData(0);
          for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
        }
        const t = this.AC.currentTime;
        const sr = this.AC.createBufferSource();
        const f = this.AC.createBiquadFilter();
        const gn = this.AC.createGain();
        sr.buffer = this.NB;
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
        gn.connect(this.AC.destination);
        sr.start(t);
        sr.stop(t + d + 0.05);
      } catch (e) {}
    }

    musicStart(isActive) {
      clearTimeout(this.mt);
      this.ms = 0;
      this.mtick(isActive);
    }

    musicStop() {
      clearTimeout(this.mt);
    }

    mtick(isActive) {
      if (!isActive()) return;
      const bpm = 124;
      const st = 60 / bpm / 4;
      const ch = this.PR[(this.ms >> 4) & 3];
      const i = this.ms % 16;

      if (i % 4 === 0) this.snd(this.mf(ch[0] - 24), st * 3.5, 'sawtooth', 0.05, this.mf(ch[0] - 24) * 0.98);
      if (i % 8 === 0) this.snd(130, 0.16, 'sine', 0.25, 40);
      if (i % 8 === 4) this.nz(0.12, 1500, 3000, 0.1);
      if (i % 2 === 1) this.nz(0.04, 6000, 9000, 0.03);
      this.snd(this.mf(ch[this.ms % 3] + (i & 4 ? 24 : 12)), st * 1.6, 'triangle', 0.04);

      this.ms++;
      this.mt = setTimeout(() => this.mtick(isActive), st * 1000);
    }
  }

  const audio = new SharedVersusAudio();

  // --- MOTOR CLÁSICO DE TETRIS COMPLETO (IDENTICO A TETRIS.JS) ---
  class ClassicTetrisEngine {
    constructor(canvasId, playerIdx, scoreElId, linesElId, skfId, sktId, audioRef) {
      this.cv = document.getElementById(canvasId);
      this.x = this.cv ? this.cv.getContext('2d') : null;
      this.w = this.cv ? this.cv.parentNode : null; // .boardwrap
      this.playerIdx = playerIdx; // 0 = Ella (Rosa), 1 = Él (Azul)
      this.name = playerIdx === 0 ? 'Ella' : 'Él';
      this.scoreEl = document.getElementById(scoreElId);
      this.linesEl = document.getElementById(linesElId);
      this.skfEl = document.getElementById(skfId);
      this.sktEl = document.getElementById(sktId);
      this.audio = audioRef;
      this.rival = null;
      this.pendingGarbage = 0;
      this.onGameOver = null;

      // Estado interno del motor (idéntico a tetris.js)
      this.g = null;
      this.gi = null;
      this.p = null;
      this.turn = playerIdx;
      this.sc = 0;
      this.ln = 0;
      this.run = false;
      this.over = false;
      this.busy = false;
      this.soft = false;
      this.now = 0;
      this.last = 0;
      this.spinT = -1e9;
      this.spinC = [5, 10];
      this.fN = 0;
      this.fT = 0;
      this.aS = 0;
      this.aE = 0;
      this.orient = 0;
      this.parts = [];
      this.rings = [];
      this.marked = new Set();
      this.msg = '';
      this.msgC = '#fff';
      this.msgT = 0;
      this.playT = 0;
      this.tier = 0;
      this.lastSec = -1;
      this.anim = null;
      this.animT = 0;
      this.pid = 0;
      this.canimDur = 900;
      this.lineFx = null;
      this.mega = false;
      this.epic = false;
      this.curDur = 900;
      this.canim = null;
      this.canimT = 0;
      this.rb0 = 0;
      this.flipMsg = false;
      this.saving = false;
      this.skBase = 0;
      this.skCost = CFG.salvacionBase;
      this.skReady = false;
      this.skUses = 0;
      this.saveFx = null;
      this.tl = 0;
      this.GA = 1;
      this.shk = 0;
      this.lastHitSnd = 0;
      this.ANIM = 2400;
      this.lc = 0;
    }

    fits(m, px, py) {
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[0].length; c++) {
          if (m[r][c]) {
            const a = px + c, b = py + r;
            if (a < 0 || a >= W || b >= H || (b >= 0 && this.g[b][a] !== null)) return false;
          }
        }
      }
      return true;
    }

    kick(nm) {
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0]]) {
        if (this.fits(nm, this.p.x + dx, this.p.y + dy)) {
          this.p.m = nm;
          this.p.x += dx;
          this.p.y += dy;
          return true;
        }
      }
      return false;
    }

    reset() {
      if (this.w) {
        this.w.classList.remove('warn');
        this.w.style.transform = '';
      }
      if (this.cv) this.cv.style.transform = '';
      this.skBase = 0;
      this.skCost = CFG.salvacionBase;
      this.skUses = 0;
      this.skReady = false;
      this.saving = false;
      this.saveFx = null;
      this.lineFx = null;
      this.aS = this.aE = 0;
      this.orient = 0;
      this.parts = [];
      this.rings = [];
      this.marked = new Set();
      this.lc = 0;
      this.epic = false;
      this.mega = false;
      this.canim = null;
      this.playT = 0;
      this.tier = 0;
      this.lastSec = -1;
      this.anim = null;
      this.g = Array.from({ length: H }, () => Array(W).fill(null));
      this.gi = Array.from({ length: H }, () => Array(W).fill(null));
      this.sc = 0;
      this.ln = 0;
      this.turn = this.playerIdx;
      this.over = false;
      this.busy = false;
      this.pendingGarbage = 0;
      this.initGray();
      this.spawn();
      this.ui();
    }

    initGray() {
      [...Array(W).keys()].sort(() => Math.random() - 0.5).slice(0, CFG.grisesIniciales).forEach(c => {
        this.g[H - 1][c] = 10;
        this.gi[H - 1][c] = ++this.pid;
      });
    }

    spawn() {
      const k = KS[Math.random() * KS.length | 0];
      const m = SH[k];
      const px = (W - m[0].length) / 2 | 0;
      this.p = { m, k, id: ++this.pid, col: Math.random() * 5 | 0, x: px, vx: px, y: 0, f: 0, hard: false, done: false };
      if (!this.fits(this.p.m, this.p.x, this.p.y)) {
        if (!(this.saveReady() && this.fireSave(true, () => this.spawn()))) this.end();
      }
      this.ui();
    }

    ui() {
      if (this.scoreEl) this.scoreEl.textContent = this.sc.toLocaleString('es');
      if (this.linesEl) this.linesEl.textContent = this.ln + ' líneas';
      const ch = Math.min(1, Math.max(0, (this.sc - this.skBase) / this.skCost));
      if (this.skfEl) this.skfEl.style.width = (ch * 100) + '%';
      if (this.sktEl) {
        const keyName = this.playerIdx === 0 ? 'E' : 'Shift';
        this.sktEl.textContent = ch >= 1 ? `🛟 ¡LISTA! (${keyName})` : `🛟 ${Math.max(0, this.sc - this.skBase)} / ${this.skCost} pts`;
      }
      if (ch >= 1 && !this.skReady) {
        this.skReady = true;
        if (this.run) {
          const keyName = this.playerIdx === 0 ? 'E' : 'Shift';
          this.toast(`🛟 ¡Salvación lista! Pulsa ${keyName}`, '#facc15');
          this.audio.snd(880, 0.2, 'triangle', 0.12, 1320);
        }
      }
    }

    level() {
      return 1 + (this.ln / 10 | 0);
    }

    end() {
      if (this.over) return;
      this.over = true;
      this.run = false;
      this.audio.snd(180, 0.8, 'sawtooth', 0.25, 40);
      this.toast('💀 ¡Fin del juego!', '#ef4444');
      if (this.onGameOver) this.onGameOver(this);
    }

    dust(S) {
      if (!this.p) return;
      this.p.m[0].forEach((_, c) => {
        let r = this.p.m.length - 1;
        while (r >= 0 && !this.p.m[r][c]) r--;
        if (r < 0) return;
        for (let i = 0; i < 4 * S; i++) {
          this.parts.push({
            x: (this.p.x + c + 0.5) * C + (Math.random() - 0.5) * C,
            y: (this.p.y + r + 1) * C,
            vx: (Math.random() - 0.5) * 170 * S,
            vy: -Math.random() * 80,
            l: 1,
            c: '#d9cbbd'
          });
        }
      });
    }

    burst(px, py, col, n, v) {
      for (let i = 0; i < n; i++) {
        const an = Math.random() * 6.283;
        const sp = v * 0.25 + Math.random() * v;
        this.parts.push({
          x: px,
          y: py,
          vx: Math.cos(an) * sp,
          vy: Math.sin(an) * sp,
          l: 1,
          c: i % 3 ? col : '#fff'
        });
      }
    }

    toast(t, c) {
      this.msg = t;
      this.msgC = c;
      this.msgT = this.now + 1500;
    }

    land() {
      if (this.busy) return;
      this.busy = true;
      this.p.f = 0;
      this.p.vx = this.p.x;
      this.lc++;
      this.mega = this.lc % CFG.megaCada === 0;
      this.epic = this.mega || this.lc % CFG.remolinoCada === 0;
      this.curDur = 340;
      this.spinT = this.now;
      this.spinC = [this.p.x + this.p.m[0].length / 2, this.p.y + this.p.m.length / 2];

      const S = Math.min(2.2, (this.p.hard ? 1.7 : 1) * (1 + Math.min(this.p.v || 0, 25) * 0.02));
      this.shk = Math.max(this.shk, 9 * S);
      this.audio.snd(62, 0.7, 'sine', 0.65, 26);
      this.audio.snd(42, 1, 'sawtooth', 0.1 * Math.min(S, 1.6), 28);
      this.audio.nz(0.55, 500, 70, 0.4 * Math.min(S, 1.6));
      this.burst(this.spinC[0] * C, this.spinC[1] * C, PAL[this.p.col], 14, 150);
      this.dust(S);
      setTimeout(() => this.lock(), this.curDur * 0.9);
      this.ui();
    }

    sameGroup(pc) {
      const k = (r, c) => r * W + c;
      const inP = new Set(pc.map(a => k(a[0], a[1])));
      const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const nb = (r, c) => D.map(d => [r + d[0], c + d[1]]).filter(a => a[0] >= 0 && a[0] < H && a[1] >= 0 && a[1] < W);
      const sm = b => ((this.g[b[0]][b[1]] ?? -2) >> 1) === this.p.col;

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

    lock() {
      this.p.done = true;
      const pc = [];
      this.p.m.forEach((row, r) => row.forEach((v, c) => {
        if (v && this.p.y + r >= 0) {
          this.g[this.p.y + r][this.p.x + c] = this.p.col * 2 + this.turn;
          this.gi[this.p.y + r][this.p.x + c] = this.p.id;
          pc.push([this.p.y + r, this.p.x + c]);
        }
      }));

      const grp = this.sameGroup(pc);
      if (!grp.length) {
        this.settle(false);
        return;
      }

      const q = this.spinC;
      const d = a => Math.hypot(a[1] + 0.5 - q[0], a[0] + 0.5 - q[1]);
      grp.sort((a, b) => d(a) - d(b));
      this.marked = new Set(grp.map(a => a[0] * W + a[1]));
      this.toast('💥 ¡' + CN[this.p.col] + ' con ' + CN[this.p.col].toLowerCase() + '! ×' + grp.length, PAL[this.p.col]);
      this.audio.snd(300, 0.3, 'square', 0.08, 900);

      // Traspaso de fila basura al rival en caso de reventón grande
      if (this.rival && grp.length >= 5) {
        this.rival.pendingGarbage += Math.floor(grp.length / 5);
      }

      let i = 0;
      const step = () => {
        if (i >= grp.length) {
          this.marked.clear();
          setTimeout(() => this.settle(true), 220);
          return;
        }
        const r = grp[i][0], c = grp[i][1];
        this.g[r][c] = null;
        this.gi[r][c] = null;
        this.marked.delete(r * W + c);
        this.burst((c + 0.5) * C, (r + 0.5) * C, PAL[this.p.col], 16, 200);
        this.rings.push({ x: (c + 0.5) * C, y: (r + 0.5) * C, l: 1, c: PAL[this.p.col] });
        this.audio.snd(420 + Math.min(i, 14) * 55, 0.14, 'triangle', 0.22, 90);
        this.sc += CFG.puntosReventon;
        i++;
        this.ui();
        setTimeout(step, Math.max(55, 140 - i * 4));
      };
      setTimeout(step, 380);
    }

    clearAnim(cb) {
      const rows = [];
      for (let r = 0; r < H; r++) {
        if (this.g[r].every(v => v !== null)) rows.push(r);
      }
      if (!rows.length) { cb(); return; }

      const n = rows.length;
      const gray = rows.reduce((a, r) => a + this.g[r].filter(v => (v >> 1) === 5).length, 0);
      this.ln += n;
      this.sc += CFG.puntosLinea[n] * this.level();
      this.audio.snd(520, 0.5, 'triangle', 0.2, 1300);
      if (gray) this.audio.snd(180, 0.3, 'square', 0.1, 60);
      this.lineFx = { rows, t: this.now };

      // Enviar filas basura al rival: 2 líneas -> 1 basura, 3 -> 2, 4 -> 4
      if (this.rival && n >= 2) {
        const toSend = n === 4 ? 4 : (n - 1);
        this.rival.pendingGarbage += toSend;
        this.toast(`⚔️ ¡Envías ${toSend} fila${toSend > 1 ? 's' : ''}!`, '#f43f5e');
      } else {
        this.toast(gray ? '🧹 ¡Fila completa! Se borran ' + gray + ' bloques grises' : '✨ ¡Fila completa!', gray ? '#cbd5e1' : '#fde047');
      }

      rows.forEach(r => this.g[r].forEach((v, c) => this.burst((c + 0.5) * C, (r + 0.5) * C, PAL[v >> 1], (v >> 1) === 5 ? 5 : 9, 200)));

      setTimeout(() => {
        rows.forEach(r => this.g[r].forEach((v, c) => this.burst((c + 0.5) * C, (r + 0.5) * C, '#fff', 3, 320)));
        const mv = [];
        for (let r = 0; r < H; r++) {
          if (rows.includes(r)) continue;
          const k = rows.filter(q => q > r).length;
          this.g[r].forEach((v, c) => {
            if (v !== null) mv.push({ v, c, r0: r, r1: r + k, d: 0 });
          });
        }
        for (let i = rows.length - 1; i >= 0; i--) {
          this.g.splice(rows[i], 1);
          this.gi.splice(rows[i], 1);
        }
        for (let i = 0; i < n; i++) {
          this.g.unshift(Array(W).fill(null));
          this.gi.unshift(Array(W).fill(null));
        }
        this.shk = Math.max(this.shk, 8);
        this.canim = mv;
        this.canimT = this.now;
        this.canimDur = 380;
        this.audio.snd(110, 0.3, 'sine', 0.4, 45);
        setTimeout(() => {
          this.canim = null;
          this.lineFx = null;
          cb();
        }, 400);
      }, 650);
    }

    fall(cb) {
      const mv = [], moved = new Set();
      for (let c = 0; c < W; c++) {
        const a = [];
        for (let r = H - 1; r >= 0; r--) {
          if (this.g[r][c] !== null) a.push([r, this.g[r][c], this.gi[r][c]]);
        }
        a.forEach((e, i) => {
          const r1 = H - 1 - i;
          mv.push({ v: e[1], c, r0: e[0], r1, d: e[0] === r1 ? 0 : 0.3 * (1 - r1 / H) });
          if (e[0] !== r1) moved.add(r1 * W + c);
        });
        for (let r = H - 1, i = 0; r >= 0; r--, i++) {
          this.g[r][c] = i < a.length ? a[i][1] : null;
          this.gi[r][c] = i < a.length ? a[i][2] : null;
        }
      }
      if (!moved.size) { cb(moved); return; }
      this.canim = mv;
      this.canimT = this.now;
      this.canimDur = 900;
      this.audio.snd(120, 0.35, 'sine', 0.3, 50);
      setTimeout(() => {
        this.canim = null;
        this.shk = Math.max(this.shk, 6);
        cb(moved);
      }, 950);
    }

    contactGroups(moved) {
      const seen = Array.from({ length: H }, () => Array(W).fill(false)), out = [];
      const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if (this.g[r][c] === null || seen[r][c]) continue;
          const col = this.g[r][c] >> 1;
          if (col > 4) continue;
          const cells = [], st = [[r, c]];
          seen[r][c] = true;
          let hit = false;
          while (st.length) {
            const [a, b] = st.pop();
            cells.push([a, b]);
            for (const [dr, dc] of D) {
              const ra = a + dr, ca = b + dc;
              if (ra < 0 || ra >= H || ca < 0 || ca >= W || this.g[ra][ca] === null || (this.g[ra][ca] >> 1) !== col) continue;
              if (this.gi[ra][ca] !== this.gi[a][b] && (moved.has(a * W + b) || moved.has(ra * W + ca))) hit = true;
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

    chain(moved, n, done) {
      const gs = this.contactGroups(moved);
      if (!gs.length || n >= 8) { done(); return; }
      const list = [];
      gs.forEach(G => G.cells.forEach(([r, c]) => list.push({ r, c, col: G.col })));
      list.sort((a, b) => a.r - b.r || a.c - b.c);
      this.marked = new Set(list.map(o => o.r * W + o.c));

      this.toast('⚡ ¡CADENA ×' + (n + 2) + '!', PAL[list[0].col]);
      this.audio.snd(300, 0.3, 'square', 0.08, 900 + n * 200);

      if (this.rival) {
        this.rival.pendingGarbage += 1;
      }

      let i = 0;
      const step = () => {
        if (i >= list.length) {
          this.marked.clear();
          setTimeout(() => this.fall(m2 => this.chain(m2, n + 1, done)), 160);
          return;
        }
        const o = list[i];
        this.g[o.r][o.c] = null;
        this.gi[o.r][o.c] = null;
        this.marked.delete(o.r * W + o.c);
        this.burst((o.c + 0.5) * C, (o.r + 0.5) * C, PAL[o.col], 16, 200);
        this.rings.push({ x: (o.c + 0.5) * C, y: (o.r + 0.5) * C, l: 1, c: PAL[o.col] });
        this.audio.snd(420 + Math.min(i, 14) * 55 + n * 40, 0.14, 'triangle', 0.22, 90);
        this.sc += CFG.puntosReventon * (n + 2);
        i++;
        this.ui();
        setTimeout(step, Math.max(45, 120 - i * 4));
      };
      setTimeout(step, 300);
    }

    settle(popped) {
      const go = () => this.clearAnim(() => {
        if (!(this.epic && this.spinEvent())) this.finish();
      });
      if (popped) this.fall(m => this.chain(m, 0, go));
      else go();
    }

    comps() {
      const seen = Array.from({ length: H }, () => Array(W).fill(false)), out = [];
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if (this.g[r][c] === null || seen[r][c]) continue;
          const id = this.gi[r][c], st = [[r, c]], cells = [];
          seen[r][c] = true;
          while (st.length) {
            const [a, b] = st.pop();
            cells.push([a, b]);
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const ra = a + dr, ca = b + dc;
              if (ra >= 0 && ra < H && ca >= 0 && ca < W && !seen[ra][ca] && this.g[ra][ca] !== null && this.gi[ra][ca] === id) {
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

    saveReady() {
      return this.sc - this.skBase >= this.skCost;
    }

    fireSave(auto, cb) {
      let br = -1, bc = 0;
      for (let r = 0; r < H; r++) {
        const n = this.g[r].filter(v => v !== null).length;
        if (n > 0 && n >= bc) {
          bc = n;
          br = r;
        }
      }
      if (br < 0) return false;

      this.saving = true;
      this.busy = true;
      if (auto && this.p) this.p.done = true;

      this.skBase = this.sc;
      this.skUses++;
      this.skCost = Math.min(CFG.salvacionTope, CFG.salvacionBase * Math.pow(2, this.skUses));
      this.skReady = false;

      if (this.skfEl) {
        this.skfEl.style.transition = 'width 1.3s ease-in';
        this.ui();
        setTimeout(() => { if (this.skfEl) this.skfEl.style.transition = ''; }, 1400);
      }

      this.saveFx = { r: br, t: this.now, auto };
      this.toast(auto ? '🛟 ¡Te salvó de perder!' : '🛟 ¡Fila borrada!', '#facc15');
      this.audio.snd(200, 0.65, 'sawtooth', 0.08, 1600);
      this.audio.nz(0.7, 400, 6000, 0.3);

      [72, 76, 79, 84].forEach((n, i) => setTimeout(() => this.audio.snd(this.audio.mf(n), 0.9, 'triangle', 0.12), i * 140));

      setTimeout(() => {
        this.g[br].forEach((v, c) => {
          if (v !== null) this.burst((c + 0.5) * C, (br + 0.5) * C, PAL[v >> 1], 8, 260);
          this.burst((c + 0.5) * C, (br + 0.5) * C, '#fde047', 3, 320);
        });
        this.g.splice(br, 1);
        this.g.unshift(Array(W).fill(null));
        this.gi.splice(br, 1);
        this.gi.unshift(Array(W).fill(null));
        this.shk = 14;
        this.audio.snd(70, 0.8, 'sine', 0.55, 28);
        this.audio.nz(0.6, 3000, 150, 0.45);
        [84, 88, 91, 96].forEach((n, i) => setTimeout(() => this.audio.snd(this.audio.mf(n), 0.7, 'triangle', 0.09), i * 90));
      }, 650);

      setTimeout(() => {
        this.saveFx = null;
        this.saving = false;
        this.busy = false;
        if (!auto && this.p && !this.p.done) {
          while (!this.fits(this.p.m, this.p.x, this.p.y) && this.p.y > -4) this.p.y--;
        }
        this.ui();
        if (cb) cb();
      }, 1500);

      return true;
    }

    useSave() {
      if (!this.run || this.over || this.busy || this.anim || this.canim || this.saving || (this.p && this.p.hard) || !this.saveReady()) return;
      this.fireSave(false);
    }

    collapse() {
      const mv = [];
      for (let c = 0; c < W; c++) {
        const a = [];
        for (let r = H - 1; r >= 0; r--) {
          if (this.g[r][c] !== null) a.push([r, this.g[r][c], this.gi[r][c]]);
        }
        a.forEach((e, i) => {
          const r1 = H - 1 - i;
          mv.push({ v: e[1], c, r0: e[0], r1, d: e[0] === r1 ? 0 : 0.35 * (1 - r1 / H) });
        });
        for (let r = H - 1, i = 0; r >= 0; r--, i++) {
          this.g[r][c] = i < a.length ? a[i][1] : null;
          this.gi[r][c] = i < a.length ? a[i][2] : null;
        }
      }
      if (!mv.some(m => m.r0 !== m.r1)) return false;

      this.canim = mv;
      this.canimT = this.now;
      this.canimDur = 900;
      this.audio.snd(60, 0.9, 'sine', 0.4, 30);
      this.audio.nz(0.9, 2500, 200, 0.3);
      this.toast('⬇️ ¡Todo cae!', '#ef4444');

      setTimeout(() => {
        this.canim = null;
        this.shk = 14;
        this.audio.snd(55, 1, 'sine', 0.6, 22);
        this.audio.nz(0.8, 2000, 90, 0.5);
        this.burst(150, 560, '#fff', 60, 380);
        this.clearAnim(() => this.finish());
      }, 1100);
      return true;
    }

    spinEvent() {
      let top = H;
      for (let r = 0; r < H; r++) {
        if (this.g[r].some(v => v !== null)) { top = r; break; }
      }
      const rows = H - top;
      if (rows <= 0 && !this.mega) return false;

      const heavy = rows > H / 2 || this.mega, turns = heavy ? 2 : 1;
      const groups = this.comps().map(cells => {
        let r0 = 99, r1 = -1, c0 = 99, c1 = -1;
        cells.forEach(([r, c]) => {
          r0 = Math.min(r0, r); r1 = Math.max(r1, r);
          c0 = Math.min(c0, c); c1 = Math.max(c1, c);
        });
        const h = r1 - r0 + 1, w = c1 - c0 + 1;
        const m = Array.from({ length: h }, () => Array(w).fill(0));
        cells.forEach(([r, c]) => m[r - r0][c - c0] = 1);
        return {
          cells, r0, r1, c0, c1, m,
          val: this.g[cells[0][0]][cells[0][1]],
          id: this.gi[cells[0][0]][cells[0][1]]
        };
      });

      groups.sort((a, b) => b.r1 - a.r1);
      groups.forEach(G => G.cells.forEach(([r, c]) => { this.g[r][c] = null; this.gi[r][c] = null; }));

      const cellsOf = (m, l, t) => {
        const o = [];
        m.forEach((row, i) => row.forEach((v, j) => { if (v) o.push([t + i, l + j]); }));
        return o;
      };

      const ok = cl => cl.every(([r, c]) => c >= 0 && c < W && r >= 0 && r < H && this.g[r][c] === null);
      const ok2 = cl => ok(cl) && cl.every(([r]) => r >= top);
      const put = (G, cl, th) => {
        G.final = cl;
        G.th = th;
        cl.forEach(([r, c]) => { this.g[r][c] = G.val; this.gi[r][c] = G.id; });
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
            if (!G.final.every(([r, c]) => r + 1 < H && (this.g[r + 1][c] === null || own.has((r + 1) * W + c)))) break;
            G.final.forEach(([r, c]) => { this.g[r][c] = null; this.gi[r][c] = null; });
            G.final = G.final.map(([r, c]) => [r + 1, c]);
            G.final.forEach(([r, c]) => { this.g[r][c] = G.val; this.gi[r][c] = G.id; });
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

      this.anim = fin.map(G => {
        const o = bb(G.cells);
        const n = bb(G.final);
        return {
          val: G.val,
          th: G.th,
          o,
          n,
          dl: 0.22 * (1 - n[1] / H),
          sp: this.mega ? 5 : heavy ? 3 : 2,
          fell: n[1] - o[1] > 0.4,
          hh: (Math.max(...G.final.map(z => z[0])) - Math.min(...G.final.map(z => z[0])) + 1) / 2,
          off: G.cells.map(([r, c]) => [c + 0.5 - o[0], r + 0.5 - o[1]])
        };
      });

      this.ANIM = this.mega ? 3000 : 2400;
      this.animT = this.now;
      if (this.mega) {
        this.rb0 = this.orient * 180;
        this.orient ^= 1;
        this.flipMsg = true;
      }
      this.burst(150, 300, '#fff', this.mega ? 90 : 50, this.mega ? 420 : 320);
      this.toast(this.mega ? '🌪️ ¡SUPER REMOLINO!' : heavy ? '⚠️ ¡Giro doble y se pone peor!' : '↻ ¡Todo gira a la derecha!', heavy ? '#ef4444' : '#f59e0b');

      const L = this.mega ? 3 : 1.4;
      this.audio.snd(80, L, 'sawtooth', 0.1, this.mega ? 1100 : 700);
      this.audio.snd(300, L, 'square', 0.04, 1800);
      this.audio.nz(L + 0.1, 200, this.mega ? 7000 : 5000, 0.35);
      this.audio.snd(50, L + 0.6, 'sine', 0.35, 35);

      setTimeout(() => {
        this.anim = null;
        this.audio.snd(70, 1, 'sine', 0.55, 25);
        this.audio.nz(0.9, 3000, 120, 0.5);
        this.toast('💥 ¡BOOM!', '#f59e0b');
        this.shk = 9;
        if (this.mega && this.collapse()) return;
        this.clearAnim(() => this.finish());
      }, this.ANIM + 200);

      return true;
    }

    garbage() {
      const o = this.g[0].some(v => v !== null);
      for (let r = 0; r < H - 1; r++) {
        this.g[r] = this.g[r + 1];
        this.gi[r] = this.gi[r + 1];
      }
      const h = Math.random() * W | 0;
      this.g[H - 1] = Array.from({ length: W }, (_, c) => c === h ? null : 10);
      this.gi[H - 1] = Array.from({ length: W }, (_, c) => c === h ? null : ++this.pid);
      return o;
    }

    finish() {
      this.sc += 10;
      this.busy = false;

      let addedGarbage = false;
      while (this.pendingGarbage > 0) {
        this.pendingGarbage--;
        addedGarbage = true;
        if (this.garbage()) { this.end(); return; }
      }

      if (!addedGarbage && this.lc % CFG.basuraCada === 0 && this.lc > 0) {
        this.toast('⬆️ ¡Fila basura!', '#64748b');
        this.audio.snd(110, 0.25, 'square', 0.12, 60);
        this.shk = Math.max(this.shk, 7);
        if (this.garbage()) { this.end(); return; }
      } else if (addedGarbage) {
        this.toast('⬆️ ¡Ataque rival recibido!', '#ef4444');
        this.audio.snd(110, 0.25, 'square', 0.12, 60);
        this.shk = Math.max(this.shk, 7);
      }

      this.spawn();
      const mg = (this.lc + 1) % CFG.megaCada === 0;
      const w = mg || (this.lc + 1) % CFG.remolinoCada === 0;
      if (this.w) this.w.classList.toggle('warn', w);

      if (w) {
        this.toast(mg ? '⚠️ ¡SUPER REMOLINO! Se invierte la gravedad' : '⚠️ ¡Próxima caída: REMOLINO!', mg ? '#ef4444' : '#f59e0b');
        this.audio.snd(70, 0.5, 'sine', 0.3, 60);
      }
      if (this.flipMsg) {
        this.flipMsg = false;
        this.toast(this.orient ? '🙃 ¡MUNDO AL REVÉS! Caen de abajo hacia arriba' : '🙂 ¡Mundo derecho otra vez!', this.orient ? '#ef4444' : '#22c55e');
      }
    }

    ok() {
      return this.run && !this.busy && !this.over && !this.p.hard;
    }

    move(d) {
      d = this.orient ? -d : d;
      if (this.ok() && this.fits(this.p.m, this.p.x + d, this.p.y)) {
        this.p.x += d;
        this.audio.snd(300, 0.05, 'triangle', 0.08, 260);
      }
    }

    turnPiece() {
      if (this.ok() && this.kick(rot(this.p.m))) {
        this.audio.nz(0.14, 600, 2600, 0.12);
        this.audio.snd(520, 0.07, 'triangle', 0.08, 780);
      }
    }

    hard() {
      if (this.ok()) {
        this.p.hard = true;
        this.audio.nz(0.3, 3500, 500, 0.18);
        this.audio.snd(900, 0.3, 'sine', 0.05, 200);
      }
    }

    flipCss() {
      let deg = this.orient * 180, k = 1;
      if (this.anim && this.mega) {
        const e = ease(Math.min(1, (this.now - this.animT) / this.ANIM / 0.75));
        deg = this.rb0 + 900 * e;
        k = 1 - 0.45 * Math.sin(Math.PI * e);
      }
      if (this.cv) this.cv.style.transform = 'rotate(' + deg + 'deg) scale(' + k + ')';
    }

    tilt() {
      const w = this.w;
      if (!w) return;
      if (this.anim) {
        const t = Math.min(1, (this.now - this.animT) / this.ANIM);
        const sn = Math.sin(Math.PI * t);
        w.style.transform = 'perspective(800px) rotateX(' + sn * 14 + 'deg) rotateZ(' + Math.sin(t * 12.566) * 3 * sn + 'deg) scale(' + (1 + 0.06 * sn) + ')';
        this.tl = 1;
      } else if (this.shk > 0.3) {
        w.style.transform = 'translate(' + Math.sin(this.now / 22) * this.shk * 0.5 + 'px,' + Math.sin(this.now / 17) * this.shk * 0.4 + 'px) rotate(' + Math.sin(this.now / 31) * this.shk * 0.07 + 'deg)';
        this.tl = 1;
      } else if (this.tl) {
        w.style.transform = '';
        this.tl = 0;
      }
    }

    cellAt(cx, cy, col, own, glow, ang) {
      const x = this.x;
      x.save();
      x.globalAlpha = this.GA;
      x.translate(cx * C + C / 2, cy * C + C / 2);
      if (ang) x.rotate(ang);
      x.fillStyle = col;
      x.beginPath();
      x.roundRect(-C / 2 + 1, -C / 2 + 1, C - 2, C - 2, CFG.radioBloque);
      x.fill();

      if (CFG.brilloBloque) {
        x.globalAlpha = 0.35 * this.GA;
        x.fillStyle = '#fff';
        x.fillRect(-C / 2 + 5, -C / 2 + 5, C - 14, 4);
      }
      x.globalAlpha = this.GA;

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

    pose(G, t) {
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

    drawG(G, t) {
      const q = this.pose(G, t), cs = Math.cos(q.a), sn = Math.sin(q.a);
      G.off.forEach(([ox, oy]) => this.cellAt(
        q.px + ox * cs - oy * sn - 0.5,
        q.py + ox * sn + oy * cs - 0.5,
        PAL[G.val >> 1],
        G.val & 1,
        false,
        q.a
      ));
    }

    draw() {
      const x = this.x;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, 300, 600);

      const q = Math.min(1, Math.max(0, (this.now - this.spinT) / this.curDur));
      const sp = q > 0 && q < 1;
      const sh = (sp ? (1 - q) * 2.5 : 0) + this.shk;

      x.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      x.strokeStyle = 'rgba(255, 255, 255, 0.12)';
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

      if (this.canim) {
        const u = (this.now - this.canimT) / this.canimDur;
        this.canim.forEach(m => {
          const tt = Math.min(1, Math.max(0, (u - m.d) / (1 - m.d)));
          this.cellAt(m.c, m.r0 + (m.r1 - m.r0) * tt * tt, PAL[m.v >> 1], m.v & 1);
        });
      } else if (this.anim) {
        const t = (this.now - this.animT) / this.ANIM;
        for (let gh = 2; gh >= 0; gh--) {
          this.GA = gh ? 0.14 / gh : 1;
          const tt = t - gh * 0.022;
          this.anim.forEach(G => this.drawG(G, tt));
        }
        this.GA = 1;
      } else {
        this.g.forEach((row, r) => row.forEach((v, c) => {
          if (v !== null) {
            const w = this.shk > 0.3 ? Math.sin(this.now / 38 - Math.hypot(c + 0.5 - this.spinC[0], r + 0.5 - this.spinC[1]) * 1.1) * this.shk * 0.45 / C : 0;
            this.cellAt(c, r + w, PAL[v >> 1], v & 1);
          }
        }));
      }

      this.marked.forEach(id => {
        const r = id / W | 0, c = id % W;
        x.save();
        x.globalAlpha = 0.5 + 0.5 * Math.sin(this.now / 45);
        x.strokeStyle = '#fff';
        x.lineWidth = 3;
        x.strokeRect(c * C + 3, r * C + 3, C - 6, C - 6);
        x.restore();
      });

      if (this.p && !this.over && !this.marked.size && !this.anim && !this.busy) {
        const tl2 = Math.min(5, (this.p.v || 0) * 0.07);
        if (tl2 > 0.1) {
          for (let k2 = 4; k2 >= 1; k2--) {
            this.GA = 0.2 / k2;
            this.p.m.forEach((row, r) => row.forEach((v, c) => {
              if (v) this.cellAt(this.p.vx + c, this.p.y + this.p.f + r - tl2 * k2 / 4, PAL[this.p.col]);
            }));
          }
          this.GA = 1;
        }
      }

      if (this.p && !this.over && !this.marked.size && !this.anim && !this.canim && !this.p.done) {
        this.p.m.forEach((row, r) => row.forEach((v, c) => {
          if (v) this.cellAt(this.p.vx + c, this.p.y + this.p.f + r, PAL[this.p.col], this.turn, true);
        }));
      }

      if (sp) {
        x.strokeStyle = PAL[this.p.col];
        x.globalAlpha = 1 - q;
        x.lineWidth = 5 * (1 - q);
        x.beginPath();
        x.arc(this.spinC[0] * C, this.spinC[1] * C, q * 140, 0, 6.283);
        x.stroke();
        x.globalAlpha = 1;
      }

      if (this.lineFx && !this.canim) {
        const t = Math.min(1, (this.now - this.lineFx.t) / 650);
        this.lineFx.rows.forEach(r => {
          x.save();
          x.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(this.now / 45));
          x.fillStyle = '#fff';
          x.fillRect(0, r * C, 300 * Math.min(1, t * 3), C);
          x.globalAlpha = 1;
          x.strokeStyle = '#fde047';
          x.lineWidth = 2;
          x.strokeRect(1, r * C + 1, 298, C - 2);
          x.restore();
        });
      }

      if (this.saveFx) {
        const t = Math.min(1, (this.now - this.saveFx.t) / 1500);
        const y0 = this.saveFx.r * C, bp = Math.min(1, t / 0.4), fd = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
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
            if (this.g[this.saveFx.r][c] !== null && c * C < bp * 300) x.strokeRect(c * C + 3, y0 + 3, C - 6, C - 6);
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

      this.rings.forEach(o => {
        x.globalAlpha = o.l;
        x.strokeStyle = o.c;
        x.lineWidth = 3 * o.l;
        x.beginPath();
        x.arc(o.x, o.y, (1 - o.l) * 50 + 6, 0, 6.283);
        x.stroke();
      });

      this.parts.forEach(o => {
        x.globalAlpha = Math.max(0, o.l);
        x.fillStyle = o.c;
        x.beginPath();
        x.arc(o.x, o.y, 2 + 3 * o.l, 0, 6.283);
        x.fill();
      });
      x.globalAlpha = 1;

      x.setTransform(1, 0, 0, 1, 0, 0);

      if (this.anim) {
        const t = (this.now - this.animT) / this.ANIM;
        if (t < 0.25) {
          x.globalAlpha = 0.4 * (1 - t / 0.25);
          x.fillStyle = '#fff';
          x.fillRect(0, 0, 300, 600);
          x.globalAlpha = 1;
        }
      }

      if (this.saveFx) {
        const t = Math.min(1, (this.now - this.saveFx.t) / 1500);
        if (t < 0.85) {
          x.save();
          if (this.orient) { x.translate(300, 600); x.rotate(Math.PI); }
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
          if (this.saveFx.auto) {
            x.font = 'bold 15px system-ui';
            x.lineWidth = 4;
            x.strokeText('¡Te salvó de perder!', 150, 338);
            x.fillText('¡Te salvó de perder!', 150, 338);
          }
          x.restore();
        }
      }

      if (this.now < this.msgT) {
        x.save();
        if (this.orient) { x.translate(300, 600); x.rotate(Math.PI); }
        x.globalAlpha = Math.min(1, (this.msgT - this.now) / 500);
        x.font = 'bold 20px system-ui';
        x.textAlign = 'center';
        x.lineWidth = 4;
        x.strokeStyle = '#fff';
        x.strokeText(this.msg, 150, 70);
        x.fillStyle = this.msgC;
        x.fillText(this.msg, 150, 70);
        x.globalAlpha = 1;
        x.restore();
      }
    }

    update(dt, t) {
      this.now = t;
      const s = dt / 1000;
      this.parts.forEach(o => { o.x += o.vx * s; o.y += o.vy * s; o.l -= s * 1.2; });
      this.parts = this.parts.filter(o => o.l > 0);
      this.rings.forEach(o => o.l -= s * 2.5);
      this.rings = this.rings.filter(o => o.l > 0);
      this.shk = Math.max(0, this.shk - s * 9);

      if (this.anim) {
        const tRatio = (this.now - this.animT) / this.ANIM;
        this.anim.forEach(G => {
          if (!G.hit && Math.min(1, Math.max(0, (tRatio - G.dl) / 0.78)) >= 0.8) {
            G.hit = true;
            if (G.fell) {
              this.shk = 5;
              this.burst(G.n[0] * C, (G.n[1] + G.hh) * C, PAL[G.val >> 1], 8, 160);
              if (this.now - this.lastHitSnd > 70) {
                this.lastHitSnd = this.now;
                this.audio.snd(90 + Math.random() * 50, 0.12, 'sine', 0.22, 45);
              }
            }
          }
        });
      }

      if (!this.run || this.over) return;

      this.playT += dt;
      const tr = Math.min(30, this.sc / 1200 | 0);
      const sec = this.playT / 1000 | 0;

      if (tr !== this.tier) {
        this.tier = tr;
        this.toast('⚡ ¡Más rápido!', '#f59e0b');
        this.audio.snd(300, 0.35, 'sawtooth', 0.12, 1200);
      }
      if (sec !== this.lastSec) {
        this.lastSec = sec;
        this.ui();
      }
      if (this.busy) return;

      this.p.vx += (this.p.x - this.p.vx) * Math.min(1, s * 28);
      const base = Math.min(
        CFG.velMax,
        CFG.velInicial + this.sc * (CFG.velFinal - CFG.velInicial) / CFG.ptsLocura
      );
      const v = this.p.hard ? 75 : this.soft ? Math.max(18, base * 2) : base;
      this.p.v = v;

      if (!this.fits(this.p.m, this.p.x, this.p.y + 1)) { this.land(); return; }
      this.p.f += v * s;
      while (this.p.f >= 1) {
        if (this.fits(this.p.m, this.p.x, this.p.y + 1)) {
          this.p.y++;
          this.p.f -= 1;
        } else {
          this.land();
          return;
        }
      }
    }
  }

  // --- ADMINISTRADOR DE PARTIDA 1v1 LOCAL ---
  class VersusManager {
    constructor() {
      this.active = false;
      this.rafId = null;
      this.lastTime = 0;
      this.p1 = null;
      this.p2 = null;
      this.keysBound = false;
      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onKeyUp = this.handleKeyUp.bind(this);
    }

    init() {
      if (!this.p1) {
        this.p1 = new ClassicTetrisEngine('c', 0, 'p1-score-val', 'p1-lines-val', 'p1-skf', 'p1-skt', audio);
      }
      if (!this.p2) {
        this.p2 = new ClassicTetrisEngine('c2', 1, 'p2-score-val', 'p2-lines-val', 'p2-skf', 'p2-skt', audio);
      }
      this.p1.rival = this.p2;
      this.p2.rival = this.p1;

      this.p1.onGameOver = () => this.handlePlayerDefeat(this.p1, this.p2);
      this.p2.onGameOver = () => this.handlePlayerDefeat(this.p2, this.p1);

      if (!this.keysBound) {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.keysBound = true;
      }
    }

    start() {
      this.init();
      audio.init();
      this.active = true;

      // Adaptar la UI al modo 1v1
      const bw2 = document.getElementById('boardwrap-2');
      if (bw2) bw2.style.display = 'block';
      const p1b = document.getElementById('p1-badge');
      if (p1b) p1b.style.display = 'block';

      // Tarjetas laterales
      const p1Sc = document.getElementById('p1-score-card');
      if (p1Sc) p1Sc.style.display = 'block';
      const p1Ct = document.getElementById('p1-ctrl-card');
      if (p1Ct) p1Ct.style.display = 'block';

      const p2Sc = document.getElementById('p2-score-card');
      if (p2Sc) p2Sc.style.display = 'block';
      const p2Ct = document.getElementById('p2-ctrl-card');
      if (p2Ct) p2Ct.style.display = 'block';

      // Ocultar tarjetas de modo solo
      ['classic-controls-card', 'classic-score-card', 'classic-record-card', 'card-level', 'sk', 'classic-pad-card'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      const ov = document.getElementById('ov');
      if (ov) ov.style.display = 'none';

      this.p1.reset();
      this.p2.reset();
      this.p1.run = true;
      this.p2.run = true;

      audio.musicStart(() => this.active && !this.p1.over && !this.p2.over);

      this.lastTime = performance.now();
      cancelAnimationFrame(this.rafId);
      this.loop(this.lastTime);
    }

    stop() {
      this.active = false;
      cancelAnimationFrame(this.rafId);
      audio.musicStop();
      if (this.p1) this.p1.run = false;
      if (this.p2) this.p2.run = false;
    }

    handlePlayerDefeat(loser, winner) {
      this.stop();
      audio.snd(120, 1.2, 'sawtooth', 0.35, 40);

      const ov = document.getElementById('ov');
      const ovt = document.getElementById('ovt');
      const startBtn = document.getElementById('start');
      const modeOpt = document.getElementById('mode-options');

      if (ov && ovt) {
        const winColor = winner.playerIdx === 0 ? '#f472b6' : '#60a5fa';
        const winIcon = winner.playerIdx === 0 ? '💗' : '💙';

        ovt.innerHTML = `
          <div style="font-size:1.8rem;font-weight:900;color:${winColor};margin-bottom:8px;text-shadow:0 0 25px ${winColor}88;">
            🏆 ¡GANA ${winner.name.toUpperCase()}! ${winIcon}
          </div>
          <div style="font-size:0.95rem;color:#cbd5e1;line-height:1.4;">
            <b>${winner.name}:</b> ${winner.sc.toLocaleString('es')} pts (${winner.ln} líneas)<br>
            <span style="color:#94a3b8;">${loser.name}: ${loser.sc.toLocaleString('es')} pts (${loser.ln} líneas)</span>
          </div>
        `;

        if (startBtn) {
          startBtn.textContent = 'Jugar otra revancha';
          startBtn.style.display = 'block';
          startBtn.onclick = () => {
            if (ov) ov.style.display = 'none';
            this.start();
          };
        }

        if (modeOpt) modeOpt.style.display = 'none';
        ov.style.display = 'flex';
      }
    }

    handleKeyDown(e) {
      if (!this.active) return;
      if (e.target && e.target.id === 'nm') return;

      const code = e.code;
      const key = e.key;

      // Prevenir scroll en teclas de juego
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(code) || [' ', 'Enter'].includes(key)) {
        e.preventDefault();
      }

      // --- Controles Jugador 1 (Ella - WASD + Espacio + E) ---
      if (code === 'KeyA' || key === 'a' || key === 'A') {
        this.p1.move(-1);
      } else if (code === 'KeyD' || key === 'd' || key === 'D') {
        this.p1.move(1);
      } else if (code === 'KeyS' || key === 's' || key === 'S') {
        this.p1.soft = true;
      } else if (code === 'KeyW' || key === 'w' || key === 'W') {
        if (!e.repeat) this.p1.turnPiece();
      } else if (code === 'Space' || key === ' ') {
        if (!e.repeat) this.p1.hard();
      } else if (code === 'KeyE' || key === 'e' || key === 'E') {
        this.p1.useSave();
      }

      // --- Controles Jugador 2 (Él - Flechas + Enter + Shift/L) ---
      if (code === 'ArrowLeft' || key === 'ArrowLeft') {
        this.p2.move(-1);
      } else if (code === 'ArrowRight' || key === 'ArrowRight') {
        this.p2.move(1);
      } else if (code === 'ArrowDown' || key === 'ArrowDown') {
        this.p2.soft = true;
      } else if (code === 'ArrowUp' || key === 'ArrowUp') {
        if (!e.repeat) this.p2.turnPiece();
      } else if (code === 'Enter' || key === 'Enter') {
        if (!e.repeat) this.p2.hard();
      } else if (code === 'ShiftRight' || code === 'ShiftLeft' || code === 'KeyL' || key === 'l' || key === 'L') {
        this.p2.useSave();
      }
    }

    handleKeyUp(e) {
      if (!this.active) return;
      const code = e.code;
      const key = e.key;

      if (code === 'KeyS' || key === 's' || key === 'S') {
        this.p1.soft = false;
      }
      if (code === 'ArrowDown' || key === 'ArrowDown') {
        this.p2.soft = false;
      }
    }

    loop(t) {
      if (!this.active) return;
      const dt = Math.min(50, t - this.lastTime);
      this.lastTime = t;

      this.p1.update(dt, t);
      this.p1.draw();
      this.p1.tilt();
      this.p1.flipCss();

      this.p2.update(dt, t);
      this.p2.draw();
      this.p2.tilt();
      this.p2.flipCss();

      this.rafId = requestAnimationFrame(time => this.loop(time));
    }
  }

  const manager = new VersusManager();
  return manager;
});
