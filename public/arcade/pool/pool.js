/* #####################################################################
 * POOL 3D 2v2 (local, por turnos) — Lógica del juego (Three.js r128)
 * #####################################################################
 * JUEGO
 *   4 asientos (Rojo1, Azul1, Rojo2, Azul2) juegan por turnos en el mismo dispositivo.
 *   Rojo = lisas (1-7), Azul = rayadas (9-15). Embocar una propia = sigues; blanca = falta
 *   (el rival coloca la blanca); la 8 gana solo si ya no quedan bolas de tu equipo.
 *
 * COORDENADAS
 *   La física es 2D en "unidades de mesa": x∈[L,RX]=[60,940], y∈[T,BY]=[60,460].
 *   En 3D: x_3d = x, z_3d = y (física), y_3d = altura. El paño está en y=0, las bolas en y=R.
 *   Las bolas son objetos {i,x,y,vx,vy,in}: i=número (0=blanca), in=1 si está embocada.
 *
 * CONTROLES
 *   Cámara de tiro: arrastrar = girar 360° alrededor de la blanca; ←/→ afinan;
 *   mantener botón rojo o Espacio = cargar fuerza; soltar = disparar.
 *   Mesa libre: vista clásica (honda); clic derecho o Shift+arrastrar para orbitar.
 * ##################################################################### */

/** Constantes de mesa: R=radio de bola; L,T,RX,BY=límites del paño; MX=centro (troneras medias); CZ=centro en z. */
const R = 12, L = 60, T = 60, RX = 940, BY = 460, MX = 500, CZ = 260;
/** Troneras [x,y]: 4 esquinas + 2 medias. Radio de captura en step(): 33 esquinas, 31 medias. */
const PK = [[L - 5, T - 5], [RX + 5, T - 5], [L - 5, BY + 5], [RX + 5, BY + 5], [MX, T - 9], [MX, BY + 9]];
/** Colores base de bolas 0..8 (las rayadas 9..15 reutilizan el color de i-8 vía col()). */
const BC = ['#f4f1e8', '#f2c230', '#1f4fb0', '#d62b2b', '#5b2a86', '#f07d1a', '#12803a', '#7a1f1f', '#141414'];
const col = i => BC[i > 8 ? i - 8 : i];
/** Temas de paño: [color claro, color de bandas]. Índice = botón data-t. */
const FELT = [['#1f8f55', '#0e5f36'], ['#2a78c4', '#144f8c'], ['#a8283a', '#6a1526']];
const $ = id => document.getElementById(id);

/* ======== ESCENA: renderer, cámara, luces ======== */
const st = $('stage'), rd = new THREE.WebGLRenderer({ 
  antialias: true, 
  powerPreference: 'high-performance' 
});
rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
rd.shadowMap.enabled = true;
rd.shadowMap.type = THREE.PCFShadowMap;
rd.shadowMap.autoUpdate = false;
rd.shadowMap.needsUpdate = true;
rd.outputEncoding = THREE.sRGBEncoding;
rd.toneMapping = THREE.ACESFilmicToneMapping;
st.appendChild(rd.domElement);

const sc = new THREE.Scene();
sc.background = new THREE.Color('#000');
const cam = new THREE.PerspectiveCamera(38, 1.6, 25, 12000);
let th = 0, ph = .85, dist = 1050;
const tgt = new THREE.Vector3(500, 0, CZ);
const _targetPos = new THREE.Vector3();
/** Posiciona la cámara según el modo. */
function placeCam() {
  if (aimMode && !hand && over == null) {
    const c = B[0];
    if (!c.in && !moving) {
      _targetPos.set(c.x, R, c.y);
      ctr.lerp(_targetPos, .12);
    }
    const s = Math.sin(phA), ux = Math.cos(aimYaw), uz = Math.sin(aimYaw);
    cam.position.set(ctr.x - ux * adist * s, Math.max(46, ctr.y + adist * Math.cos(phA)), ctr.z - uz * adist * s);
    cam.lookAt(ctr.x + ux * 90, 4, ctr.z + uz * 90);
  } else {
    cam.position.set(tgt.x + dist * Math.sin(ph) * Math.sin(th), Math.max(46, dist * Math.cos(ph)), tgt.z + dist * Math.sin(ph) * Math.cos(th));
    cam.lookAt(tgt);
  }
}

function resize() {
  const w = st.clientWidth, h = st.clientHeight;
  rd.setSize(w, h, false);
  cam.aspect = w / h;
  cam.fov = w / h < 1 ? 58 : 38;
  cam.updateProjectionMatrix();
}
addEventListener('resize', resize);

sc.add(new THREE.HemisphereLight('#aab8d0', '#201810', .45));
const sp = new THREE.SpotLight('#fff1d8', 1.35, 0, .95, .55, 1);
sp.position.set(500, 640, CZ);
sp.target.position.set(500, 0, CZ);
sc.add(sp, sp.target);
sp.castShadow = true;
sp.shadow.mapSize.set(1024, 1024);
sp.shadow.bias = -.0006;
sp.shadow.normalBias = 1.2;
sp.shadow.camera.near = 200;
sp.shadow.camera.far = 1200;

/** Fondo Espacio */
function buildSpace(root) {
  const starPos = new Float32Array(18000), starCol = new Float32Array(18000);
  for (let i = 0; i < 3000; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u), D = 7000, t = .55 + Math.random() * .45;
    starPos[i * 3] = r * Math.cos(a) * D;
    starPos[i * 3 + 1] = u * D;
    starPos[i * 3 + 2] = r * Math.sin(a) * D;
    starCol[i * 3] = t;
    starCol[i * 3 + 1] = t * (.9 + Math.random() * .1);
    starCol[i * 3 + 2] = t * (.8 + Math.random() * .2);
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
      eG.fillStyle = Math.random() < .7 ? '#2f7d3a' : '#8a7a45';
      eG.beginPath();
      eG.ellipse(x + Math.random() * 70 - 35, y + Math.random() * 40 - 20, 10 + Math.random() * 34, 6 + Math.random() * 20, Math.random() * 3, 0, 7);
      eG.fill();
    }
  }
  eG.fillStyle = '#e8f1fa';
  eG.fillRect(0, 0, 1024, 26);
  eG.fillRect(0, 486, 1024, 26);
  eG.globalAlpha = .35;
  eG.fillStyle = '#fff';
  for (let i = 0; i < 170; i++) {
    eG.beginPath();
    eG.ellipse(Math.random() * 1024, Math.random() * 512, 20 + Math.random() * 60, 4 + Math.random() * 10, Math.random() * .6 - .3, 0, 7);
    eG.fill();
  }
  eG.globalAlpha = 1;
  const eTex = new THREE.CanvasTexture(eC);
  eTex.encoding = THREE.sRGBEncoding;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 20), new THREE.MeshBasicMaterial({ map: eTex }));
  earth.position.set(-900, -1100, -2600);
  earth.rotation.z = .4;
  root.add(earth);

  const atmo = new THREE.Mesh(new THREE.SphereGeometry(830, 24, 16), new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: .22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  atmo.position.copy(earth.position);
  root.add(atmo);

  const [sunC, sunG] = cvs(256, 256);
  {
    const g = sunG.createRadialGradient(128, 128, 4, 128, 128, 128);
    g.addColorStop(0, '#fffef0');
    g.addColorStop(.12, '#fff3c0');
    g.addColorStop(.3, '#ffcf6a88');
    g.addColorStop(1, '#ff9a2000');
    sunG.fillStyle = g;
    sunG.fillRect(0, 0, 256, 256);
  }
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunC), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sun.scale.set(1500, 1500, 1);
  sun.position.set(3200, 300, -4200);
  root.add(sun);

  return {
    tick() {
      earth.rotation.y += .0004;
      atmo.rotation.y += .0004;
      stars.rotation.y += .00003;
    }
  };
}

