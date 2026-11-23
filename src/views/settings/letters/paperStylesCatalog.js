// Catálogo Oficial de Estilos de Papel para Cartas de Amor
// Organizado por niveles de rareza: Común (55), Rara (101), Épica (160), Legendaria (8), Mítica (4)

export const RARITY_TIERS = {
  comun: {
    id: 'comun',
    label: 'Común',
    targetCount: 55,
    color: '#94a3b8',
    badgeClass: 'bg-slate-800/90 text-slate-300 border-slate-600/70',
    tabActiveClass: 'bg-slate-700 text-white border-slate-500 shadow-md',
    borderClass: 'border-slate-700 hover:border-slate-500',
    glowClass: 'hover:shadow-[0_0_12px_rgba(148,163,184,0.15)]'
  },
  rara: {
    id: 'rara',
    label: 'Rara',
    targetCount: 101,
    color: '#38bdf8',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]',
    tabActiveClass: 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
    borderClass: 'border-cyan-900/60 hover:border-cyan-400',
    glowClass: 'hover:shadow-[0_0_15px_rgba(56,189,248,0.3)]'
  },
  epica: {
    id: 'epica',
    label: 'Épica',
    targetCount: 160,
    color: '#c084fc',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.25)]',
    tabActiveClass: 'bg-purple-600 text-white border-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.45)]',
    borderClass: 'border-purple-900/60 hover:border-purple-400',
    glowClass: 'hover:shadow-[0_0_18px_rgba(192,132,252,0.35)]'
  },
  legendaria: {
    id: 'legendaria',
    label: 'Legendaria',
    targetCount: 8,
    color: '#facc15',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-400/80 shadow-[0_0_12px_rgba(250,204,21,0.35)]',
    tabActiveClass: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-bold border-amber-300 shadow-[0_0_20px_rgba(250,204,21,0.5)]',
    borderClass: 'border-amber-500/60 hover:border-amber-300',
    glowClass: 'hover:shadow-[0_0_22px_rgba(250,204,21,0.45)]'
  },
  mitica: {
    id: 'mitica',
    label: 'Mítica',
    targetCount: 4,
    color: '#fb7185',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse',
    tabActiveClass: 'bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 text-white font-black border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.6)]',
    borderClass: 'border-rose-500/70 hover:border-rose-400',
    glowClass: 'hover:shadow-[0_0_25px_rgba(251,113,133,0.55)]'
  }
};

// Paletas temáticas para generar y catalogar los estilos visuales
const COMUN_THEMES = [
  { name: 'Moderna (Papel Crema)', id: 'modern', bg: '#f4f0e8', border: '#e6dfd1', text: '#2d2a26', desc: 'Papel liso y limpio tono crema clásico' },
  { name: 'Lino Blanco Suave', id: 'comun_lino_blanco', bg: '#faf9f6', border: '#e0ded8', text: '#333333', desc: 'Textura suave de lino artesanal' },
  { name: 'Marfil Romántico', id: 'comun_marfil', bg: '#fdfbf7', border: '#ebd5c1', text: '#3a2e2b', desc: 'Tono marfil cálido y delicado' },
  { name: 'Gris Perla Vintage', id: 'comun_gris_perla', bg: '#f0f2f5', border: '#d1d5db', text: '#1f2937', desc: 'Aspecto elegante de libreta nórdica' },
  { name: 'Algodón Pastel', id: 'comun_algodon_pastel', bg: '#fffaf0', border: '#f0e6d2', text: '#2e2820', desc: 'Fibra de algodón suave al tacto' },
  { name: 'Manila Nostálgico', id: 'comun_manila', bg: '#efe7d3', border: '#dbc9a9', text: '#3c3222', desc: 'Papel manila clásico de memorias' },
  { name: 'Kraft Ligero', id: 'comun_kraft_ligero', bg: '#e8dcbf', border: '#cbb692', text: '#3b2f1e', desc: 'Papel artesanal ecológico suave' },
  { name: 'Hueso Antiguo', id: 'comun_hueso', bg: '#f9f6ed', border: '#ded7c2', text: '#302c25', desc: 'Papel de diario personal clásico' },
  { name: 'Brisa Celeste Suave', id: 'comun_celeste_suave', bg: '#f0f7ff', border: '#c7e0f8', text: '#1e293b', desc: 'Tono cielo pálido con brisa romántica' },
  { name: 'Rosa Cuarzo Pastel', id: 'comun_rosa_cuarzo', bg: '#fff1f2', border: '#fecdd3', text: '#4c1d24', desc: 'Rosa romántico muy delicado' }
];

