/**
 * ============================================================================
 * POOL 3D 2v2 - ARCADE DEL AMOR (LÓGICA DEL JUEGO)
 * ============================================================================
 * Billar 3D con Three.js r128, física elástica sub-step 2D, síntesis de audio
 * en tiempo real (Web Audio API), cámara orbital/de tiro y controles táctiles.
 *
 * MODALIDAD:
 *   4 asientos (Rojo 1, Azul 1, Rojo 2, Azul 2) por turnos.
 *   - Rojo = lisas (1 al 7)
 *   - Azul = rayadas (9 al 15)
 *   - Embocar propia = repites turno; blanca = falta (bola en mano);
 *   - Bola 8 gana solo tras embocar todas las de tu equipo.
 */

/* ============================================================================
   1. CONSTANTES DE MESA Y CONFIGURACIÓN FÍSICA
   ============================================================================ */
/** Constantes de mesa: R=radio de bola; L,T,RX,BY=límites del paño; MX=centro x; CZ=centro z. */
const R = 12;
const L = 60;
const T = 60;
const RX = 940;
const BY = 460;
const MX = 500;
const CZ = 260;

/** Troneras [x,y]: 4 esquinas + 2 medias. */
const PK = [
  [L - 5, T - 5],
  [RX + 5, T - 5],
  [L - 5, BY + 5],
  [RX + 5, BY + 5],
  [MX, T - 9],
  [MX, BY + 9]
];

/** Colores base de bolas 0..8 (las rayadas 9..15 reutilizan el color de i-8). */
const BC = [
  '#f4f1e8', '#f2c230', '#1f4fb0', '#d62b2b',
  '#5b2a86', '#f07d1a', '#12803a', '#7a1f1f', '#141414'
];
const col = i => BC[i > 8 ? i - 8 : i];

/** Temas de paño: [color paño, color bandas]. */
const FELT = [
  ['#1f8f55', '#0e5f36'],
  ['#2a78c4', '#144f8c'],
  ['#a8283a', '#6a1526']
];

const $ = id => document.getElementById(id);

/* ============================================================================
   2. ESCENA 3D: RENDERER, CÁMARA E ILUMINACIÓN
   ============================================================================ */
const st = $('stage');
const rd = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });

rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
rd.shadowMap.enabled = true;
rd.shadowMap.autoUpdate = false;
rd.shadowMap.type = THREE.PCFSoftShadowMap;
rd.outputEncoding = THREE.sRGBEncoding;
rd.toneMapping = THREE.ACESFilmicToneMapping;
st.appendChild(rd.domElement);

const sc = new THREE.Scene();
rd.setClearColor(0x000000, 0);
sc.background = null;

const cam = new THREE.PerspectiveCamera(38, 1.6, 25, 12000);
let th = 0, ph = 0.85, dist = 1050;
const tgt = new THREE.Vector3(500, 0, CZ);

let aimMode = true, aimYaw = 0, phA = 1.2, adist = 330;
const ctr = new THREE.Vector3(250, R, CZ);

/** Posiciona la cámara en tercera persona alrededor de la blanca o en órbita libre */
function placeCam() {
  if (aimMode && !hand && over == null) {
    const c = B[0];
    if (!c.in && !moving) ctr.lerp(new THREE.Vector3(c.x, R, c.y), 0.12);
    const s = Math.sin(phA), ux = Math.cos(aimYaw), uz = Math.sin(aimYaw);
    cam.position.set(ctr.x - ux * adist * s, Math.max(46, ctr.y + adist * Math.cos(phA)), ctr.z - uz * adist * s);
    cam.lookAt(ctr.x + ux * 90, 4, ctr.z + uz * 90);
  } else {
    cam.position.set(
      tgt.x + dist * Math.sin(ph) * Math.sin(th),
      Math.max(46, dist * Math.cos(ph)),
      tgt.z + dist * Math.sin(ph) * Math.cos(th)
    );
    cam.lookAt(tgt);
  }
}

