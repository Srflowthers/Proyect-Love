/**
 * ============================================================================
 * RECONSTRUYE NUESTRO RECUERDO - ROMPECABEZAS ARCADE (LÓGICA DEL JUEGO)
 * ============================================================================
 * Minijuego de rompecabezas fotográfico romántico con piezas jigsaw auténticas
 * generadas mediante curvas Bézier y recorte en Canvas 2D.
 * Incluye audio sintetizado (Web Audio API), motor de partículas, soporte táctil
 * con detección alfa, layout responsivo y niveles de 30 a 500 piezas.
 */

(() => {
  /* ============================================================================
     1. CONSTANTES, ESTADO INICIAL Y ELEMENTOS DOM
     ============================================================================ */
  let COLS = 10, ROWS = 6, N = 60, level = 60;
  const PAD = 8, MAX_MB = 25;

  const $ = id => document.getElementById(id);
  const el = {
    intro: $('lpIntro'),
    game: $('lpGame'),
    file: $('lpFile'),
    prev: $('lpPrev'),
    host: $('lpHost'),
    crop: $('lpCrop'),
    fit: $('lpFit'),
    tip: $('lpTip'),
    hint: $('lpHint'),
    create: $('lpCreate'),
    err: $('lpErr'),
    stage: $('lpStage'),
    board: $('lpBoard'),
    tray: $('lpTray'),
    count: $('lpCount'),
    time: $('lpTime'),
    fill: $('lpFill'),
    done: $('lpDone'),
    doneTime: $('lpDoneTime'),
    ref: $('lpRef')
  };

  /* ============================================================================
     2. MOTOR DE AUDIO SINTETIZADO (WEB AUDIO API - SIN ARCHIVOS EXTERNOS)
     ============================================================================ */
  let AC = null, muted = false;

  const ac = () => {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {}
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  };

  /**
   * Sintetiza un tono con oscilador y envolvente de volumen.
   * f = frecuencia, d = duración, type = tipo de onda, v = volumen, t = retraso, slide = frecuencia final
   */
  function tone(f, d = 0.15, type = 'sine', v = 0.07, t = 0, slide = 0) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + d + 0.03);
  }

  const SFX = {
    click: () => tone(560, 0.09, 'triangle', 0.05),
    pick: () => tone(420, 0.12, 'sine', 0.06, 0, 1.4),
    ready: () => { tone(660, 0.15, 'sine', 0.06); tone(990, 0.25, 'sine', 0.05, 0.08); },
    snap: () => { tone(784, 0.2, 'sine', 0.09); tone(1175, 0.3, 'sine', 0.07, 0.07); tone(1568, 0.35, 'triangle', 0.04, 0.14); },
    wrong: () => tone(260, 0.25, 'sine', 0.07, 0, 0.55),
    mix: () => [0, 1, 2, 3, 4, 5].forEach(i => tone(380 + i * 80, 0.09, 'triangle', 0.04, i * 0.04)),
    start: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.06, i * 0.08)),
    mile: () => { tone(880, 0.2, 'triangle', 0.06, 0.25); tone(1320, 0.35, 'sine', 0.06, 0.35); },
    pop: () => tone(300 + Math.random() * 500, 0.18, 'sine', 0.05, 0, 2.2),
    win: () => {
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.7, 'sine', 0.08, i * 0.12));
      [523, 659, 784].forEach(f => tone(f, 1.6, 'triangle', 0.04, 0.9));
    }
  };

  /* ============================================================================
     3. MOTOR DE PARTÍCULAS CANVAS (EFECTOS VISUALES)
     ============================================================================ */
  const fx = $('lpFx'), fctx = fx.getContext('2d');
  const PAL = ['#ff8fb1', '#c9506b', '#ffd166', '#ffffff', '#ffb3c6', '#b9a4ff'];
  let parts = [], raf = 0, rain = 0;

  function fxSize() {
    const d = Math.min(2, window.devicePixelRatio || 1);
    fx.width = window.innerWidth * d;
    fx.height = window.innerHeight * d;
    fctx.setTransform(d, 0, 0, d, 0, 0);
  }
  fxSize();
  window.addEventListener('resize', fxSize);

  function burst(x, y, n, o = {}) {
    for (let i = 0; i < n && parts.length < 700; i++) {
      const a = Math.random() * 6.283;
      const v = (o.v || 4) * (0.4 + Math.random());
      const cols = o.cols || PAL;
      parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (o.up || 0),
        g: o.g == null ? 0.12 : o.g,
        life: 0,
        max: (o.life || 50) + Math.random() * 20,
        size: (o.size || 6) * (0.6 + Math.random() * 0.8),
        col: cols[(Math.random() * cols.length) | 0],
        type: o.types ? o.types[i % o.types.length] : 'dot',
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.3
      });
    }
    run();
  }

  const ring = (x, y, r) => {
    parts.push({
      type: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      g: 0,
      life: 0,
      max: 32,
      size: 4,
      size2: r,
      col: '#ff8fb1',
      rot: 0,
      vr: 0
    });
    run();
  };

  function shape(p, a) {
    fctx.save();
    fctx.globalAlpha = a;
    fctx.translate(p.x, p.y);
    fctx.fillStyle = p.col;
    fctx.strokeStyle = p.col;
    const s = p.size;
    if (p.type === 'dot') {
      fctx.beginPath();
      fctx.arc(0, 0, s / 2, 0, 6.283);
      fctx.fill();
    } else if (p.type === 'ring') {
      const t = p.life / p.max;
      fctx.lineWidth = 4 * (1 - t);
      fctx.beginPath();
      fctx.arc(0, 0, p.size + t * p.size2, 0, 6.283);
      fctx.stroke();
    } else if (p.type === 'star') {
      fctx.rotate(p.rot);
      fctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? s * 0.22 : s;
        fctx.lineTo(Math.cos(i * 0.785) * r, Math.sin(i * 0.785) * r);
      }
      fctx.closePath();
      fctx.fill();
    } else if (p.type === 'heart') {
      const k = s / 14;
      fctx.scale(k, k);
      fctx.beginPath();
      fctx.moveTo(0, 4);
      fctx.bezierCurveTo(-14, -6, -6, -16, 0, -8);
      fctx.bezierCurveTo(6, -16, 14, -6, 0, 4);
      fctx.fill();
    } else {
      fctx.rotate(p.rot);
      fctx.scale(1, Math.cos(p.life * 0.2));
      fctx.fillRect(-s / 2, -s / 4, s, s / 2);
    }
    fctx.restore();
  }

  function run() {
    if (raf) return;
    const step = t => {
      fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (rain > t) {
        for (let i = 0; i < 3; i++) {
          parts.push({
            x: Math.random() * window.innerWidth,
            y: -12,
            vx: (Math.random() - 0.5) * 2,
            vy: 1.5 + Math.random() * 3,
            g: 0.03,
            life: 0,
            max: 170 + Math.random() * 90,
            size: 7 + Math.random() * 7,
            col: PAL[(Math.random() * PAL.length) | 0],
            type: Math.random() < 0.25 ? 'heart' : 'conf',
            rot: Math.random() * 6,
            vr: (Math.random() - 0.5) * 0.25
          });
        }
      }
      parts = parts.filter(p => {
        p.life++;
        p.vy += p.g;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const q = p.life / p.max;
        if (q >= 1) return false;
        shape(p, 1 - q * q);
        return true;
      });
      raf = (parts.length || rain > t) ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  }

  let toastT;
  function toast(m) {
    const t = $('lpToast');
    t.textContent = m;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2000);
  }

  function firework() {
    const x = window.innerWidth * (0.15 + Math.random() * 0.7);
    const y = window.innerHeight * (0.12 + Math.random() * 0.4);
    burst(x, y, 44, { v: 6, g: 0.08, life: 55, size: 6, types: ['dot', 'star', 'heart'] });
    ring(x, y, 90);
    SFX.pop();
  }

  // Ripple y micro-partículas al hacer clic en botones
  document.addEventListener('pointerdown', e => {
    ac();
    const b = e.target.closest && e.target.closest('.lp-btn');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, i = document.createElement('i');
    i.className = 'lp-rip';
    i.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(i);
    setTimeout(() => i.remove(), 700);
    SFX.click();
    burst(e.clientX, e.clientY, 5, { v: 2.5, g: 0.05, life: 30, size: 5, types: ['star', 'heart'] });
  });

  $('lpSnd').onclick = () => {
    muted = !muted;
    if (bgm) { muted ? bgm.pause() : bgm.play().catch(() => {}); }
    $('lpSnd').textContent = muted ? '🔇 Sonido' : '🔊 Sonido';
    $('lpSnd').setAttribute('aria-pressed', !muted);
    if (!muted) SFX.ready();
  };

  /* ============================================================================
     4. EXTENSIONES Y EMISIÓN DE EVENTOS
     ============================================================================ */
  const listeners = [];
  function emit(type, data) {
    const ev = Object.assign({ type, time: Date.now() }, data || {});
    listeners.forEach(fn => { try { fn(ev); } catch (_) {} });
    try { document.dispatchEvent(new CustomEvent('puzzle:event', { detail: ev })); } catch (_) {}
  }

  const bgEl = $('lpBg');
  function setBackground(css) {
    bgEl.style.backgroundImage = css || 'none';
    bgEl.classList.toggle('on', !!css);
  }

  let bgm = null;
  function setMusic(src, vol) {
    if (bgm) { bgm.pause(); bgm = null; }
    if (!src) return;
    bgm = new Audio(src);
    bgm.loop = true;
    bgm.volume = vol == null ? 0.25 : vol;
    if (!muted) bgm.play().catch(() => {});
  }

  window.PuzzleGame = {
    on: fn => listeners.push(fn),
    setBackground,
    setMusic,
    get level() { return level; }
  };

  let url = null;
  let G = null;
  let refImg, fullImg, drag = null;

  /* ============================================================================
     5. CARGA Y RECORTE DE IMÁGENES
     ============================================================================ */
  const revoke = () => { url = null; };

  document.querySelectorAll('.lp-lv').forEach(b => {
    b.setAttribute('aria-checked', b.classList.contains('sel'));
    b.onclick = () => {
      level = +b.dataset.n;
      document.querySelectorAll('.lp-lv').forEach(x => {
        x.classList.toggle('sel', x === b);
        x.setAttribute('aria-checked', x === b);
      });
    };
  });

  el.file.onchange = () => {
    const f = el.file.files[0];
    el.err.textContent = '';
    el.create.disabled = true;
    if (!f) return;
    const okType = f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name);
    if (!okType) return fail('El archivo no parece una imagen.');
    if (f.size > 40 * 1048576) return fail('La imagen pesa demasiado (máx. 40 MB).');

    const rd = new FileReader();
    rd.onerror = () => fail('No se pudo leer el archivo. Intenta con otra foto.');
    rd.onload = () => {
      revoke();
      url = rd.result;
      el.prev.onload = () => {
        SFX.ready();
        el.host.hidden = false;
        el.hint.hidden = true;
        el.fit.hidden = false;
        setMode('whole');
        el.create.disabled = false;
      };
      el.prev.onerror = () => {
        fail('Tu navegador no pudo abrir esta imagen. Prueba con JPG, PNG o WebP.');
        revoke();
        el.host.hidden = true;
        el.fit.hidden = true;
        el.tip.hidden = true;
        el.hint.hidden = false;
      };
      el.prev.src = url;
    };
    rd.readAsDataURL(f);
  };

  function loadExternalImage(photoUrl, autoStart = true) {
    if (!photoUrl) return;
    el.err.textContent = '';
    el.create.disabled = true;
    el.prev.crossOrigin = 'anonymous';

    fetch(photoUrl)
      .then(res => {
        if (!res.ok) throw new Error('Fetch status ' + res.status);
        return res.blob();
      })
      .then(blob => {
        revoke();
        url = URL.createObjectURL(blob);
        el.prev.onload = () => {
          SFX.ready();
          el.host.hidden = false;
          el.hint.hidden = true;
          el.fit.hidden = false;
          setMode('whole');
          el.create.disabled = false;
          checkRandomBtn();
          if (autoStart) {
            setTimeout(() => {
              if (url && el.prev.naturalWidth) {
                SFX.start();
                startGame();
                burst(window.innerWidth / 2, window.innerHeight / 3, 30, { v: 5, life: 60, types: ['heart', 'star'] });
              }
            }, 350);
          }
        };
        el.prev.onerror = () => {
          fail('No se pudo procesar la foto elegida.');
        };
        el.prev.src = url;
      })
      .catch(() => {
        revoke();
        url = photoUrl;
        el.prev.onload = () => {
          SFX.ready();
          el.host.hidden = false;
          el.hint.hidden = true;
          el.fit.hidden = false;
          setMode('whole');
          el.create.disabled = false;
          checkRandomBtn();
          if (autoStart) {
            setTimeout(() => {
              if (url && el.prev.naturalWidth) {
                SFX.start();
                startGame();
              }
            }, 350);
          }
        };
        el.prev.onerror = () => {
          fail('No se pudo cargar la imagen del recuerdo.');
        };
        el.prev.src = photoUrl;
      });
  }

  function checkRandomBtn() {
    try {
      const btn = $('lpRandomBtn');
      const raw = sessionStorage.getItem('couple_photos');
      if (btn && raw) {
        const list = JSON.parse(raw);
        btn.style.display = Array.isArray(list) && list.length > 1 ? 'inline-block' : 'none';
      }
    } catch(e){}
  }

  let crop = { x: 0, y: 0, w: 1, h: 1 }, cd = null;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), MINC = 0.15;

  function drawCrop() {
    const c = el.crop.style;
    c.left = crop.x * 100 + '%';
    c.top = crop.y * 100 + '%';
    c.width = crop.w * 100 + '%';
    c.height = crop.h * 100 + '%';
  }

  function setMode(m) {
    document.querySelectorAll('.lp-fit').forEach(b => b.classList.toggle('sel', b.dataset.m === m));
    crop = m === 'whole' ? { x: 0, y: 0, w: 1, h: 1 } : { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
    el.crop.hidden = m === 'whole';
    el.tip.hidden = m === 'whole';
    if (m !== 'whole') drawCrop();
  }

  document.querySelectorAll('.lp-fit').forEach(b => b.onclick = () => setMode(b.dataset.m));

  el.crop.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.crop.setPointerCapture(e.pointerId);
    cd = {
      h: (e.target.dataset && e.target.dataset.h) || 'move',
      x: e.clientX,
      y: e.clientY,
      c: { ...crop },
      r: el.host.getBoundingClientRect()
    };
  });

  el.crop.addEventListener('pointermove', e => {
    if (!cd) return;
    const dx = (e.clientX - cd.x) / cd.r.width, dy = (e.clientY - cd.y) / cd.r.height, c = cd.c;
    if (cd.h === 'move') {
      crop = { x: clamp(c.x + dx, 0, 1 - c.w), y: clamp(c.y + dy, 0, 1 - c.h), w: c.w, h: c.h };
    } else {
      let x1 = c.x, y1 = c.y, x2 = c.x + c.w, y2 = c.y + c.h;
      if (cd.h.includes('w')) x1 = clamp(c.x + dx, 0, x2 - MINC);
      if (cd.h.includes('e')) x2 = clamp(c.x + c.w + dx, x1 + MINC, 1);
      if (cd.h.includes('n')) y1 = clamp(c.y + dy, 0, y2 - MINC);
      if (cd.h.includes('s')) y2 = clamp(c.y + c.h + dy, y1 + MINC, 1);
      crop = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    drawCrop();
  });

  ['pointerup', 'pointercancel'].forEach(t => el.crop.addEventListener(t, () => { cd = null; }));

  function fail(m) {
    el.err.textContent = m;
    el.create.disabled = true;
  }

  el.create.onclick = () => {
    if (url && el.prev.naturalWidth) {
      SFX.start();
      startGame();
      burst(window.innerWidth / 2, window.innerHeight / 3, 30, { v: 5, life: 60, types: ['heart', 'star'] });
    }
  };

  $('lpChange').onclick = backToIntro;
  window.addEventListener('pagehide', revoke);

  function backToIntro() {
    stopTimer();
    G = null;
    el.board.innerHTML = '';
    el.tray.innerHTML = '';
    el.stage.querySelectorAll('.lp-piece').forEach(n => n.remove());
    revoke();
    el.prev.removeAttribute('src');
    el.host.hidden = true;
    el.fit.hidden = true;
    el.tip.hidden = true;
    el.hint.hidden = false;
    el.file.value = '';
    el.create.disabled = true;
    el.err.textContent = '';
    el.game.hidden = true;
    el.intro.hidden = false;
  }

  /* ============================================================================
     6. RECORTE DE PIEZAS JIGSAW (FORMA REAL CON CURVAS BÉZIER)
     ============================================================================ */
  const rnd = () => Math.random() < 0.5 ? -1 : 1;

  function edge(ctx, x1, y1, x2, y2, sg, u) {
    if (!sg) { ctx.lineTo(x2, y2); return; }
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const P = (a, b) => [mx + ux * a * u + nx * b * u * sg, my + uy * a * u + ny * b * u * sg];
    const sgm = (c1, c2, e) => ctx.bezierCurveTo(...P(...c1), ...P(...c2), ...P(...e));
    ctx.lineTo(...P(-0.2, 0));
    sgm([-0.12, 0], [-0.06, 0.03], [-0.06, 0.08]);
    sgm([-0.06, 0.13], [-0.16, 0.14], [-0.14, 0.19]);
    sgm([-0.12, 0.25], [-0.06, 0.27], [0, 0.27]);
    sgm([0.06, 0.27], [0.12, 0.25], [0.14, 0.19]);
    sgm([0.16, 0.14], [0.06, 0.13], [0.06, 0.08]);
    sgm([0.06, 0.03], [0.12, 0], [0.2, 0]);
    ctx.lineTo(x2, y2);
  }

  const GRIDS = {
    30: [[6, 5], [5, 6], [10, 3], [3, 10]],
    60: [[10, 6], [6, 10], [12, 5], [5, 12]],
    120: [[12, 10], [10, 12], [15, 8], [8, 15]],
    240: [[16, 15], [15, 16], [20, 12], [12, 20], [24, 10], [10, 24]],
    500: [[25, 20], [20, 25], [50, 10], [10, 50]]
  };

  function pickGrid(ratio) {
    return GRIDS[N].reduce((b, g) =>
      Math.abs(Math.log(g[0] / g[1] / ratio)) < Math.abs(Math.log(b[0] / b[1] / ratio)) ? g : b
    );
  }

  function cutPieces(img) {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const sx = Math.round(crop.x * nw), sy = Math.round(crop.y * nh);
    const sw = Math.max(1, Math.round(crop.w * nw)), sh = Math.max(1, Math.round(crop.h * nh));
    N = level;
    [COLS, ROWS] = pickGrid(sw / sh);

    const s = Math.min(1, 1600 / Math.max(sw, sh));
    const cwS = Math.round(sw * s / COLS), chS = Math.round(sh * s / ROWS);
    const work = document.createElement('canvas');
    work.width = cwS * COLS;
    work.height = chS * ROWS;
    work.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, work.width, work.height);

    const u = Math.min(cwS, chS), m = Math.ceil(0.3 * u) + 2;
    const pw = cwS + 2 * m, ph = chS + 2 * m;
    const Hs = [], Vs = [];
    for (let r = 0; r < ROWS; r++) {
      Hs[r] = []; Vs[r] = [];
      for (let c = 0; c < COLS; c++) { Hs[r][c] = rnd(); Vs[r][c] = rnd(); }
    }

    const pieces = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const top = r ? -Vs[r - 1][c] : 0;
        const right = c < COLS - 1 ? Hs[r][c] : 0;
        const bottom = r < ROWS - 1 ? Vs[r][c] : 0;
        const left = c ? -Hs[r][c - 1] : 0;

        const cv = document.createElement('canvas');
        cv.width = pw;
        cv.height = ph;
        const ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(m, m);
        edge(ctx, m, m, m + cwS, m, top, u);
        edge(ctx, m + cwS, m, m + cwS, m + chS, right, u);
        edge(ctx, m + cwS, m + chS, m, m + chS, bottom, u);
        edge(ctx, m, m + chS, m, m, left, u);
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.drawImage(work, c * cwS - m, r * chS - m, pw, ph, 0, 0, pw, ph);
        ctx.restore();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(255,255,255,.4)';
        ctx.stroke();

        cv.className = 'lp-piece';
        cv.setAttribute('aria-label', 'Pieza ' + (r * COLS + c + 1));
        pieces.push({ id: r * COLS + c, r, c, el: cv, slot: 0, placed: false });
      }
    }
    return { pieces, cwS, chS, m, pw, ph, work };
  }

  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ============================================================================
     7. INICIO Y DISTRIBUCIÓN DEL TABLERO
     ============================================================================ */
  function startGame() {
    el.intro.hidden = true;
    el.game.hidden = false;
    el.done.hidden = true;
    el.board.innerHTML = '';
    el.stage.querySelectorAll('.lp-piece').forEach(n => n.remove());

    const cut = cutPieces(el.prev), pieces = cut.pieces;
    el.board.style.gridTemplateColumns = 'repeat(' + COLS + ',1fr)';
    el.board.style.gridTemplateRows = 'repeat(' + ROWS + ',1fr)';
    for (let i = 0; i < N; i++) {
      const d = document.createElement('div');
      d.className = 'lp-cell';
      el.board.appendChild(d);
    }

    const mk = cls => {
      const c = document.createElement('canvas');
      c.width = cut.work.width;
      c.height = cut.work.height;
      c.getContext('2d').drawImage(cut.work, 0, 0);
      c.className = cls;
      return c;
    };
    refImg = mk('lp-ref');
    fullImg = mk('lp-full');
    fullImg.setAttribute('role', 'img');
    fullImg.setAttribute('aria-label', 'Nuestro recuerdo');

    el.stage.classList.toggle('dense', N >= 240);
    el.board.append(fullImg, refImg);
    el.tray.hidden = true;
    el.ref.setAttribute('aria-pressed', 'false');
    el.ref.textContent = 'Ver imagen de referencia';

    G = {
      pieces,
      cwS: cut.cwS,
      chS: cut.chS,
      m: cut.m,
      pw: cut.pw,
      ph: cut.ph,
      ratio: (cut.cwS * COLS) / (cut.chS * ROWS),
      L: null,
      t0: Date.now(),
      timer: null,
      done: false
    };

    pieces.forEach(p => {
      el.stage.appendChild(p.el);
      p.el.addEventListener('pointermove', move);
      p.el.addEventListener('pointerup', up);
      p.el.addEventListener('pointercancel', up);
      p.el.addEventListener('lostpointercapture', up);
    });

    newDistribution();
    layout(false);
    startTimer();
    updateUI();
    emit('start', { pieces: N, cols: COLS, rows: ROWS, cropped: crop.w < 1 || crop.h < 1 });
  }

  function newDistribution() {
    const ranks = shuffle([...Array(N).keys()]);
    G.pieces.forEach((p, i) => {
      p.placed = false;
      p.rank = ranks[i];
      jitter(p);
      p.el.classList.remove('locked');
    });
    fullImg.classList.remove('on');
    el.board.classList.remove('win');
    rain = 0;
    el.done.hidden = true;
    G.done = false;
    G.help = HELPS[N];
    G.helping = false;
    G.wrong = 0;
    G.mixes = 0;
    updateHelp();
  }

  const jitter = p => {
    p.jx = (Math.random() - 0.5) * 0.2;
    p.jy = (Math.random() - 0.5) * 0.2;
  };

  /* ============================================================================
     8. MOTOR DE LAYOUT RESPONSIVO Y ALAS LATERALES
     ============================================================================ */
  function plan(cw, W, wide) {
    const GAPZ = 12, P = 6, ch = Math.max(8, Math.round(cw * G.chS / G.cwS));
    const bw = COLS * cw, bh = ROWS * ch;
    const kx = cw / G.cwS, ky = ch / G.chS;
    const boxW = G.pw * kx, boxH = G.ph * ky;
    const ov = N >= 500 ? 0.68 : N >= 240 ? 0.74 : 0.78;
    const px = Math.max(14, boxW * ov), py = Math.max(14, boxH * ov);
    const zoneW = wide ? Math.max(0, (W - bw - 2 * GAPZ) / 2) : 0;
    const a = wide && zoneW >= boxW ? Math.floor((zoneW - boxW) / px) + 1 : 0;
    const sideH = wide ? Math.max(bh + 120, window.innerHeight - 130) : bh;
    const sr = wide ? Math.max(1, Math.floor((sideH - boxH) / py) + 1) : 0;
    const tc = Math.max(1, Math.floor((W - 2 * P - boxW) / px) + 1);
    return { cw, ch, bw, bh, boxW, boxH, px, py, zoneW, a, sr, tc, GAPZ, P, kx, ky, sideH };
  }

  function layout(animate) {
    if (!G) return;
    const W = el.stage.clientWidth || window.innerWidth || 360;
    const wide = W >= 580;
    let pl = null;

    if (wide) {
      const maxBW = Math.min(Math.max(460, W * 0.50), 850);
      const maxBH = Math.min(Math.max(320, (window.innerHeight - 140) * 0.62), 580);
      const cwMax = Math.floor(Math.min(95, maxBW / COLS, (maxBH / ROWS) * (G.cwS / G.chS)));

      for (let cw = cwMax; cw >= 10 && !pl; cw--) {
        const q = plan(cw, W, true);
        const sideCap = 2 * q.a * q.sr;
        for (let t = 1; t <= (N >= 500 ? 6 : N >= 240 ? 3 : 2); t++) {
          if (sideCap + 2 * t * q.tc >= N) {
            pl = q;
            pl.t = t;
            break;
          }
        }
      }
      if (!pl) {
        pl = plan(10, W, true);
        const sideCap = 2 * pl.a * pl.sr;
        pl.t = Math.max(1, Math.ceil(Math.max(0, N - sideCap) / (2 * Math.max(1, pl.tc))));
      }
    } else {
      pl = plan(Math.max(10, Math.floor((W - 16) / COLS)), W, false);
      pl.t = Math.ceil(N / (2 * Math.max(1, pl.tc)));
    }

    const { cw, ch, bw, bh, boxW, boxH, px, py, zoneW, a, sr, tc, GAPZ, P, t } = pl;
    const topH = (t - 1) * py + boxH;
    const bx = wide ? zoneW + GAPZ : (W - bw) / 2;
    const by = P + topH + GAPZ;
    const slots = [];
    const rowX = (n, from, len) => from + Math.max(0, (len - ((n - 1) * px + boxW)) / 2);

    for (let i = 0; i < t; i++) {
      for (let j = 0; j < tc; j++) {
        const x = rowX(tc, 0, W) + j * px;
        slots.push({ x, y: P + i * py }, { x, y: by + bh + GAPZ + i * py });
      }
    }

    if (wide && a > 0) {
      for (let k = 0; k < sr; k++) {
        const y = P + k * py;
        for (let j = 0; j < a; j++) {
          const leftX = rowX(a, P, zoneW - P) + j * px;
          const rightX = rowX(a, bx + bw + GAPZ, zoneW - P) + j * px;
          slots.push({ x: leftX, y }, { x: rightX, y });
        }
      }
    }

    G.L = { cw, ch, bx, by, boxW, boxH, px, py, slots, cap: slots.length, mdx: G.m * pl.kx, mdy: G.m * pl.ky };

    const stageH = Math.max(
      by + bh + GAPZ + topH + P + 10,
      wide ? P + sr * py + boxH + P : 0
    );
    el.stage.style.height = stageH + 'px';

    Object.assign(el.board.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' });
    G.pieces.forEach(p => {
      p.el.style.width = boxW + 'px';
      p.el.style.height = boxH + 'px';
      put(p, animate);
    });
  }

  const slotXY = p => {
    const L = G.L, s = L.slots[Math.min(L.cap - 1, Math.floor(p.rank * L.cap / N))];
    return { x: s.x + p.jx * L.px, y: s.y + p.jy * L.py };
  };

  const targetXY = p => ({
    x: G.L.bx + p.c * G.L.cw - G.L.mdx,
    y: G.L.by + p.r * G.L.ch - G.L.mdy
  });

  function put(p, animate) {
    const t = p.placed ? targetXY(p) : slotXY(p);
    if (animate) {
      p.el.classList.add('anim');
      clearTimeout(p.to);
      p.to = setTimeout(() => p.el.classList.remove('anim'), 450);
    }
    p.el.style.left = t.x + 'px';
    p.el.style.top = t.y + 'px';
  }

  let rt;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => layout(false), 60);
  }).observe(el.stage);

  /* ============================================================================
     9. ARRASTRE Y ENCAJE DE PIEZAS (POINTER DRAG ENGINE)
     ============================================================================ */
  const alphaAt = (n, cx, cy) => {
    const r = n.getBoundingClientRect();
    const x = Math.floor((cx - r.left) * n.width / r.width);
    const y = Math.floor((cy - r.top) * n.height / r.height);
    return x >= 0 && y >= 0 && x < n.width && y < n.height && n.getContext('2d').getImageData(x, y, 1, 1).data[3] > 20;
  };

  const near = (n, e) => {
    const R = Math.max(8, Math.min(G.L.cw, G.L.ch) * 0.3) * (e.pointerType === 'touch' ? 1.6 : 1);
    for (let k = 0; k < 8; k++) {
      if (alphaAt(n, e.clientX + Math.cos(k * 0.785) * R, e.clientY + Math.sin(k * 0.785) * R)) return true;
    }
    return false;
  };

  el.stage.addEventListener('pointerdown', e => {
    if (!G || G.done) return;
    if (drag) {
      if (performance.now() - drag.last > 1500) up({ pointerId: drag.id });
      else return;
    }
    const list = document.elementsFromPoint(e.clientX, e.clientY).filter(n => n.classList && n.classList.contains('lp-piece'));
    let hit = null;
    try {
      hit = list.find(n => alphaAt(n, e.clientX, e.clientY)) || list.find(n => near(n, e));
    } catch (_) {
      hit = list[0];
    }
    const p = hit && G.pieces.find(q => q.el === hit);
    if (p && !p.placed) down(e, p);
  });

  window.addEventListener('blur', () => { if (drag) up({ pointerId: drag.id }); });

  function down(e, p) {
    e.preventDefault();
    p.el.setPointerCapture(e.pointerId);
    SFX.pick();
    const r = p.el.getBoundingClientRect();
    drag = {
      p,
      ox: e.clientX - r.left,
      oy: e.clientY - r.top,
      id: e.pointerId,
      last: performance.now(),
      cx: e.clientX,
      cy: e.clientY
    };
    drag.raf = requestAnimationFrame(autoScroll);
    clearTimeout(p.to);
    p.el.classList.remove('anim');
    p.el.classList.add('drag');
  }

  const tol = () => Math.min(G.L.cw, G.L.ch) * 0.55;

  const dist = (p, i) => {
    const x = parseFloat(p.el.style.left) + G.L.boxW / 2;
    const y = parseFloat(p.el.style.top) + G.L.boxH / 2;
    return Math.hypot(
      x - (G.L.bx + (i % COLS + 0.5) * G.L.cw),
      y - (G.L.by + (Math.floor(i / COLS) + 0.5) * G.L.ch)
    );
  };

  function nearestCell(p) {
    let best = { i: -1, d: 1e9 };
    for (let i = 0; i < N; i++) {
      const d = dist(p, i);
      if (d < best.d) best = { i, d };
    }
    return best;
  }

  const isTaken = i => G.pieces.some(q => q.placed && q.id === i);

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    drag.last = now;
    if (now - (drag.tt || 0) > 40) {
      drag.tt = now;
      burst(e.clientX, e.clientY, 1, { v: 1.2, g: 0.02, life: 28, size: 7, types: ['star', 'dot'] });
    }
    drag.cx = e.clientX;
    drag.cy = e.clientY;
    reposition();
  }

  function reposition() {
    const s = el.stage.getBoundingClientRect(), p = drag.p;
    p.el.style.left = (drag.cx - s.left - drag.ox) + 'px';
    p.el.style.top = (drag.cy - s.top - drag.oy) + 'px';
    const n = nearestCell(p);
    [...el.board.children].forEach((c, i) => c.classList.toggle('hot', n.i === i && n.d < tol() && !isTaken(i)));
  }

  function autoScroll() {
    if (!drag) return;
    const y = drag.cy, M = 80;
    let dy = 0;
    if (y < M) dy = -(M - y) / 4;
    else if (y > window.innerHeight - M) dy = (y - (window.innerHeight - M)) / 4;
    if (dy) {
      window.scrollBy(0, dy);
      reposition();
      drag.last = performance.now();
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const p = drag.p;
    cancelAnimationFrame(drag.raf);
    drag = null;
    p.el.classList.remove('drag');
    [...el.board.children].forEach(c => c.classList.remove('hot'));

    if (dist(p, p.id) < tol()) {
      p.placed = true;
      p.el.classList.add('locked');
      put(p, true);
      updateUI();
      snapFx(p);
      if (G.pieces.every(q => q.placed)) complete();
    } else {
      G.wrong++;
      SFX.wrong();
      p.el.classList.remove('shake');
      void p.el.offsetWidth;
      p.el.classList.add('shake');
      setTimeout(() => p.el.classList.remove('shake'), 400);
      put(p, true);
    }
  }

  /* ============================================================================
     10. SISTEMA DE AYUDAS Y RETROALIMENTACIÓN
     ============================================================================ */
  const HELPS = { 30: 1, 60: 2, 120: 3, 240: 5, 500: 8 };

  function updateHelp() {
    const b = $('lpHelp');
    b.textContent = '💡 Ayuda (' + G.help + ')';
    b.disabled = G.help <= 0 || G.done || G.helping;
  }

  $('lpHelp').onclick = () => {
    if (!G || G.done || G.help <= 0 || G.helping || drag) return;
    const free = G.pieces.filter(q => !q.placed);
    if (!free.length) return;
    const p = free[(Math.random() * free.length) | 0];
    G.help--;
    emit('help_used', { left: G.help });
    G.helping = true;
    updateHelp();
    SFX.mile();
    toast('💡 ¡Te ayudo con una pieza!');
    p.placed = true;
    p.el.style.zIndex = 1000;
    put(p, true);
    setTimeout(() => {
      p.el.style.zIndex = '';
      p.el.classList.add('locked');
      updateUI();
      snapFx(p);
      G.helping = false;
      updateHelp();
      if (G.pieces.every(q => q.placed)) complete();
    }, 460);
  };

  function snapFx(p) {
    SFX.snap();
    const sr = el.stage.getBoundingClientRect();
    const t = targetXY(p);
    const cx = sr.left + t.x + G.L.boxW / 2;
    const cy = sr.top + t.y + G.L.boxH / 2;
    burst(cx, cy, 16, { types: ['star', 'heart', 'dot'], v: 4.5, life: 45, size: 8 });
    ring(cx, cy, Math.max(G.L.cw, G.L.ch) * 0.9);

    const c = el.board.children[p.id];
    if (c) {
      c.classList.remove('flash');
      void c.offsetWidth;
      c.classList.add('flash');
    }

    [el.count, el.fill.parentNode].forEach(n => {
      n.classList.remove('lp-bump');
      void n.offsetWidth;
      n.classList.add('lp-bump');
    });

    const k = G.pieces.filter(q => q.placed).length, M = {};
    emit('piece_placed', { pieceId: p.id, placed: k, total: N, byHelp: G.helping });
    M[Math.round(N / 4)] = '¡Buen comienzo! 💗';
    M[Math.round(N / 2)] = '¡Ya vas por la mitad! ✨';
    M[Math.round(N * 0.75)] = '¡Casi lo logras! 💞';
    M[N - 1] = '¡Solo falta una pieza! 😍';
    if (M[k] && k < N) { toast(M[k]); SFX.mile(); }
  }

  /* ============================================================================
     11. CRONÓMETRO, COMPLETADO Y VICTORIA
     ============================================================================ */
  const fmt = ms => {
    const s = Math.floor(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  function startTimer() {
    stopTimer();
    G.t0 = Date.now();
    el.time.textContent = '00:00';
    G.timer = setInterval(() => el.time.textContent = fmt(Date.now() - G.t0), 1000);
  }

  function stopTimer() {
    if (G && G.timer) clearInterval(G.timer);
  }

  function updateUI() {
    const k = G.pieces.filter(p => p.placed).length;
    el.count.textContent = k + ' de ' + N + ' piezas';
    el.fill.style.width = (k / N * 100) + '%';
  }

  function complete() {
    G.done = true;
    updateHelp();
    stopTimer();
    emit('complete', {
      pieces: N,
      timeMs: Date.now() - G.t0,
      helpsUsed: HELPS[N] - G.help,
      wrongDrops: G.wrong,
      mixes: G.mixes
    });
    refImg.classList.remove('on');
    SFX.win();
    toast(N >= 500 ? '¡Hiciste lo IMPOSIBLE! 🏆' : '¡Lo lograste! 💖');

    const sr = el.board.getBoundingClientRect();
    burst(sr.left + sr.width / 2, sr.top + sr.height / 2, 70, { v: 8, g: 0.1, life: 70, size: 9, types: ['star', 'heart', 'dot'] });
    ring(sr.left + sr.width / 2, sr.top + sr.height / 2, Math.max(sr.width, sr.height));

    setTimeout(() => {
      const f = $('lpFlash');
      f.classList.remove('on');
      void f.offsetWidth;
      f.classList.add('on');
      fullImg.classList.add('on');
      el.board.classList.add('win');
      hearts();
      rain = performance.now() + 4500;
      run();
      for (let i = 0; i < 7; i++) setTimeout(firework, 250 + i * 450);
      el.doneTime.textContent = 'Tiempo: ' + fmt(Date.now() - G.t0);
      el.done.hidden = false;
      el.done.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 450);
  }

  function hearts() {
    for (let i = 0; i < 20; i++) {
      const h = document.createElement('span');
      h.className = 'lp-fly';
      h.textContent = '❤';
      h.style.left = Math.random() * 100 + 'vw';
      h.style.fontSize = (14 + Math.random() * 22) + 'px';
      h.style.animationDuration = (3 + Math.random() * 2.5) + 's';
      h.style.animationDelay = (Math.random() * 1.2) + 's';
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 7000);
    }
  }

  function restart() {
    newDistribution();
    layout(true);
    startTimer();
    updateUI();
    SFX.mix();
    emit('restart', { pieces: N });
    refImg.classList.remove('on');
    el.ref.setAttribute('aria-pressed', 'false');
    el.ref.textContent = 'Ver imagen de referencia';
  }

  $('lpReset').onclick = restart;
  $('lpAgain').onclick = restart;

  $('lpMix').onclick = () => {
    if (!G || G.done) return;
    const free = G.pieces.filter(p => !p.placed);
    const r = shuffle(free.map(p => p.rank));
    G.mixes++;
    SFX.mix();
    free.forEach((p, i) => {
      p.rank = r[i];
      jitter(p);
      put(p, true);
    });
  };

  el.ref.onclick = () => {
    const on = !refImg.classList.contains('on');
    refImg.classList.toggle('on', on);
    el.ref.setAttribute('aria-pressed', on);
    el.ref.textContent = on ? 'Ocultar imagen de referencia' : 'Ver imagen de referencia';
  };

  const rBtn = $('lpRandomBtn');
  if (rBtn) {
    rBtn.onclick = () => {
      try {
        const raw = sessionStorage.getItem('couple_photos');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const current = sessionStorage.getItem('puzzle_random_photo');
            const choices = list.filter(u => u !== current);
            const next = choices.length > 0 ? choices[Math.floor(Math.random() * choices.length)] : list[0];
            sessionStorage.setItem('puzzle_random_photo', next);
            loadExternalImage(next, false);
          }
        }
      } catch(e){}
    };
  }

  /* ============================================================================
     12. INICIALIZACIÓN POR PARÁMETROS DE URL / MEMORIA DE SESIÓN
     ============================================================================ */
  try {
    const params = new URLSearchParams(window.location.search);
    const qLevel = parseInt(params.get('level'), 10);
    if (qLevel && [30, 60, 120, 240, 500].includes(qLevel)) {
      level = qLevel;
      document.querySelectorAll('.lp-lv').forEach(x => {
        const isMatch = +x.dataset.n === qLevel;
        x.classList.toggle('sel', isMatch);
        x.setAttribute('aria-checked', isMatch);
      });
    }
    const initialImg = params.get('img') || sessionStorage.getItem('puzzle_random_photo');
    if (initialImg) {
      loadExternalImage(initialImg, true);
    } else {
      checkRandomBtn();
    }
  } catch(e){}
})();