/** Fondo Atardecer */
function buildSunset(root) {
  const [c, g] = cvs(16, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#0b1030');
  gr.addColorStop(.5, '#6a2c70');
  gr.addColorStop(.8, '#f08a4b');
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

/* ======== TEXTURAS ======== */
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
  gr.addColorStop(.5, '#5c3516');
  gr.addColorStop(1, '#7a4a22');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = `rgba(${i % 2 ? '20,8,0' : '210,150,90'},${.05 + Math.random() * .1})`;
    g.lineWidth = Math.random() * 1.8;
    const y = Math.random() * 128;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + Math.random() * 6 - 3, 340, y + Math.random() * 6 - 3, 512, y + Math.random() * 4 - 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
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
  g.globalAlpha = .09;
  for (let i = 0; i < 40000; i++) {
    g.fillStyle = Math.random() < .5 ? '#fff' : '#000';
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
  t.anisotropy = 4;
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
  t.anisotropy = 4;
  return ballTex[i] = t;
}

/* ======== MESA 3D ======== */
const wood = woodTex(), woodM = new THREE.MeshStandardMaterial({ map: wood, roughness: .4, metalness: .05 });
const feltM = new THREE.MeshStandardMaterial({ map: feltTex(0), roughness: .95 });
const felt = new THREE.Mesh(new THREE.PlaneGeometry(920, 440), feltM);
felt.rotation.x = -Math.PI / 2;
felt.position.set(500, 0, CZ);
felt.receiveShadow = true;
felt.matrixAutoUpdate = false;
felt.updateMatrix();
sc.add(felt);

function box(w, h, d, x, y, z, m, cast = false) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  b.castShadow = cast;
  b.receiveShadow = true;
  b.matrixAutoUpdate = false;
  b.updateMatrix();
  sc.add(b);
  return b;
}

box(980, 24, 30, 500, 11, 29, woodM, true);
box(980, 24, 30, 500, 11, 491, woodM, true);
box(30, 24, 432, 29, 11, CZ, woodM, true);
box(30, 24, 432, 971, 11, CZ, woodM, true);

const cushM = new THREE.MeshStandardMaterial({ color: FELT[0][1], roughness: .9 });
const cushs = [];
const cu = (w, d, x, z) => cushs.push(box(w, 15, d, x, 7.5, z, cushM, false));
cu(MX - L - 50, 16, (L + 26 + MX - 22) / 2, T - 8);
cu(MX - L - 50, 16, (MX + 22 + RX - 26) / 2, T - 8);
cu(MX - L - 50, 16, (L + 26 + MX - 22) / 2, BY + 8);
cu(MX - L - 50, 16, (MX + 22 + RX - 26) / 2, BY + 8);
cu(16, BY - T - 52, L - 8, CZ);
cu(16, BY - T - 52, RX + 8, CZ);

const dm = new THREE.MeshStandardMaterial({ color: '#efe3c0', roughness: .3 });
for (let k = 1; k <= 3; k++) {
  const a = L + (MX - L) * k / 4, b = MX + (RX - MX) * k / 4;
  [a, b].forEach(x => {
    const d1 = box(8, 1.5, 8, x, 24.6, 29, dm, false); d1.rotation.y = .785; d1.updateMatrix();
    const d2 = box(8, 1.5, 8, x, 24.6, 491, dm, false); d2.rotation.y = .785; d2.updateMatrix();
  });
  [T + (BY - T) * k / 4].forEach(z => {
    const d3 = box(8, 1.5, 8, 29, 24.6, z, dm, false); d3.rotation.y = .785; d3.updateMatrix();
    const d4 = box(8, 1.5, 8, 971, 24.6, z, dm, false); d4.rotation.y = .785; d4.updateMatrix();
  });
}

const brass = new THREE.MeshStandardMaterial({ color: '#c9a15a', metalness: .8, roughness: .3 });
for (const [x, y] of PK) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(27, 32), new THREE.MeshBasicMaterial({ color: '#000' }));
  d.rotation.x = -Math.PI / 2;
  d.position.set(x, .8, y);
  d.matrixAutoUpdate = false;
  d.updateMatrix();
  sc.add(d);
  const r = new THREE.Mesh(new THREE.TorusGeometry(28, 2.2, 8, 32), brass);
  r.rotation.x = Math.PI / 2;
  r.position.set(x, 1.6, y);
  r.matrixAutoUpdate = false;
  r.updateMatrix();
  sc.add(r);
}
box(930, 34, 470, 500, -17.5, CZ, woodM, false);

/* ======== BOLAS 3D ======== */
const sg = new THREE.SphereGeometry(R, 28, 20), meshes = [];
function mkBall(i) {
  const m = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: bTex(i), roughness: .18, metalness: .05 }));
  m.castShadow = true;
  m.rotation.x = -Math.PI / 2;
  sc.add(m);
  return m;
}

function ballPos() {
  const rows = [[1], [9, 2], [10, 8, 3], [11, 4, 12, 5], [13, 6, 14, 7, 15]], b = [{ i: 0, x: 250, y: CZ, in: 0, vx: 0, vy: 0 }];
  rows.forEach((r, c) => r.forEach((id, k) => b.push({
    i: id,
    x: 640 + c * R * 1.75,
    y: CZ + (k - (r.length - 1) / 2) * R * 2.05 + (Math.random() - .5) * .6,
    in: 0,
    vx: 0,
    vy: 0
  })));
  return b;
}

/* ======== SONIDO ======== */
let ac, mix, nb, rollG, rollF;
function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor();
  comp.connect(ac.destination);
  mix = ac.createGain();
  mix.gain.value = .9;
  mix.connect(comp);

  const len = ac.sampleRate * .7, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const cv = ac.createConvolver();
  cv.buffer = ir;
  const rg = ac.createGain();
  rg.gain.value = .22;
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
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(mix);
  s.start(t, Math.random() * 1.5, dur + .05);
}