function resize() {
  const w = st.clientWidth, h = st.clientHeight;
  rd.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// Iluminación ambiental y focos de billar
sc.add(new THREE.HemisphereLight('#aab8d0', '#201810', 0.45));

const sp = new THREE.SpotLight('#fff1d8', 1.35, 0, 0.95, 0.55, 1);
sp.position.set(500, 640, CZ);
sp.target.position.set(500, 0, CZ);
sc.add(sp, sp.target);
sp.castShadow = true;
sp.shadow.mapSize.set(512, 512);
sp.shadow.bias = -0.0006;
sp.shadow.normalBias = 1.2;
sp.shadow.camera.near = 200;
sp.shadow.camera.far = 1200;

const pl = new THREE.PointLight('#ffd9a0', 0.35, 0, 2);
pl.position.set(500, 300, CZ + 400);
sc.add(pl);

/* ============================================================================
   3. FONDOS PROCEDURALES
   ============================================================================ */
function buildSpace(root) {
  const starPos = new Float32Array(18000), starCol = new Float32Array(18000);
  for (let i = 0; i < 6000; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u), D = 7000, t = 0.55 + Math.random() * 0.45;
    starPos[i * 3] = r * Math.cos(a) * D;
    starPos[i * 3 + 1] = u * D;
    starPos[i * 3 + 2] = r * Math.sin(a) * D;
    starCol[i * 3] = t;
    starCol[i * 3 + 1] = t * (0.9 + Math.random() * 0.1);
    starCol[i * 3 + 2] = t * (0.8 + Math.random() * 0.2);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, fog: false }));
  root.add(stars);

  const [eC, eG] = cvs(1024, 512);
  eG.fillStyle = '#0b3d91';
  eG.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 1024, y = 90 + Math.random() * 330;
    for (let k = 0; k < 12; k++) {
      eG.fillStyle = Math.random() < 0.7 ? '#2f7d3a' : '#8a7a45';
      eG.beginPath();
      eG.ellipse(x + Math.random() * 70 - 35, y + Math.random() * 40 - 20, 10 + Math.random() * 34, 6 + Math.random() * 20, Math.random() * 3, 0, 7);
      eG.fill();
    }
  }
  eG.fillStyle = '#e8f1fa';
  eG.fillRect(0, 0, 1024, 26);
  eG.fillRect(0, 486, 1024, 26);
  eG.globalAlpha = 0.35;
  eG.fillStyle = '#fff';
  for (let i = 0; i < 170; i++) {
    eG.beginPath();
    eG.ellipse(Math.random() * 1024, Math.random() * 512, 20 + Math.random() * 60, 4 + Math.random() * 10, Math.random() * 0.6 - 0.3, 0, 7);
    eG.fill();
  }
  eG.globalAlpha = 1;

  const eTex = new THREE.CanvasTexture(eC);
  eTex.encoding = THREE.sRGBEncoding;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(800, 64, 48), new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.85, emissive: '#07142b', emissiveIntensity: 0.8 }));
  earth.position.set(-900, -1100, -2600);
  earth.rotation.z = 0.4;
  root.add(earth);

  const atmo = new THREE.Mesh(new THREE.SphereGeometry(830, 48, 32), new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  atmo.position.copy(earth.position);
  root.add(atmo);

  const [sunC, sunG] = cvs(256, 256);
  const g = sunG.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, '#fffef0');
  g.addColorStop(0.12, '#fff3c0');
  g.addColorStop(0.3, '#ffcf6a88');
  g.addColorStop(1, '#ff9a2000');
  sunG.fillStyle = g;
  sunG.fillRect(0, 0, 256, 256);

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunC), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sun.scale.set(1500, 1500, 1);
  sun.position.set(3200, 300, -4200);
  root.add(sun);

  const sunL = new THREE.DirectionalLight('#fff2d0', 0.8);
  sunL.position.copy(sun.position);
  root.add(sunL);

  return {
    tick() {
      earth.rotation.y += 0.0004;
      atmo.rotation.y += 0.0004;
      stars.rotation.y += 0.00003;
    }
  };
}

function buildSunset(root) {
  const [c, g] = cvs(16, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#0b1030');
  gr.addColorStop(0.5, '#6a2c70');
  gr.addColorStop(0.8, '#f08a4b');
  gr.addColorStop(1, '#ffd27a');
  g.fillStyle = gr;
  g.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  root.add(new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })));
  return { tick() {} };
}

const BACKGROUNDS = {
  espacio: { name: 'Espacio (Tierra y Sol)', color: '#000000', build: buildSpace },
  atardecer: { name: 'Atardecer', color: '#0b1030', build: buildSunset }
};
let bgGroup = null, bgTick = () => {};

function applyBackground(id) {
  const b = BACKGROUNDS[id];
  if (!b) return;
  if (bgGroup) {
    sc.remove(bgGroup);
    bgGroup.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }
  bgGroup = new THREE.Group();
  sc.add(bgGroup);
  sc.background = new THREE.Color(b.color);
  bgTick = b.build(bgGroup).tick;
}

/* ============================================================================
   4. TEXTURAS PROCEDURALES CANVAS
   ============================================================================ */
