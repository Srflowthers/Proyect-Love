import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export const POOL_CUES_CATALOG = [
  { id: 'clasico', name: 'Vara Clásica', tier: 'Base', tierColor: 'text-slate-300 border-slate-400/30 bg-slate-500/15', price: 0, desc: 'Madera de arce tradicional con virola de marfil y puntera azul.', color: '#d9a95f', tip: '#4aa3df', roughness: 0.38, metalness: 0.05 },
  { id: 'ebano', name: 'Ébano Imperial', tier: 'Especial', tierColor: 'text-amber-300 border-amber-400/35 bg-amber-500/15', price: 25, desc: 'Madera negra pulida con anillos de bronce y puntera dorada.', color: '#1b1b1f', tip: '#d4af37', roughness: 0.24, metalness: 0.25 },
  { id: 'neon', name: 'Neón Cian', tier: 'Épico', tierColor: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15', price: 45, desc: 'Fibra oscura con núcleo luminoso de energía neón cian.', color: '#10202a', tip: '#00e5ff', roughness: 0.28, metalness: 0.15, emissive: '#00bcd4', emissiveIntensity: 0.9 },
  { id: 'rubi', name: 'Carmesí de Amor', tier: 'Épico', tierColor: 'text-rose-300 border-rose-400/40 bg-rose-500/15', price: 65, desc: 'Acabado rubí intenso con destello rosa neón en cada tiro.', color: '#3b0718', tip: '#ff4d94', roughness: 0.22, metalness: 0.35, emissive: '#e11d48', emissiveIntensity: 0.78 },
  { id: 'oro', name: 'Oro Real', tier: 'Legendario', tierColor: 'text-yellow-300 border-yellow-400/50 bg-yellow-500/20', price: 90, desc: 'Aleación de oro reluciente de alto prestigio con puntera blanca.', color: '#d4af37', tip: '#ffffff', roughness: 0.16, metalness: 0.95, emissive: '#785508', emissiveIntensity: 0.28 },
  { id: 'galaxia', name: 'Vara Cósmica', tier: 'Mítico', tierColor: 'text-fuchsia-300 border-fuchsia-400/50 bg-fuchsia-500/20', price: 120, desc: 'Forjada en violeta astral con núcleo estelar púrpura.', color: '#1e1035', tip: '#e879f9', roughness: 0.2, metalness: 0.5, emissive: '#9333ea', emissiveIntensity: 0.88 }
];

export const POOL_FELTS_CATALOG = [
  { id: '0', idx: 0, name: 'Verde Clásico', tier: 'Base', tierColor: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/15', price: 0, desc: 'Paño tradicional de club de billar.', colors: ['#1f8f55', '#0e5f36'] },
  { id: '1', idx: 1, name: 'Azul Torneo', tier: 'Especial', tierColor: 'text-sky-300 border-sky-400/35 bg-sky-500/15', price: 25, desc: 'Paño profesional de campeonato internacional.', colors: ['#2a78c4', '#144f8c'] },
  { id: '2', idx: 2, name: 'Burdeos Imperial', tier: 'Especial', tierColor: 'text-rose-300 border-rose-400/35 bg-rose-500/15', price: 40, desc: 'Terciopelo rojo vino de salón elegante.', colors: ['#a8283a', '#6a1526'] },
  { id: '3', idx: 3, name: 'Amatista Real', tier: 'Épico', tierColor: 'text-purple-300 border-purple-400/40 bg-purple-500/15', price: 55, desc: 'Paño púrpura intenso de medianoche.', colors: ['#6b21a8', '#3b0764'] },
  { id: '4', idx: 4, name: 'Obsidiana Nocturna', tier: 'Legendario', tierColor: 'text-slate-200 border-slate-300/40 bg-slate-500/20', price: 75, desc: 'Pizarra oscura de alto contraste competitivo.', colors: ['#263244', '#111827'] },
  { id: '5', idx: 5, name: 'Bronce Dorado', tier: 'Mítico', tierColor: 'text-amber-300 border-amber-400/50 bg-amber-500/20', price: 95, desc: 'Paño imperial dorado con bandas cálidas.', colors: ['#85581A', '#4A2E08'] }
];

// Único escenario comprable (por defecto siempre se usa el fondo del perfil seleccionado por el usuario)
export const POOL_EARTH_SUN_ITEM = {
  id: 'espacio',
  name: 'Órbita: Tierra y Sol',
  tier: 'Escenario Mítico',
  tierColor: 'text-amber-300 border-amber-400/50 bg-amber-500/20',
  price: 50,
  desc: 'Único escenario exterior desbloqueable con el planeta Tierra 3D en rotación, atmósfera y el Sol. Al desactivarlo, se usa automáticamente el fondo de tu Perfil.'
};

// Juegos soportados en la Tienda General del Arcade (GOMINOLA EXCLUIDO ESTRICTAMENTE)
export const SHOP_GAMES = [
  {
    id: 'pool',
    name: 'Pool 3D',
    status: 'active',
    badge: 'Disponible',
    badgeColor: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15',
    tagline: 'Varas 3D, Mesas y Escenario',
    iconType: 'pool'
  },
  {
    id: 'tetris',
    name: 'Tetris Pareja',
    status: 'upcoming',
    badge: 'Próximamente',
    badgeColor: 'text-pink-300 border-pink-400/30 bg-pink-500/10',
    tagline: 'Skins de Bloques y Tableros',
    iconType: 'tetris'
  },
  {
    id: 'sudoku',
    name: 'Sudoku Pareja',
    status: 'upcoming',
    badge: 'Próximamente',
    badgeColor: 'text-sky-300 border-sky-400/30 bg-sky-500/10',
    tagline: 'Fichas Clásicas y Cuadrículas Zen',
    iconType: 'sudoku'
  },
  {
    id: 'puzzle',
    name: 'Rompecabezas',
    status: 'upcoming',
    badge: 'Próximamente',
    badgeColor: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
    tagline: 'Marcos de Fotos y Efectos',
    iconType: 'puzzle'
  },
  {
    id: 'airhockey',
    name: 'Air Hockey',
    status: 'upcoming',
    badge: 'Próximamente',
    badgeColor: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
    tagline: 'Mazos Neón, Discos y Pistas',
    iconType: 'airhockey'
  }
];

// Catálogo de accesorios futuros para los otros juegos del Arcade
export const UPCOMING_GAMES_CATALOG = {
  tetris: {
    title: 'Tetris Pareja',
    subtitle: 'Skins de Tetrominós, Matrices y Efectos de Combo',
    desc: 'Personaliza los bloques con estelas de luz, cuadrículas con resplandor neón reactivo y explosiones cósmicas al limpiar 4 líneas junto a tu pareja.',
    color: '#ff7ac8',
    gradient: 'from-pink-500/20 via-purple-500/10 to-transparent',
    borderColor: 'border-pink-500/30',
    categories: ['Todos', 'Skins de Piezas', 'Matrices de Juego', 'Efectos de Línea'],
    items: [
      {
        id: 'tetris_neon',
        name: 'Tetrominós Cyber Neón',
        tier: 'Épico',
        tierColor: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15',
        category: 'Skins de Piezas',
        desc: 'Bloques translúcidos de energía pulsante con halo cian y fucsia al rotar y caer al fondo.',
        previewIcon: 'neon_blocks',
        plannedPrice: 45
      },
      {
        id: 'tetris_holo_grid',
        name: 'Matriz Holográfica',
        tier: 'Legendario',
        tierColor: 'text-yellow-300 border-yellow-400/50 bg-yellow-500/20',
        category: 'Matrices de Juego',
        desc: 'Cuadrícula con haz láser reactivo que se ilumina con la velocidad de caída de cada pieza.',
        previewIcon: 'matrix',
        plannedPrice: 70
      },
      {
        id: 'tetris_star_burst',
        name: 'Explosión Estelar de Líneas',
        tier: 'Mítico',
        tierColor: 'text-fuchsia-300 border-fuchsia-400/50 bg-fuchsia-500/20',
        category: 'Efectos de Línea',
        desc: 'Destello de supernova que viaja hacia el campo de tu pareja al limpiar 4 líneas a la vez.',
        previewIcon: 'burst',
        plannedPrice: 95
      },
      {
        id: 'tetris_crystal_gold',
        name: 'Cristal Ámbar Clásico',
        tier: 'Especial',
        tierColor: 'text-amber-300 border-amber-400/35 bg-amber-500/15',
        category: 'Skins de Piezas',
        desc: 'Facetas de cristal pulido con reflejos dorados y sonido armónico al encajar.',
        previewIcon: 'crystal',
        plannedPrice: 35
      }
    ]
  },
  sudoku: {
    title: 'Sudoku Pareja',
    subtitle: 'Estilos de Fichas, Tableros Zen y Resonancias',
    desc: 'Elige el material de tus números, estilos de caligrafía y temas visuales que hacen de cada acertijo una experiencia elegante y relajante junto a tu pareja.',
    color: '#4aa8ff',
    gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
    borderColor: 'border-sky-500/30',
    categories: ['Todos', 'Material de Fichas', 'Tableros Zen', 'Efectos de Acierto'],
    items: [
      {
        id: 'sudoku_wood',
        name: 'Nogal Japonés Tallado',
        tier: 'Base',
        tierColor: 'text-amber-200 border-amber-300/30 bg-amber-500/10',
        category: 'Material de Fichas',
        desc: 'Números grabados artesanalmente en madera noble oscura con sutil textura de veta.',
        previewIcon: 'wood',
        plannedPrice: 20
      },
      {
        id: 'sudoku_zen_board',
        name: 'Cuadrícula Tinta Sumi-e',
        tier: 'Especial',
        tierColor: 'text-sky-300 border-sky-400/35 bg-sky-500/15',
        category: 'Tableros Zen',
        desc: 'Líneas trazadas con pincel suave y fondo de papel de arroz con animación de quietud.',
        previewIcon: 'zen_grid',
        plannedPrice: 40
      },
      {
        id: 'sudoku_cyber_glyph',
        name: 'Glifos Neón Cuántico',
        tier: 'Épico',
        tierColor: 'text-purple-300 border-purple-400/40 bg-purple-500/15',
        category: 'Material de Fichas',
        desc: 'Dígitos en tipografía sintética flotante con resplandor violeta en cada número correcto.',
        previewIcon: 'glyph',
        plannedPrice: 65
      },
      {
        id: 'sudoku_resonance',
        name: 'Aura de Resonancia Dúo',
        tier: 'Legendario',
        tierColor: 'text-rose-300 border-rose-400/50 bg-rose-500/20',
        category: 'Efectos de Acierto',
        desc: 'Onda lumínica compartida que viaja a través de filas y columnas completadas en conjunto.',
        previewIcon: 'resonance',
        plannedPrice: 85
      }
    ]
  },
  puzzle: {
    title: 'Rompecabezas',
    subtitle: 'Marcos de Recuerdo, Efectos de Unión y Vitrinas',
    desc: 'Decora los retratos y fotos de recuerdos completados con marcos artísticos de oro, efectos mágicos de encastre y vitrinas de galería de pareja.',
    color: '#3ddc97',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-500/30',
    categories: ['Todos', 'Marcos de Retrato', 'Efectos de Unión', 'Efectos de Galería'],
    items: [
      {
        id: 'puzzle_baroque_gold',
        name: 'Marco Barroco Dorado',
        tier: 'Legendario',
        tierColor: 'text-yellow-300 border-yellow-400/50 bg-yellow-500/20',
        category: 'Marcos de Retrato',
        desc: 'Borde ornamentado en relieve de oro antiguo para inmortalizar vuestras fotos de pareja.',
        previewIcon: 'frame_gold',
        plannedPrice: 75
      },
      {
        id: 'puzzle_magic_snap',
        name: 'Destello de Unión Mágica',
        tier: 'Épico',
        tierColor: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15',
        category: 'Efectos de Unión',
        desc: 'Chispas de luz esmeralda y sonido de campana de cristal cada vez que encajas una pieza.',
        previewIcon: 'snap_spark',
        plannedPrice: 50
      },
      {
        id: 'puzzle_polar_neon',
        name: 'Marco Aurora Boreal',
        tier: 'Especial',
        tierColor: 'text-cyan-300 border-cyan-400/35 bg-cyan-500/15',
        category: 'Marcos de Retrato',
        desc: 'Borde sutil con gradiente nórdico animado que reacciona a los colores de la foto.',
        previewIcon: 'frame_aurora',
        plannedPrice: 35
      },
      {
        id: 'puzzle_diamond_vault',
        name: 'Sello de Amor Eterno',
        tier: 'Mítico',
        tierColor: 'text-fuchsia-300 border-fuchsia-400/50 bg-fuchsia-500/20',
        category: 'Efectos de Galería',
        desc: 'Insignia flotante de diamante y brillo etéreo al completar un puzzle en 100%.',
        previewIcon: 'diamond_seal',
        plannedPrice: 110
      }
    ]
  },
  airhockey: {
    title: 'Air Hockey',
    subtitle: 'Mazos de Combate, Discos de Plasma y Mesas Neón',
    desc: 'Personaliza tu mazo de juego, la estela y brillo del disco de aire, y la pista de juego para tus duelos de reflejos más intensos.',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-500/30',
    categories: ['Todos', 'Mazos / Pushers', 'Discos de Aire', 'Diseños de Pista'],
    items: [
      {
        id: 'hockey_cyber_pusher',
        name: 'Mazo Cyber Striker',
        tier: 'Épico',
        tierColor: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15',
        category: 'Mazos / Pushers',
        desc: 'Aleación de fibra de carbono con halo cian reactivo al impactar el disco a gran velocidad.',
        previewIcon: 'pusher_cyan',
        plannedPrice: 50
      },
      {
        id: 'hockey_plasma_puck',
        name: 'Disco de Plasma Ígneo',
        tier: 'Legendario',
        tierColor: 'text-amber-300 border-amber-400/50 bg-amber-500/20',
        category: 'Discos de Aire',
        desc: 'Disco ardiente que deja una estela de fuego en los rebotes y en los tiros potentes.',
        previewIcon: 'plasma_puck',
        plannedPrice: 75
      },
      {
        id: 'hockey_tron_rink',
        name: 'Pista Láser Grid',
        tier: 'Mítico',
        tierColor: 'text-purple-300 border-purple-400/50 bg-purple-500/20',
        category: 'Diseños de Pista',
        desc: 'Mesa futurista con líneas de rebote luminosas y porterías con hologramas de gol.',
        previewIcon: 'laser_rink',
        plannedPrice: 100
      },
      {
        id: 'hockey_crimson_pusher',
        name: 'Mazo Carmesí Pasión',
        tier: 'Especial',
        tierColor: 'text-rose-300 border-rose-400/35 bg-rose-500/15',
        category: 'Mazos / Pushers',
        desc: 'Acabado rojo rubí metálico con destellos al bloquear tiros en la línea de meta.',
        previewIcon: 'pusher_ruby',
        plannedPrice: 35
      }
    ]
  }
};

export function normalizePoolShop(raw) {
  const base = {
    unlocked: {
      cues: ['clasico'],
      felts: ['0'],
      bgs: ['universo']
    },
    equipped: {
      cues: 'clasico',
      felts: '0',
      bgs: 'universo'
    }
  };
  if (!raw || typeof raw !== 'object') return base;
  if (raw.unlocked && typeof raw.unlocked === 'object') {
    if (Array.isArray(raw.unlocked.cues)) {
      base.unlocked.cues = Array.from(new Set(['clasico', ...raw.unlocked.cues.map(String)]));
    }
    if (Array.isArray(raw.unlocked.felts)) {
      base.unlocked.felts = Array.from(new Set(['0', ...raw.unlocked.felts.map(String)]));
    }
    if (Array.isArray(raw.unlocked.bgs)) {
      base.unlocked.bgs = Array.from(new Set(['universo', ...raw.unlocked.bgs.filter(b => b === 'universo' || b === 'espacio')]));
    }
  }
  if (raw.equipped && typeof raw.equipped === 'object') {
    const c = String(raw.equipped.cues || 'clasico');
    if (base.unlocked.cues.includes(c)) base.equipped.cues = c;
    const f = String(raw.equipped.felts ?? '0');
    if (base.unlocked.felts.includes(f)) base.equipped.felts = f;
    const b = String(raw.equipped.bgs || 'universo');
    base.equipped.bgs = (b === 'espacio' && base.unlocked.bgs.includes('espacio')) ? 'espacio' : 'universo';
  }
  return base;
}

// Construye la escena Three.js con los 3 modelos 3D reales para Pool 3D
function createAccessory3dStudio() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2, 1, 2000);

  scene.add(new THREE.HemisphereLight('#e0f2fe', '#1e1b4b', 1.05));
  const dir1 = new THREE.DirectionalLight('#fffbeb', 1.85);
  dir1.position.set(90, 160, 140);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight('#f472b6', 0.85);
  dir2.position.set(-110, -70, -90);
  scene.add(dir2);

  const makeCvs = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  };

  // Textura de madera 3D
  const [wC, wG] = makeCvs(256, 64);
  const wGr = wG.createLinearGradient(0, 0, 0, 64);
  wGr.addColorStop(0, '#855228');
  wGr.addColorStop(0.5, '#5c3516');
  wGr.addColorStop(1, '#855228');
  wG.fillStyle = wGr;
  wG.fillRect(0, 0, 256, 64);
  const woodTex = new THREE.CanvasTexture(wC);

  // Texturas de paño en caché para las 6 mesas
  const feltTextures = {};
  POOL_FELTS_CATALOG.forEach((f) => {
    const [fC, fG] = makeCvs(512, 256);
    fG.fillStyle = f.colors[0];
    fG.fillRect(0, 0, 512, 256);
    const rad = fG.createRadialGradient(256, 128, 20, 256, 128, 300);
    rad.addColorStop(0, 'rgba(255,255,255,0.04)');
    rad.addColorStop(1, 'rgba(0,0,0,0.42)');
    fG.fillStyle = rad;
    fG.fillRect(0, 0, 512, 256);
    fG.strokeStyle = 'rgba(255,255,255,0.25)';
    fG.lineWidth = 2;
    fG.beginPath();
    fG.moveTo(118, 12);
    fG.lineTo(118, 244);
    fG.stroke();
    feltTextures[f.id] = new THREE.CanvasTexture(fC);
  });

  // 1. OBJETO 3D: LA VARA / TACO EN SÍ
  const cueGroup = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({ color: '#d9a95f', roughness: 0.35 });
  const buttMat = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.35, metalness: 0.25 });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.18, metalness: 0.92 });
  const ferruleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.18 });
  const tipMat = new THREE.MeshStandardMaterial({ color: '#4aa3df', roughness: 0.35 });
  const glowMat = new THREE.MeshBasicMaterial({ color: '#00e5ff', transparent: true, opacity: 0, side: THREE.BackSide });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.6, 132, 28), shaftMat);
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = 12;
  cueGroup.add(shaft);

  const butt = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.6, 54, 28), buttMat);
  butt.rotation.z = -Math.PI / 2;
  butt.position.x = -81;
  cueGroup.add(butt);

  const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(4.75, 4.75, 3.8, 28), ringMat);
  ring1.rotation.z = -Math.PI / 2;
  ring1.position.x = -54;
  cueGroup.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 5.4, 4.4, 28), ringMat);
  ring2.rotation.z = -Math.PI / 2;
  ring2.position.x = -108;
  cueGroup.add(ring2);

  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.25, 6.2, 28), ferruleMat);
  ferrule.rotation.z = -Math.PI / 2;
  ferrule.position.x = 81;
  cueGroup.add(ferrule);

  const tip = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.18, 5.5, 28), tipMat);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 86.8;
  cueGroup.add(tip);

  const glow = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.9, 134, 24), glowMat);
  glow.rotation.z = -Math.PI / 2;
  glow.position.x = 12;
  cueGroup.add(glow);

  const cueBall = new THREE.Mesh(
    new THREE.SphereGeometry(6, 28, 20),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.16 })
  );
  cueBall.position.set(96, 0, 0);
  cueGroup.add(cueBall);
  scene.add(cueGroup);

  // 2. OBJETO 3D: LA MESA DE BILLAR REAL
  const tableGroup = new THREE.Group();
  const woodBorderMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.42 });
  const tFeltMat = new THREE.MeshStandardMaterial({ roughness: 0.72 });
  const tCushMat = new THREE.MeshStandardMaterial({ roughness: 0.65 });
  const pocketMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.85 });

  const tableBody = new THREE.Mesh(new THREE.BoxGeometry(118, 12, 68), woodBorderMat);
  tableBody.position.y = -6;
  tableGroup.add(tableBody);

  const playSurface = new THREE.Mesh(new THREE.BoxGeometry(98, 2.5, 48), tFeltMat);
  playSurface.position.y = 1;
  tableGroup.add(playSurface);

  const cushTop = new THREE.Mesh(new THREE.BoxGeometry(98, 3.2, 4.5), tCushMat);
  cushTop.position.set(0, 2.2, -24);
  const cushBot = new THREE.Mesh(new THREE.BoxGeometry(98, 3.2, 4.5), tCushMat);
  cushBot.position.set(0, 2.2, 24);
  const cushL = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 48), tCushMat);
  cushL.position.set(-49, 2.2, 0);
  const cushR = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 48), tCushMat);
  cushR.position.set(49, 2.2, 0);
  tableGroup.add(cushTop, cushBot, cushL, cushR);

  // 6 Buchacas
  const pG = new THREE.CylinderGeometry(3.6, 3.6, 3.5, 18);
  const pCoords = [
    [-47, 1.8, -23], [0, 1.8, -23.5], [47, 1.8, -23],
    [-47, 1.8, 23], [0, 1.8, 23.5], [47, 1.8, 23]
  ];
  pCoords.forEach(([px, py, pz]) => {
    const pM = new THREE.Mesh(pG, pocketMat);
    pM.position.set(px, py, pz);
    tableGroup.add(pM);
  });

  // 4 Patas
  const legG = new THREE.CylinderGeometry(4.4, 3.4, 28, 18);
  const legCoords = [[-50, -18, -26], [50, -18, -26], [-50, -18, 26], [50, -18, 26]];
  legCoords.forEach(([lx, ly, lz]) => {
    const legM = new THREE.Mesh(legG, woodBorderMat);
    legM.position.set(lx, ly, lz);
    tableGroup.add(legM);
  });
  scene.add(tableGroup);

  // 3. OBJETO 3D: TIERRA Y SOL
  const spaceGroup = new THREE.Group();
  const [eC, eG] = makeCvs(256, 128);
  eG.fillStyle = '#0b3954';
  eG.fillRect(0, 0, 256, 128);
  eG.fillStyle = '#2e7d32';
  for (let i = 0; i < 24; i++) {
    eG.beginPath();
    eG.arc((i * 47) % 256, (i * 31) % 128, 16 + (i % 12), 0, Math.PI * 2);
    eG.fill();
  }
  eG.fillStyle = 'rgba(255,255,255,0.45)';
  for (let j = 0; j < 18; j++) {
    eG.fillRect((j * 61) % 256, (j * 23) % 128, 48, 7);
  }
  const earthTex = new THREE.CanvasTexture(eC);

  const earthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(25, 36, 26),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.55 })
  );
  earthGlobe.position.set(-24, 0, 0);

  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(27.5, 32, 22),
    new THREE.MeshBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.28, side: THREE.BackSide })
  );
  earthAtmo.position.copy(earthGlobe.position);

  const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(15, 28, 20),
    new THREE.MeshBasicMaterial({ color: '#fef08a' })
  );
  sunSphere.position.set(36, 8, -8);
  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(21, 24, 18),
    new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.38 })
  );
  sunHalo.position.copy(sunSphere.position);
  spaceGroup.add(earthGlobe, earthAtmo, sunSphere, sunHalo);
  scene.add(spaceGroup);

  const configureObject = (cat, id, tSec, isMain, yaw = 0, pitch = 0) => {
    cueGroup.visible = cat === 'cues';
    tableGroup.visible = cat === 'felts';
    spaceGroup.visible = cat === 'earth_sun';

    if (cat === 'cues') {
      const k = POOL_CUES_CATALOG.find(it => it.id === id) || POOL_CUES_CATALOG[0];
      shaftMat.color.set(k.color);
      shaftMat.roughness = k.roughness;
      shaftMat.metalness = k.metalness || 0;
      shaftMat.emissive.set(k.emissive || '#000000');
      shaftMat.emissiveIntensity = k.emissiveIntensity || 0;
      tipMat.color.set(k.tip);
      if (k.emissive) {
        glowMat.color.set(k.emissive);
        glowMat.opacity = 0.28;
      } else {
        glowMat.opacity = 0;
      }
      cueBall.visible = isMain;
      const rY = isMain ? yaw : 0.14;
      const rX = isMain ? pitch : 0;
      cueGroup.rotation.set(tSec * 1.6 + rX, rY, isMain ? -0.14 : -0.11);
      camera.fov = isMain ? 27 : 23;
      camera.position.set(0, 12, isMain ? 232 : 242);
      camera.lookAt(0, 0, 0);
    } else if (cat === 'felts') {
      const f = POOL_FELTS_CATALOG.find(it => it.id === String(id)) || POOL_FELTS_CATALOG[0];
      tFeltMat.map = feltTextures[f.id] || feltTextures['0'];
      tFeltMat.needsUpdate = true;
      tCushMat.color.set(f.colors[1]);
      const rY = isMain ? (tSec * 0.45 + yaw) : -0.38;
      const rX = isMain ? (0.48 + pitch * 0.4) : 0.54;
      tableGroup.rotation.set(rX, rY, 0);
      camera.fov = isMain ? 35 : 34;
      camera.position.set(0, 22, isMain ? 228 : 236);
      camera.lookAt(0, 0, 0);
    } else {
      earthGlobe.rotation.y = tSec * 0.75;
      spaceGroup.rotation.set(isMain ? (0.18 + pitch * 0.4) : 0.18, isMain ? (tSec * 0.35 + yaw) : 0.25, 0);
      camera.fov = isMain ? 36 : 36;
      camera.position.set(0, 8, isMain ? 128 : 132);
      camera.lookAt(0, 0, 0);
    }
  };

  return { scene, camera, configureObject };
}