function tn(f, dur, vol, type = 'sine', f2, dly = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + dly;
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g);
  g.connect(mix);
  o.start(t);
  o.stop(t + dur + .02);
}

let lastClick = 0;
const sClick = v => {
  const n = performance.now();
  if (n - lastClick < 18) return;
  lastClick = n;
  v = Math.min(v, 1);
  const p = 1 + Math.random() * .12;
  nz('bandpass', 3800 * p, 2.5, .035, .9 * v);
  tn(1750 * p, .07, .35 * v, 'sine', 1500 * p);
  tn(3100 * p, .025, .18 * v, 'triangle');
  nz('lowpass', 900, .7, .05, .25 * v);
};

const sCush = v => {
  if (firstHit != null) railHit = true;
  v = Math.min(v, 1);
  nz('lowpass', 520, .8, .14, .9 * v);
  tn(150, .16, .55 * v, 'sine', 90);
  nz('bandpass', 1800, 1, .03, .2 * v);
};

function sw(f1, f2, dur, vol, dly = 0, q = 2) {
  if (!ac) return;
  const s = ac.createBufferSource();
  s.buffer = nb;
  const fl = ac.createBiquadFilter();
  fl.type = 'bandpass';
  fl.Q.value = q;
  const g = ac.createGain(), t = ac.currentTime + dly;
  fl.frequency.setValueAtTime(f1, t);
  fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(.0008, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * .4);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(mix);
  s.start(t, Math.random() * 1.5, dur + .05);
}

const sPocket = (id = 1, n = 1) => {
  tn(110, .4, .5, 'sine', 60);
  nz('lowpass', 700, .8, .5, .35);
  for (let i = 0; i < 4; i++) {
    nz('bandpass', 2200, 3, .03, .4 / (i + 1), .12 + i * .11);
    tn(900 - i * 120, .04, .12 / (i + 1), 'sine', undefined, .12 + i * .11);
  }
  if (id == 0) {
    tn(330, .55, .3, 'sawtooth', 90, .1);
    tn(220, .7, .28, 'square', 60, .28);
    sw(2400, 160, .6, .4, .05);
    return;
  }
  const up = Math.pow(2, Math.min(n - 1, 4) * 2 / 12);
  tn(72, .95, .95, 'sine', 26, .04);
  nz('lowpass', 260, .7, .7, .55, .04);
  sw(250, 6200, .5, .5, .02);
  sw(900, 9000, .35, .25, .2, 4);
  const N = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];
  const cnt = Math.min(7, 4 + n - 1 + (id == 8 ? 2 : 0));
  for (let i = 0; i < cnt; i++) {
    const f = N[i] * up, d = .2 + i * .065;
    tn(f, .55, .14, 'triangle', undefined, d);
    tn(f * 2, .35, .05, 'sine', undefined, d);
    tn(f * 3.01, .2, .025, 'sine', undefined, d);
  }
  if (id == 8) {
    [261.6, 329.6, 392, 523.25].forEach((f, k) => tn(f, 1.9, .22, 'triangle', undefined, .35 + k * .03));
    sw(120, 9000, 1.1, .6, .3, 1.2);
    tn(55, 1.3, .9, 'sine', 20, .5);
  }
};

const sCue = v => {
  nz('bandpass', 2300, 1.4, .025, .8 * v);
  tn(260, .1, .7 * v, 'sine', 140);
  nz('lowpass', 1200, .8, .06, .4 * v);
};

/* ======== FÍSICA 2D ======== */
function step(B, pot) {
  for (let k = 0; k < 8; k++) {
    for (const b of B) {
      if (b.in) continue;
      b.x += b.vx / 8;
      b.y += b.vy / 8;
      let cap = false;
      PK.forEach((p, k) => {
        if (!cap && Math.hypot(b.x - p[0], b.y - p[1]) < (k < 4 ? 33 : 31)) {
          cap = true;
          b.in = 1;
          b.t = 0;
          b.px = p[0];
          b.py = p[1];
          b.vx = b.vy = 0;
          pot.push(b.i);
          sPocket(b.i, pot.length);
          pocketBurst(p[0], p[1], b.i, pot.length);
        }
      });
      if (cap) continue;
      if (b.x < L + R) { b.x = L + R; sCush(Math.abs(b.vx) / 20); b.vx = -b.vx * .9; }
      if (b.x > RX - R) { b.x = RX - R; sCush(Math.abs(b.vx) / 20); b.vx = -b.vx * .9; }
      if (b.y < T + R) { b.y = T + R; sCush(Math.abs(b.vy) / 20); b.vy = -b.vy * .9; }
      if (b.y > BY - R) { b.y = BY - R; sCush(Math.abs(b.vy) / 20); b.vy = -b.vy * .9; }
    }
    for (let i = 0; i < B.length; i++) {
      for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (a.in || b.in) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * R && d > 0) {
          const nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
          a.x -= nx * ov; a.y -= ny * ov;
          b.x += nx * ov; b.y += ny * ov;
          const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (dv > 0) {
            if (firstHit == null && (a.i == 0 || b.i == 0)) firstHit = a.i ? a.i : b.i;
            a.vx -= dv * nx; a.vy -= dv * ny;
            b.vx += dv * nx; b.vy += dv * ny;
            if (dv > .4) sClick(dv / 16);
          }
        }
      }
    }
  }
  let m = false, sp = 0;
  for (const b of B) {
    if (b.in) continue;
    b.vx *= .9905;
    b.vy *= .9905;
    const s = Math.hypot(b.vx, b.vy);
    if (s < .06) b.vx = b.vy = 0;
    else { m = true; sp = Math.max(sp, s); }
  }
  if (rollG) {
    rollG.gain.setTargetAtTime(Math.min(sp / 26, 1) * .16, ac.currentTime, .05);
    rollF.frequency.setTargetAtTime(250 + sp * 25, ac.currentTime, .05);
  }
  return m;
}

/* ======== ESTADO DEL JUEGO ======== */
const NAMES = ['Rojo 1', 'Azul 1', 'Rojo 2', 'Azul 2'];
let B, turn, over, hand, moving, pot, tray, drag = null, mouse = new THREE.Vector3(), pw = 0, camMode = false, sink = [], grp = [null, null], brk = true, firstHit = null, railHit = false, grab = null;

/* ======== EFECTOS ÉPICOS ======== */
let fx = [], shake = 0, punch = 0, slowT = 0, slowDur = 1, slowMin = 1, ts = 1, epicCam = true, fxLi = 0;
const _up = new THREE.Vector3(0, 1, 0), WHITE = new THREE.Color('#ffffff');

const glowTex = (() => {
  const [c, g] = cvs(64, 64);
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff');
  r.addColorStop(.22, '#fffe');
  r.addColorStop(.55, '#fff4');
  r.addColorStop(1, '#fff0');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  return t;
})();