function cvs(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function woodTex() {
  const [c, g] = cvs(512, 128);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#7a4a22');
  gr.addColorStop(0.5, '#5c3516');
  gr.addColorStop(1, '#7a4a22');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = `rgba(${i % 2 ? '20,8,0' : '210,150,90'},${0.05 + Math.random() * 0.1})`;
    g.lineWidth = Math.random() * 1.8;
    const y = Math.random() * 128;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + Math.random() * 6 - 3, 340, y + Math.random() * 6 - 3, 512, y + Math.random() * 4 - 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}

function feltTex(k) {
  const [c, g] = cvs(1840, 880);
  g.scale(2, 2);
  g.fillStyle = FELT[k][0];
  g.fillRect(0, 0, 920, 440);
  const r = g.createRadialGradient(460, 220, 40, 460, 220, 560);
  r.addColorStop(0, '#fff0');
  r.addColorStop(1, '#0007');
  g.fillStyle = r;
  g.fillRect(0, 0, 920, 440);
  g.globalAlpha = 0.09;
  for (let i = 0; i < 40000; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
    g.fillRect(Math.random() * 920, Math.random() * 440, 1, 1);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#ffffff30';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(210, 20);
  g.lineTo(210, 420);
  g.stroke();
  g.fillStyle = '#ffffff55';
  [[210, 220], [620, 220]].forEach(p => {
    g.beginPath();
    g.arc(p[0], p[1], 3, 0, 7);
    g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}

const ballTex = {};
function bTex(i) {
  if (ballTex[i]) return ballTex[i];
  const [c, g] = cvs(512, 256);
  g.fillStyle = i == 0 || i > 8 ? '#f4f1e8' : col(i);
  g.fillRect(0, 0, 512, 256);
  if (i > 8) {
    g.fillStyle = col(i);
    g.fillRect(0, 64, 512, 128);
  }
  if (i) {
    [128, 384].forEach(x => {
      g.fillStyle = '#f4f1e8';
      g.beginPath();
      g.arc(x, 128, 34, 0, 7);
      g.fill();
      g.fillStyle = '#111';
      g.font = 'bold 44px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(i, x, 132);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return ballTex[i] = t;
}

/* ============================================================================
   5. ENSAMBLAJE DE LA MESA 3D
   ============================================================================ */
const wood = woodTex();
const woodM = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.4, metalness: 0.05 });
const feltM = new THREE.MeshStandardMaterial({ map: feltTex(0), roughness: 0.95 });

const felt = new THREE.Mesh(new THREE.PlaneGeometry(920, 440), feltM);
felt.rotation.x = -Math.PI / 2;
felt.position.set(500, 0, CZ);
felt.receiveShadow = true;
sc.add(felt);

function box(w, h, d, x, y, z, m) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  b.castShadow = b.receiveShadow = true;
  sc.add(b);
  return b;
}

box(980, 24, 30, 500, 11, 29, woodM);
box(980, 24, 30, 500, 11, 491, woodM);
box(30, 24, 432, 29, 11, CZ, woodM);
box(30, 24, 432, 971, 11, CZ, woodM);

const cushM = new THREE.MeshStandardMaterial({ color: FELT[0][1], roughness: 0.9 });
const cushs = [];
const cu = (w, d, x, z) => cushs.push(box(w, 15, d, x, 7.5, z, cushM));

cu(MX - L - 50, 16, (L + 26 + MX - 22) / 2, T - 8);
cu(MX - L - 50, 16, (MX + 22 + RX - 26) / 2, T - 8);
cu(MX - L - 50, 16, (L + 26 + MX - 22) / 2, BY + 8);
cu(MX - L - 50, 16, (MX + 22 + RX - 26) / 2, BY + 8);
cu(16, BY - T - 52, L - 8, CZ);
cu(16, BY - T - 52, RX + 8, CZ);

const dm = new THREE.MeshStandardMaterial({ color: '#efe3c0', roughness: 0.3 });
for (let k = 1; k <= 3; k++) {
  const a = L + (MX - L) * k / 4, b = MX + (RX - MX) * k / 4;
  [a, b].forEach(x => {
    box(8, 1.5, 8, x, 24.6, 29, dm).rotation.y = 0.785;
    box(8, 1.5, 8, x, 24.6, 491, dm).rotation.y = 0.785;
  });
  [T + (BY - T) * k / 4].forEach(z => {
    box(8, 1.5, 8, 29, 24.6, z, dm).rotation.y = 0.785;
    box(8, 1.5, 8, 971, 24.6, z, dm).rotation.y = 0.785;
  });
}

const brass = new THREE.MeshStandardMaterial({ color: '#c9a15a', metalness: 0.8, roughness: 0.3 });
for (const [x, y] of PK) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(23, 32), new THREE.MeshBasicMaterial({ color: '#000' }));
  d.rotation.x = -Math.PI / 2;
  d.position.set(x, 0.8, y);
  sc.add(d);
  const r = new THREE.Mesh(new THREE.TorusGeometry(24, 2.2, 8, 32), brass);
  r.rotation.x = Math.PI / 2;
  r.position.set(x, 1.6, y);
  sc.add(r);
}

box(930, 34, 470, 500, -17.5, CZ, woodM);

/* ============================================================================
   6. BOLAS 3D Y POSICIONAMIENTO EN TRIÁNGULO
   ============================================================================ */
const sg = new THREE.SphereGeometry(R, 40, 28);
const meshes = [];

function mkBall(i) {
  const m = new THREE.Mesh(
    sg,
    new THREE.MeshPhysicalMaterial({ map: bTex(i), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 })
  );
  m.castShadow = true;
  m.rotation.x = -Math.PI / 2;
  sc.add(m);
  return m;
}

function ballPos() {
  const rows = [[1], [9, 2], [10, 8, 3], [11, 4, 12, 5], [13, 6, 14, 7, 15]];
  const b = [{ i: 0, x: 250, y: CZ, in: 0, vx: 0, vy: 0 }];
  rows.forEach((r, c) => r.forEach((id, k) => {
    b.push({
      i: id,
      x: 640 + c * R * 1.75,
      y: CZ + (k - (r.length - 1) / 2) * R * 2.05 + (Math.random() - 0.5) * 0.6,
      in: 0,
      vx: 0,
      vy: 0
    });
  }));
  return b;
}

/* ============================================================================
   7. SÍNTESIS DE AUDIO (WEB AUDIO API)
   ============================================================================ */
let ac, mix, nb, rollG, rollF;

function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor();
  comp.connect(ac.destination);

  mix = ac.createGain();
  mix.gain.value = 0.9;
  mix.connect(comp);

  const len = ac.sampleRate * 0.7, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const cv = ac.createConvolver();
  cv.buffer = ir;
  const rg = ac.createGain();
  rg.gain.value = 0.22;
  mix.connect(cv);
  cv.connect(rg);
  rg.connect(comp);

  nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const rs = ac.createBufferSource();
  rs.buffer = nb;
  rs.loop = true;
  rollF = ac.createBiquadFilter();
  rollF.type = 'lowpass';
  rollF.frequency.value = 380;
  rollG = ac.createGain();
  rollG.gain.value = 0;
  rs.connect(rollF);
  rollF.connect(rollG);
  rollG.connect(mix);
  rs.start();
}

function nz(type, f, q, dur, vol, dly = 0) {
  if (!ac) return;
  const s = ac.createBufferSource();
  s.buffer = nb;
  const fl = ac.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = ac.createGain(), t = ac.currentTime + dly;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(mix);
  s.start(t, Math.random() * 1.5, dur + 0.05);
}

function tn(f, dur, vol, type = 'sine', f2, dly = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + dly;
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g);
  g.connect(mix);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let lastClick = 0;
const sClick = v => {
  const n = performance.now();
  if (n - lastClick < 18) return;
  lastClick = n;
  v = Math.min(v, 1);
  const p = 1 + Math.random() * 0.12;
  nz('bandpass', 3800 * p, 2.5, 0.035, 0.9 * v);
  tn(1750 * p, 0.07, 0.35 * v, 'sine', 1500 * p);
  tn(3100 * p, 0.025, 0.18 * v, 'triangle');
  nz('lowpass', 900, 0.7, 0.05, 0.25 * v);
};

const sCush = v => {
  v = Math.min(v, 1);
  nz('lowpass', 520, 0.8, 0.14, 0.9 * v);
  tn(150, 0.16, 0.55 * v, 'sine', 90);
  nz('bandpass', 1800, 1, 0.03, 0.2 * v);
};

const sPocket = () => {
  tn(110, 0.4, 0.5, 'sine', 60);
  nz('lowpass', 700, 0.8, 0.5, 0.35);
  for (let i = 0; i < 4; i++) {
    nz('bandpass', 2200, 3, 0.03, 0.4 / (i + 1), 0.12 + i * 0.11);
    tn(900 - i * 120, 0.04, 0.12 / (i + 1), 'sine', undefined, 0.12 + i * 0.11);
  }
};

const sCue = v => {
  nz('bandpass', 2300, 1.4, 0.025, 0.8 * v);
  tn(260, 0.1, 0.7 * v, 'sine', 140);
  nz('lowpass', 1200, 0.8, 0.06, 0.4 * v);
};

/* ============================================================================
   8. FÍSICA SUB-STEP 2D (COLISIONES, REBOTES, TRONERAS Y FRICCIÓN)
   ============================================================================ */
function step(B, pot) {
  for (let k = 0; k < 8; k++) {
    for (const b of B) {
      if (b.in) continue;
      b.x += b.vx / 8;
      b.y += b.vy / 8;

      for (const p of PK) {
        if (Math.hypot(b.x - p[0], b.y - p[1]) < (p[0] === MX ? 34 : 36)) {
          b.in = 1;
          b.vx = b.vy = 0;
          pot.push(b.i);
          sPocket();
          break;
        }
      }
      if (b.in) continue;

      if (b.x < L + R) { b.x = L + R; sCush(Math.abs(b.vx) / 20); b.vx = -b.vx * 0.9; }
      if (b.x > RX - R) { b.x = RX - R; sCush(Math.abs(b.vx) / 20); b.vx = -b.vx * 0.9; }
      if (b.y < T + R) { b.y = T + R; sCush(Math.abs(b.vy) / 20); b.vy = -b.vy * 0.9; }
      if (b.y > BY - R) { b.y = BY - R; sCush(Math.abs(b.vy) / 20); b.vy = -b.vy * 0.9; }
    }

    for (let i = 0; i < B.length; i++) {
      for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (a.in || b.in) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * R && d > 0) {
          const nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
          a.x -= nx * ov;
          a.y -= ny * ov;
          b.x += nx * ov;
          b.y += ny * ov;
          const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (dv > 0) {
            a.vx -= dv * nx;
            a.vy -= dv * ny;
            b.vx += dv * nx;
            b.vy += dv * ny;
            if (dv > 0.4) sClick(dv / 16);
          }
        }
      }
    }
  }

  let m = false, sp = 0;
  for (const b of B) {
    if (b.in) continue;
    b.vx *= 0.989;
    b.vy *= 0.989;
    const s = Math.hypot(b.vx, b.vy);
    if (s < 0.06) {
      b.vx = b.vy = 0;
    } else {
      m = true;
      sp = Math.max(sp, s);
    }
  }

  if (rollG) {
    rollG.gain.setTargetAtTime(Math.min(sp / 26, 1) * 0.16, ac.currentTime, 0.05);
    rollF.frequency.setTargetAtTime(250 + sp * 25, ac.currentTime, 0.05);
  }
  return m;
}