// Ilustraciones Vectoriales SVG de alta definición para accesorios futuros
function UpcomingItemIllustration({ type }) {
  switch (type) {
    case 'neon_blocks':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <rect x="22" y="22" width="26" height="26" rx="4" fill="#00e5ff" fillOpacity="0.2" stroke="#00e5ff" strokeWidth="2.5" />
          <rect x="52" y="22" width="26" height="26" rx="4" fill="#ff007f" fillOpacity="0.2" stroke="#ff007f" strokeWidth="2.5" />
          <rect x="22" y="52" width="26" height="26" rx="4" fill="#00e5ff" fillOpacity="0.2" stroke="#00e5ff" strokeWidth="2.5" />
          <rect x="52" y="52" width="26" height="26" rx="4" fill="#a855f7" fillOpacity="0.25" stroke="#a855f7" strokeWidth="2.5" />
          <circle cx="35" cy="35" r="3" fill="#ffffff" />
          <circle cx="65" cy="35" r="3" fill="#ffffff" />
        </svg>
      );
    case 'matrix':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <rect x="15" y="15" width="70" height="70" rx="8" stroke="#eab308" strokeWidth="2" strokeDasharray="4 4" fill="#eab308" fillOpacity="0.05" />
          <path d="M15 38h70M15 62h70M38 15v70M62 15v70" stroke="#facc15" strokeWidth="1.2" strokeOpacity="0.6" />
          <circle cx="50" cy="50" r="10" stroke="#fef08a" strokeWidth="2" fill="#eab308" fillOpacity="0.3" />
        </svg>
      );
    case 'burst':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <circle cx="50" cy="50" r="16" fill="#ec4899" fillOpacity="0.3" />
          <path d="M50 12v18M50 70v18M12 50h18M70 50h18M23 23l13 13M64 64l13 13M77 23l-13 13M36 64l-13 13" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
        </svg>
      );
    case 'crystal':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <polygon points="50,15 78,38 68,82 32,82 22,38" stroke="#f59e0b" strokeWidth="2.5" fill="#f59e0b" fillOpacity="0.2" />
          <polyline points="22,38 50,48 78,38" stroke="#fbbf24" strokeWidth="1.8" />
          <line x1="50" y1="48" x2="50" y2="82" stroke="#fbbf24" strokeWidth="1.8" />
        </svg>
      );
    case 'wood':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <rect x="20" y="16" width="60" height="68" rx="8" fill="#5c3516" stroke="#b45309" strokeWidth="2.5" />
          <path d="M26 26c15-4 33-4 48 0M26 74c15 4 33 4 48 0" stroke="#d97706" strokeWidth="1" strokeOpacity="0.5" />
          <text x="50" y="60" textAnchor="middle" fill="#fef3c7" fontSize="32" fontWeight="bold" fontFamily="serif">7</text>
        </svg>
      );
    case 'zen_grid':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <rect x="18" y="18" width="64" height="64" rx="4" fill="#0284c7" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M40 18v64M60 18v64M18 40h64M18 60h64" stroke="#7dd3fc" strokeWidth="1.4" strokeOpacity="0.7" />
          <circle cx="50" cy="50" r="8" fill="#38bdf8" fillOpacity="0.3" stroke="#e0f2fe" strokeWidth="1.5" />
        </svg>
      );
    case 'glyph':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <circle cx="50" cy="50" r="32" stroke="#c084fc" strokeWidth="2" strokeDasharray="6 4" />
          <path d="M35 50h30M50 35v30M40 40l20 20M40 60l20-20" stroke="#e879f9" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" />
        </svg>
      );
    case 'resonance':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <circle cx="50" cy="50" r="12" stroke="#f43f5e" strokeWidth="2" fill="#f43f5e" fillOpacity="0.25" />
          <circle cx="50" cy="50" r="24" stroke="#fb7185" strokeWidth="1.8" strokeOpacity="0.7" strokeDasharray="4 3" />
          <circle cx="50" cy="50" r="36" stroke="#fda4af" strokeWidth="1.2" strokeOpacity="0.4" />
        </svg>
      );
    case 'frame_gold':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <rect x="18" y="16" width="64" height="68" rx="6" stroke="#f59e0b" strokeWidth="3" fill="#78350f" fillOpacity="0.25" />
          <rect x="25" y="23" width="50" height="54" rx="3" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="21" cy="19" r="3" fill="#fde047" />
          <circle cx="79" cy="19" r="3" fill="#fde047" />
          <circle cx="21" cy="81" r="3" fill="#fde047" />
          <circle cx="79" cy="81" r="3" fill="#fde047" />
        </svg>
      );
    case 'snap_spark':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <path d="M28 35h16c3 0 5-4 5-8s-2-8 5-8 5 4 5 8 2 8 5 8h16v32H28V35z" stroke="#34d399" strokeWidth="2.5" fill="#059669" fillOpacity="0.2" />
          <circle cx="70" cy="30" r="4" fill="#a7f3d0" />
          <path d="M66 22l8 16M74 22l-8 16" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'frame_aurora':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <rect x="18" y="16" width="64" height="68" rx="10" stroke="#06b6d4" strokeWidth="2.8" fill="#083344" fillOpacity="0.3" />
          <rect x="26" y="24" width="48" height="52" rx="6" stroke="#ec4899" strokeWidth="1.5" strokeOpacity="0.8" />
        </svg>
      );
    case 'diamond_seal':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <circle cx="50" cy="50" r="36" stroke="#d946ef" strokeWidth="2.5" fill="#701a75" fillOpacity="0.25" />
          <polygon points="50,26 68,44 50,74 32,44" stroke="#f0abfc" strokeWidth="2" fill="#c084fc" fillOpacity="0.35" />
          <circle cx="50" cy="44" r="5" fill="#ffffff" />
        </svg>
      );
    case 'pusher_cyan':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <ellipse cx="50" cy="62" rx="36" ry="18" fill="#0891b2" fillOpacity="0.35" stroke="#06b6d4" strokeWidth="2.8" />
          <ellipse cx="50" cy="42" rx="20" ry="10" fill="#0e7490" stroke="#22d3ee" strokeWidth="2" />
          <cylinder cx="50" cy="34" r="8" />
          <circle cx="50" cy="32" r="8" fill="#a5f3fc" stroke="#0891b2" strokeWidth="2" />
        </svg>
      );
    case 'plasma_puck':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <path d="M14 56c12-16 28-20 40-20" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
          <ellipse cx="58" cy="48" rx="28" ry="15" fill="#dc2626" fillOpacity="0.4" stroke="#ef4444" strokeWidth="2.8" />
          <ellipse cx="58" cy="44" rx="20" ry="10" fill="#f97316" fillOpacity="0.5" stroke="#fde047" strokeWidth="2" />
        </svg>
      );
    case 'laser_rink':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <polygon points="15,70 85,70 70,30 30,30" stroke="#a855f7" strokeWidth="2.5" fill="#3b0764" fillOpacity="0.25" />
          <line x1="50" y1="30" x2="50" y2="70" stroke="#c084fc" strokeWidth="2" strokeDasharray="3 3" />
          <ellipse cx="50" cy="50" rx="14" ry="7" stroke="#e879f9" strokeWidth="1.8" />
        </svg>
      );
    case 'pusher_ruby':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <ellipse cx="50" cy="62" rx="34" ry="17" fill="#881337" fillOpacity="0.4" stroke="#e11d48" strokeWidth="2.8" />
          <ellipse cx="50" cy="42" rx="18" ry="9" fill="#9f1239" stroke="#fb7185" strokeWidth="2" />
          <circle cx="50" cy="32" r="7" fill="#fecdd3" stroke="#e11d48" strokeWidth="1.8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none">
          <circle cx="50" cy="50" r="30" stroke="#ec4899" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M40 50h20M50 40v20" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