const beamTex = (() => {
  const [c, g] = cvs(4, 128);
  const r = g.createLinearGradient(0, 0, 0, 128);
  r.addColorStop(0, '#fff0');
  r.addColorStop(.35, '#fff5');
  r.addColorStop(1, '#fff');
  g.fillStyle = r;
  g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  return t;
})();

const ringGeo = new THREE.RingGeometry(.8, 1, 64), beamGeo = new THREE.CylinderGeometry(7, 19, 240, 24, 1, true);

function mkPool(n, size) {
  const pos = new Float32Array(n * 3).fill(-9999), clr = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(clr, 3).setUsage(THREE.DynamicDrawUsage));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.frustumCulled = false;
  sc.add(pts);
  const P = Array.from({ length: n }, () => ({ life: 0 }));
  let nx = 0, dirty = false;
  return {
    emit(x, y, z, vx, vy, vz, c, life, grav = .3, drag = .985) {
      const p = P[nx]; nx = (nx + 1) % n;
      p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz;
      p.r = c.r; p.g = c.g; p.b = c.b;
      p.life = p.max = life; p.grav = grav; p.drag = drag;
      dirty = true;
    },
    tick(dt) {
      if (!dirty) return;
      let alive = 0;
      for (let i = 0; i < n; i++) {
        const p = P[i], k = i * 3;
        if (p.life <= 0) {
          if (pos[k + 1] > -9000) { pos[k + 1] = -9999; clr[k] = clr[k + 1] = clr[k + 2] = 0; }
          continue;
        }
        p.life -= dt;
        if (p.life <= 0) { pos[k + 1] = -9999; clr[k] = clr[k + 1] = clr[k + 2] = 0; continue; }
        alive++;
        p.vy -= p.grav * dt;
        const d = Math.pow(p.drag, dt);
        p.vx *= d; p.vz *= d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 1.5 && p.vy < 0) { p.y = 1.5; p.vy *= -.32; p.vx *= .7; p.vz *= .7; }
        const f = Math.min(1, p.life / p.max * 1.5);
        pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z;
        clr[k] = p.r * f; clr[k + 1] = p.g * f; clr[k + 2] = p.b * f;
      }
      geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
      if (!alive) dirty = false;
    }
  };
}

const sparks = mkPool(900, 9), orbs = mkPool(160, 50);
const fxLights = [0, 1].map(() => {
  const l = new THREE.PointLight('#ffffff', 0, 460, 1.6);
  l.position.set(500, 60, CZ);
  sc.add(l);
  return l;
});

const flashEl = document.createElement('div');
flashEl.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0';
st.appendChild(flashEl);

function screenFlash(c, a) {
  const h = '#' + c.getHexString();
  flashEl.style.background = `radial-gradient(circle at 50% 50%,#ffffff22 0%,#0000 38%,${h}99 100%)`;
  flashEl.style.boxShadow = `inset 0 0 140px 30px ${h}aa`;
  if (flashEl.animate) flashEl.animate([{ opacity: a }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
}

function slowMo(min, dur) {
  // Desactivado: velocidad constante 1.0 para mantener 60 FPS fluidos
}

function popSprite(x, z, id, n, c) {
  const [cv, g] = cvs(320, 200), hex = '#' + c.getHexString(), scr = id == 0, eight = id == 8;
  g.shadowColor = hex; g.shadowBlur = 26; g.fillStyle = hex;
  g.beginPath(); g.arc(160, 70, 50, 0, 7); g.fill(); g.shadowBlur = 0;
  if (!scr) {
    g.fillStyle = eight ? '#141414' : col(id);
    g.beginPath(); g.arc(160, 70, 46, 0, 7); g.fill();
    g.fillStyle = '#f4f1e8';
    g.beginPath(); g.arc(160, 70, 27, 0, 7); g.fill();
    g.fillStyle = '#111';
    g.font = 'bold 34px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(id, 160, 73);
  } else {
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(160, 70, 46, 0, 7); g.fill();
    g.fillStyle = '#d62b2b';
    g.font = 'bold 58px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('✖', 160, 73);
  }
  const label = scr ? '¡BLANCA!' : eight ? '¡LA BOLA 8!' : n > 1 ? ['', '', '¡DOBLE!', '¡TRIPLE!', '¡LOCURA!'][Math.min(n, 4)] : '¡EMBOCADA!';
  g.font = '900 38px system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 9;
  g.strokeStyle = '#000c';
  g.strokeText(label, 160, 158);
  g.fillStyle = scr ? '#ff8a80' : '#ffe27a';
  g.shadowColor = scr ? '#ff1744' : '#ff9100';
  g.shadowBlur = 14;
  g.fillText(label, 160, 158);
  const tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.renderOrder = 20;
  sp.position.set(x, 45, z);
  sp.scale.set(.001, .001, 1);
  sc.add(sp);
  return sp;
}

function pocketBurst(x, z, id = 1, n = 1) {
  const scr = id == 0, eight = id == 8, big = eight ? 1.7 : 1 + .22 * Math.min(n - 1, 3);
  const c = new THREE.Color(scr ? '#ff3b3b' : eight ? '#b76bff' : col(id)).lerp(WHITE, .28);
  const gold = new THREE.Color(scr ? '#ff9a7a' : '#ffd76a');
  const hot = new THREE.Color(scr ? '#ffd0c0' : '#fff4c2');
  const mix4 = [c, gold, hot, c, WHITE];

  for (let j = 0, m = Math.round((scr ? 40 : 80) * big); j < m; j++) {
    const a = Math.random() * 6.283, sp = .5 + Math.random() * 2.6 * big, u = 3 + Math.random() * (scr ? 3 : 6.5) * Math.sqrt(big);
    sparks.emit(x, 6, z, Math.cos(a) * sp, u, Math.sin(a) * sp, mix4[j % 5], 38 + Math.random() * 34, .32);
  }
  for (let j = 0, m = Math.round(38 * big); j < m; j++) {
    const a = j / m * 6.283 + Math.random() * .2, sp = 4 + Math.random() * 5;
    sparks.emit(x, 3, z, Math.cos(a) * sp, .4 + Math.random() * 1.2, Math.sin(a) * sp, mix4[j % 3], 18 + Math.random() * 16, .08, .93);
  }
  for (let j = 0, m = Math.round(26 * big); j < m; j++) {
    const a = Math.random() * 6.283, sp = Math.random() * 1.4;
    sparks.emit(x + (Math.random() - .5) * 20, 8, z + (Math.random() - .5) * 20, Math.cos(a) * sp, .6 + Math.random() * 1.4, Math.sin(a) * sp, Math.random() < .5 ? gold : c, 70 + Math.random() * 50, -.012, .97);
  }
  for (let j = 0, m = Math.round(14 * big); j < m; j++) {
    const a = Math.random() * 6.283, sp = Math.random() * 1.6;
    orbs.emit(x, 12, z, Math.cos(a) * sp, 1 + Math.random() * 2.4, Math.sin(a) * sp, j % 2 ? c : gold, 34 + Math.random() * 30, -.01, .95);
  }

  const L = fxLights[fxLi++ % 2];
  L.color.copy(c).lerp(WHITE, .25);
  L.position.set(x, 55, z);
  L.userData.ev = null;

  const mk = (geo, color, tex) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, map: tex || null });
  const rings = [[0, 115, c], [4, 150, gold], [9, 205, c]].map(([d, mx, cl]) => {
    const m = new THREE.Mesh(ringGeo, mk(0, cl));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 2.6, z);
    m.scale.setScalar(.01);
    sc.add(m);
    return { m, d, mx: mx * big };
  });

  const dome = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  dome.position.set(x, 16, z);
  sc.add(dome);

  const beam = new THREE.Mesh(beamGeo, mk(0, c.clone().lerp(WHITE, .3), beamTex)), core = new THREE.Mesh(beamGeo, mk(0, WHITE, beamTex));
  beam.position.set(x, 120, z); core.position.set(x, 120, z);
  sc.add(beam, core);

  const pop = popSprite(x, z, id, n, c);
  const ev = {
    age: 0, life: 78,
    upd(a) {
      rings.forEach(r => {
        const t = (a - r.d) / 30;
        if (t <= 0 || t >= 1) { r.m.material.opacity = 0; return; }
        r.m.scale.setScalar(5 + r.mx * (1 - Math.pow(1 - t, 3)));
        r.m.material.opacity = (1 - t) * .95;
      });
      const dk = Math.min(1, a / 22);
      dome.scale.setScalar((60 + 240 * Math.sin(Math.min(1, dk) * Math.PI * .5)) * big);
      dome.material.opacity = Math.max(0, (1 - dk)) * .95;
      const bk = a / 44, pulse = 1 + .12 * Math.sin(a * .9);
      beam.visible = core.visible = bk < 1;
      if (bk < 1) {
        const gr = Math.min(1, a / 5);
        beam.scale.set(pulse * (1 - bk * .55) * big, gr * (1 + bk * .35), pulse * (1 - bk * .55) * big);
        core.scale.set(.42 * (1 - bk * .7), gr, .42 * (1 - bk * .7));
        beam.material.opacity = Math.pow(1 - bk, 1.2) * .8;
        core.material.opacity = Math.pow(1 - bk, 1.6) * .95;
      }
      if (!L.userData.ev && a < 1.5) L.userData.ev = this;
      if (L.userData.ev === this) L.intensity = Math.pow(Math.max(0, 1 - a / 34), 2) * (eight ? 10 : 6) * big;
      const pk = Math.min(1, a / 14), ease = 1 + 2.70158 * Math.pow(pk - 1, 3) + 1.70158 * Math.pow(pk - 1, 2), dsc = Math.max(.35, Math.min(2, cam.position.distanceTo(pop.position) / 1000));
      const sc2 = (112 + (eight ? 36 : 0)) * ease * dsc;
      pop.scale.set(sc2 * 1.6, sc2, 1);
      pop.position.y = 40 + Math.min(a, 60) * 1.05;
      pop.material.opacity = a < 48 ? 1 : Math.max(0, 1 - (a - 48) / 30);
    },
    end() {
      rings.forEach(r => { sc.remove(r.m); r.m.material.dispose(); });
      [dome, beam, core, pop].forEach(o => { sc.remove(o); o.material.dispose(); });
      pop.material.map.dispose();
      if (L.userData.ev === this) { L.intensity = 0; L.userData.ev = null; }
    }
  };
  fx.push(ev);

  if (epicCam) {
    shake = Math.max(shake, (eight ? 4 : scr ? 1.5 : 2) * big);
    punch = Math.max(punch, eight ? 2 : scr ? 0.8 : 1.2);
    screenFlash(c, eight ? .7 : scr ? .35 : .45);
  }
}