/* ============================================================================
   9. ESTADO DEL JUEGO: REGLAS, TURNOS Y BANDEJA
   ============================================================================ */
const NAMES = ['Rojo 1', 'Azul 1', 'Rojo 2', 'Azul 2'];
let B, turn, over, hand, moving, pot, tray, drag = null;
const mouse = new THREE.Vector3();
let charge = 0, charging = false, sink = [];

const own = (i, t) => t == 0 ? (i >= 1 && i <= 7) : (i >= 9);

function newGame() {
  B = ballPos();
  meshes.forEach(m => sc.remove(m));
  meshes.length = 0;
  B.forEach(b => meshes.push(mkBall(b.i)));
  turn = 0;
  over = null;
  hand = false;
  moving = false;
  pot = [];
  tray = [];
  $('msg').textContent = 'Turno de ' + NAMES[0];
  ui();
}

function updateBadge() {
  const tb = $('stage-badge'), tc = $('stage-turn-chip'), tt = $('stage-tip-text');
  if (!tb || !tc || !tt) return;
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (over != null) {
    tc.className = 'chip on ' + (over == 0 ? 'R' : 'B');
    tc.textContent = '🏆 ' + (over == 0 ? 'Rojo' : 'Azul') + ' gana';
    tt.textContent = 'Partida finalizada';
  } else if (hand) {
    tc.className = 'chip on ' + (turn % 2 ? 'B' : 'R');
    tc.textContent = '⚠️ Falta de ' + NAMES[turn];
    tt.textContent = isTouch ? 'Toca la mesa para colocar la blanca' : 'Clic en la mesa para colocar la blanca';
  } else {
    tc.className = 'chip on ' + (turn % 2 ? 'B' : 'R');
    tc.textContent = (turn % 2 ? '🔵 ' : '🔴 ') + NAMES[turn];
    tt.textContent = isTouch ? 'Desliza: Apuntar · Mantén ⚡: Disparar' : '🖱️ Clic Der: Rotar · Clic Izq: Disparar';
  }
}

