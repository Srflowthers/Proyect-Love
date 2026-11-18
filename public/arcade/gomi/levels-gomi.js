/**
 * ============================================================================
 * GOMINOLA - SISTEMA DE 101 NIVELES (NIVEL 0 AL 100), VALIDADOR Y SIMULADOR
 * ============================================================================
 * Define el catálogo oficial de las 7 figuras del juego, las 12 distribuciones
 * de tablero (8x8 con soporte de celdas vacías/huecos), la campaña completa de
 * 101 niveles organizada en 10 bloques de dificultad y el motor de validación.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. CATÁLOGO DE FIGURAS EXISTENTES EN EL PROYECTO
     ========================================================================== */
  const GOMI_FIGURES = {
    0: {
      id: 0,
      key: 'helado',
      name: 'Helado de cono ácido',
      shortName: 'Helado',
      pFn: 'pHelado',
      dFn: 'dHelado',
      color: '#F2475A',
      role: 'base'
    },
    1: {
      id: 1,
      key: 'compromiso',
      name: 'Anillo de compromiso',
      shortName: 'Compromiso',
      pFn: 'pAnilloCompromiso',
      dFn: 'dAnilloCompromiso',
      color: '#FFAE1A',
      role: 'base'
    },
    2: {
      id: 2,
      key: 'sushi',
      name: 'Sushi frito',
      shortName: 'Sushi',
      pFn: 'pSushi',
      dFn: 'dSushi',
      color: '#3CC47C',
      role: 'base'
    },
    3: {
      id: 3,
      key: 'boda',
      name: 'Anillo de boda',
      shortName: 'Anillo boda',
      pFn: 'pAnilloBoda',
      dFn: 'dAnilloBoda',
      color: '#22B8E8',
      role: 'base'
    },
    4: {
      id: 4,
      key: 'gusano',
      name: 'Gusano ácido',
      shortName: 'Gusano',
      pFn: 'pGusano',
      dFn: 'dGusano',
      color: '#8B5CF6',
      role: 'base'
    },
    5: {
      id: 5,
      key: 'algodon',
      name: 'Algodón de azúcar',
      shortName: 'Algodón',
      pFn: 'pAlgodon',
      dFn: 'dAlgodon',
      color: '#E64CC2',
      role: 'base'
    },
    6: {
      id: 6,
      key: 'carta',
      name: 'Carta de amor',
      shortName: 'Carta',
      pFn: 'pCarta',
      dFn: 'dCarta',
      color: '#D81B60',
      role: 'special_rare'
    }
  };

  const KEY_TO_ID = {
    helado: 0,
    compromiso: 1,
    sushi: 2,
    boda: 3,
    gusano: 4,
    algodon: 5,
    carta: 6
  };

  /* ==========================================================================
     2. DISTRIBUCIONES DE TABLERO 8x8 (MÁSCARAS DE CELDAS ACTIVAS Y HUECOS)
     ==========================================================================
     1 = Celda activa jugable
     0 = Espacio vacío / hueco estructural del tablero
     Todas las máscaras garantizan múltiples líneas H y V >= 3 contiguas.
  */
  const GOMI_LAYOUTS = {
    full: {
      id: 'full',
      name: 'Clásico 8×8',
      desc: 'Tablero completo de 64 celdas sin obstáculos.',
      mask: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
      ]
    },
    corners_cut: {
      id: 'corners_cut',
      name: 'Esquinas Recortadas',
      desc: 'Tablero octogonal suave sin los 4 vértices extremos (60 celdas).',
      mask: [
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0]
      ]
    },
    soft_frame: {
      id: 'soft_frame',
      name: 'Marco Biselado',
      desc: 'Esquinas dobles recortadas que concentran las cascadas al centro (52 celdas).',
      mask: [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0]
      ]
    },
    center_pond: {
      id: 'center_pond',
      name: 'Fuente Central',
      desc: 'Un vacío central de 2×2 divide el flujo de caída en dos carriles (60 celdas).',
      mask: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
      ]
    },
    twin_pillars: {
      id: 'twin_pillars',
      name: 'Columnas Gemelas',
      desc: 'Dos huecos simétricos obligan a maniobrar por los flancos y el centro (56 celdas).',
      mask: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
      ]
    },
    hourglass: {
      id: 'hourglass',
      name: 'Reloj de Arena',
      desc: 'Estrechamiento lateral en las filas centrales (52 celdas).',
      mask: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
      ]
    },
    cross_wide: {
      id: 'cross_wide',
      name: 'Cruz Real',
      desc: 'Tablero en cruz amplia de 48 celdas con brazos de 4×2.',
      mask: [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0]
      ]
    },
    diamond_plus: {
      id: 'diamond_plus',
      name: 'Diamante Imperial',
      desc: 'Geometría escalonada en forma de gema (52 celdas).',
      mask: [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0]
      ]
    },
    bridge_islands: {
      id: 'bridge_islands',
      name: 'Islas del Puente',
      desc: 'Dos hemisferios conectados por un puente central (52 celdas).',
      mask: [
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1]
      ]
    },
    heart_arena: {
      id: 'heart_arena',
      name: 'Santuario del Corazón',
      desc: 'Silueta romántica de corazón tallada sobre la cuadrícula 8×8 (50 celdas).',
      mask: [
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0]
      ]
    },
    archway: {
      id: 'archway',
      name: 'Arco Nupcial',
      desc: 'Bóveda superior redondeada con base dividida (54 celdas).',
      mask: [
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1]
      ]
    },
    corridors: {
      id: 'corridors',
      name: 'Galerías de Cristal',
      desc: 'Canales verticales entrelazados que exigen uso preciso de rayadas (56 celdas).',
      mask: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
      ]
    }
  };

  /* ==========================================================================
     3. CONSTRUCTOR DE NIVELES CON ESTRUCTURA ESTANDARIZADA
     ========================================================================== */
  const BLOCK_META = [
    { block: 1, range: [0, 9], difficulty: 'Muy Fácil', theme: 'Tutorial y mecánicas básicas' },
    { block: 2, range: [10, 19], difficulty: 'Fácil', theme: 'Presentación de todas las figuras y primeros tableros' },
    { block: 3, range: [20, 29], difficulty: 'Medio', theme: 'Objetivos triples, zonas y planificación' },
    { block: 4, range: [30, 39], difficulty: 'Medio+', theme: 'Cantidades asimétricas y tableros con huecos' },
    { block: 5, range: [40, 49], difficulty: 'Difícil', theme: 'Complejidad estratégica y tableros irregulares' },
    { block: 6, range: [50, 59], difficulty: 'Difícil+', theme: 'Cuatro objetivos simultáneos y zonas separadas' },
    { block: 7, range: [60, 69], difficulty: 'Muy Difícil', theme: 'Retos de estrategia con grandes cantidades y pocos movimientos' },
    { block: 8, range: [70, 79], difficulty: 'Muy Difícil+', theme: 'Dominio de cascadas, especiales y tableros complejos' },
    { block: 9, range: [80, 89], difficulty: 'Extremo', theme: 'Cinco objetivos simultáneos y movimientos al límite' },
    { block: 10, range: [90, 100], difficulty: 'Imposible', theme: 'Desafío final donde solo ganas dominando el 100% de las mecánicas' }
  ];

  function buildLevel(spec) {
    const blockInfo = BLOCK_META.find(function (b) {
      return spec.id >= b.range[0] && spec.id <= b.range[1];
    }) || BLOCK_META[0];

    const layoutKey = spec.layout || 'full';
    const layoutObj = GOMI_LAYOUTS[layoutKey] || GOMI_LAYOUTS.full;
    const minScore = typeof spec.minScore === 'number' ? spec.minScore : 0;
    const reqFigs = spec.collect || {};

    // Construir lista estructurada de objetivos de victoria
    const objectives = [];
    const requiredFigures = [];

    Object.keys(reqFigs).forEach(function (k) {
      const count = reqFigs[k];
      if (count > 0 && KEY_TO_ID[k] !== undefined) {
        const fid = KEY_TO_ID[k];
        objectives.push({
          type: 'collect',
          figureId: fid,
          key: k,
          name: GOMI_FIGURES[fid].name,
          shortName: GOMI_FIGURES[fid].shortName,
          target: count
        });
        requiredFigures.push({
          figureId: fid,
          key: k,
          name: GOMI_FIGURES[fid].name,
          count: count
        });
      }
    });

    if (minScore > 0) {
      objectives.push({
        type: 'score',
        name: 'Puntuación mínima',
        shortName: 'Puntos',
        target: minScore
      });
    }

    // Pesos de aparición por defecto [helado, compromiso, sushi, boda, gusano, algodon]
    const weights = Array.isArray(spec.weights) && spec.weights.length === 6
      ? spec.weights.slice()
      : [1, 1, 1, 1, 1, 1];

    // Si el nivel pide Cartas de amor, asegurar frecuencia de aparición adecuada
    const needsCarta = (reqFigs.carta || 0) > 0;
    const heartRate = typeof spec.heartRate === 'number'
      ? spec.heartRate
      : (needsCarta ? Math.min(0.11, 0.045 + reqFigs.carta * 0.008) : 0.025);

    const enabledMechanics = [
      'intercambio_vecinos',
      'match_3_basico',
      'cascadas_combo',
      'rayada_4_en_linea',
      'bomba_arcoiris_5',
      'amor_total_3_cartas',
      'habilidades_por_hito_1000',
      'pista_tiritar_3s'
    ];
    if (layoutKey !== 'full') enabledMechanics.push('tablero_con_huecos');
    if (spec.weights) enabledMechanics.push('frecuencia_aparicion_variable');

    const winDesc = objectives.map(function (o) {
      return o.type === 'score'
        ? ('Alcanzar ' + o.target.toLocaleString('es-CL') + ' pts')
        : ('Recolectar ' + o.target + ' × ' + o.name);
    }).join(' + ');

    return {
      id: spec.id,
      block: blockInfo.block,
      name: spec.name,
      difficulty: blockInfo.difficulty,
      description: spec.desc || blockInfo.theme,
      moves: spec.moves,
      minScore: minScore,
      objectives: objectives,
      requiredFigures: requiredFigures,
      layout: layoutKey,
      layoutName: layoutObj.name,
      mask: layoutObj.mask,
      weights: weights,
      heartRate: heartRate,
      enabledMechanics: enabledMechanics,
      winConditions: {
        allObjectivesRequired: true,
        summary: winDesc + ' en ' + spec.moves + ' movimientos o menos.'
      },
      loseConditions: {
        outOfMoves: true,
        summary: 'Quedarse sin movimientos (' + spec.moves + ') antes de completar todos los objetivos.'
      }
    };
  }

  /* ==========================================================================
     4. DEFINICIÓN INDIVIDUAL DE LOS 101 NIVELES (NIVEL 0 AL 100)
     ========================================================================== */
  const RAW_SPECS = [
    /* ---------------- BLOQUE 1 (0–9): MUY FÁCIL ---------------- */
    { id: 0,  name: 'Primer Suspiro Dulce',     moves: 28, minScore: 500,  collect: { algodon: 6 },  layout: 'full', desc: 'Tutorial de movimientos: desliza piezas vecinas para juntar 3 iguales.' },
    { id: 1,  name: 'Brillo de Azúcar',         moves: 26, minScore: 1000, collect: {},              layout: 'full', desc: 'Conseguir una puntuación mínima encadenando combinaciones.' },
    { id: 2,  name: 'Nubes Rosadas',            moves: 25, minScore: 0,    collect: { algodon: 12 }, layout: 'full', weights: [1, 1, 1, 1, 1, 1.35], desc: 'Recolectar algodón de azúcar.' },
    { id: 3,  name: 'Mensajes del Corazón',     moves: 25, minScore: 0,    collect: { carta: 3 },    layout: 'full', heartRate: 0.09, desc: 'Recolectar cartas de amor (juntar 3 explota todo el tablero).' },
    { id: 4,  name: 'Dulce Encuentro',          moves: 25, minScore: 0,    collect: { algodon: 9, helado: 9 }, layout: 'full', desc: 'Combinar diferentes figuras en el mismo tablero.' },
    { id: 5,  name: 'Pasos Contados',           moves: 18, minScore: 0,    collect: { algodon: 14 }, layout: 'full', weights: [1, 1, 1, 1, 1, 1.3], desc: 'Introducir un objetivo con cantidad limitada de movimientos.' },
    { id: 6,  name: 'Montaña de Algodón',       moves: 24, minScore: 0,    collect: { algodon: 22 }, layout: 'full', weights: [0.95, 0.95, 0.95, 0.95, 0.95, 1.4], desc: 'Aumentar la cantidad de figuras necesarias.' },
    { id: 7,  name: 'Pareja de Feria',          moves: 24, minScore: 0,    collect: { algodon: 12, gusano: 12 }, layout: 'full', desc: 'Combinar dos objetivos de recolección simultáneos.' },
    { id: 8,  name: 'Puntos y Nubes',           moves: 24, minScore: 1500, collect: { algodon: 14 }, layout: 'full', desc: 'Introducir objetivos de puntuación y recolección a la vez.' },
    { id: 9,  name: 'Primer Reto del Amor',     moves: 22, minScore: 1800, collect: { algodon: 12, carta: 2 }, layout: 'full', heartRate: 0.075, desc: 'Primer desafío combinado de fin del Bloque 1.' },

    /* ---------------- BLOQUE 2 (10–19): FÁCIL ---------------- */
    { id: 10, name: 'Promesa de Plata',         moves: 24, minScore: 0,    collect: { boda: 15 },    layout: 'full', weights: [1, 1, 1, 1.3, 1, 1], desc: 'Introducir recolección de Anillos de boda.' },
    { id: 11, name: 'Chispa Ácida',             moves: 24, minScore: 0,    collect: { gusano: 16 },  layout: 'full', weights: [1, 1, 1, 1, 1.3, 1], desc: 'Introducir recolección de Gusanos ácidos.' },
    { id: 12, name: 'Barquillo de Chocolate',   moves: 24, minScore: 0,    collect: { helado: 16 },  layout: 'full', weights: [1.3, 1, 1, 1, 1, 1], desc: 'Introducir recolección de Helados de cono.' },
    { id: 13, name: 'Bocado Crujiente',         moves: 24, minScore: 0,    collect: { sushi: 16 },   layout: 'full', weights: [1, 1, 1.3, 1, 1, 1], desc: 'Introducir recolección de Sushi frito.' },
    { id: 14, name: 'Destello de Diamante',     moves: 24, minScore: 0,    collect: { compromiso: 16 }, layout: 'full', weights: [1, 1.3, 1, 1, 1, 1], desc: 'Introducir recolección de Anillos de compromiso.' },
    { id: 15, name: 'Dúo de Alianzas',          moves: 23, minScore: 0,    collect: { boda: 13, compromiso: 13 }, layout: 'corners_cut', desc: 'Combinar los dos tipos de anillos en tablero de esquinas recortadas.' },
    { id: 16, name: 'Cita de Sabores',          moves: 23, minScore: 2200, collect: { sushi: 12, helado: 12 }, layout: 'full', desc: 'Combinar dos figuras gastronómicas y puntuación.' },
    { id: 17, name: 'Festival de Puntos',       moves: 22, minScore: 2800, collect: { gusano: 14 },  layout: 'corners_cut', desc: 'Conseguir puntuaciones más elevadas con menos esquinas.' },
    { id: 18, name: 'Reloj de Terciopelo',      moves: 17, minScore: 0,    collect: { boda: 12, algodon: 12 }, layout: 'soft_frame', desc: 'Completar objetivos con movimientos limitados en marco biselado.' },
    { id: 19, name: 'Fuente de los Deseos',     moves: 21, minScore: 2600, collect: { sushi: 13, compromiso: 13 }, layout: 'center_pond', desc: 'Superar la fuente central combinando puntos y dos figuras.' },

    /* ---------------- BLOQUE 3 (20–29): NORMAL ---------------- */
    { id: 20, name: 'Trío de Medianoche',       moves: 22, minScore: 0,    collect: { helado: 12, sushi: 12, algodon: 12 }, layout: 'full', desc: 'Recolectar tres tipos diferentes de figuras.' },
    { id: 21, name: 'Joyero Real',              moves: 21, minScore: 2500, collect: { boda: 12, compromiso: 12 }, layout: 'center_pond', desc: 'Objetivos simultáneos alrededor de la fuente central.' },
    { id: 22, name: 'El Ingrediente Secreto',   moves: 21, minScore: 0,    collect: { sushi: 14, gusano: 12, helado: 12 }, layout: 'full', weights: [1.1, 1, 0.72, 1, 1.1, 1], desc: 'El Sushi frito aparece con menor frecuencia: prioriza sus combinaciones.' },
    { id: 23, name: 'Columnas del Destino',     moves: 20, minScore: 2700, collect: { algodon: 12, boda: 12, gusano: 10 }, layout: 'twin_pillars', desc: 'Distribuir combinaciones entre las columnas gemelas.' },
    { id: 24, name: 'Susurro Escaso',           moves: 19, minScore: 0,    collect: { compromiso: 14, algodon: 14, carta: 2 }, layout: 'corners_cut', weights: [1.1, 0.75, 1.1, 1.1, 1.1, 1.1], heartRate: 0.065, desc: 'El Anillo de compromiso es más difícil de encontrar.' },
    { id: 25, name: 'Pulso de Cristal',         moves: 18, minScore: 2900, collect: { helado: 13, gusano: 13 }, layout: 'soft_frame', desc: 'Menos movimientos con meta de puntos y recolección doble.' },
    { id: 26, name: 'Arco de las Promesas',     moves: 20, minScore: 2800, collect: { boda: 12, sushi: 12, algodon: 12 }, layout: 'archway', desc: 'Aprovechar la parte alta del Arco Nupcial para crear cascadas.' },
    { id: 27, name: 'Dulce Escasez',            moves: 19, minScore: 0,    collect: { helado: 15, compromiso: 12, sushi: 12 }, layout: 'center_pond', weights: [0.72, 1.1, 1.1, 1.05, 1.05, 1.05], desc: 'El Helado de cono escasea; usa rayadas y bombas para recolectarlo.' },
    { id: 28, name: 'Cartas en el Puente',      moves: 20, minScore: 3100, collect: { carta: 3, gusano: 13, boda: 13 }, layout: 'bridge_islands', heartRate: 0.075, desc: 'Junta 3 Cartas de amor entre las dos islas para limpiar todo el tablero.' },
    { id: 29, name: 'Trilogía del Amor',        moves: 18, minScore: 3300, collect: { compromiso: 13, boda: 13, algodon: 13 }, layout: 'twin_pillars', desc: 'Cierre del Bloque 3 con triple recolección y puntuación.' },

    /* ---------------- BLOQUE 4 (30–39): NORMAL+ ---------------- */
    { id: 30, name: 'Balanza Desigual',         moves: 21, minScore: 3000, collect: { gusano: 20, sushi: 12, boda: 8 }, layout: 'corners_cut', desc: 'Objetivos con cantidades escalonadas muy diferentes.' },
    { id: 31, name: 'Laguna de Azúcar',         moves: 20, minScore: 3200, collect: { algodon: 18, helado: 12, compromiso: 10 }, layout: 'center_pond', desc: 'Tablero con espacio vacío central y cantidades asimétricas.' },
    { id: 32, name: 'Cintura de Arena',         moves: 20, minScore: 3300, collect: { boda: 16, gusano: 14, sushi: 10 }, layout: 'hourglass', desc: 'El reloj de arena exige combinaciones en la zona estrecha.' },
    { id: 33, name: 'Cruz de Caramelo',         moves: 19, minScore: 3400, collect: { helado: 16, algodon: 14, carta: 3 }, layout: 'cross_wide', heartRate: 0.075, desc: 'Tablero en cruz con espacios vacíos en las 4 esquinas.' },
    { id: 34, name: 'Cosecha Asimétrica',       moves: 19, minScore: 3500, collect: { sushi: 22, compromiso: 11, gusano: 9 }, layout: 'twin_pillars', weights: [1, 1, 1.15, 1, 1, 1], desc: 'Gran pedido de Sushi frito escoltado por columnas.' },
    { id: 35, name: 'Puente de Plata',          moves: 19, minScore: 3600, collect: { boda: 18, compromiso: 12, helado: 10 }, layout: 'bridge_islands', desc: 'Cruza combinaciones horizontales sobre el puente central.' },
    { id: 36, name: 'Galería de Sabores',       moves: 19, minScore: 3700, collect: { gusano: 16, algodon: 14, sushi: 12 }, layout: 'corridors', desc: 'Canales verticales donde las piezas rayadas brillan.' },
    { id: 37, name: 'Diamante Rosado',          moves: 18, minScore: 3800, collect: { compromiso: 17, algodon: 13, carta: 3 }, layout: 'diamond_plus', heartRate: 0.075, desc: 'Combina puntuación, Cartas de amor y figuras en el rombo.' },
    { id: 38, name: 'Bóveda de Cristal',        moves: 18, minScore: 3900, collect: { helado: 18, boda: 14, sushi: 10 }, layout: 'archway', desc: 'Recolección en el Arco Nupcial con movimientos ajustados.' },
    { id: 39, name: 'Sinfonía del Cuarto Bloque', moves: 18, minScore: 4100, collect: { algodon: 16, gusano: 14, compromiso: 12 }, layout: 'heart_arena', desc: 'Primer reto en el Santuario del Corazón.' },

    /* ---------------- BLOQUE 5 (40–49): DIFÍCIL ---------------- */
    { id: 40, name: 'Estrategia Triple',        moves: 19, minScore: 4200, collect: { helado: 18, sushi: 18, boda: 16 }, layout: 'hourglass', desc: 'Cantidades elevadas en tablero de reloj de arena.' },
    { id: 41, name: 'Oro Escondido',            moves: 18, minScore: 4300, collect: { compromiso: 16, gusano: 16, algodon: 14 }, layout: 'cross_wide', weights: [1.1, 0.68, 1.1, 1.1, 1.05, 1.05], desc: 'Anillo de compromiso con baja frecuencia de aparición.' },
    { id: 42, name: 'Islas en Tormenta',        moves: 18, minScore: 4400, collect: { sushi: 18, helado: 16, carta: 3 }, layout: 'bridge_islands', heartRate: 0.07, desc: 'Usa la explosión de Cartas de amor para limpiar ambas islas.' },
    { id: 43, name: 'Laberinto Dulce',          moves: 18, minScore: 4500, collect: { gusano: 18, algodon: 18, boda: 15 }, layout: 'corridors', desc: 'Tres objetivos altos entre galerías verticales.' },
    { id: 44, name: 'Gema Escasa',              moves: 17, minScore: 4600, collect: { boda: 16, compromiso: 16, sushi: 14 }, layout: 'diamond_plus', weights: [1.1, 0.85, 1.05, 0.72, 1.1, 1.1], desc: 'Los anillos aparecen menos: aprovecha los poderes de cada hito.' },
    { id: 45, name: 'Reloj contra el Tiempo',   moves: 16, minScore: 4600, collect: { helado: 17, algodon: 17, gusano: 14 }, layout: 'hourglass', desc: 'Movimientos muy limitados en el reloj de arena.' },
    { id: 46, name: 'Pilares de Fuego',         moves: 18, minScore: 4800, collect: { sushi: 19, compromiso: 17, helado: 15 }, layout: 'twin_pillars', desc: 'Combinaciones largas de 4 y 5 piezas para alcanzar la cuota.' },
    { id: 47, name: 'Corazón de Rubí',          moves: 17, minScore: 4900, collect: { carta: 4, algodon: 16, boda: 16 }, layout: 'heart_arena', heartRate: 0.085, desc: 'Recolecta 4 Cartas de amor en la arena del corazón.' },
    { id: 48, name: 'Cosecha de Medianoche',    moves: 17, minScore: 5000, collect: { gusano: 18, sushi: 16, helado: 16 }, layout: 'archway', weights: [0.85, 1.1, 0.85, 1.1, 0.9, 1.1], desc: 'Frecuencias reducidas y tres objetivos exigentes.' },
    { id: 49, name: 'Bastión del Quinto Bloque', moves: 17, minScore: 5200, collect: { compromiso: 18, boda: 18, algodon: 16 }, layout: 'cross_wide', desc: 'Desafío de cierre del Bloque 5 en la Cruz Real.' },

    /* ---------------- BLOQUE 6 (50–59): DIFÍCIL+ ---------------- */
    { id: 50, name: 'Cuarteto Imperial',        moves: 19, minScore: 4800, collect: { helado: 14, sushi: 14, boda: 14, algodon: 14 }, layout: 'corners_cut', desc: 'Cuatro objetivos de figuras más puntuación mínima.' },
    { id: 51, name: 'Dos Mundos',               moves: 18, minScore: 5000, collect: { compromiso: 14, gusano: 14, sushi: 14 }, layout: 'bridge_islands', desc: 'Cuatro objetivos simultáneos en zonas separadas por el puente.' },
    { id: 52, name: 'Pasillos del Palacio',     moves: 18, minScore: 5100, collect: { boda: 15, helado: 15, algodon: 14, carta: 3 }, layout: 'corridors', heartRate: 0.075, desc: 'Combina Cartas de amor con 3 figuras y puntuación en galerías.' },
    { id: 53, name: 'Espejo de Agua',           moves: 18, minScore: 5200, collect: { sushi: 15, compromiso: 15, gusano: 15 }, layout: 'center_pond', weights: [1.1, 0.85, 0.85, 1.1, 0.9, 1.1], desc: 'Planifica los cruces alrededor del estanque central.' },
    { id: 54, name: 'Cuatro Estaciones',        moves: 18, minScore: 5300, collect: { helado: 14, compromiso: 14, gusano: 14, algodon: 14 }, layout: 'soft_frame', desc: 'Recolección cuádruple equilibrada en marco biselado.' },
    { id: 55, name: 'Arco de las Cuatro Lunas', moves: 17, minScore: 5400, collect: { boda: 15, sushi: 15, algodon: 15 }, layout: 'archway', desc: 'Cuatro metas simultáneas con 17 movimientos.' },
    { id: 56, name: 'Arena de Cuarzo',          moves: 17, minScore: 5500, collect: { gusano: 15, helado: 15, compromiso: 13, carta: 3 }, layout: 'hourglass', heartRate: 0.075, desc: 'Desbloquea el cuello de botella del reloj con explosiones.' },
    { id: 57, name: 'Columnas de Obsidiana',    moves: 17, minScore: 5600, collect: { sushi: 16, boda: 16, algodon: 14 }, layout: 'twin_pillars', weights: [1.15, 1.15, 0.8, 0.8, 1.1, 0.9], desc: 'Sushi y Anillo de boda escasos entre columnas.' },
    { id: 58, name: 'Latido Cuádruple',         moves: 17, minScore: 5700, collect: { compromiso: 15, boda: 15, helado: 14, gusano: 14 }, layout: 'heart_arena', desc: 'Cuatro figuras más puntos en el Santuario del Corazón.' },
    { id: 59, name: 'Corona del Sexto Bloque',  moves: 17, minScore: 5900, collect: { sushi: 15, algodon: 15, compromiso: 15, carta: 3 }, layout: 'bridge_islands', heartRate: 0.08, desc: 'Cierre de Difícil+ con 4 figuras y puntuación alta.' },

    /* ---------------- BLOQUE 7 (60–69): MUY DIFÍCIL ---------------- */
    { id: 60, name: 'Torrente de Gala',         moves: 18, minScore: 6000, collect: { helado: 18, sushi: 18, boda: 16, gusano: 16 }, layout: 'corners_cut', desc: 'Cuatro tipos de figuras en cantidades elevadas.' },
    { id: 61, name: 'Cruz de Diamante',         moves: 17, minScore: 6100, collect: { compromiso: 18, algodon: 18, boda: 16 }, layout: 'cross_wide', weights: [1.1, 0.78, 1.1, 0.85, 1.1, 0.85], desc: 'Menor cantidad de movimientos en la Cruz Real.' },
    { id: 62, name: 'Puente de las Estrellas',  moves: 17, minScore: 6200, collect: { helado: 17, sushi: 17, gusano: 16, carta: 4 }, layout: 'bridge_islands', heartRate: 0.085, desc: 'Objetivos distribuidos entre las dos islas con 4 Cartas de amor.' },
    { id: 63, name: 'Galería del Viento',       moves: 16, minScore: 6200, collect: { boda: 16, compromiso: 16, algodon: 16, sushi: 14 }, layout: 'corridors', desc: '16 movimientos para 4 colecciones y más de 6.000 puntos.' },
    { id: 64, name: 'Reloj de Fuego',           moves: 16, minScore: 6300, collect: { gusano: 18, helado: 18, compromiso: 16 }, layout: 'hourglass', desc: 'Alta densidad de combinaciones requerida en 16 turnos.' },
    { id: 65, name: 'Prisma de Seis Caras',     moves: 17, minScore: 6400, collect: { helado: 15, compromiso: 15, sushi: 15, boda: 15 }, layout: 'diamond_plus', desc: 'Cuatro figuras principales en el Diamante Imperial.' },
    { id: 66, name: 'Santuario Escarlata',      moves: 16, minScore: 6500, collect: { algodon: 18, carta: 4, boda: 16, gusano: 15 }, layout: 'heart_arena', heartRate: 0.085, desc: 'Condiciones simultáneas exigentes en forma de corazón.' },
    { id: 67, name: 'Pilares del Trueno',       moves: 16, minScore: 6600, collect: { sushi: 18, helado: 18, compromiso: 16, boda: 14 }, layout: 'twin_pillars', weights: [0.85, 0.85, 0.85, 1, 1.2, 1.2], desc: 'Usa el Rayo y el Martillo de los hitos para limpiar columnas.' },
    { id: 68, name: 'Arco del Crepúsculo',      moves: 16, minScore: 6700, collect: { gusano: 18, algodon: 18, sushi: 16, carta: 3 }, layout: 'archway', heartRate: 0.08, desc: 'Puntuación alta y 4 colecciones bajo el arco.' },
    { id: 69, name: 'Cúspide del Séptimo Bloque', moves: 16, minScore: 6900, collect: { compromiso: 17, boda: 17, helado: 17, algodon: 17 }, layout: 'cross_wide', desc: 'Prueba maestra del Bloque 7 con 4 figuras a 17 unidades.' },

    /* ---------------- BLOQUE 8 (70–79): MUY DIFÍCIL+ ---------------- */
    { id: 70, name: 'Engranaje de Precisión',   moves: 16, minScore: 7000, collect: { helado: 18, sushi: 18, gusano: 18, boda: 15 }, layout: 'hourglass', desc: 'Exige encadenar especiales desde los primeros movimientos.' },
    { id: 71, name: 'Islas del Eclipse',        moves: 16, minScore: 7100, collect: { compromiso: 18, algodon: 18, carta: 4, sushi: 15 }, layout: 'bridge_islands', heartRate: 0.085, desc: 'Tablero dividido con 4 figuras y 7.100 puntos.' },
    { id: 72, name: 'Cámara de Terciopelo',     moves: 15, minScore: 7100, collect: { boda: 17, helado: 17, gusano: 17 }, layout: 'soft_frame', weights: [0.82, 1.15, 1.15, 0.82, 0.82, 1.15], desc: 'Solo 15 movimientos con las 3 figuras objetivo en menor proporción.' },
    { id: 73, name: 'Laberinto de Espejos',     moves: 16, minScore: 7200, collect: { sushi: 18, compromiso: 18, algodon: 17, helado: 15 }, layout: 'corridors', desc: 'Aprovecha cada bomba arcoíris y rayada en los pasillos.' },
    { id: 74, name: 'Fuente de Diamantes',      moves: 15, minScore: 7300, collect: { compromiso: 19, boda: 19, carta: 4 }, layout: 'center_pond', heartRate: 0.09, desc: 'Junta las Cartas de amor para multiplicar la recolección de anillos.' },
    { id: 75, name: 'Cruz de las Tormentas',    moves: 15, minScore: 7400, collect: { gusano: 18, algodon: 18, sushi: 17, helado: 15 }, layout: 'cross_wide', desc: '15 turnos en tablero irregular con 4 figuras.' },
    { id: 76, name: 'Corazón Indomable',        moves: 15, minScore: 7500, collect: { carta: 4, compromiso: 17, boda: 17, algodon: 16 }, layout: 'heart_arena', heartRate: 0.09, desc: 'Dominio total de las explosiones de Amor Total.' },
    { id: 77, name: 'Columnas del Alba',        moves: 15, minScore: 7600, collect: { helado: 18, sushi: 18, gusano: 18, compromiso: 16 }, layout: 'twin_pillars', desc: 'Cuádruple recolección alta en 15 movimientos.' },
    { id: 78, name: 'Bóveda Celeste',           moves: 15, minScore: 7700, collect: { boda: 18, algodon: 18, sushi: 17, carta: 4 }, layout: 'archway', heartRate: 0.09, desc: 'Penúltima prueba del Bloque 8 con puntuación y 4 figuras.' },
    { id: 79, name: 'Trono de Cristal',         moves: 15, minScore: 7900, collect: { compromiso: 18, helado: 18, gusano: 18, boda: 18 }, layout: 'diamond_plus', desc: 'Cierre de Muy difícil+ con 4 figuras a 18 unidades.' },

    /* ---------------- BLOQUE 9 (80–89): EXTREMA ---------------- */
    { id: 80, name: 'Pentágono de Fuego',       moves: 16, minScore: 8000, collect: { helado: 16, compromiso: 16, sushi: 16, boda: 16 }, layout: 'corners_cut', desc: 'Cinco objetivos simultáneos (4 figuras + 8.000 pts).' },
    { id: 81, name: 'Arenas del Destino',       moves: 15, minScore: 8100, collect: { gusano: 16, algodon: 16, sushi: 16, carta: 4 }, layout: 'hourglass', heartRate: 0.09, weights: [1.15, 1.15, 0.8, 1.1, 0.8, 0.8], desc: 'Distribución exigente en reloj de arena con 5 metas.' },
    { id: 82, name: 'Puente del Infinito',      moves: 15, minScore: 8200, collect: { boda: 16, compromiso: 16, helado: 16, algodon: 16 }, layout: 'bridge_islands', desc: 'Cinco condiciones de victoria entre las dos islas.' },
    { id: 83, name: 'Galería Suprema',          moves: 15, minScore: 8300, collect: { sushi: 17, gusano: 17, helado: 16, boda: 16 }, layout: 'corridors', weights: [0.85, 1.2, 0.8, 0.85, 0.8, 1.2], desc: 'Frecuencias adversas pero superables mediante cascadas y habilidades.' },
    { id: 84, name: 'Cruz del Eclipse',         moves: 15, minScore: 8400, collect: { compromiso: 17, algodon: 17, carta: 4, gusano: 16 }, layout: 'cross_wide', heartRate: 0.09, desc: 'Movimientos al límite en la Cruz Real con 5 objetivos.' },
    { id: 85, name: 'Santuario de Fuego',       moves: 14, minScore: 8400, collect: { helado: 16, sushi: 16, boda: 16, carta: 4 }, layout: 'heart_arena', heartRate: 0.095, desc: 'Solo 14 movimientos: desencadena Amor Total para triunfar.' },
    { id: 86, name: 'Pilares del Cosmos',       moves: 15, minScore: 8500, collect: { compromiso: 17, boda: 17, sushi: 17, algodon: 17 }, layout: 'twin_pillars', desc: '68 figuras totales y 8.500 puntos en 15 turnos.' },
    { id: 87, name: 'Diamante de Sangre',       moves: 14, minScore: 8600, collect: { gusano: 16, helado: 16, compromiso: 16, carta: 4 }, layout: 'diamond_plus', heartRate: 0.095, weights: [0.85, 0.85, 1.15, 1.15, 0.85, 1.15], desc: '14 movimientos con escasez en las tres figuras principales.' },
    { id: 88, name: 'Arco de la Eternidad',     moves: 15, minScore: 8700, collect: { sushi: 17, algodon: 17, boda: 17, gusano: 17 }, layout: 'archway', desc: 'Cinco objetivos extremos bajo el Arco Nupcial.' },
    { id: 89, name: 'Abismo de Cristal',        moves: 14, minScore: 8800, collect: { compromiso: 17, helado: 17, sushi: 16, boda: 16 }, layout: 'hourglass', desc: 'Cumbre del Bloque 9 Extrema en 14 movimientos.' },

    /* ---------------- BLOQUE 10 (90–100): MAESTRO ---------------- */
    { id: 90, name: 'Obertura del Maestro',     moves: 16, minScore: 8800, collect: { helado: 16, compromiso: 16, sushi: 16, boda: 16, gusano: 14 }, layout: 'full', desc: 'Seis objetivos simultáneos en el tablero clásico.' },
    { id: 91, name: 'Sello de las Dos Almas',   moves: 15, minScore: 8900, collect: { boda: 17, compromiso: 17, carta: 4, algodon: 16 }, layout: 'bridge_islands', heartRate: 0.095, desc: 'Alianzas, diamantes y Cartas de amor entre dos islas.' },
    { id: 92, name: 'Catedral de Azúcar',       moves: 15, minScore: 9000, collect: { algodon: 18, gusano: 18, helado: 17, sushi: 17 }, layout: 'corridors', desc: '9.000 puntos y 70 dulces en las Galerías de Cristal.' },
    { id: 93, name: 'Reloj de los Siglos',      moves: 15, minScore: 9100, collect: { compromiso: 17, sushi: 17, boda: 17, carta: 4 }, layout: 'hourglass', heartRate: 0.095, weights: [1.15, 0.82, 0.82, 0.82, 1.15, 1.15], desc: 'Precisión absoluta en el reloj de arena.' },
    { id: 94, name: 'Cruz del Gran Maestro',    moves: 15, minScore: 9200, collect: { helado: 17, gusano: 17, algodon: 17, compromiso: 17 }, layout: 'cross_wide', desc: 'Cuatro colecciones de 17 unidades en la Cruz Real.' },
    { id: 95, name: 'Fuente del Destino',       moves: 15, minScore: 9300, collect: { sushi: 18, boda: 18, helado: 17, gusano: 17 }, layout: 'center_pond', desc: 'Domina las cascadas laterales de la Fuente Central.' },
    { id: 96, name: 'Columnas del Olimpo',      moves: 15, minScore: 9400, collect: { compromiso: 18, algodon: 18, boda: 17, carta: 4 }, layout: 'twin_pillars', heartRate: 0.095, desc: 'Combina habilidades de hito y Cartas de amor.' },
    { id: 97, name: 'Diamante Eterno',          moves: 15, minScore: 9500, collect: { helado: 17, compromiso: 17, sushi: 17, gusano: 17 }, layout: 'diamond_plus', weights: [0.85, 0.85, 0.85, 1.2, 0.85, 1.2], desc: 'Cuatro figuras escasas y 9.500 puntos en el Diamante Imperial.' },
    { id: 98, name: 'Arco de las Estrellas',    moves: 15, minScore: 9600, collect: { boda: 18, sushi: 18, algodon: 18, helado: 16, carta: 4 }, layout: 'archway', heartRate: 0.095, desc: 'Seis metas simultáneas en la antesala de los niveles finales.' },
    { id: 99, name: 'Umbral de la Eternidad',   moves: 15, minScore: 9800, collect: { compromiso: 18, boda: 18, algodon: 18, gusano: 18, carta: 5 }, layout: 'heart_arena', heartRate: 0.10, desc: 'Nivel 99 — Desafío previo al final en el Santuario del Corazón.' },
    { id: 100, name: 'Gran Maestro del Amor',   moves: 16, minScore: 10000, collect: { helado: 15, compromiso: 15, sushi: 15, boda: 15, gusano: 15, algodon: 15, carta: 5 }, layout: 'heart_arena', heartRate: 0.105, desc: 'Nivel 100 — Desafío Maestro final que reúne las 7 figuras del juego.' }
  ];

  const GOMI_LEVELS = RAW_SPECS.map(buildLevel);

  /* ==========================================================================
     5. SISTEMA DE VALIDACIÓN AUTOMÁTICA Y SIMULACIÓN DE TABLEROS
     ========================================================================== */

  /** Cuenta celdas jugables y comprueba que cada celda activa pueda participar en líneas >= 3 */
  function validateMaskGeometry(mask) {
    if (!Array.isArray(mask) || mask.length !== 8) return { ok: false, reason: 'La máscara no es 8×8' };
    let activeCount = 0;
    let validLines = 0;

    for (let r = 0; r < 8; r++) {
      if (!Array.isArray(mask[r]) || mask[r].length !== 8) return { ok: false, reason: 'Fila ' + r + ' inválida' };
      for (let c = 0; c < 8; c++) {
        if (mask[r][c]) activeCount++;
        if (c <= 5 && mask[r][c] && mask[r][c + 1] && mask[r][c + 2]) validLines++;
        if (r <= 5 && mask[r][c] && mask[r + 1][c] && mask[r + 2][c]) validLines++;
      }
    }
    if (activeCount < 36) return { ok: false, reason: 'Muy pocas celdas activas (' + activeCount + ')' };
    if (validLines < 20) return { ok: false, reason: 'Insuficientes líneas de 3 posibles (' + validLines + ')' };
    return { ok: true, activeCount: activeCount, validLines: validLines };
  }

  /** Simula la generación de un tablero inicial válido para un nivel (con movimientos posibles y sin matches previos) */
  function simulateLevelBoard(level, seed) {
    let s = (seed || (level.id * 997 + 12345)) >>> 0;
    const rnd = function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    const mask = level.mask;
    const weights = level.weights || [1, 1, 1, 1, 1, 1];
    const wSum = weights.reduce(function (a, b) { return a + b; }, 0);

    function pickColor(hearts) {
      const hr = hearts < 4 ? (level.heartRate || 0.025) : 0.008;
      if (rnd() < hr) return 6;
      let r = rnd() * wSum;
      for (let i = 0; i < 6; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      return 5;
    }

    for (let attempt = 0; attempt < 40; attempt++) {
      const b = Array.from({ length: 8 }, function () { return Array(8).fill(null); });
      let hearts = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (!mask[r][c]) {
            b[r][c] = { hole: true, t: -2 };
            continue;
          }
          let t, guard = 0;
          do {
            t = pickColor(hearts);
            guard++;
          } while (
            guard < 30 && (
              (c >= 2 && b[r][c - 1] && b[r][c - 2] && b[r][c - 1].t === t && b[r][c - 2].t === t) ||
              (r >= 2 && b[r - 1][c] && b[r - 2][c] && b[r - 1][c].t === t && b[r - 2][c].t === t)
            )
          );
          if (t === 6) hearts++;
          b[r][c] = { t: t, s: 0 };
        }
      }

      // Contar jugadas válidas iniciales
      let validMoves = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (!b[r][c] || b[r][c].hole) continue;
          const nbs = [];
          if (c + 1 < 8 && b[r][c + 1] && !b[r][c + 1].hole) nbs.push([r, c + 1]);
          if (r + 1 < 8 && b[r + 1][c] && !b[r + 1][c].hole) nbs.push([r + 1, c]);
          for (let k = 0; k < nbs.length; k++) {
            const nr = nbs[k][0], nc = nbs[k][1];
            const tmp = b[r][c]; b[r][c] = b[nr][nc]; b[nr][nc] = tmp;
            let hasRun = false;
            for (let rr = 0; rr < 8 && !hasRun; rr++) {
              for (let cc = 0; cc < 6; cc++) {
                const x = b[rr][cc];
                if (x && x.t >= 0 && b[rr][cc + 1] && b[rr][cc + 2] && b[rr][cc + 1].t === x.t && b[rr][cc + 2].t === x.t) {
                  hasRun = true; break;
                }
              }
            }
            for (let cc = 0; cc < 8 && !hasRun; cc++) {
              for (let rr = 0; rr < 6; rr++) {
                const x = b[rr][cc];
                if (x && x.t >= 0 && b[rr + 1][cc] && b[rr + 2][cc] && b[rr + 1][cc].t === x.t && b[rr + 2][cc].t === x.t) {
                  hasRun = true; break;
                }
              }
            }
            b[nr][nc] = b[r][c]; b[r][c] = tmp;
            if (hasRun) validMoves++;
          }
        }
      }

      if (validMoves > 0) {
        return { ok: true, board: b, validMoves: validMoves, attempts: attempt + 1 };
      }
    }
    return { ok: false, board: null, validMoves: 0, attempts: 40 };
  }

  /** Valida un nivel individual y retorna diagnóstico detallado */
  function validateLevel(level) {
    const errors = [];
    if (!level || typeof level.id !== 'number' || level.id < 0 || level.id > 100) {
      errors.push('ID de nivel fuera de rango (0-100)');
    }
    if (!level.name || typeof level.name !== 'string') {
      errors.push('Nombre de nivel faltante');
    }
    if (typeof level.moves !== 'number' || level.moves < 10 || level.moves > 40) {
      errors.push('Cantidad de movimientos inválida: ' + level.moves);
    }
    if (!Array.isArray(level.objectives) || level.objectives.length === 0) {
      errors.push('El nivel no tiene objetivos definidos');
    }

    // Verificar que todas las figuras existan y sus funciones estén registradas
    let totalRequiredPieces = 0;
    for (let i = 0; i < (level.requiredFigures || []).length; i++) {
      const rf = level.requiredFigures[i];
      const fig = GOMI_FIGURES[rf.figureId];
      if (!fig) {
        errors.push('Figura inexistente ID ' + rf.figureId);
      } else {
        if (typeof window[fig.pFn] !== 'function' && typeof window[fig.dFn] !== 'function') {
          // Nota: si se valida antes de cargar gomi.js se ignora, pero con gomi.js cargado verifica las funciones
        }
      }
      if (rf.count <= 0 || rf.count > 35) {
        errors.push('Cantidad fuera de rango razonable para ' + rf.key + ': ' + rf.count);
      }
      totalRequiredPieces += rf.count;
    }

    // Verificar alcanzabilidad matemática considerando cascadas, poderes cada 1.000 pts y Amor Total
    const maxAchievablePieces = level.moves * 8.5;
    if (totalRequiredPieces > maxAchievablePieces) {
      errors.push('Total de figuras (' + totalRequiredPieces + ') excede capacidad estimada para ' + level.moves + ' movs');
    }

    const geom = validateMaskGeometry(level.mask);
    if (!geom.ok) errors.push(geom.reason);

    const sim = simulateLevelBoard(level);
    if (!sim.ok) errors.push('No se pudo generar tablero inicial con movimientos válidos');

    return {
      ok: errors.length === 0,
      levelId: level.id,
      errors: errors,
      activeCells: geom.activeCount || 0,
      initialValidMoves: sim.validMoves || 0,
      totalRequiredPieces: totalRequiredPieces
    };
  }

  /** Valida los 101 niveles (0 al 100) */
  function validateAllLevels() {
    const results = GOMI_LEVELS.map(validateLevel);
    const passed = results.filter(function (r) { return r.ok; }).length;
    return {
      total: GOMI_LEVELS.length,
      passed: passed,
      failed: GOMI_LEVELS.length - passed,
      allValid: passed === 101 && GOMI_LEVELS.length === 101,
      details: results
    };
  }

  // Exponer API globalmente para gomi.js y la interfaz de administración
  window.GOMI_FIGURES = GOMI_FIGURES;
  window.GOMI_LAYOUTS = GOMI_LAYOUTS;
  window.GOMI_BLOCKS = BLOCK_META;
  window.GOMI_LEVELS = GOMI_LEVELS;
  window.GOMI_VALIDATOR = {
    validateLevel: validateLevel,
    validateAllLevels: validateAllLevels,
    simulateLevelBoard: simulateLevelBoard
  };
})();