function tickFx(dt = 1) {
  sparks.tick(dt);
  orbs.tick(dt);
  fx = fx.filter(f => {
    f.age += dt;
    if (f.age < f.life) { f.upd(f.age); return true; }
    f.end();
    return false;
  });
}

const own = (i, t) => grp[t] == 'S' ? (i >= 1 && i <= 7) : grp[t] == 'T' ? i >= 9 : false;
let toastTimer = null;

function notify(title, detail = '', epic = false, duration = 2100) {
  const el = $('toast');
  el.classList.remove('show', 'epic');
  void el.offsetWidth;
  $('toastTitle').textContent = title;
  $('toastText').textContent = detail;
  if (epic) el.classList.add('epic');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show', 'epic'), duration);
}

function groupHint(t) {
  const g = grp[t];
  return g === 'S' ? 'LISAS: debes embocar las bolas del 1 al 7.' :
         g === 'T' ? 'RAYADAS: debes embocar las bolas del 9 al 15.' :
         'MESA ABIERTA: emboca una lisa o rayada para definir tu grupo.';
}

function newGame() {
  B = ballPos();
  meshes.forEach(m => sc.remove(m));
  meshes.length = 0;
  B.forEach(b => meshes.push(mkBall(b.i)));
  grab = null; grp = [null, null]; brk = true; turn = 0; over = null; hand = false; moving = false; pot = []; tray = [];
  $('msg').textContent = 'Turno de ' + NAMES[0] + ' · arrastra para apuntar y mantén FUERZA';
  ui();
  notify('¡QUE COMIENCE LA PARTIDA!', 'ROJO empieza. ' + groupHint(0), false, 2800);
  rd.shadowMap.needsUpdate = true;
}

const mb = (i, c = '') => {
  const k = col(i);
  return `<span class="mb ${c}" style="background:${i > 8 ? `linear-gradient(${k} 28%,#f4f1e8 28% 72%,${k} 72%)` : k}"><i>${i}</i></span>`;
};
const GN = { S: 'LISAS (1-7)', T: 'RAYADAS (9-15)' };

function ui() {
  $('seats').innerHTML = over == null ? `<span class="chip ${turn % 2 ? 'B' : 'R'} on">Turno: ${NAMES[turn]}</span>` : '';
  [0, 1].forEach(t => {
    const g = grp[t], cur = turn % 2 == t && over == null, ids = g ? (g == 'S' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15]).concat(8) : [], el = $(t ? 'tR' : 'tL');
    el.className = 'tc ' + (t ? 'B' : 'R') + (cur ? ' on' : '');
    el.innerHTML = `<div class="th"><b>${t ? 'AZUL' : 'ROJO'}</b><span>${g ? GN[g] : 'Mesa abierta'}</span></div><div class="sl">${g ? ids.map(i => mb(i, tray.includes(i) ? 'dn' : '')).join('') : '<small>Grupo sin asignar</small>'}</div>`;
  });
  $('trWrap').hidden = !tray.length;
  $('trAll').innerHTML = tray.map(i => mb(i)).join('');
}