function ui() {
  $('seats').innerHTML = NAMES.map((n, i) =>
    `<span class="chip ${i % 2 ? 'B' : 'R'} ${i == turn && over == null ? 'on' : ''}">${n}</span>`
  ).join('');

  const mb = i => `<span class="mb" style="background:${i > 8 ? `linear-gradient(${col(i)} 30%,#f4f1e8 30% 70%,${col(i)} 70%)` : col(i)}"></span>`;

  $('trR').innerHTML = '<b style="color:var(--red)">Lisas&nbsp;</b>' + tray.filter(i => i >= 1 && i <= 7).map(mb).join('');
  $('trB').innerHTML = '<b style="color:var(--blue)">Rayadas&nbsp;</b>' + tray.filter(i => i >= 9).map(mb).join('');
  updateBadge();
}

function finish() {
  moving = false;
  if (rollG) rollG.gain.setTargetAtTime(0, ac.currentTime, 0.1);
  const t = turn % 2, foul = pot.includes(0), mine = pot.some(i => own(i, t));
  tray.push(...pot.filter(i => i));
  const left = B.some(b => !b.in && own(b.i, t)), M = $('msg');

  if (pot.includes(8)) {
    const w = !left && !foul;
    over = w ? t : 1 - t;
    M.textContent = (w ? '¡Gana el equipo ' : 'Bola 8 antes de tiempo. Gana el equipo ') + (over == 0 ? 'ROJO!' : 'AZUL!');
    ui();
    return;
  }

  if (mine && !foul) {
    M.textContent = NAMES[turn] + ' embocó y sigue.';
  } else {
    turn = (turn + 1) % 4;
    if (foul) {
      hand = true;
      M.textContent = 'Falta. ' + NAMES[turn] + ' coloca la blanca (toca la mesa).';
    } else {
      M.textContent = 'Turno de ' + NAMES[turn];
    }
  }
  ui();
}

const idle = () => over == null && !moving && !hand;

/* ============================================================================
   10. CONTROL DE ENTRADA: MOUSE, TOUCH, TECLADO
   ============================================================================ */
const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -R);
const v2 = new THREE.Vector2();

function tp(e) {
  const r = st.getBoundingClientRect();
  v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(v2, cam);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(plane, p) ? p : null;
}

let orb = null;
let isLeftCharging = false, aimInterval = null;

st.oncontextmenu = e => { e.preventDefault(); return false; };
window.oncontextmenu = e => { e.preventDefault(); return false; };
document.oncontextmenu = e => { e.preventDefault(); return false; };

function updateShootBtn(active) {
  const btn = $('btnStageShoot'), pf = $('shootPowerText');
  if (!btn) return;
  if (active) {
    btn.classList.add('charging');
  } else {
    btn.classList.remove('charging');
    if (pf) pf.textContent = '0%';
  }
}