const RARA_THEMES = [
  { name: 'Antigua (Pergamino)', id: 'parchment', bg: 'radial-gradient(circle at center, #f1dcb8 0%, #e4c494 70%, #c79c65 100%)', border: '#b88c52', text: '#2a1a0f', desc: 'Pergamino histórico con matices ambarinos' },
  { name: 'Cielo Crepuscular', id: 'rara_crepusculo', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 60%, #7dd3fc 100%)', border: '#0284c7', text: '#0c4a6e', desc: 'Gradiente azul zafiro crepuscular' },
  { name: 'Flor de Cerezo Rosa', id: 'rara_sakura', bg: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 60%, #f472b6 100%)', border: '#db2777', text: '#701a75', desc: 'Pétalos de sakura al viento de primavera' },
  { name: 'Lavanda Silvestre', id: 'rara_lavanda', bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 60%, #d8b4fe 100%)', border: '#9333ea', text: '#581c87', desc: 'Esencia provenzal de flores de lavanda' },
  { name: 'Menta Fresca', id: 'rara_menta', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #86efac 100%)', border: '#16a34a', text: '#14532d', desc: 'Papel fresco con tintes botánicos verdes' },
  { name: 'Arenas Doradas', id: 'rara_arenas', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)', border: '#d97706', text: '#78350f', desc: 'Duna dorada acariciada por el sol' },
  { name: 'Océano Pacífico', id: 'rara_oceano', bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 60%, #67e8f9 100%)', border: '#0891b2', text: '#164e63', desc: 'Aguas cristalinas con reflejos turquesa' },
  { name: 'Amanecer Escarlata', id: 'rara_amanecer', bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fdba74 100%)', border: '#ea580c', text: '#7c2d12', desc: 'Primeros rayos del sol naciente' },
  { name: 'Nube de Algodón Violeta', id: 'rara_nube_violeta', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #c4b5fd 100%)', border: '#7c3aed', text: '#4c1d95', desc: 'Suavidad etérea entre nieblas violetas' },
  { name: 'Bambú Zen', id: 'rara_bambu', bg: 'linear-gradient(135deg, #f7fee7 0%, #ecfccb 60%, #bef264 100%)', border: '#65a30d', text: '#365314', desc: 'Papel de fibras orientales de bambú' }
];

const EPICA_THEMES = [
  { name: 'Antigua (Bordes Quemados)', id: 'burnt', bg: 'radial-gradient(circle at center, #f1dcb8 0%, #e4c494 70%, #c79c65 100%)', border: '#1a0a00', text: '#2a1a0f', isBurnt: true, desc: 'Pergamino milenario con bordes carbonizados al fuego' },
  { name: 'Noche Estelar de Amor', id: 'epica_noche_estelar', bg: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 60%, #020617 100%)', border: '#6366f1', text: '#e0e7ff', desc: 'Cielo estrellado profundo con constelaciones' },
  { name: 'Papiro Egipcio Sagrado', id: 'epica_papiro_egipcio', bg: 'radial-gradient(ellipse at center, #d4a373 0%, #bc6c25 70%, #6b4117 100%)', border: '#dda15e', text: '#fefae0', desc: 'Fibras sagradas de las orillas del Nilo' },
  { name: 'Terciopelo Carmesí', id: 'epica_terciopelo_carmesi', bg: 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #9f1239 100%)', border: '#f43f5e', text: '#ffe4e6', desc: 'Lujoso terciopelo rojo oscuro de época imperial' },
  { name: 'Amatista Imperial', id: 'epica_amatista_imperial', bg: 'linear-gradient(135deg, #2e1065 0%, #581c87 60%, #7e22ce 100%)', border: '#c084fc', text: '#f3e8ff', desc: 'Reflejos de gemas místicas violetas' },
  { name: 'Esmeralda Mística', id: 'epica_esmeralda_mistica', bg: 'linear-gradient(135deg, #022c22 0%, #064e3b 60%, #047857 100%)', border: '#34d399', text: '#ecfdf5', desc: 'Luz profunda de esmeraldas de la selva' },
  { name: 'Obsidiana con Filos de Oro', id: 'epica_obsidiana_oro', bg: 'radial-gradient(circle, #18181b 0%, #09090b 80%, #000000 100%)', border: '#fbbf24', text: '#fef08a', desc: 'Papel negro volcánico con ribetes de oro puro' },
  { name: 'Nebulosa Cósmica', id: 'epica_nebulosa_cosmica', bg: 'radial-gradient(circle at 70% 30%, #3b0764 0%, #172554 60%, #030712 100%)', border: '#a855f7', text: '#f3e8ff', desc: 'Vórtice interestelar de polvo y galaxias' }
];

const LEGENDARIA_THEMES = [
  { name: 'Pérgamo Real Aureo', id: 'legendaria_pergamo_aureo', bg: 'radial-gradient(circle at center, #fef08a 0%, #eab308 50%, #854d0e 100%)', border: '#fde047', text: '#422006', desc: 'Bañado en pan de oro de 24 kilates para votos eternos' },
  { name: 'Rosa de Plata Celestial', id: 'legendaria_plata_celestial', bg: 'radial-gradient(circle at 30% 30%, #f1f5f9 0%, #94a3b8 50%, #334155 100%)', border: '#e2e8f0', text: '#f8fafc', desc: 'Brillo lunar de plata diamantada encantada' },
  { name: 'Corona de Sol Naciente', id: 'legendaria_corona_sol', bg: 'radial-gradient(circle at center, #ffedd5 0%, #f97316 60%, #7c2d12 100%)', border: '#fdba74', text: '#fff7ed', desc: 'Llama inextinguible de pasión y fidelidad eterna' },
  { name: 'Zafiro del Destino', id: 'legendaria_zafiro_destino', bg: 'radial-gradient(circle at 60% 40%, #0369a1 0%, #0c4a6e 60%, #082f49 100%)', border: '#38bdf8', text: '#e0f2fe', desc: 'Gema legendaria que une dos almas a través del tiempo' },
  { name: 'Velo de Luna Eterna', id: 'legendaria_luna_eterna', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)', border: '#a5b4fc', text: '#e0e7ff', desc: 'Luz plateada de luna llena que ilumina secretos de amor' },
  { name: 'Bosque de los Elfos', id: 'legendaria_bosque_elfos', bg: 'radial-gradient(circle at center, #14532d 0%, #052e16 70%, #022c22 100%)', border: '#4ade80', text: '#dcfce7', desc: 'Papel encantado bendecido por la magia del bosque antiguo' },
  { name: 'Corazón de Fénix', id: 'legendaria_corazon_fenix', bg: 'radial-gradient(circle at center, #ea580c 0%, #991b1b 60%, #450a0a 100%)', border: '#f97316', text: '#ffedd5', desc: 'Cenizas y plumas de fénix que renacen con cada palabra' },
  { name: 'Santuario de las Estrellas', id: 'legendaria_santuario_estrellas', bg: 'radial-gradient(circle at 50% 50%, #4c1d95 0%, #2e1065 60%, #09090b 100%)', border: '#e9d5ff', text: '#faf5ff', desc: 'Templo sideral donde los juramentos son para siempre' }
];

const MITICA_THEMES = [
  { name: 'Pacto de Almas Gemelas', id: 'mitica_pacto_almas', bg: 'radial-gradient(circle at 50% 50%, #be123c 0%, #881337 40%, #4c0519 80%, #000000 100%)', border: '#fb7185', text: '#fff1f2', desc: 'El juramento más sagrado que trasciende las vidas y dimensiones' },
  { name: 'Origen Cósmico del Amor', id: 'mitica_origen_cosmico', bg: 'radial-gradient(circle at 30% 70%, #c026d3 0%, #4f46e5 50%, #0f172a 90%, #000000 100%)', border: '#e879f9', text: '#fdf4ff', desc: 'La primera chispa de luz que dio vida al universo y a nuestro encuentro' },
  { name: 'Eternidad Sin Fin', id: 'mitica_eternidad_sin_fin', bg: 'radial-gradient(ellipse at center, #ffd700 0%, #b8860b 35%, #4a154b 75%, #0d001a 100%)', border: '#fef08a', text: '#fffbeb', desc: 'Forjado con la energía intemporal del amor que nunca morirá' },
  { name: 'Cáliz del Destino Compartido', id: 'mitica_caliz_destino', bg: 'radial-gradient(circle at 50% 40%, #fb7185 0%, #9f1239 45%, #3f0713 80%, #020617 100%)', border: '#fda4af', text: '#ffffff', desc: 'Dos destinos fundidos en una sola copa de amor inmortal' }
];

// Generar el catálogo completo estructurado y escalable
function buildPaperCatalog() {
  const catalog = [];

  // 1. Común: exactamente 55
  for (let i = 0; i < 55; i++) {
    const base = COMUN_THEMES[i % COMUN_THEMES.length];
    const id = i < COMUN_THEMES.length ? base.id : `comun_variante_${i + 1}`;
    const name = i < COMUN_THEMES.length ? base.name : `${base.name.replace(/\s\(.*\)/, '')} · Tonalidad ${i + 1}`;
    catalog.push({
      id,
      name,
      rarity: 'comun',
      description: base.desc,
      preview: {
        bg: base.bg,
        border: base.border,
        textColor: base.text
      }
    });
  }

  // 2. Rara: exactamente 101
  for (let i = 0; i < 101; i++) {
    const base = RARA_THEMES[i % RARA_THEMES.length];
    const id = i < RARA_THEMES.length ? base.id : `rara_variante_${i + 1}`;
    const name = i < RARA_THEMES.length ? base.name : `${base.name.replace(/\s\(.*\)/, '')} · Matiz ${i + 1}`;
    catalog.push({
      id,
      name,
      rarity: 'rara',
      description: base.desc,
      preview: {
        bg: base.bg,
        border: base.border,
        textColor: base.text
      }
    });
  }

  // 3. Épica: exactamente 160
  for (let i = 0; i < 160; i++) {
    const base = EPICA_THEMES[i % EPICA_THEMES.length];
    const id = i < EPICA_THEMES.length ? base.id : `epica_variante_${i + 1}`;
    const name = i < EPICA_THEMES.length ? base.name : `${base.name.replace(/\s\(.*\)/, '')} · Nivel ${i + 1}`;
    catalog.push({
      id,
      name,
      rarity: 'epica',
      description: base.desc,
      isBurnt: base.isBurnt || false,
      preview: {
        bg: base.bg,
        border: base.border,
        textColor: base.text
      }
    });
  }

  // 4. Legendaria: exactamente 8
  LEGENDARIA_THEMES.forEach((base, idx) => {
    catalog.push({
      id: base.id,
      name: base.name,
      rarity: 'legendaria',
      description: base.desc,
      preview: {
        bg: base.bg,
        border: base.border,
        textColor: base.text
      }
    });
  });

  // 5. Mítica: exactamente 4
  MITICA_THEMES.forEach((base, idx) => {
    catalog.push({
      id: base.id,
      name: base.name,
      rarity: 'mitica',
      description: base.desc,
      preview: {
        bg: base.bg,
        border: base.border,
        textColor: base.text
      }
    });
  });

  return catalog;
}

export const PAPER_STYLES_CATALOG = buildPaperCatalog();

// Mapa indexado por ID para búsqueda O(1) ultrarrápida
export const PAPER_STYLES_MAP = new Map(PAPER_STYLES_CATALOG.map(item => [item.id, item]));

// Obtener un estilo por ID con fallback seguro a moderna
export function getPaperStyleById(id) {
  if (!id) return PAPER_STYLES_CATALOG[0];
  return PAPER_STYLES_MAP.get(id) || {
    id,
    name: id === 'modern' ? 'Moderna (Papel Crema)' : id === 'parchment' ? 'Antigua (Pergamino)' : id === 'burnt' ? 'Antigua (Bordes Quemados)' : `Estilo ${id}`,
    rarity: id === 'burnt' ? 'epica' : id === 'parchment' ? 'rara' : 'comun',
    description: 'Estilo de papel para carta',
    preview: {
      bg: id === 'parchment' || id === 'burnt' ? 'radial-gradient(circle, #f1dcb8, #c79c65)' : '#f4f0e8',
      border: id === 'burnt' ? '#1a0a00' : id === 'parchment' ? '#b88c52' : '#e6dfd1',
      textColor: id === 'parchment' || id === 'burnt' ? '#2a1a0f' : '#2d2a26'
    }
  };
}

// Obtener la información visual de una categoría de rareza
export function getRarityInfo(rarityKey) {
  return RARITY_TIERS[rarityKey] || RARITY_TIERS.comun;
}

// Conteo dinámico de estilos por rareza
export function getPaperCategoryCounts() {
  const counts = {
    todas: PAPER_STYLES_CATALOG.length,
    comun: 0,
    rara: 0,
    epica: 0,
    legendaria: 0,
    mitica: 0
  };

  PAPER_STYLES_CATALOG.forEach(style => {
    if (counts[style.rarity] !== undefined) {
      counts[style.rarity]++;
    }
  });

  return counts;
}