function finish() {
  moving = false;
  if (rollG) rollG.gain.setTargetAtTime(0, ac.currentTime, .1);
  const t = turn % 2, o = 1 - t, M = $('msg'), team = t ? 'AZUL' : 'ROJO', oth = o ? 'AZUL' : 'ROJO';
  if (brk) {
    brk = false;
    if (pot.includes(8)) {
      const b8 = B.find(b => b.i == 8);
      b8.in = 0; b8.x = 640 + 2 * R * 1.75; b8.y = CZ; b8.vx = b8.vy = 0;
      pot = pot.filter(i => i != 8);
    }
  }
  const scratch = pot.includes(0), eight = pot.includes(8), objs = pot.filter(i => i && i != 8), leftBefore = B.some(b => !b.in && own(b.i, t)) || objs.some(i => own(i, t));
  let why = '';
  if (scratch) why = 'embocó la blanca';
  else if (firstHit == null) why = 'la blanca no tocó ninguna bola';
  else if (firstHit == 8) { if (!grp[t] || leftBefore) why = 'tocó primero la 8'; }
  else if (grp[t] && !own(firstHit, t)) why = 'tocó primero una bola del rival';
  if (!why && !objs.length && !eight && !railHit) why = 'ninguna bola tocó banda';
  const foul = !!why;
  tray.push(...pot.filter(i => i));

  if (eight) {
    const ok = grp[t] && !leftBefore && !foul;
    over = ok ? t : o;
    M.textContent = ok ? `¡Gana el equipo ${team}! Embocó la 8 legalmente.` : `${team} pierde: ${grp[t] && !leftBefore ? why : 'embocó la 8 antes de tiempo'}. ¡Gana el equipo ${oth}!`;
    ui();
    notify(ok ? '¡VICTORIA ÉPICA!' : '¡PARTIDA PERDIDA!', ok ? `El equipo ${team} embocó la bola 8 y se lleva la victoria.` : `Gana el equipo ${oth}. ${why ? 'Falta: ' + why + '.' : 'La bola 8 cayó antes de tiempo.'}`, true, 4000);
    return;
  }

  let asg = '';
  if (!grp[t] && !foul && objs.length) {
    const s = objs[0] < 8;
    grp[t] = s ? 'S' : 'T'; grp[o] = s ? 'T' : 'S';
    asg = ` ${team} queda con ${s ? 'LISAS' : 'RAYADAS'} y ${oth} con ${s ? 'RAYADAS' : 'LISAS'}.`;
  }
  const mine = objs.some(i => own(i, t)), opp = objs.filter(i => own(i, o)).length, ex = opp ? ` (${opp} del rival cuenta para ${oth})` : '';
  if (mine && !foul) {
    M.textContent = NAMES[turn] + ' embocó y sigue.' + asg + ex;
    notify('¡BUEN TIRO!', 'La bola cayó. Sigues jugando. ' + groupHint(turn % 2), true, 2100);
  } else {
    turn = (turn + 1) % 4;
    M.textContent = foul ? `Falta: ${why}. ${NAMES[turn]} coloca la blanca (la arrastra y la suelta donde quiera).${ex}` : `Turno de ${NAMES[turn]}.${asg}${ex}`;
    if (foul) { hand = true; startHand(); }
    notify(foul ? '¡FALTA!' : 'CAMBIO DE TURNO', foul ? `${why}. ${NAMES[turn]} puede colocar la blanca donde quiera.` : `Juega ${NAMES[turn]}. ${groupHint(turn % 2)}`, false, 2800);
  }
  const n = turn % 2;
  if (!hand && grp[n] && !B.some(b => !b.in && own(b.i, n))) {
    M.textContent += ' ¡Ve por la bola 8!';
    notify('¡ÚLTIMA BOLA!', 'Ya embocaste todas las tuyas. Ahora debes meter la bola 8.', true, 3000);
  }
  ui();
  rd.shadowMap.needsUpdate = true;
}

const validPos = (x, y) => x >= L + R && x <= RX - R && y >= T + R && y <= BY - R && B.every(b => b.i == 0 || b.in || Math.hypot(b.x - x, b.y - y) > 2 * R);

function startHand() {
  const c = B[0];
  if (c.in || !validPos(c.x, c.y)) {
    let f = null;
    for (let r = 0; r <= 400 && !f; r += 26) {
      for (let k = 0; k < 16 && !f; k++) {
        const x = 250 + Math.cos(k * .39) * r, y = CZ + Math.sin(k * .39) * r;
        if (validPos(x, y)) f = [x, y];
      }
    }
    if (f) { c.x = f[0]; c.y = f[1]; }
  }
  c.in = 0; c.vx = c.vy = 0;
  sink = sink.filter(s => s != 0);
  setMode(false); ph = .4; th = 0; dist = 1100;
}
const idle = () => over == null && !moving && !hand;

/* ======== ENTRADA ======== */
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -R), v2 = new THREE.Vector2();
function tp(e) {
  const r = st.getBoundingClientRect();
  v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(v2, cam);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(plane, p) ? p : null;
}

let orb = null, aimMode = true, aimYaw = 0, phA = 1.2, adist = 330, charge = 0, charging = false;
const ctr = new THREE.Vector3(250, R, CZ);

st.oncontextmenu = e => e.preventDefault();
st.onpointerdown = e => {
  initAudio();
  st.setPointerCapture(e.pointerId);
  if ((aimMode && !hand) || e.button == 2 || e.shiftKey) {
    orb = { x: e.clientX, y: e.clientY, aim: aimMode && !hand };
    return;
  }
  const p = tp(e);
  if (!p) return;
  mouse.copy(p);
  if (over == null && !moving && hand) {
    const c = B[0];
    if (Math.hypot(p.x - c.x, p.z - c.y) < 48) grab = { dx: c.x - p.x, dz: c.y - p.z };
    return;
  }
  if (idle()) drag = { sx: p.x, sz: p.z };
};

st.onpointermove = e => {
  if (orb) {
    const dx = e.clientX - orb.x, dy = e.clientY - orb.y;
    if (orb.aim && aimMode && !hand && over == null) {
      aimYaw += dx * .0045;
      phA = Math.max(.6, Math.min(1.3, phA - dy * .004));
    } else {
      th -= dx * .006;
      ph = Math.max(.05, Math.min(1.25, ph - dy * .005));
    }
    orb.x = e.clientX; orb.y = e.clientY;
    return;
  }
  const p = tp(e);
  if (p) {
    mouse.copy(p);
    if (grab && hand) {
      const c = B[0], x = Math.max(L + R, Math.min(RX - R, p.x + grab.dx)), y = Math.max(T + R, Math.min(BY - R, p.z + grab.dz));
      if (validPos(x, y)) { c.x = x; c.y = y; }
      else if (validPos(x, c.y)) c.x = x;
      else if (validPos(c.x, y)) c.y = y;
    }
  }
};