st.onpointerdown = e => {
  initAudio();
  if (e.target.closest && e.target.closest('#stage-touch-hud')) return;

  // Detección estricta de botón secundario (clic derecho) o Shift para rotación de cámara
  const isRightClick = e.button === 2 || e.which === 3 || (e.buttons !== undefined && (e.buttons & 2) !== 0) || e.shiftKey;

  // Si es clic derecho: EXCLUSIVAMENTE orbitar/girar cámara. NUNCA cargar tiro.
  if (isRightClick) {
    e.preventDefault();
    charging = false;
    isLeftCharging = false;
    updateShootBtn(false);
    charge = 0;
    $('pf').style.height = '0';
    orb = { x: e.clientX, y: e.clientY, aim: aimMode && !hand, btn: 2 };
    return;
  }

  // 1. Bola en mano (falta previa)
  if (over == null && !moving && hand) {
    const p = tp(e);
    if (!p) return;
    const ok = p.x > L + R && p.x < RX - R && p.z > T + R && p.z < BY - R &&
      B.every(b => b.i == 0 || b.in || Math.hypot(b.x - p.x, b.y - p.z) > 2 * R);
    if (ok) {
      const c = B[0];
      c.in = 0;
      c.x = p.x;
      c.y = p.z;
      c.vx = c.vy = 0;
      hand = false;
      $('msg').textContent = 'Turno de ' + NAMES[turn];
      sink = sink.filter(s => s != 0);
      updateBadge();
    }
    return;
  }

  // 2. Touch en móvil / tablet: deslizar en mesa gira el apuntado 360°
  if (e.pointerType === 'touch') {
    orb = { x: e.clientX, y: e.clientY, aim: aimMode && !hand, btn: 0 };
    return;
  }

  // 3. Clic izquierdo primario en PC (e.button === 0 y NO es clic derecho):
  if (e.button === 0 && (e.buttons === undefined || (e.buttons & 2) === 0)) {
    try { st.setPointerCapture(e.pointerId); } catch (err) {}
    if (aimMode && idle()) {
      charging = true;
      isLeftCharging = true;
      updateShootBtn(true);
      return;
    }
    const p = tp(e);
    if (!p) return;
    mouse.copy(p);
    if (idle()) drag = { sx: p.x, sz: p.z };
  }
};

const handlePointerMove = e => {
  if (orb) {
    const dx = e.clientX - orb.x, dy = e.clientY - orb.y;
    if (orb.aim && aimMode && !hand && over == null) {
      aimYaw += dx * 0.0045;
      phA = Math.max(0.6, Math.min(1.3, phA - dy * 0.004));
    } else {
      th -= dx * 0.006;
      ph = Math.max(0.05, Math.min(1.25, ph - dy * 0.005));
    }
    orb.x = e.clientX;
    orb.y = e.clientY;
    return;
  }
  const p = tp(e);
  if (p) mouse.copy(p);
};

st.onpointermove = handlePointerMove;
window.addEventListener('pointermove', handlePointerMove);

const handleGlobalPointerUp = e => {
  const isRight = e && (e.button === 2 || e.which === 3);

  // Si se soltó el clic derecho o estábamos orbitando con clic derecho:
  if (orb && (orb.btn === 2 || isRight)) {
    orb = null;
    return; // NUNCA disparar al soltar clic derecho
  }

  if (orb) {
    orb = null;
  }

  // Si era clic derecho, nunca continuar hacia el disparo
  if (isRight) return;

  if (charging) {
    charging = false;
    isLeftCharging = false;
    updateShootBtn(false);
    if (aimMode && idle() && charge > 0.05) {
      shoot(aimYaw, charge);
    } else {
      charge = 0;
      $('pf').style.height = '0';
    }
    return;
  }
  if (!drag) return;
  const dx = drag.sx - mouse.x, dz = drag.sz - mouse.z, l = Math.hypot(dx, dz);
  drag = null;
  $('pf').style.height = '0';
  if (l < 8 || !idle()) return;
  shoot(Math.atan2(dz, dx), Math.min(l / 180, 1));
};

st.onpointerup = handleGlobalPointerUp;
window.addEventListener('pointerup', handleGlobalPointerUp);

function shoot(a, p) {
  B[0].vx = Math.cos(a) * p * 26;
  B[0].vy = Math.sin(a) * p * 26;
  pot = [];
  moving = true;
  sCue(p);
  $('msg').textContent = '…';
  charge = 0;
  charging = false;
  $('pf').style.height = '0';
  updateShootBtn(false);
  updateBadge();
}

st.onwheel = e => {
  e.preventDefault();
  zoom(1 + e.deltaY * 0.001);
};

function zoom(f) {
  if (aimMode && !hand) adist = Math.max(140, Math.min(700, adist * f));
  else dist = Math.max(600, Math.min(1700, dist * f));
}

function setMode(v) {
  aimMode = v;
  $('mode').textContent = v ? 'Cámara de tiro' : 'Mesa libre';
}
$('mode').onclick = () => setMode(!aimMode);

const go = () => {
  initAudio();
  if (aimMode && idle()) {
    charging = true;
    updateShootBtn(true);
  }
};

const rel = () => {
  if (!charging) return;
  handleGlobalPointerUp({ button: 0 });
};

if ($('fire')) $('fire').onpointerdown = e => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  e.preventDefault();
  go();
};

if ($('btnStageShoot')) {
  $('btnStageShoot').onpointerdown = e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    go();
  };
}

function startAimFine(dir) {
  aimYaw += dir * 0.015;
  clearInterval(aimInterval);
  aimInterval = setInterval(() => { aimYaw += dir * 0.012; }, 30);
}

function stopAimFine() {
  clearInterval(aimInterval);
  aimInterval = null;
}