// Icono selector para la barra superior de juegos
function GameTabIcon({ type, isSelected }) {
  const colorClass = isSelected ? 'text-white' : 'text-gray-300';
  switch (type) {
    case 'pool':
      return (
        <svg className={`w-4 h-4 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7a5 5 0 0 1 5 5c0 2.5-2 4-5 4s-5-1.5-5-4a5 5 0 0 1 5-5z" />
        </svg>
      );
    case 'tetris':
      return (
        <svg className={`w-4 h-4 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="6" height="6" x="3" y="3" rx="1" />
          <rect width="6" height="6" x="15" y="3" rx="1" />
          <rect width="6" height="6" x="15" y="15" rx="1" />
          <rect width="6" height="6" x="3" y="15" rx="1" />
        </svg>
      );
    case 'sudoku':
      return (
        <svg className={`w-4 h-4 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      );
    case 'puzzle':
      return (
        <svg className={`w-4 h-4 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.439 7.85c0-1.57.802-2.54 1.561-3.3a.5.5 0 0 0-.353-.85H15.5c-1.5 0-2-1.5-2-2.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5c0 1-.5 2.5-2 2.5H3.353a.5.5 0 0 0-.353.85c.759.76 1.561 1.73 1.561 3.3 0 1.57-.802 2.54-1.561 3.3a.5.5 0 0 0 .353.85H8.5c1.5 0 2 1.5 2 2.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5c0-1 .5-2.5 2-2.5h5.147a.5.5 0 0 0 .353-.85c-.759-.76-1.561-1.73-1.561-3.3z" />
        </svg>
      );
    case 'airhockey':
      return (
        <svg className={`w-4 h-4 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="21" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ArcadeShopView({
  userData,
  coins = 0,
  onPurchaseOrEquip
}) {
  const [selectedGameId, setSelectedGameId] = useState('pool'); // 'pool' | 'tetris' | 'sudoku' | 'puzzle' | 'airhockey'
  const [activeTab, setActiveTab] = useState('cues'); // 'cues' | 'felts' | 'earth_sun' (para Pool 3D)
  const [upcomingCategoryFilter, setUpcomingCategoryFilter] = useState('Todos');
  const [feedback, setFeedback] = useState(null);
  const feedbackTimerRef = useRef(null);

  const shopData = normalizePoolShop(userData?.poolShop || (() => {
    try {
      return JSON.parse(localStorage.getItem('pool_shop_state_v1') || '{}');
    } catch (e) {
      return {};
    }
  })());

  const [previewId, setPreviewId] = useState(() => shopData.equipped.cues);
  const mainCanvasRef = useRef(null);
  const cardCanvasesRef = useRef({});
  const studioRef = useRef(null);
  const orbitRef = useRef({ yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 });
  const activeTabRef = useRef(activeTab);
  const previewIdRef = useRef(previewId);
  const selectedGameIdRef = useRef(selectedGameId);

  useEffect(() => {
    selectedGameIdRef.current = selectedGameId;
  }, [selectedGameId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'cues') setPreviewId(shopData.equipped.cues);
    else if (activeTab === 'felts') setPreviewId(shopData.equipped.felts);
    else setPreviewId('espacio');
    orbitRef.current.yaw = 0;
    orbitRef.current.pitch = 0;
  }, [activeTab]);

  useEffect(() => {
    previewIdRef.current = previewId;
  }, [previewId]);

  const showNotice = (text, isOk = true) => {
    setFeedback({ text, isOk });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 3000);
  };

  // 1. Escaparate 3D Principal en Vivo (60 FPS directos en el canvas izquierdo) + Renderizado 3D de cada tarjeta
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: mainCanvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x070a14, 1);

    const studio = createAccessory3dStudio();
    studioRef.current = { renderer, ...studio };

    // Renderizar los modelos 3D en los lienzos de cada tarjeta
    const renderCardsOnce = () => {
      const curTab = activeTabRef.current;
      const items = curTab === 'cues'
        ? POOL_CUES_CATALOG
        : curTab === 'felts'
          ? POOL_FELTS_CATALOG
          : [POOL_EARTH_SUN_ITEM];

      renderer.setSize(280, 96, false);
      studio.camera.aspect = 280 / 96;
      studio.camera.updateProjectionMatrix();

      items.forEach((it) => {
        const cEl = cardCanvasesRef.current[`${curTab}__${it.id}`];
        if (!cEl) return;
        studio.configureObject(curTab, it.id, 0.6, false, 0, 0);
        renderer.render(studio.scene, studio.camera);
        const ctx = cEl.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, cEl.width, cEl.height);
          ctx.drawImage(mainCanvas, 0, 0, cEl.width, cEl.height);
        }
      });
    };

    let rafId = null;
    let lastTabRendered = null;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);

      // Si no estamos viendo Pool 3D, pausar el ciclo 3D para optimizar rendimiento
      if (selectedGameIdRef.current !== 'pool') return;

      if (lastTabRendered !== activeTabRef.current) {
        lastTabRendered = activeTabRef.current;
        renderCardsOnce();
      }
      const rect = mainCanvas.getBoundingClientRect();
      const w = Math.max(200, Math.round(rect.width));
      const h = Math.max(120, Math.round(rect.height));
      const pr = renderer.getPixelRatio();
      if (mainCanvas.width !== Math.floor(w * pr) || mainCanvas.height !== Math.floor(h * pr)) {
        renderer.setSize(w, h, false);
      }
      studio.camera.aspect = w / h;
      studio.camera.updateProjectionMatrix();
      studio.configureObject(
        activeTabRef.current,
        previewIdRef.current,
        now * 0.001,
        true,
        orbitRef.current.yaw,
        orbitRef.current.pitch
      );
      renderer.render(studio.scene, studio.camera);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      renderer.dispose();
    };
  }, []);

  const handleAction = (cat, item, explicitBuy = false) => {
    setPreviewId(String(item.id));
    orbitRef.current.yaw = 0;
    orbitRef.current.pitch = 0;

    const shopKey = cat === 'earth_sun' ? 'bgs' : cat;
    const unlockedList = shopData.unlocked[shopKey] || [];
    const isUnlocked = unlockedList.includes(String(item.id)) || item.price === 0;

    if (isUnlocked) {
      const nextShop = normalizePoolShop(shopData);
      if (cat === 'earth_sun') {
        nextShop.equipped.bgs = nextShop.equipped.bgs === 'espacio' ? 'universo' : 'espacio';
        onPurchaseOrEquip?.({ cost: 0, poolShop: nextShop });
        showNotice(
          nextShop.equipped.bgs === 'espacio'
            ? 'Escenario "Órbita: Tierra y Sol" equipado para Pool 3D.'
            : 'Usando el fondo de tu Perfil en Pool 3D.',
          true
        );
      } else {
        nextShop.equipped[shopKey] = String(item.id);
        onPurchaseOrEquip?.({ cost: 0, poolShop: nextShop });
        showNotice(`"${item.name}" equipado en tu arsenal de Pool 3D.`, true);
      }
      return;
    }

    if (!explicitBuy) {
      showNotice(`Inspeccionando "${item.name}" en el visor 3D. Pulsa "Desbloquear · ${item.price} Monedas" para adquirirlo.`, true);
      return;
    }

    if (coins < item.price) {
      showNotice(`Te faltan ${item.price - coins} monedas para desbloquear "${item.name}".`, false);
      return;
    }

    const nextShop = normalizePoolShop(shopData);
    if (!nextShop.unlocked[shopKey].includes(String(item.id))) {
      nextShop.unlocked[shopKey].push(String(item.id));
    }
    nextShop.equipped[shopKey] = String(item.id);
    onPurchaseOrEquip?.({ cost: item.price, poolShop: nextShop });
    showNotice(`¡Desbloqueaste y equipaste "${item.name}"!`, true);
  };

  const activeItems = activeTab === 'cues'
    ? POOL_CUES_CATALOG
    : activeTab === 'felts'
      ? POOL_FELTS_CATALOG
      : [POOL_EARTH_SUN_ITEM];

  const selectedItem = activeItems.find(it => String(it.id) === String(previewId)) || activeItems[0];
  const activeShopKey = activeTab === 'earth_sun' ? 'bgs' : activeTab;
  const isSelectedUnlocked = (shopData.unlocked[activeShopKey] || []).includes(String(selectedItem.id)) || selectedItem.price === 0;
  const isSelectedEquipped = String(shopData.equipped[activeShopKey]) === String(selectedItem.id);

  const activeCueName = POOL_CUES_CATALOG.find(c => c.id === shopData.equipped.cues)?.name || 'Vara Clásica';
  const activeFeltName = POOL_FELTS_CATALOG.find(f => f.id === String(shopData.equipped.felts))?.name || 'Verde Clásico';
  const activeBgName = shopData.equipped.bgs === 'espacio' ? 'Tierra y Sol 3D' : 'Fondo de tu Perfil';

  // Configuración del juego seleccionado
  const currentUpcomingGame = UPCOMING_GAMES_CATALOG[selectedGameId];
  const filteredUpcomingItems = currentUpcomingGame?.items.filter(
    it => upcomingCategoryFilter === 'Todos' || it.category === upcomingCategoryFilter
  ) || [];

  return (
    <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-2 sm:px-6 md:px-8 pt-1 pb-3 flex flex-col justify-start select-none">
      <div className="rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-[#151726]/95 via-[#0e101b]/98 to-[#090a12]/98 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-3.5">

        {/* SELECTOR DE JUEGOS DEL ARCADE (Pool 3D, Tetris, Sudoku, Rompecabezas, Air Hockey - GOMI EXCLUIDO) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SHOP_GAMES.map((game) => {
            const isSelected = selectedGameId === game.id;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  setSelectedGameId(game.id);
                  setUpcomingCategoryFilter('Todos');
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer whitespace-nowrap flex-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600/35 via-purple-600/30 to-black/60 border-pink-400/80 shadow-[0_0_18px_rgba(236,72,153,0.3)] text-white'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25 text-gray-400 hover:text-white'
                }`}
              >
                <div className={`p-1.5 rounded-xl border flex items-center justify-center ${
                  isSelected ? 'bg-pink-500/25 border-pink-400/50' : 'bg-black/40 border-white/10'
                }`}>
                  <GameTabIcon type={game.iconType} isSelected={isSelected} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <b className="text-xs sm:text-sm font-bold block">{game.name}</b>
                    <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded-md font-extrabold border ${game.badgeColor}`}>
                      {game.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block">{game.tagline}</span>
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-center border ${
              feedback.isOk
                ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                : 'bg-rose-500/15 border-rose-400/50 text-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* 3. SECCIÓN ACTIVA: POOL 3D (ESTUDIO EN VIVO CON MODELOS 3D REALES Y EQUIPAMIENTO) */}
        <div className={`flex-col gap-3.5 ${selectedGameId === 'pool' ? 'flex' : 'hidden'}`}>
          {/* Subpestañas específicas de Pool 3D */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-black/40 p-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-left">
              <span className="text-xs font-bold text-white px-2">
                Personalización de Pool 3D:
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('cues')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'cues'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_2px_10px_rgba(236,72,153,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Varas 3D</span>
                <span className="hidden md:inline-block px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase bg-emerald-500/25 border border-emerald-400/50 text-emerald-200">
                  Rival la ve
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('felts')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'felts'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_2px_10px_rgba(236,72,153,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Mesas 3D</span>
                <span className="hidden md:inline-block px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase bg-sky-500/25 border border-sky-400/50 text-sky-200">
                  Solo tú
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('earth_sun')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'earth_sun'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_2px_10px_rgba(236,72,153,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Tierra y Sol</span>
                <span className="hidden md:inline-block px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase bg-amber-500/25 border border-amber-400/50 text-amber-200">
                  Especial
                </span>
              </button>
            </div>
          </div>

          {/* CUERPO PRINCIPAL DE POOL: ESCAPARATE 3D 360° (IZQ) + CATÁLOGO 3D (DER) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* COLUMNA IZQUIERDA (5 cols): Escaparate 3D en Vivo del Accesorio + Ficha Técnica + Arsenal Equipado */}
            <div className="lg:col-span-5 rounded-2xl bg-[#0b0e18] border border-white/10 p-3.5 flex flex-col justify-between gap-3">
              <div>
                {/* Cabecera del Visor 3D */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${selectedItem.tierColor}`}>
                    {selectedItem.tier || 'Accesorio 3D'}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                    {activeTab === 'cues' ? (
                      <><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Visible para tu rival</>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Vista exclusiva para ti</>
                    )}
                  </span>
                </div>

                {/* Lienzo WebGL 3D Directo en Vivo (Arrastrable 360°) */}
                <div
                  onPointerDown={(e) => {
                    orbitRef.current.dragging = true;
                    orbitRef.current.lastX = e.clientX;
                    orbitRef.current.lastY = e.clientY;
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                  }}
                  onPointerMove={(e) => {
                    if (!orbitRef.current.dragging) return;
                    const dx = e.clientX - orbitRef.current.lastX;
                    const dy = e.clientY - orbitRef.current.lastY;
                    orbitRef.current.lastX = e.clientX;
                    orbitRef.current.lastY = e.clientY;
                    orbitRef.current.yaw += dx * 0.012;
                    orbitRef.current.pitch = Math.max(-0.85, Math.min(0.85, orbitRef.current.pitch + dy * 0.01));
                  }}
                  onPointerUp={() => { orbitRef.current.dragging = false; }}
                  onPointerCancel={() => { orbitRef.current.dragging = false; }}
                  className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden border border-white/15 bg-[#070a14] cursor-grab active:cursor-grabbing shadow-inner"
                >
                  <canvas ref={mainCanvasRef} className="w-full h-full block" />
                  <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/75 border border-white/10 text-[10px] text-gray-300">
                      Arrastra para girar 360°
                    </span>
                    {!isSelectedUnlocked && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-bold text-amber-300">
                        Vista Previa · {selectedItem.price} Monedas
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalle del Accesorio Seleccionado */}
                <div className="mt-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">{selectedItem.name}</h3>
                    {isSelectedEquipped && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-bold text-emerald-300">
                        ✓ En Uso
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1">
                    {selectedItem.desc}
                  </p>
                </div>
              </div>

              {/* Botón Principal del Escaparate + Resumen de Arsenal */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
                {isSelectedEquipped ? (
                  activeTab === 'earth_sun' ? (
                    <button
                      type="button"
                      onClick={() => handleAction(activeTab, selectedItem, false)}
                      className="w-full py-2 px-4 rounded-xl font-bold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 transition-all cursor-pointer"
                    >
                      ✓ Activo · Clic para usar el Fondo de tu Perfil
                    </button>
                  ) : (
                    <div className="w-full py-2 px-4 rounded-xl font-bold text-xs bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-center">
                      ✓ Accesorio Equipado en tu Arsenal
                    </div>
                  )
                ) : isSelectedUnlocked ? (
                  <button
                    type="button"
                    onClick={() => handleAction(activeTab, selectedItem, false)}
                    className="w-full py-2 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg transition-all cursor-pointer"
                  >
                    Equipar {selectedItem.name}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(activeTab, selectedItem, true)}
                    className={`w-full py-2 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      coins >= selectedItem.price
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    Desbloquear Accesorio · {selectedItem.price} Monedas
                  </button>
                )}

                {/* Resumen compacto de tus 3 accesorios activos */}
                <div className="grid grid-cols-3 gap-1.5 text-left bg-black/50 p-2 rounded-xl border border-white/10">
                  <div className="px-2 py-1 rounded-lg bg-white/[0.03]">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block">Vara (Rival)</span>
                    <b className="text-[11px] text-emerald-300 truncate block">{activeCueName}</b>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-white/[0.03]">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block">Mesa (Tú)</span>
                    <b className="text-[11px] text-sky-300 truncate block">{activeFeltName}</b>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-white/[0.03]">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block">Escenario</span>
                    <b className="text-[11px] text-purple-300 truncate block">{activeBgName}</b>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA (7 cols): Cuadrícula de Tarjetas con Modelos 3D Reales */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-3">
              {activeTab === 'earth_sun' ? (
                <div className="h-full rounded-2xl bg-[#0b0e18] border border-white/10 p-4 flex flex-col justify-between gap-4 text-left">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                      Configuración de Escenario 3D en Pool
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Fondo del Perfil vs. Órbita Tierra y Sol
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Por defecto, Pool 3D sincroniza automáticamente <b className="text-pink-300">el color y las partículas del Universo de tu Perfil</b>. Si desbloqueas el accesorio especial <b className="text-amber-300">Órbita: Tierra y Sol</b>, podrás jugar rodeado del planeta Tierra 3D y el Sol (visible únicamente en tu pantalla).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opción 1: Fondo de tu Perfil (Por defecto) */}
                    <div
                      onClick={() => {
                        const nextShop = normalizePoolShop(shopData);
                        nextShop.equipped.bgs = 'universo';
                        onPurchaseOrEquip?.({ cost: 0, poolShop: nextShop });
                        showNotice('Fondo de tu Perfil activado para Pool 3D.', true);
                      }}
                      className={`rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        shopData.equipped.bgs === 'universo'
                          ? 'bg-purple-950/30 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <b className="text-sm text-white">Fondo de tu Perfil</b>
                          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-400/30">
                            Por defecto
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Usa automáticamente el tema y partículas que tengas elegidos en Nuestro Universo.
                        </p>
                      </div>
                      <span className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs text-center border ${
                        shopData.equipped.bgs === 'universo'
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-white/10 border-white/15 text-white'
                      }`}>
                        {shopData.equipped.bgs === 'universo' ? '✓ Seleccionado' : 'Usar Fondo del Perfil'}
                      </span>
                    </div>

                    {/* Opción 2: Tierra y Sol 3D (Único comprable) */}
                    <div
                      onClick={() => handleAction('earth_sun', POOL_EARTH_SUN_ITEM, false)}
                      className={`rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        shopData.equipped.bgs === 'espacio'
                          ? 'bg-amber-950/25 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                          : 'bg-white/[0.03] border-amber-400/30 hover:border-amber-400/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <b className="text-sm text-amber-200">{POOL_EARTH_SUN_ITEM.name}</b>
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                            {shopData.unlocked.bgs.includes('espacio') ? 'Desbloqueado' : `${POOL_EARTH_SUN_ITEM.price} Oro`}
                          </span>
                        </div>
                        <canvas
                          ref={(el) => { cardCanvasesRef.current['earth_sun__espacio'] = el; }}
                          width={280}
                          height={96}
                          className="w-full h-16 rounded-lg border border-white/10 bg-[#070a14] my-2 block"
                        />
                      </div>
                      {shopData.equipped.bgs === 'espacio' ? (
                        <span className="w-full py-1.5 px-3 rounded-lg font-bold text-xs text-center bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
                          ✓ Seleccionado
                        </span>
                      ) : shopData.unlocked.bgs.includes('espacio') ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('earth_sun', POOL_EARTH_SUN_ITEM, false);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg font-bold text-xs bg-white/10 hover:bg-pink-500/25 border border-white/20 text-white cursor-pointer"
                        >
                          Equipar Tierra y Sol
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('earth_sun', POOL_EARTH_SUN_ITEM, true);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-500/30 to-yellow-600/30 border border-amber-400/60 text-amber-200 cursor-pointer"
                        >
                          Comprar · {POOL_EARTH_SUN_ITEM.price} Monedas
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 h-full">
                  {activeItems.map((item) => {
                    const unlockedList = shopData.unlocked[activeTab] || [];
                    const isUnlocked = unlockedList.includes(String(item.id)) || item.price === 0;
                    const isEquipped = String(shopData.equipped[activeTab]) === String(item.id);
                    const isPreviewing = String(previewId) === String(item.id);
                    const canAfford = coins >= item.price;
                    const refKey = `${activeTab}__${item.id}`;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAction(activeTab, item, false)}
                        className={`group relative rounded-2xl p-2.5 bg-[#0c0f1a] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isEquipped
                            ? 'border-emerald-400/80 bg-gradient-to-b from-emerald-950/25 to-[#0c0f1a] shadow-[0_0_18px_rgba(16,185,129,0.18)]'
                            : isPreviewing
                              ? 'border-pink-400/80 bg-gradient-to-b from-pink-950/20 to-[#0c0f1a]'
                              : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* Etiqueta superior de rareza y estado */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${item.tierColor}`}>
                            {item.tier}
                          </span>
                          {isEquipped ? (
                            <span className="text-[9px] font-mono font-extrabold text-emerald-300">
                              ✓ EN USO
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[9px] font-mono text-gray-400">
                              Adquirido
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-extrabold text-amber-300">
                              {item.price} Oro
                            </span>
                          )}
                        </div>

                        {/* Modelo 3D Real del Accesorio renderizado por Three.js */}
                        <div className="w-full h-16 rounded-xl border border-white/10 bg-[#070a14] overflow-hidden">
                          <canvas
                            ref={(el) => { cardCanvasesRef.current[refKey] = el; }}
                            width={280}
                            height={96}
                            className="w-full h-full block group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>

                        {/* Nombre y Botón Rápido */}
                        <div className="text-left">
                          <b className="text-xs sm:text-sm font-bold text-white block truncate">{item.name}</b>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.desc}</p>
                        </div>

                        {isEquipped ? (
                          <span className="w-full py-1 px-2.5 rounded-lg font-bold text-[11px] text-center bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
                            ✓ Equipado
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(activeTab, item, false);
                            }}
                            className="w-full py-1 px-2.5 rounded-lg font-bold text-[11px] bg-white/10 hover:bg-pink-500/25 border border-white/15 hover:border-pink-400/50 text-white transition-all cursor-pointer"
                          >
                            Equipar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(activeTab, item, true);
                            }}
                            className={`w-full py-1 px-2.5 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500/25 to-yellow-600/25 hover:from-amber-500/40 hover:to-yellow-600/40 border-amber-400/60 text-amber-200'
                                : 'bg-white/5 border-white/10 text-gray-500'
                            }`}
                          >
                            Comprar · {item.price} Oro
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. SECCIÓN PRÓXIMAMENTE: PARA TETRIS, SUDOKU, ROMPECABEZAS Y AIR HOCKEY */}
        {selectedGameId !== 'pool' && currentUpcomingGame && (
          <div className="flex flex-col gap-4 text-left">
            {/* Banner de Presentación del Juego */}
            <div className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-r ${currentUpcomingGame.gradient} border ${currentUpcomingGame.borderColor} flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner`}>
              <div className="flex flex-col gap-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono uppercase font-extrabold bg-white/10 border border-white/20 text-white">
                    Catálogo de Personalización
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    En Desarrollo
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-white mt-0.5">
                  {currentUpcomingGame.subtitle}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {currentUpcomingGame.desc}
                </p>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between gap-1 flex-none border-t md:border-t-0 border-white/10 pt-2 md:pt-0">
                <span className="text-[10px] font-mono text-gray-400 uppercase">
                  Fase de Desarrollo
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Próximamente
                </span>
              </div>
            </div>

            {/* Filtros de Categoría */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-gray-400 font-bold mr-1">Filtrar:</span>
              {currentUpcomingGame.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setUpcomingCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    upcomingCategoryFilter === cat
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-md'
                      : 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Vitrina de Tarjetas de Accesorios Próximos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredUpcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl p-3 bg-[#0c0f1a] border border-white/10 hover:border-pink-500/40 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    {/* Rareza y Categoría */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${item.tierColor}`}>
                        {item.tier}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-300">
                        ~{item.plannedPrice} Oro
                      </span>
                    </div>

                    {/* Ilustración Vectorial del Accesorio */}
                    <div className="w-full h-28 rounded-xl bg-gradient-to-b from-white/[0.04] to-black/50 border border-white/10 flex items-center justify-center overflow-hidden group-hover:scale-[1.02] transition-transform">
                      <div className="w-20 h-20">
                        <UpcomingItemIllustration type={item.previewIcon} />
                      </div>
                    </div>

                    {/* Título y Descripción */}
                    <div className="mt-2.5">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 block">
                        {item.category}
                      </span>
                      <b className="text-sm font-bold text-white block mt-0.5">
                        {item.name}
                      </b>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-3">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Estado / Botón Informativo */}
                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      disabled
                      className="w-full py-1.5 px-3 rounded-xl font-bold text-xs bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Próximamente</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Nota de la comunidad */}
            <div className="rounded-xl p-3 bg-black/40 border border-white/10 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-2">
                <span className="text-amber-400">💡</span>
                <span>Los accesorios de <b>{currentUpcomingGame.title}</b> estarán disponibles con la próxima temporada del Arcade.</span>
              </span>
              <span className="font-mono text-[10px] text-pink-400/80 uppercase hidden sm:inline">
                Sugerencias abiertas
              </span>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