st.onpointerup = () => {
  if (grab) {
    grab = null;
    if (hand) { hand = false; setMode(true); $('msg').textContent = 'Turno de ' + NAMES[turn]; }
    return;
  }
  if (orb) { orb = null; return; }
  if (!drag) return;
  const dx = drag.sx - mouse.x, dz = drag.sz - mouse.z, l = Math.hypot(dx, dz);
  drag = null; $('pf').style.height = '0';
  if (l < 8 || !idle()) return;
  shoot(Math.atan2(dz, dx), Math.min(l / 180, 1));
};

function shoot(a, p) {
  B[0].vx = Math.cos(a) * p * 28.5;
  B[0].vy = Math.sin(a) * p * 28.5;
  pot = []; firstHit = null; railHit = false; moving = true;
  sCue(p); $('msg').textContent = '…'; charge = 0; charging = false; $('pf').style.height = '0';
  rd.shadowMap.needsUpdate = true;
}

st.onwheel = e => {
  e.preventDefault();
  zoom(1 + e.deltaY * .001);
};

function zoom(f) {
  if (aimMode && !hand) adist = Math.max(140, Math.min(700, adist * f));
  else dist = Math.max(600, Math.min(1700, dist * f));
}

function setMode(v) {
  aimMode = v;
  $('mode').textContent = v ? '🎯 Cámara de tiro' : '🌐 Mesa libre';
}

$('mode').onclick = () => setMode(!aimMode);
const go = () => { initAudio(); if (aimMode && idle()) charging = true; };
const rel = () => {
  if (!charging) return;
  charging = false;
  if (aimMode && idle() && charge > .05) shoot(aimYaw, charge);
  else { charge = 0; $('pf').style.height = '0'; }
};

$('pw').onpointerdown = e => { e.preventDefault(); e.stopPropagation(); go(); };
addEventListener('pointerup', rel);
addEventListener('pointercancel', rel);

['gear', 'menu', 'trWrap'].forEach(id => {
  const el = $(id);
  if (el) el.onpointerdown = e => e.stopPropagation();
});
$('gear').onclick = () => { $('menu').hidden = !$('menu').hidden; };

addEventListener('keydown', e => {
  if (e.code == 'Space' && !e.repeat) { e.preventDefault(); go(); }
  if (e.key == 'ArrowLeft') aimYaw -= .012;
  if (e.key == 'ArrowRight') aimYaw += .012;
});
addEventListener('keyup', e => { if (e.code == 'Space') rel(); });

$('v1').onclick = () => { setMode(false); ph = .04; th = 0; dist = 1150; };
$('v2').onclick = () => { setMode(false); ph = .85; th = 0; dist = 1050; };
$('zi').onclick = () => zoom(.85);
$('zo').onclick = () => zoom(1.18);
$('new').onclick = newGame;
const exitBtn = $('btnExit');
if (exitBtn) {
  exitBtn.onclick = () => {
    try {
      window.parent.postMessage({ type: 'EXIT_TO_CATALOG' }, '*');
    } catch (e) {}
  };
}

$('epicBtn').onclick = e => {
  epicCam = !epicCam;
  if (!epicCam) { slowT = 0; shake = 0; }
  e.target.textContent = '🎬 Cámara épica: ' + (epicCam ? 'ON' : 'OFF');
  e.target.classList.toggle('sel', epicCam);
};

document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
  feltM.map = feltTex(+b.dataset.t);
  feltM.needsUpdate = true;
  cushM.color.set(FELT[+b.dataset.t][1]);
  document.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('sel', x == b));
});

/* ======== AYUDAS DE PUNTERÍA ======== */
function setLine(g, a, b, c, d, e, f) {
  const p = g.attributes.position;
  p.setXYZ(0, a, b, c); p.setXYZ(1, d, e, f);
  p.needsUpdate = true;
}

const aimG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), aimL = new THREE.Line(aimG, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 }));
aimL.visible = false; aimL.frustumCulled = false; sc.add(aimL);
const trgG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), trgL = new THREE.Line(trgG, new THREE.LineBasicMaterial({ color: '#f5c542' }));
trgL.visible = false; trgL.frustumCulled = false; sc.add(trgL);
const bncG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), bncL = new THREE.Line(bncG, new THREE.LineBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: .75 }));
bncL.visible = false; bncL.frustumCulled = false; sc.add(bncL);
const ghost = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .28 }));
ghost.visible = false; sc.add(ghost);

const CUES = {
  clasico: { name: 'Clásica', color: '#d9a95f', tip: '#4aa3df', roughness: .4, metalness: 0 },
  ebano: { name: 'Ébano', color: '#1b1b1f', tip: '#d4af37', roughness: .25, metalness: .2 },
  oro: { name: 'Oro', color: '#d4af37', tip: '#ffffff', roughness: .2, metalness: .95 },
  neon: { name: 'Neón', color: '#10202a', tip: '#00e5ff', roughness: .3, metalness: 0, emissive: '#00bcd4', emissiveIntensity: .9 }
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
cue.castShadow = true; cue.visible = false; sc.add(cue);
const tip = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 6, 12), tipMat);
cue.add(tip); tip.position.y = 162;

function castRay(x, z, ux, uz) {
  let tm = 1e9, hit = null;
  for (const b of B) {
    if (b.i == 0 || b.in) continue;
    const fx = b.x - x, fz = b.y - z, pr = fx * ux + fz * uz;
    if (pr <= 0) continue;
    const d2 = fx * fx + fz * fz - pr * pr;
    if (d2 < 4 * R * R) {
      const t = pr - Math.sqrt(4 * R * R - d2);
      if (t < tm) { tm = t; hit = b; }
    }
  }
  const wx = ux > 0 ? (RX - R - x) / ux : ux < 0 ? (L + R - x) / ux : 1e9,
        wz = uz > 0 ? (BY - R - z) / uz : uz < 0 ? (T + R - z) / uz : 1e9,
        wm = Math.min(wx, wz);
  let wall = 0;
  if (!hit || wm < tm) { tm = wm; hit = null; wall = wx < wz ? 1 : 2; }
  return { tm, hit, wall };
}