if ($('btnAimLeft')) {
  $('btnAimLeft').onpointerdown = e => { e.preventDefault(); e.stopPropagation(); startAimFine(-1); };
  $('btnAimLeft').onpointerup = stopAimFine;
  $('btnAimLeft').onpointerleave = stopAimFine;
}

if ($('btnAimRight')) {
  $('btnAimRight').onpointerdown = e => { e.preventDefault(); e.stopPropagation(); startAimFine(1); };
  $('btnAimRight').onpointerup = stopAimFine;
  $('btnAimRight').onpointerleave = stopAimFine;
}

window.addEventListener('keydown', e => {
  if (e.code == 'Space' && !e.repeat) { e.preventDefault(); go(); }
  if (e.key == 'ArrowLeft') aimYaw -= 0.014;
  if (e.key == 'ArrowRight') aimYaw += 0.014;
});

window.addEventListener('keyup', e => {
  if (e.code == 'Space') rel();
});

$('v1').onclick = () => { setMode(false); ph = 0.04; th = 0; dist = 1150; };
$('v2').onclick = () => { setMode(false); ph = 0.85; th = 0; dist = 1050; };
$('zi').onclick = () => zoom(0.85);
$('zo').onclick = () => zoom(1.18);
$('new').onclick = newGame;

document.querySelectorAll('[data-t]').forEach(b => {
  b.onclick = () => {
    feltM.map = feltTex(+b.dataset.t);
    feltM.needsUpdate = true;
    cushM.color.set(FELT[+b.dataset.t][1]);
    document.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('sel', x == b));
  };
});

/* ============================================================================
   11. AYUDAS DE PUNTERÍA Y TACO DE BILLAR CON SKINS
   ============================================================================ */
const aimG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const aimL = new THREE.Line(aimG, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
aimL.visible = false;
sc.add(aimL);

const trgG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const trgL = new THREE.Line(trgG, new THREE.LineBasicMaterial({ color: '#f5c542' }));
trgL.visible = false;
sc.add(trgL);

const ghost = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.28 }));
ghost.visible = false;
sc.add(ghost);

const CUES = {
  clasico: { name: 'Clásica', color: '#d9a95f', tip: '#4aa3df', roughness: 0.4, metalness: 0 },
  ebano: { name: 'Ébano', color: '#1b1b1f', tip: '#d4af37', roughness: 0.25, metalness: 0.2 },
  oro: { name: 'Oro', color: '#d4af37', tip: '#ffffff', roughness: 0.2, metalness: 0.95 },
  neon: { name: 'Neón', color: '#10202a', tip: '#00e5ff', roughness: 0.3, metalness: 0, emissive: '#00bcd4', emissiveIntensity: 0.9 }
};

const cueMat = new THREE.MeshStandardMaterial(), tipMat = new THREE.MeshStandardMaterial();

function applyCue(id) {
  const k = CUES[id];
  if (!k) return;
  cueMat.color.set(k.color);
  cueMat.roughness = k.roughness;
  cueMat.metalness = k.metalness || 0;
  cueMat.emissive.set(k.emissive || '#000000');
  cueMat.emissiveIntensity = k.emissiveIntensity || 1;
  tipMat.color.set(k.tip);
}

const cue = new THREE.Mesh(new THREE.CylinderGeometry(2, 5, 330, 16), cueMat);
cue.castShadow = true;
cue.visible = false;
sc.add(cue);

const tip = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 6, 12), tipMat);
cue.add(tip);
tip.position.y = 162;

function aim(a, l) {
  const c = B[0], ux = Math.cos(a), uz = Math.sin(a);
  let tm = 1e9, hit = null;

  for (const b of B) {
    if (b.i == 0 || b.in) continue;
    const fx = b.x - c.x, fz = b.y - c.y, pr = fx * ux + fz * uz;
    if (pr <= 0) continue;
    const d2 = fx * fx + fz * fz - pr * pr;
    if (d2 < 4 * R * R) {
      const t = pr - Math.sqrt(4 * R * R - d2);
      if (t < tm) { tm = t; hit = b; }
    }
  }

  const wm = Math.min(
    ux > 0 ? (RX - R - c.x) / ux : ux < 0 ? (L + R - c.x) / ux : 1e9,
    uz > 0 ? (BY - R - c.y) / uz : uz < 0 ? (T + R - c.y) / uz : 1e9
  );
  if (!hit || wm < tm) { tm = wm; hit = null; }

  const gx = c.x + ux * tm, gz = c.y + uz * tm, y = R + 0.5;
  aimG.setFromPoints([new THREE.Vector3(c.x, y, c.y), new THREE.Vector3(gx, y, gz)]);
  aimL.visible = true;
  ghost.position.set(gx, R, gz);
  ghost.visible = true;

  if (hit) {
    const nx = hit.x - gx, nz = hit.y - gz, n = Math.hypot(nx, nz);
    trgG.setFromPoints([new THREE.Vector3(hit.x, y, hit.y), new THREE.Vector3(hit.x + nx / n * 70, y, hit.y + nz / n * 70)]);
    trgL.visible = true;
  } else {
    trgL.visible = false;
  }

  const tx0 = c.x - ux * (R + 5 + l * 0.6), tz0 = c.y - uz * (R + 5 + l * 0.6);
  const tX = ux > 0 ? (tx0 - 44) / ux : ux < 0 ? (tx0 - 956) / ux : 1e9;
  const tZ = uz > 0 ? (tz0 - 44) / uz : uz < 0 ? (tz0 - 476) / uz : 1e9;
  const tw = Math.max(0, Math.min(tX, tZ));

  const E = tw < 330 ? Math.min(0.9, Math.max(0.07, Math.asin(Math.min(1, 16 / Math.max(tw, 16))))) : 0.07;
  const len = tw < 330 ? Math.max(140, Math.min(330, tw + 90)) : 330;
  const dir = new THREE.Vector3(ux * Math.cos(E), -Math.sin(E), uz * Math.cos(E));
  const tipP = new THREE.Vector3(tx0, R, tz0);

  cue.scale.y = len / 330;
  cue.position.copy(tipP).addScaledVector(dir, -len / 2);
  cue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  cue.visible = true;
  $('pf').style.height = (l / 180 * 100) + '%';
}

