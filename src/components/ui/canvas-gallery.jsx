import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import InteractiveFlower from './interactive-flower';
import PaperPlane3D from './paper-plane';

// Generador pseudo-aleatorio
const mulberry32 = (a) => {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/* =====================================================================
 * Constantes del universo (mismas del diseño original)
 * ===================================================================== */
const FOG_START = 3000;   // A partir de aquí empieza el fundido (niebla)
const FOG_END = 7000;     // Aquí la opacidad llega a 0 (igual que el original)
const FOG_CULL = 6960;    // Ocultar en cuanto opacity <= 0.01 (mismo umbral del original, función pura)

const PERSPECTIVE = 1200; // perspective del contenedor (px)
const OFF_SHOW = 60;      // margen para MOSTRAR un item fuera de pantalla
const OFF_HIDE = 240;     // margen para OCULTAR un item fuera de pantalla (histeresis)

// --- Virtualización (montar/desmontar fotos según lo que se ve) ---
// El anillo de montaje es MÁS amplio que el de visibilidad para que la imagen
// empiece a cargarse antes de entrar en pantalla (precarga) y no parpadee.
const MOUNT_IN_DIST = FOG_CULL + 600;  // montar si además está a <= MOUNT_IN_OFF px de la pantalla
const MOUNT_OUT_DIST = FOG_CULL + 1100; // desmontar si supera esta distancia (invisible + margen)
const MOUNT_IN_OFF = 700;
const MOUNT_OUT_OFF = 1200;

// --- Escalado de densidad ---
// El universo crece con el nº de fotos para que la DENSIDAD visual sea siempre
// la misma: 10.000 fotos no pueden apelotonarse en el volumen de 100 (se volvería
// 100x más denso y la pantalla se llenaría de fotos superpuestas).
const DENSITY_N = 100;    // nº de fotos de referencia (demo/planes pequeños => scale 1)
const BASE_X = 8000, BASE_Y = 8000, BASE_Z = 16000, BASE_Y_LIMIT = 3000;

// --- Índice espacial (grid) para que el coste por frame sea O(visibles) ---
const GRID_CELL = 2000;
const GRID_MIN = 800;     // por debajo de esto se itera todo (más barato que el grid)

const PAN_FACTOR = 2;     // sensibilidad de arrastre (igual al original)
const WHEEL_FACTOR = 3;   // sensibilidad de rueda (igual al original)
const PINCH_FACTOR = 6;   // sensibilidad del pellizco para alejarse/acercarse

const wrapAxis = (v, size) => {
  let w = ((v % size) + size) % size;
  if (w > size / 2) w -= size;
  return w;
};

// Índice de celda de una coordenada toroidal (posición -> [0, nc))
const cellIndexOf = (p, block, nc) => {
  const norm = ((p + block / 2) % block + block) % block;
  let g = Math.floor(norm / GRID_CELL);
  if (g >= nc) g = nc - 1;
  if (g < 0) g = 0;
  return g;
};

export default function CanvasGallery({ items, toggleView, hasFlightMode = true }) {
  const containerRef = useRef(null);
  const worldRef = useRef(null);          // Contenedor 3D (recibe yaw/pitch de la cámara)
  const shipRef = useRef(null);           // Nave de papel (modo vuelo)

  const itemElsRef = useRef([]);          // Nodos DOM de cada foto montada
  const videoElsRef = useRef([]);         // Nodos DOM de cada video montado (o null)
  const itemsRef = useRef([]);            // scatteredItems (siempre el último)

  // Cámara: estado fuera de React. Mover la cámara NUNCA re-renderiza React,
  // solo escribe estilos en el DOM una vez por frame (requestAnimationFrame).
  const cameraRef = useRef({ x: 0, y: 0, z: -2000, yaw: 0, pitch: 0 });
  const flightRef = useRef(false);
  const keysRef = useRef({ w: false, a: false, s: false, d: false, ' ': false, c: false });
  const shipRotRef = useRef({ roll: 0, pitch: 0 });

  const dirtyRef = useRef(false);         // Hay cambios pendientes de pintar
  const rafRef = useRef(0);               // frame programado (0 = ninguno)
  const viewRef = useRef({ w: 1, h: 1 }); // Tamaño del contenedor (se cachea)

  // Dimensiones del universo (escaladas por nº de fotos) + grid espacial
  const blocksRef = useRef({ X: BASE_X, Y: BASE_Y, Z: BASE_Z, yLimit: BASE_Y_LIMIT, scale: 1 });
  const gridRef = useRef({ active: false, map: null, ncx: 1, ncy: 1, ncz: 1, C: 2 });
  const candRef = useRef([]);             // array reutilizado de candidatos (sin GC por frame)
  const mountedListRef = useRef([]);      // índices montados actualmente
  const forceMountRef = useRef(false);    // QA: forzar montar todo (solo desarrollo)
  const statsRef = useRef({ lastApplyMs: 0, candidates: 0 });

  // Cachés por item para no escribir estilos sin cambio.
  // `mounted` = flags de montaje; `wish` = deseos calculados en el frame actual.
  const stateRef = useRef({ shown: new Uint8Array(0), vis: [], op: [], pe: [], mounted: new Uint8Array(0), wish: new Uint8Array(0) });

  // Estado de los punteros (ratón + táctil) para arrastre y pellizco
  const pointersRef = useRef(new Map());
  const lastPosRef = useRef(null);
  const pinchRef = useRef(0);

  const [isFlightMode, setIsFlightMode] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  // Fotos montadas (virtualización): solo estas existen en el DOM
  const [mountedIdx, setMountedIdx] = useState([]);

  // Densidad escalada: mismo aspecto visual sea cual sea el nº de fotos
  const blocks = useMemo(() => {
    const scale = items.length > DENSITY_N ? Math.cbrt(items.length / DENSITY_N) : 1;
    return {
      X: BASE_X * scale,
      Y: BASE_Y * scale,
      Z: BASE_Z * scale,
      yLimit: BASE_Y_LIMIT * scale,
      scale,
    };
  }, [items]);

  // Semilla aleatoria única por sesión para que el universo NUNCA sea igual al anterior
  const [universeSeed] = useState(() => Math.floor(Math.random() * 10000));

  const scatteredItems = useMemo(() => {
    // Usamos la semilla de la sesión en lugar de un 9999 fijo
    const random = mulberry32(universeSeed);
    const s = blocks.scale;

    // Barajar los items de forma determinista usando la misma semilla
    // Así, el grupo de fotos que aparece justo al frente (primeros 12) será diferente cada vez.
    const shuffledItems = [...items].sort(() => 0.5 - random());

    // 1. Generamos un "Universo Maestro" con distribución 3D uniforme
    const baseItems = [];

    // Por petición del usuario, NUNCA se deben duplicar imágenes.
    // Iteramos estrictamente sobre las imágenes originales una sola vez.
    shuffledItems.forEach((item, index) => {
      let x, y, z;

      // 🚀 HERO CLUSTER: Asegurar que las primeras 9-12 fotos aparezcan justo frente a la cámara al entrar
      // La cámara inicia en z: -2000, mirando hacia el centro (z: 0)
      if (index < 12) {
        // El clúster de entrada NO se escala: siempre se ve igual al abrir el universo
        x = (random() * 4000) - 2000; // Esparcidas a lo ancho (-2000 a 2000)
        y = (random() * 2500) - 1250; // Esparcidas a lo alto (-1250 a 1250)
        z = -1000 + (random() * 2500); // Distancia perfecta para que se vean de diferentes tamaños (Z: -1000 a 1500)
      } else {
        // Resto del universo distribuido normalmente (volumen escalado por densidad)
        x = ((random() * BASE_X) - (BASE_X / 2)) * s;
        y = ((random() * BASE_Y) - (BASE_Y / 2)) * s;
        z = ((random() * BASE_Z) - (BASE_Z / 2)) * s;
      }

      const rotation = (random() * 30) - 15;
      const width = 250 + (random() * 250);

      baseItems.push({
        ...item,
        uniqueId: `${item.id || index}`, // Key única original
        x, y, z, rotation, width,
        // Datos precalculados para la proyección de las 4 esquinas por frame
        hw: width / 2,
        hh: (width * 4 / 3) / 2, // aspectRatio 3/4
        cosR: Math.cos(rotation * Math.PI / 180),
        sinR: Math.sin(rotation * Math.PI / 180),
        rotStr: `rotateZ(${rotation}deg)`, // evita crear strings por frame
      });
    });

    return baseItems;
  }, [items, blocks]);

  /* ===================================================================
   * Construcción del índice espacial (una vez por cambio de items)
   * =================================================================== */
  const buildGrid = (list, bl) => {
    if (list.length <= GRID_MIN) {
      gridRef.current = { active: false, map: null, ncx: 1, ncy: 1, ncz: 1, C: 2 };
      return;
    }
    const ncx = Math.max(1, Math.ceil(bl.X / GRID_CELL));
    const ncy = Math.max(1, Math.ceil(bl.Y / GRID_CELL));
    const ncz = Math.max(1, Math.ceil(bl.Z / GRID_CELL));
    const C = Math.max(ncx, ncy, ncz) + 1;
    const map = new Map();
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const gx = cellIndexOf(it.x, bl.X, ncx);
      const gy = cellIndexOf(it.y, bl.Y, ncy);
      const gz = cellIndexOf(it.z, bl.Z, ncz);
      const key = gx + gy * C + gz * C * C;
      let cell = map.get(key);
      if (!cell) { cell = []; map.set(key, cell); }
      cell.push(i);
    }
    gridRef.current = { active: true, map, ncx, ncy, ncz, C };
  };

  /* Candidatos del frame: celdas próximas a la cámara (toro) o todos */
  const collectCandidates = (cam) => {
    const arr = candRef.current;
    arr.length = 0;
    const N = itemsRef.current.length;
    const force = forceMountRef.current;
    const g = gridRef.current;

    if (force || !g.active) {
      for (let i = 0; i < N; i++) arr.push(i);
      return arr;
    }

    // La cámara (en espacio de ítems) está en -cam (mod bloque): wrap(item+cam) pequeño
    // equivale a item ≈ -cam (mod bloque).
    const bl = blocksRef.current;
    const pcx = wrapAxis(-cam.x, bl.X);
    const pcy = wrapAxis(-cam.y, bl.Y);
    const pcz = wrapAxis(-cam.z, bl.Z);
    const gx0 = cellIndexOf(pcx, bl.X, g.ncx);
    const gy0 = cellIndexOf(pcy, bl.Y, g.ncy);
    const gz0 = cellIndexOf(pcz, bl.Z, g.ncz);

    // Radio de consulta: hasta donde puede haber algo montable (niebla + margen)
    const q = Math.ceil((MOUNT_OUT_DIST + 1200) / GRID_CELL);
    const C = g.C;
    for (let dz = -q; dz <= q; dz++) {
      const gz = (((gz0 + dz) % g.ncz) + g.ncz) % g.ncz;
      for (let dy = -q; dy <= q; dy++) {
        const gy = (((gy0 + dy) % g.ncy) + g.ncy) % g.ncy;
        const rowBase = gy * C + gz * C * C;
        for (let dx = -q; dx <= q; dx++) {
          const gx = (((gx0 + dx) % g.ncx) + g.ncx) % g.ncx;
          const cell = g.map.get(gx + rowBase);
          if (cell) {
            for (let k = 0; k < cell.length; k++) arr.push(cell[k]);
          }
        }
      }
    }
    return arr;
  };

  /* ===================================================================
   * Pintado imperativo: un solo frame, cero re-renders de React.
   * Fase A: matemática solo de candidatos (O(visibles), no O(N)).
   * Fase B: estilos solo de los nodos montados.
   * La lista de montados cambia vía React SOLO cuando hay altas/bajas reales.
   * =================================================================== */
  const applyFrame = () => {
    const t0 = performance.now();

    // Sincronizar el tamaño del contenedor antes de escribir (lectura limpia:
    // transformes/opacity/visibility no invalidan el layout del contenedor).
    const sizeEl = containerRef.current;
    if (sizeEl) {
      const w = sizeEl.clientWidth;
      const h = sizeEl.clientHeight;
      if (viewRef.current.w !== w || viewRef.current.h !== h) viewRef.current = { w, h };
    }

    const world = worldRef.current;
    const cam = cameraRef.current;

    // 1) Rotación de todo el universo (cámara FPS: Yaw primero, luego Pitch)
    if (world) {
      world.style.transform = `translate3d(0px, 0px, 0px) rotateY(${cam.yaw || 0}deg) rotateX(${cam.pitch || 0}deg)`;
    }

    const list = itemsRef.current;
    const els = itemElsRef.current;
    const vids = videoElsRef.current;
    const st = stateRef.current;
    const bl = blocksRef.current;
    const halfW = viewRef.current.w / 2;
    const halfH = viewRef.current.h / 2;
    const force = forceMountRef.current;

    // Trigonometría de la cámara una vez por frame (no por item)
    const yawR = (cam.yaw || 0) * (Math.PI / 180);
    const pitchR = (cam.pitch || 0) * (Math.PI / 180);
    const cosY = Math.cos(yawR), sinY = Math.sin(yawR);
    const cosP = Math.cos(pitchR), sinP = Math.sin(pitchR);

    // Deseos de este frame: 0 = no montar
    const wish = st.wish;
    wish.fill(0);
    const cand = collectCandidates(cam);
    statsRef.current.candidates = cand.length;

    let changed = false;

    for (let ci = 0; ci < cand.length; ci++) {
      const i = cand[ci];
      const it = list[i];

      // --- Matemática Toroidal Perfecta (Torus Wrapping) 3D ---
      const ax = wrapAxis(it.x + cam.x, bl.X);
      const ay = wrapAxis(it.y + cam.y, bl.Y);
      const az = wrapAxis(it.z + cam.z, bl.Z);

      // Filtro barato primero: más allá de la niebla + margen no hay nada que ver
      const dist2 = ax * ax + ay * ay + az * az;
      if (!force && dist2 >= MOUNT_OUT_DIST * MOUNT_OUT_DIST) {
        if (st.mounted[i]) changed = true; // desmontar al alejarse
        continue;
      }
      const distance = Math.sqrt(dist2);

      // --- Proyección EXACTA de las 4 esquinas del item ---
      // CSS aplica perspective por esquina (no solo al centro): cerca del plano
      // de perspectiva los items se deforman en trapecios gigantes.
      // Zona segura: si alguna esquina queda cerca o más allá del plano del ojo
      // (denom < 300) NO se oculta nada: ahí el navegador recorta/pinta a su manera.
      const hw = it.hw, hh = it.hh, cr = it.cosR, sr = it.sinR;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let minD = Infinity, maxD = -Infinity;
      let unsafe = false;
      for (let c = 0; c < 4; c++) {
        const cox = (c & 1) ? hw : -hw;
        const coy = (c & 2) ? hh : -hh;
        // rotación in-plane del item (rotateZ)
        const rx = cox * cr - coy * sr;
        const ry = cox * sr + coy * cr;
        const px = ax + rx, py = ay + ry, pz = az;
        // rotación de la cámara: primero rotateX(pitch), luego rotateY(yaw)
        const cy1 = py * cosP - pz * sinP;
        const cz1 = py * sinP + pz * cosP;
        const cx2 = px * cosY + cz1 * sinY;
        const cz2 = -px * sinY + cz1 * cosY;
        const denom = PERSPECTIVE - cz2;
        // Zona de peligro: muy cerca del plano del ojo → trapecios gigantes
        if (denom > -300 && denom < 300) { unsafe = true; break; }
        if (denom < minD) minD = denom;
        if (denom > maxD) maxD = denom;
        const k = PERSPECTIVE / denom;
        const sx = cx2 * k;
        const sy = cy1 * k;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
      // Si el item cruza el plano del ojo entre esquinas: también zona segura
      if (!unsafe && minD < -300 && maxD > 300) unsafe = true;

      let off;
      if (unsafe) {
        off = -1e6; // foto a punto de pasar por la cámara: nunca ocultarla
      } else {
        // Distancia del AABB proyectado al viewport (0 = toca la pantalla)
        const ox2 = (minX > halfW ? minX - halfW : 0) + (maxX < -halfW ? -halfW - maxX : 0);
        const oy2 = (minY > halfH ? minY - halfH : 0) + (maxY < -halfH ? -halfH - maxY : 0);
        off = Math.sqrt(ox2 * ox2 + oy2 * oy2);
      }

      // --- Distancia esférica real en 3D para la "Niebla" (Fog) ---
      let opacity = 1;
      if (distance > FOG_END) {
        opacity = 0;
      } else if (distance > FOG_START) {
        opacity = 1 - ((distance - FOG_START) / (FOG_END - FOG_START));
      }

      // --- Visibilidad: niebla (función pura, igual que el original) + ---
      // --- culling de pantalla con histeresis (evita parpadeos en bordes) ---
      const withinFog = distance < FOG_CULL; // equivalente a opacity > 0.01
      let shown = st.shown[i] === 1;
      if (shown) {
        if (!withinFog || off > OFF_HIDE) shown = false;
      } else if (withinFog && off <= OFF_SHOW) {
        shown = true;
      }
      st.shown[i] = shown ? 1 : 0;

      // --- Decisión de montaje (virtualización) con histeresis ---
      let want;
      if (force) {
        want = 1;
      } else if (st.mounted[i]) {
        want = (distance < MOUNT_OUT_DIST && off <= MOUNT_OUT_OFF) ? 1 : 0;
      } else {
        want = (distance < MOUNT_IN_DIST && off <= MOUNT_IN_OFF) ? 1 : 0;
      }
      wish[i] = want;
      if (want !== st.mounted[i]) changed = true;

      const el = els[i];
      if (!el) continue; // recién montado: sus estilos se escribirán en el próximo frame

      // --- Escritura de estilos (solo si cambiaron) ---
      el.style.transform = `translate3d(calc(-50% + ${ax}px), calc(-50% + ${ay}px), ${az}px) ${it.rotStr}`;

      if (Math.abs(st.op[i] - opacity) > 0.004) {
        el.style.opacity = opacity;
        st.op[i] = opacity;
      }

      const vis = shown ? 'visible' : 'hidden';
      if (st.vis[i] !== vis) {
        el.style.visibility = vis;
        st.vis[i] = vis;
      }

      const pe = opacity > 0.5 ? 'auto' : 'none';
      if (st.pe[i] !== pe) {
        el.style.pointerEvents = pe;
        st.pe[i] = pe;
      }

      // --- Video con audio espacial (misma lógica de volumen que el original) ---
      const video = vids[i];
      if (video) {
        if (shown) {
          if (video.paused) video.play().catch(() => {});

          // Distancia real en 3D con el wrap correcto
          let vol = 0;
          if (distance < 800) {
            vol = 1;
          } else if (distance > 3500) {
            vol = 0;
          } else {
            vol = 1 - ((distance - 800) / 2700);
          }

          // Aplicar volumen solo si cambia significativamente (evita saturar el motor de audio)
          if (Math.abs(video.volume - vol) > 0.05) {
            video.volume = vol;
          }

          // Desmutear si tiene volumen (los navegadores requieren interacción previa)
          if (vol > 0.01 && video.muted) {
            video.muted = false;
            video.play().catch(() => {
              // Ignorar el error de autoplay si el usuario aún no hizo clic en la página
            });
          } else if (vol <= 0.01 && !video.muted) {
            video.muted = true;
          }
        } else if (!video.paused) {
          // Fuera de la niebla el video es invisible: pausarlo ahorra CPU/GPU
          video.pause();
        }
      }
    }

    // Montados que no aparecieron en los candidatos: desmontar (están lejos)
    const oldList = mountedListRef.current;
    for (let k = 0; k < oldList.length; k++) {
      const i = oldList[k];
      if (!wish[i] && st.mounted[i]) changed = true;
    }

    // --- Commit de virtualización: solo React renderiza cuando hay cambios ---
    if (changed) {
      for (let ci = 0; ci < cand.length; ci++) st.mounted[cand[ci]] = wish[cand[ci]];
      for (let k = 0; k < oldList.length; k++) {
        const i = oldList[k];
        if (!wish[i]) st.mounted[i] = 0;
      }
      const newList = [];
      for (let i = 0; i < list.length; i++) if (st.mounted[i]) newList.push(i);
      mountedListRef.current = newList;
      setMountedIdx(newList);
    }

    statsRef.current.lastApplyMs = performance.now() - t0;
  };

  /* ===================================================================
   * Movimiento del modo vuelo (WASD + Espacio + C) — idéntico al original
   * =================================================================== */
  const applyFlight = () => {
    const keys = keysRef.current;
    const cam = cameraRef.current;
    const bl = blocksRef.current;

    let x = cam.x, y = cam.y, z = cam.z;
    let yaw = cam.yaw || 0;
    let pitch = cam.pitch || 0;

    const flySpeed = 10;   // Velocidad de vuelo ultra lenta y relajante
    const turnSpeed = 0.7; // Aumentado para mayor agilidad y precisión de puntería
    const pitchSpeed = 0.6;

    // A/D: Girar Izquierda / Derecha (Yaw)
    if (keys.a) yaw -= turnSpeed;
    if (keys.d) yaw += turnSpeed;

    // Evitar que el Yaw crezca hasta el infinito y cause lag de precisión flotante en CSS
    if (yaw >= 360) yaw -= 360;
    if (yaw <= -360) yaw += 360;

    // Espacio/C: Mirar Arriba / Abajo (Pitch)
    if (keys[' ']) pitch -= pitchSpeed;
    if (keys.c) pitch += pitchSpeed;

    // Limitar el pitch para evitar el "Gimbal Lock"
    if (pitch > 60) pitch = 60;
    if (pitch < -60) pitch = -60;

    // W/S: Acelerar Adelante / Atrás (En la dirección de la cámara)
    if (keys.w || keys.s) {
      const yawRad = yaw * (Math.PI / 180);
      const pitchRad = pitch * (Math.PI / 180);

      // Fórmula matemática EXACTA para volar hacia donde miras en CSS 3D
      const dirX = -Math.sin(yawRad) * Math.cos(pitchRad);
      const dirY = -Math.sin(pitchRad);
      const dirZ = Math.cos(yawRad) * Math.cos(pitchRad);

      const speed = keys.w ? flySpeed : -flySpeed;

      x += dirX * speed;
      y += dirY * speed;
      z += dirZ * speed;
    }

    // Bucle infinito Z
    z = wrapAxis(z, bl.Z);

    // Tope Y: Límite para que no viajen infinitamente hacia arriba o abajo
    if (y > bl.yLimit) y = bl.yLimit;
    else if (y < -bl.yLimit) y = -bl.yLimit;

    // Bucle infinito X
    x = wrapAxis(x, bl.X);

    // --- Animación Física de la Nave de Amor ---
    let targetRoll = 0;
    let targetShipPitch = 0;

    if (keys.a) targetRoll -= 35;      // Alabeo izquierda fuerte al girar
    if (keys.d) targetRoll += 35;      // Alabeo derecha fuerte al girar
    if (keys.w) targetShipPitch += 15; // Inclinación hacia adelante
    if (keys.s) targetShipPitch -= 20; // Inclinación hacia atrás
    if (keys[' ']) targetShipPitch += 25; // Nariz arriba
    if (keys.c) targetShipPitch -= 25;    // Nariz abajo

    // Lerp (Suavizado de la rotación)
    const sr = shipRotRef.current;
    sr.roll += (targetRoll - sr.roll) * 0.1;
    sr.pitch += (targetShipPitch - sr.pitch) * 0.1;

    if (shipRef.current) {
      shipRef.current.style.transform = `translateX(-50%) perspective(800px) rotateZ(${sr.roll}deg) rotateX(${sr.pitch}deg)`;
    }
    // -------------------------------------------

    cameraRef.current = { x, y, z, yaw, pitch };
    dirtyRef.current = true;
  };

  /* ===================================================================
   * Bucle único por requestAnimationFrame.
   * - Los eventos de entrada solo marcan "dirty" y programan un frame:
   *   N eventos = 1 pintado (antes era N re-renders de React).
   * - Si no hay nada que pintar, el bucle se detiene (coste 0 en reposo).
   * =================================================================== */
  const tick = () => {
    rafRef.current = 0;
    let repeat = false;

    const keys = keysRef.current;
    const anyKey = keys.w || keys.s || keys.a || keys.d || keys[' '] || keys.c;

    if (flightRef.current && anyKey) {
      applyFlight();
      repeat = true;
    }

    if (dirtyRef.current) {
      dirtyRef.current = false;
      applyFrame();
    }

    if (repeat || dirtyRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const requestRender = () => {
    dirtyRef.current = true;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  };

  /* ===================================================================
   * Entrada: rueda (zoom del universo, igual que antes + Drift Diagonal)
   * =================================================================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const step = e.deltaY * WHEEL_FACTOR;
      
      cam.z = wrapAxis(cam.z + step, blocksRef.current.Z);
      // Drift diagonal micro-ajustado: casi imperceptible (5%) para no marear,
      // pero suficiente para cambiar de carril (800 unidades) al completar una vuelta.
      cam.x = wrapAxis(cam.x + step * 0.05, blocksRef.current.X);
      cam.y = wrapAxis(cam.y + step * 0.02, blocksRef.current.Y);
      
      requestRender();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================================================================
   * Entrada: teclado (WASD/Espacio/C) — mismos listeners que el original
   * =================================================================== */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar que el Space haga scroll en la página si estamos enfocados
      if (e.key === ' ') e.preventDefault();
      const key = e.key.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(keysRef.current, key)) {
        keysRef.current[key] = true;
        if (flightRef.current) requestRender(); // Arranca el bucle para pintar el vuelo
      }
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(keysRef.current, key)) {
        keysRef.current[key] = false;
      }
    };

    // Si el usuario cambia de pestaña o hace clic fuera, detener el avión
    const handleBlur = () => {
      keysRef.current = { w: false, a: false, s: false, d: false, ' ': false, c: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================================================================
   * Entrada: táctil/gestos.
   * =================================================================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventGesture = (e) => e.preventDefault();
    el.addEventListener('gesturestart', preventGesture, { passive: false });
    el.addEventListener('gesturechange', preventGesture, { passive: false });
    el.addEventListener('gestureend', preventGesture, { passive: false });

    const updateView = () => {
      viewRef.current = { w: el.clientWidth, h: el.clientHeight };
      requestRender();
    };
    updateView();
    window.addEventListener('resize', updateView);
    window.addEventListener('orientationchange', updateView);

    return () => {
      el.removeEventListener('gesturestart', preventGesture);
      el.removeEventListener('gesturechange', preventGesture);
      el.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('resize', updateView);
      window.removeEventListener('orientationchange', updateView);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    flightRef.current = isFlightMode;
    if (isFlightMode) requestRender();
  }, [isFlightMode]);

  useEffect(() => {
    const timer = setTimeout(() => setShowTitle(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    itemsRef.current = scatteredItems;
    blocksRef.current = blocks;
    buildGrid(scatteredItems, blocks);
    const n = scatteredItems.length;
    stateRef.current = {
      shown: new Uint8Array(n),
      vis: new Array(n).fill(''),
      op: new Array(n).fill(-1),
      pe: new Array(n).fill(''),
      mounted: new Uint8Array(n),
      wish: new Uint8Array(n),
    };
    mountedListRef.current = [];
    itemElsRef.current = [];
    videoElsRef.current = [];
    setMountedIdx([]);
    const el = containerRef.current;
    if (el) viewRef.current = { w: el.clientWidth, h: el.clientHeight };
    applyFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scatteredItems, blocks]);

  useLayoutEffect(() => {
    if (mountedIdx.length >= 0) applyFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedIdx]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__universeDebug = {
      cameraRef, itemsRef, itemElsRef, stateRef, rafRef, dirtyRef, flightRef, keysRef, viewRef, blocksRef, gridRef, requestRender, applyFrame, tick,
      setCamera: (patch) => { cameraRef.current = { ...cameraRef.current, ...patch }; requestRender(); },
      setForceMount: (v) => { forceMountRef.current = !!v; requestRender(); },
      stats: () => ({ total: itemsRef.current.length, mounted: mountedListRef.current.length, candidates: statsRef.current.candidates, lastApplyMs: Math.round(statsRef.current.lastApplyMs * 1000) / 1000, blocks: { ...blocksRef.current }, gridActive: gridRef.current.active, imgNodes: document.querySelectorAll('img').length }),
    };
    return () => { delete window.__universeDebug; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const twoPointerDist = () => {
    const it = pointersRef.current.values();
    const a = it.next().value;
    const b = it.next().value;
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const pinchMove = (deltaDist) => {
    const step = deltaDist * PINCH_FACTOR;
    const cam = cameraRef.current;
    const bl = blocksRef.current;
    if (flightRef.current) {
      const yawRad = (cam.yaw || 0) * (Math.PI / 180);
      const pitchRad = (cam.pitch || 0) * (Math.PI / 180);
      const dirX = -Math.sin(yawRad) * Math.cos(pitchRad);
      const dirY = -Math.sin(pitchRad);
      const dirZ = Math.cos(yawRad) * Math.cos(pitchRad);
      cam.x = wrapAxis(cam.x + dirX * step, bl.X);
      let ny = cam.y + dirY * step;
      if (ny > bl.yLimit) ny = bl.yLimit;
      else if (ny < -bl.yLimit) ny = -bl.yLimit;
      cam.y = ny;
      cam.z = wrapAxis(cam.z + dirZ * step, bl.Z);
    } else {
      cam.z = wrapAxis(cam.z + step, bl.Z);
      // Drift diagonal también para pinch, casi imperceptible
      cam.x = wrapAxis(cam.x + step * 0.05, bl.X);
      cam.y = wrapAxis(cam.y + step * 0.02, bl.Y);
    }
    requestRender();
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pts = pointersRef.current;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      pinchRef.current = 0;
    } else if (pts.size === 2) {
      pinchRef.current = twoPointerDist();
    }
  };

  const handlePointerMove = (e) => {
    const pts = pointersRef.current;
    const p = pts.get(e.pointerId);
    // Igual que el original: sin botón/pulso presionado no hay arrastre
    if (!p) return;

    p.x = e.clientX;
    p.y = e.clientY;

    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';

    // --- Pellizco (2+ dedos): alejarse / acercarse del universo ---
    if (pts.size >= 2) {
      const d = twoPointerDist();
      const prev = pinchRef.current;
      // Sensibilidad del pellizco más suave en móvil
      if (prev > 0 && d > 0 && d !== prev) {
         const pinchSens = isTouch ? 3 : PINCH_FACTOR;
         pinchMove((d - prev) * (pinchSens / PINCH_FACTOR));
      }
      pinchRef.current = d;
      return;
    }

    // --- Arrastre con un puntero ---
    const last = lastPosRef.current;
    if (!last) {
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (dx === 0 && dy === 0) return;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    if (flightRef.current) {
      // En PC el modo vuelo sigue siendo teclado (sin cambios).
      // En táctil: arrastrar gira la mirada (yaw/pitch), más suave para no marear
      if (e.pointerType === 'mouse') return;
      const cam = cameraRef.current;
      const lookSens = isTouch ? 0.08 : 0.25;
      let yaw = (cam.yaw || 0) + dx * lookSens;
      let pitch = (cam.pitch || 0) + dy * lookSens;
      if (yaw > 360) yaw -= 360;
      else if (yaw < -360) yaw += 360;
      if (pitch > 60) pitch = 60;
      else if (pitch < -60) pitch = -60;
      cam.yaw = yaw;
      cam.pitch = pitch;
      requestRender();
      return;
    }

    // Pan del universo
    // En táctil, invertimos la dirección (dx * -1) para lograr el "Natural Scroll" 
    // (si el dedo va a la derecha, las fotos van a la derecha). Y bajamos la sensibilidad.
    const panSensX = isTouch ? -1.0 : PAN_FACTOR;
    const panSensY = isTouch ? -1.0 : PAN_FACTOR;

    const cam = cameraRef.current;
    const bl = blocksRef.current;
    cam.x = wrapAxis(cam.x + dx * panSensX, bl.X);
    cam.y = wrapAxis(cam.y + dy * panSensY, bl.Y);
    requestRender();
  };

  const endPointer = (e) => {
    const pts = pointersRef.current;
    if (!pts.delete(e.pointerId)) return;
    if (pts.size === 1) {
      // Queda un dedo: re-sincronizar para que no haya "salto" al continuar
      const only = pts.values().next().value;
      lastPosRef.current = { x: only.x, y: only.y };
      pinchRef.current = 0;
    } else if (pts.size === 0) {
      lastPosRef.current = null;
      pinchRef.current = 0;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-screen bg-transparent overflow-hidden relative select-none ${isFlightMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        perspective: '1200px',
        // Clave móvil: el gesto pertenece al universo, no a la página
        // (sin scroll ni zoom del navegador dentro de esta vista)
        touchAction: 'none',
        // 100svh: en móviles el contenido siempre cabe sobre la barra del navegador
        height: '100svh',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      <InteractiveFlower onClick={toggleView} />

      {showTitle && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center animate-[fadeOut_1s_ease-in_2s_forwards]">
          <h1 className="text-2xl font-bold tracking-widest text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            UNIVERSO DE RECUERDOS
          </h1>
        </div>
      )}

      {/* Botón de Modo Vuelo (Premium) */}
      <div className="absolute bottom-6 right-6 z-[120]">
        {hasFlightMode && (
          <button
            onClick={() => {
              setIsFlightMode(prev => {
                const next = !prev;
                if (!next) {
                  // Al salir del modo vuelo, reseteamos el ángulo de la cámara (Yaw y Pitch) a 0
                  cameraRef.current = { ...cameraRef.current, yaw: 0, pitch: 0 };
                  requestRender();
                }
                return next;
              });
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-xl transition-all duration-300 ${
              isFlightMode
                ? 'bg-pink-500 text-white shadow-pink-500/50 scale-105 border border-pink-400'
                : 'bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 border border-white/20'
            }`}
          >
            {isFlightMode ? '✈️ MODO VUELO ACTIVO' : '🚀 DESBLOQUEAR MODO VUELO'}
          </button>
        )}
      </div>

      {isFlightMode && (
        <>
          {/* 🎯 MIRA DINÁMICA (HUD) CENTRADA EXACTAMENTE 🎯 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex items-center justify-center opacity-60 pointer-events-none">
            <div className="w-10 h-[2px] bg-pink-300 absolute rounded-full"></div>
            <div className="w-[2px] h-10 bg-pink-300 absolute rounded-full"></div>
            <div className="w-4 h-4 rounded-full border border-pink-400 absolute"></div>
            <div className="w-1 h-1 rounded-full bg-white absolute shadow-[0_0_5px_#fff]"></div>
          </div>

          {/* ✈️ EL AVIÓN DE PAPEL 3D ✈️ */}
          <div
            ref={shipRef}
            className="absolute top-1/2 left-1/2 mt-20 z-[100] pointer-events-none flex flex-col items-center justify-center transition-transform"
            style={{ transformOrigin: 'center center', transform: 'translateX(-50%) perspective(800px) rotateZ(0deg) rotateX(0deg)' }}
          >
            <div className="relative drop-shadow-[0_15px_30px_rgba(236,72,153,0.8)]">
              <PaperPlane3D />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl animate-[ping_1s_infinite]">💖</div>
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-xl animate-[ping_1.5s_infinite] delay-150">💗</div>
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-lg animate-[ping_2s_infinite] delay-300">💓</div>
            </div>
          </div>
        </>
      )}

      <div
        ref={worldRef}
        className="absolute top-1/2 left-1/2 w-0 h-0"
        style={{
          transformStyle: 'preserve-3d',
          // Estado inicial; a partir de aquí lo actualiza applyFrame() en cada frame
          transform: 'translate3d(0px, 0px, 0px) rotateY(0deg) rotateX(0deg)',
        }}
      >
        {/* Virtualización: solo existen en el DOM las fotos del anillo visible.
            Al salirse, React las desmonta => se libera el nodo, la descarga y el
            decode; al acercarse se vuelven a montar (y precargan por estar en el
            anillo, antes de entrar en pantalla). */}
        {mountedIdx.map((i) => {
          const item = scatteredItems[i];
          if (!item) return null; // protección si cambian los items
          return (
            <div
              key={item.uniqueId}
              ref={(el) => {
                itemElsRef.current[i] = el;
                // Nodo recién (re)montado: sus estilos inline están vacíos, pero
                // las cachés (vis/op/pe) guardan el valor del montaje ANTERIOR.
                // Sin invalidar, applyFrame creería que ya escribió "hidden"/opacity 0
                // y la foto reaparecería visible fuera de la niebla. Reset = se reescribe.
                if (el) {
                  const st = stateRef.current;
                  st.vis[i] = '';
                  st.op[i] = -1;
                  st.pe[i] = '';
                }
              }}
              className="absolute rounded-lg overflow-hidden border border-pink-500/20"
              style={{
                width: `${item.width}px`,
                aspectRatio: '3/4',
                // transform/opacity/visibility se escriben imperativamente en applyFrame()
                // ANTES del primer paint (useLayoutEffect), por eso no van aquí:
                // así React no vuelve a tocar estos nodos al re-renderizar el componente
                // y nunca se crean capas GPU innecesarias (antes: will-change en TODOS).
              }}
            >
              {item.isVideo ? (
                <video
                  ref={(el) => { videoElsRef.current[i] = el; }}
                  src={item.src}
                  className="w-full h-full object-cover pointer-events-none"
                  muted // Inicia muteado para permitir autoplay
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