let cueE = .07;
function aim(a, l) {
  const c = B[0], ux = Math.cos(a), uz = Math.sin(a);
  const rc = castRay(c.x, c.y, ux, uz);
  let tm = rc.tm, hit = rc.hit;
  const gx = c.x + ux * tm, gz = c.y + uz * tm, y = R + .5;
  setLine(aimG, c.x, y, c.y, gx, y, gz);
  aimL.visible = true;
  ghost.position.set(gx, R, gz);
  ghost.scale.setScalar(1);
  ghost.visible = true;

  if (hit) {
    const nx = hit.x - gx, nz = hit.y - gz, n = Math.hypot(nx, nz);
    setLine(trgG, hit.x, y, hit.y, hit.x + nx / n * 70, y, hit.y + nz / n * 70);
    trgL.visible = true;
  } else trgL.visible = false;

  if (rc.wall) {
    const rx = rc.wall == 1 ? -ux : ux, rz = rc.wall == 2 ? -uz : uz, r2 = castRay(gx, gz, rx, rz), L2 = Math.min(r2.tm, 700);
    setLine(bncG, gx, y, gz, gx + rx * L2, y, gz + rz * L2);
    bncL.visible = true;
  } else bncL.visible = false;

  const dW = Math.min(ux > 0 ? (c.x - 44) / ux : ux < 0 ? (c.x - 956) / ux : 1e9, uz > 0 ? (c.y - 44) / uz : uz < 0 ? (c.y - 476) / uz : 1e9),
        tgtE = Math.min(.7, Math.max(.07, Math.atan(17 / Math.max(dW, 26))));
  cueE += (tgtE - cueE) * .3;

  const E = cueE, len = 330;
  _cueDir.set(ux * Math.cos(E), -Math.sin(E), uz * Math.cos(E));
  _cueTipP.set(c.x, R, c.y).addScaledVector(_cueDir, -(R + 5 + l * .6));
  cue.scale.y = 1;
  cue.position.copy(_cueTipP).addScaledVector(_cueDir, -len / 2);
  cue.quaternion.setFromUnitVectors(_vUp, _cueDir);
  cue.visible = true;
  $('pf').style.height = (l / 180 * 100) + '%';
}

/* ======== BUCLE PRINCIPAL (Con limitador inteligente a 60 FPS) ======== */
const _cueDir = new THREE.Vector3(), _cueTipP = new THREE.Vector3(), _vUp = new THREE.Vector3(0, 1, 0);
const _ax = new THREE.Vector3(), _q = new THREE.Quaternion();
let acc = 0, last = performance.now();
let _lastFrameTime = performance.now();
const _frameInterval = 1000 / 60; // 16.667ms

function frame(now) {
  requestAnimationFrame(frame);
  now = now || performance.now();
  const elapsed = now - _lastFrameTime;
  if (elapsed < _frameInterval - 1.5) return; // Evita sobrecarga en pantallas 120Hz/144Hz
  const dtMs = Math.min(50, elapsed);
  _lastFrameTime = now - (elapsed % _frameInterval);
  const rdt = dtMs / 16.667;

  // Simulación a tiempo real (60 FPS fluidos sin ralentizaciones artificiales)
  const fdt = rdt;
  acc = Math.min(acc + dtMs, 50);
  let ns = 0;
  while (acc >= 16.667) {
    acc -= 16.667;
    if (moving) {
      ns++;
      if (!step(B, pot)) { finish(); break; }
    }
  }

  B.forEach((b, k) => {
    const m = meshes[k];
    if (!b.in) {
      m.visible = true;
      m.castShadow = true;
      if (b.gl) { b.gl = 0; m.material.emissive.set('#000000'); m.material.emissiveIntensity = 1; }
      const s = Math.hypot(b.vx, b.vy);
      if (s > 0) {
        if (ns) {
          _ax.set(b.vy, 0, -b.vx).normalize();
          m.quaternion.premultiply(_q.setFromAxisAngle(_ax, s * ns / R));
          m.quaternion.normalize();
        }
      }
      m.position.set(b.x, R, b.y);
      m.scale.setScalar(1);
    } else {
      const t = b.t = (b.t || 0) + fdt, k = Math.min(1, t / 26), rs = Math.pow(1 - k, 2),
            a = t * .34 * (2 - k), sx = b.x - b.px, sz = b.y - b.py,
            ca = Math.cos(a), sa = Math.sin(a);
      m.castShadow = false;
      if (!b.gl) { b.gl = 1; m.material.emissive.set('#ffcf70'); }
      m.material.emissiveIntensity = Math.max(0, .85 * (1 - t / 18));
      m.position.x = b.px + (sx * ca - sz * sa) * rs;
      m.position.z = b.py + (sx * sa + sz * ca) * rs;
      m.position.y = R - .16 * t * t + Math.sin(Math.min(t, 6) / 6 * Math.PI) * 5;
      m.scale.setScalar(Math.max(.3, 1 - t * .03));
      m.rotateOnWorldAxis(_up, .55 * fdt);
      m.visible = m.position.y > -R * 2.4;
    }
  });

  aimL.visible = trgL.visible = bncL.visible = ghost.visible = cue.visible = false;
  if (charging && idle()) charge = Math.min(1, charge + .014);
  if (!B[0].in && idle()) {
    if (aimMode && !hand) aim(aimYaw, charge * 180);
    else if (drag) {
      const dx = drag.sx - mouse.x, dz = drag.sz - mouse.z;
      aim(Math.atan2(dz, dx), Math.min(Math.hypot(dx, dz), 180));
    }
  }
  if (hand && over == null && !moving) {
    ghost.position.set(B[0].x, R, B[0].y);
    ghost.scale.setScalar(1.7);
    ghost.visible = true;
  }

  tickFx(Math.max(.05, fdt));
  bgTick();
  placeCam();

  if (shake > .05) {
    cam.position.x += (Math.random() - .5) * shake;
    cam.position.y += (Math.random() - .5) * shake * .6;
    cam.position.z += (Math.random() - .5) * shake;
    shake *= Math.pow(.84, rdt);
  } else shake = 0;

  if (punch > .02) {
    cam.fov = (cam.aspect < 1 ? 58 : 38) - punch;
    cam.updateProjectionMatrix();
    punch *= Math.pow(.82, rdt);
    if (punch <= .02) {
      punch = 0;
      cam.fov = cam.aspect < 1 ? 58 : 38;
      cam.updateProjectionMatrix();
    }
  }

  // Actualizar sombras dinámicas solo bajo movimiento o interacción (ahorra ~60% de GPU en reposo)
  if (moving || charging || drag || (aimMode && !hand) || orb || shake > 0.05) {
    rd.shadowMap.needsUpdate = true;
  }

  rd.render(sc, cam);
}

/* Poblar selectores de vara y fondo */
for (const [id, k] of Object.entries(CUES)) $('selCue').add(new Option('Vara: ' + k.name, id));
for (const [id, k] of Object.entries(BACKGROUNDS)) $('selBg').add(new Option('Fondo: ' + k.name, id));
$('selCue').onchange = e => applyCue(e.target.value);
$('selBg').onchange = e => applyBackground(e.target.value);

applyCue('clasico');
applyBackground('espacio');
resize();
newGame();
frame();