/* ============================================================================
   12. BUCLE PRINCIPAL (RENDER LOOP 60 FPS)
   ============================================================================ */
const _TICK = 1000 / 60;
let _acc = 0, _last = 0, _dirty = true, _cueWas = false, _ema = 16.7, _n = 0;
let _pr = Math.min(window.devicePixelRatio || 1, 1.25);
const _tq = new THREE.Quaternion(), _tax = new THREE.Vector3();

function frame(now) {
  requestAnimationFrame(frame);
  now = now || performance.now();
  const dt = Math.min(now - (_last || now), 100);
  _last = now;
  _acc += dt;
  _ema = _ema * 0.95 + Math.min(dt, 50) * 0.05;

  if (++_n > 60 && _ema > 22 && _pr > 0.75) {
    _pr -= 0.25;
    rd.setPixelRatio(_pr);
    resize();
    _n = 0;
    _ema = 16.7;
  }

  let ticks = 0;
  while (_acc >= _TICK && ticks < 4) {
    _acc -= _TICK;
    ticks++;
    if (moving && !step(B, pot)) finish();
    if (charging && idle()) {
      charge = Math.min(1, charge + 0.014);
      const sp = $('shootPowerText');
      if (sp) sp.textContent = Math.round(charge * 100) + '%';
    }

    B.forEach((b, k) => {
      const m = meshes[k];
      if (!b.in) {
        m.visible = true;
        m.castShadow = true;
        const s = Math.hypot(b.vx, b.vy);
        if (s > 0) {
          _tax.set(b.vy, 0, -b.vx).normalize();
          m.quaternion.premultiply(_tq.setFromAxisAngle(_tax, s / R));
          m.quaternion.normalize();
          _dirty = true;
        }
        if (m.position.x !== b.x || m.position.z !== b.y || m.position.y !== R) _dirty = true;
        m.position.set(b.x, R, b.y);
        m.scale.setScalar(1);
      } else {
        m.castShadow = false;
        if (m.position.y > -R * 2.2) {
          let q = PK[0], dm = 1e9;
          for (const p of PK) {
            const d = Math.hypot(b.x - p[0], b.y - p[1]);
            if (d < dm) { dm = d; q = p; }
          }
          m.position.x += (q[0] - m.position.x) * 0.25;
          m.position.z += (q[1] - m.position.z) * 0.25;
          m.position.y -= 1.6;
          m.scale.setScalar(Math.max(0.4, m.scale.x - 0.01));
          _dirty = true;
        } else {
          m.visible = false;
        }
      }
    });
  }

  if (ticks === 4) _acc = 0;

  aimL.visible = trgL.visible = ghost.visible = cue.visible = false;
  if (!B[0].in && idle()) {
    if (aimMode && !hand) {
      aim(aimYaw, charge * 180);
    } else if (drag) {
      const dx = drag.sx - mouse.x, dz = drag.sz - mouse.z;
      aim(Math.atan2(dz, dx), Math.min(Math.hypot(dx, dz), 180));
    }
  }

  if (hand && over == null && !moving) {
    ghost.position.set(mouse.x, R, mouse.z);
    ghost.visible = true;
  }

  if (cue.visible !== _cueWas) {
    _cueWas = cue.visible;
    _dirty = true;
  }

  if (_dirty || cue.visible) {
    rd.shadowMap.needsUpdate = true;
    _dirty = false;
  }

  try { if (typeof bgTick === 'function') bgTick(); } catch (e) {}
  placeCam();
  rd.render(sc, cam);
}

/* ============================================================================
   13. ARRANQUE E INICIALIZACIÓN
   ============================================================================ */
for (const [id, k] of Object.entries(CUES)) {
  $('selCue').add(new Option('Vara: ' + k.name, id));
}
if ($('selBg')) $('selBg').style.display = 'none';
$('selCue').onchange = e => applyCue(e.target.value);
applyCue('clasico');

// Fondo transparente: la mesa de billar flota integrada en el universo de la app
if (bgGroup) {
  sc.remove(bgGroup);
  bgGroup = null;
}
sc.background = null;
rd.setClearColor(0x000000, 0);
bgTick = () => {};

resize();
newGame();
frame();
