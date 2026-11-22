import React, { useState, useEffect, useRef } from 'react';
import { ARCADE_ICONS_RAW, ARCADE_SCENES } from './gameIcons';
import './arcadeCards.css';

// Escenas animadas precomputadas para las tarjetas de récords del perfil
const RECORD_GAME_SCENES = {
  gominola: (ARCADE_SCENES.gominola ? ARCADE_SCENES.gominola() : '') + `<div class="fg">${ARCADE_ICONS_RAW.gominola || ''}</div>`,
  tetris: (ARCADE_SCENES.tetris ? ARCADE_SCENES.tetris() : '') + `<div class="fg">${ARCADE_ICONS_RAW.tetris || ''}</div>`,
  sudoku: (ARCADE_SCENES.sudoku ? ARCADE_SCENES.sudoku() : '') + `<div class="fg">${ARCADE_ICONS_RAW.sudoku || ''}</div>`,
  puzzle: (ARCADE_SCENES.puzzle ? ARCADE_SCENES.puzzle() : '') + `<div class="fg">${ARCADE_ICONS_RAW.puzzle || ''}</div>`,
};

export const LEAGUES = [
  { id: 0, key: 'rk0', name: 'Aficionados', minLp: 0, color: '#9aa3b5', desc: 'Corazón de fieltro cosido con botón e hilo rosa', hasPips: true, divLps: [0, 100, 200, 300], nextLp: 400, nextName: 'Enamorados', winsNeeded: 0 },
  { id: 1, key: 'rk1', name: 'Enamorados', minLp: 400, color: '#d4813f', desc: 'Carta de amor con sello de lacre en forma de corazón', hasPips: true, divLps: [400, 500, 600, 700], nextLp: 800, nextName: 'Novios', winsNeeded: 25 },
  { id: 2, key: 'rk2', name: 'Novios', minLp: 800, color: '#cfd7e6', desc: 'Osito de peluche blanco con moño abrazando un corazón', hasPips: true, divLps: [800, 900, 1000, 1100], nextLp: 1200, nextName: 'Cómplices', winsNeeded: 50 },
  { id: 3, key: 'rk3', name: 'Cómplices', minLp: 1200, color: '#f5b82a', desc: 'Dos anillos de oro entrelazados con diamante', hasPips: true, divLps: [1200, 1300, 1400, 1500], nextLp: 1600, nextName: 'Inseparables', winsNeeded: 75 },
  { id: 4, key: 'rk4', name: 'Inseparables', minLp: 1600, color: '#39cdbd', desc: 'Dos ositos abrazados sobre escudo de platino', hasPips: true, divLps: [1600, 1700, 1800, 1900], nextLp: 2000, nextName: 'Almas Gemelas', winsNeeded: 100 },
  { id: 5, key: 'rk5', name: 'Almas Gemelas', minLp: 2000, color: '#5aa6ff', desc: 'Corazón de cristal en dos mitades unidas por el hilo rojo del destino', hasPips: true, divLps: [2000, 2100, 2200, 2300], nextLp: 2400, nextName: 'Eternos', winsNeeded: 125 },
  { id: 6, key: 'rk6', name: 'Eternos', minLp: 2400, color: '#a860f0', desc: 'Corazón de amatista con infinito de oro, alas y halo', hi: true, hasPips: true, divLps: [2400, 2500, 2600, 2700], nextLp: 2800, nextName: 'Dúo Maestro', winsNeeded: 150 },
  { id: 7, key: 'rk7', name: 'Dúo Maestro', minLp: 2800, color: '#ff5c93', desc: 'Corona doble con dos ositos, laureles y corazón de rubí', hi: true, hasPips: false, divLps: [2800], nextLp: 2800, nextName: 'Amor Verdadero', winsNeeded: 175, specialReq: '2.800 LP o más (sin divisiones)' },
  { id: 8, key: 'rk8', name: 'Amor Verdadero', minLp: 2800, color: '#ee2a45', desc: 'Corazón de rubí con corona de rosas y alas', hi: true, isTop: true, hasPips: false, specialReq: '2.800 LP + Top 60 del Servidor' },
  { id: 9, key: 'rk9', name: 'Leyendas del Amor', minLp: 2800, color: '#ffd24a', desc: 'Osito rey con corona y corazón dorado, alas y flechas de cupido', hi: true, isTop: true, hasPips: false, specialReq: '2.800 LP + Top 10 del Servidor' },
];

export function getRankData(lp = 0) {
  const currentLp = Math.max(0, Number(lp) || 0);

  let leagueIndex = 0;
  for (let i = 0; i <= 7; i++) {
    if (currentLp >= LEAGUES[i].minLp) {
      leagueIndex = i;
    }
  }

  const league = LEAGUES[leagueIndex];
  let divisionName = '';
  let divisionNumber = 4;
  let pipsCount = 1;
  let lpInDivision = 0;
  let lpNeededNext = 0;
  let progressPercent = 0;
  let nextRankName = '';

  if (league.hasPips) {
    const lpInLeague = currentLp - league.minLp; // 0..399
    const divIdx = Math.min(3, Math.floor(lpInLeague / 100)); // 0 = IV, 1 = III, 2 = II, 3 = I
    const ROMAN = ['IV', 'III', 'II', 'I'];
    divisionName = ROMAN[divIdx];
    divisionNumber = 4 - divIdx;
    pipsCount = divIdx + 1;

    lpInDivision = lpInLeague % 100;
    lpNeededNext = 100 - lpInDivision;
    progressPercent = Math.min(100, Math.max(0, lpInDivision));

    if (divIdx < 3) {
      nextRankName = `${league.name} ${ROMAN[divIdx + 1]}`;
    } else {
      const nextLeague = LEAGUES[leagueIndex + 1];
      nextRankName = nextLeague ? `${nextLeague.name} IV` : 'Dúo Maestro';
    }
  } else {
    divisionName = '';
    pipsCount = 4;
    lpInDivision = currentLp - 2800;
    progressPercent = 100;
    lpNeededNext = 0;
    nextRankName = 'Top 60 (Amor Verdadero)';
  }

  return {
    lp: currentLp,
    leagueIndex,
    league,
    divisionName,
    fullName: divisionName ? `${league.name} ${divisionName}` : league.name,
    pipsCount,
    lpInDivision,
    lpNeededNext,
    progressPercent,
    nextRankName,
  };
}

// Generador matemático de bordes y piezas de rompecabezas reales (curvas Bézier de cuello estrecho y cabeza circular idénticas a puzzle.js)
function buildJigsawEdgeCmd(x1, y1, x2, y2, sg) {
  if (!sg) return `L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const nx = uy;
  const ny = -ux;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const u = L;
  const P = (a, b) => [
    (mx + ux * a * u + nx * b * u * sg).toFixed(2),
    (my + uy * a * u + ny * b * u * sg).toFixed(2)
  ];
  const B = (c1, c2, e) => {
    const p1 = P(c1[0], c1[1]);
    const p2 = P(c2[0], c2[1]);
    const pe = P(e[0], e[1]);
    return `C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${pe[0]} ${pe[1]}`;
  };
  const pStart = P(-0.2, 0);
  return [
    `L ${pStart[0]} ${pStart[1]}`,
    B([-0.12, 0], [-0.06, 0.03], [-0.06, 0.08]),
    B([-0.06, 0.13], [-0.16, 0.14], [-0.14, 0.19]),
    B([-0.12, 0.25], [-0.06, 0.27], [0, 0.27]),
    B([0.06, 0.27], [0.12, 0.25], [0.14, 0.19]),
    B([0.16, 0.14], [0.06, 0.13], [0.06, 0.08]),
    B([0.06, 0.03], [0.12, 0], [0.2, 0]),
    `L ${x2.toFixed(2)} ${y2.toFixed(2)}`
  ].join(' ');
}

function buildJigsawPiecePath(x, y, w, h, top, right, bottom, left) {
  return [
    `M ${x.toFixed(2)} ${y.toFixed(2)}`,
    buildJigsawEdgeCmd(x, y, x + w, y, top),
    buildJigsawEdgeCmd(x + w, y, x + w, y + h, right),
    buildJigsawEdgeCmd(x + w, y + h, x, y + h, bottom),
    buildJigsawEdgeCmd(x, y + h, x, y, left),
    'Z'
  ].join(' ');
}

export default function ArcadeProfileView({
  userData,
  user,
  onBack,
  completedPortraits = [],
  onUpdateArcadeProfile,
  onGoToPuzzle,
}) {
  const currentLp = userData?.lp ?? 0;
  const currentCoins = userData?.coins ?? 0;
  const rank = getRankData(currentLp);
  const defaultTeamName = `${userData?.user1Name || 'Tú'} & ${userData?.user2Name || 'Tu Pareja'}`;
  const arcadeTeamName = userData?.arcadeName || defaultTeamName;
  const bestScores = userData?.best || {};

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showEloModal, setShowEloModal] = useState(false);
  const sliderRef = useRef(null);

  const scrollSlider = (dir) => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.querySelector('.elo-slide-card');
    const step = card ? card.clientWidth + 24 : 370;
    sliderRef.current.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!showEloModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowEloModal(false);
      if (e.key === 'ArrowRight') scrollSlider(1);
      if (e.key === 'ArrowLeft') scrollSlider(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEloModal]);

  const [draftName, setDraftName] = useState(userData?.arcadeName || defaultTeamName);
  const [draftBannerKey, setDraftBannerKey] = useState(userData?.arcadeBannerKey || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Construir lista de retratos completados al 100% disponibles para usar de fondo
  const availablePortraits = React.useMemo(() => {
    if (Array.isArray(completedPortraits) && completedPortraits.length > 0) {
      return completedPortraits;
    }
    const raw = userData?.completedPuzzles || {};
    return Object.entries(raw)
      .map(([k, v]) => ({
        key: k,
        ...v,
        displaySrc: v?.liveUrl || v?.portrait || v?.url || '',
        maxPieces: v?.maxPieces || (Array.isArray(v?.levels) && v.levels.length > 0 ? Math.max(...v.levels) : 30),
        levels: Array.isArray(v?.levels) ? v.levels : []
      }))
      .filter(item => item.levels.length > 0)
      .sort((a, b) => (b.maxPieces - a.maxPieces) || ((b.lastCompletedAt || 0) - (a.lastCompletedAt || 0)));
  }, [completedPortraits, userData?.completedPuzzles]);

  const savedBannerKey = userData?.arcadeBannerKey;
  const activePortrait = React.useMemo(() => {
    if (savedBannerKey === 'none') return null;
    if (savedBannerKey) {
      const found = availablePortraits.find(p => p.key === savedBannerKey);
      if (found) return found;
    }
    return availablePortraits.length > 0 ? availablePortraits[0] : null;
  }, [savedBannerKey, availablePortraits]);

  useEffect(() => {
    setDraftName(userData?.arcadeName || defaultTeamName);
    setDraftBannerKey(
      userData?.arcadeBannerKey || (availablePortraits[0]?.key || 'none')
    );
  }, [userData?.arcadeName, userData?.arcadeBannerKey, defaultTeamName, availablePortraits]);

  const handleSaveProfile = async (overrideBannerKey) => {
    if (!onUpdateArcadeProfile) return;
    setIsSavingProfile(true);
    try {
      const nextKey = overrideBannerKey !== undefined ? overrideBannerKey : draftBannerKey;
      await onUpdateArcadeProfile({
        arcadeName: draftName.trim() || defaultTeamName,
        arcadeBannerKey: nextKey || 'none'
      });
      if (overrideBannerKey === undefined) {
        setIsEditingProfile(false);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const activePortraitSrc = activePortrait ? (activePortrait.displaySrc || activePortrait.liveUrl || activePortrait.portrait || activePortrait.url) : '';
  const activePortraitPieces = activePortrait ? (activePortrait.maxPieces || Math.max(...(activePortrait.levels || [30]))) : 30;
  const activePortraitDiffLabel = activePortraitPieces >= 500
    ? 'Imposible'
    : activePortraitPieces >= 240
      ? 'Difícil'
      : activePortraitPieces >= 120
        ? 'Media'
        : activePortraitPieces >= 60
          ? 'Fácil'
          : 'Muy fácil';
  // Tamaño visual de la retícula jigsaw según cantidad de piezas armadas
  const jigsawTileSize = activePortraitPieces >= 500 ? 44 : activePortraitPieces >= 240 ? 50 : activePortraitPieces >= 120 ? 56 : activePortraitPieces >= 60 ? 64 : 72;

  // Malla 2x2 de piezas reales con pestañas alternadas para el patrón repetible
  const jigsawPatternData = React.useMemo(() => {
    const s = jigsawTileSize;
    const p00 = buildJigsawPiecePath(0, 0, s, s, 1, -1, 1, -1);
    const p10 = buildJigsawPiecePath(s, 0, s, s, -1, -1, -1, 1);
    const p01 = buildJigsawPiecePath(0, s, s, s, -1, 1, -1, 1);
    const p11 = buildJigsawPiecePath(s, s, s, s, 1, 1, 1, -1);

    return {
      tileSpan: s * 2,
      s,
      pieces: [p00, p10, p01, p11]
    };
  }, [jigsawTileSize]);

  // Si se activó la vista épica de Elos, renderizar directamente como contenido bajo la barra superior fija aprovechando toda la pantalla
  if (showEloModal) {
    return (
      <div className="relative z-10 w-full flex-1 flex flex-col justify-between px-2 sm:px-6 lg:px-10 py-1.5 select-none animate-in fade-in duration-300 min-h-[calc(100vh-70px)]">
        {/* Fondo cósmico continuo sin cortes en negro que se funde con el universo */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 30%, color-mix(in srgb, ${rank.league.color} 24%, transparent) 0%, rgba(14, 8, 25, 0.88) 55%, #07050c 100%)`
          }}
        />

        {/* 1. Título y Acción de Salida Limpia (Sin barra intermedia divisoria) */}
        <div className="relative z-10 w-full flex items-center justify-between gap-3 px-1 sm:px-4 my-1">
          <div className="text-left">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-pink-300 font-extrabold block">
              Tu Elo Actual y los Próximos Escalones
            </span>
            <h2 className="text-sm sm:text-lg md:text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-amber-200">
              Desliza horizontalmente para explorar el camino de ligas
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowEloModal(false)}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-gray-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 flex-none shadow-md backdrop-blur-md"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Volver a mi Perfil</span>
          </button>
        </div>

        {/* 2. Slider Horizontal Épico: Aprovecha ancho y alto en PC y Móvil */}
        <div className="relative z-10 flex-1 w-full flex items-center justify-center my-1 min-h-0">
          {/* Flecha Flotante Izquierda */}
          <button
            type="button"
            onClick={() => scrollSlider(-1)}
            className="hidden md:flex absolute left-2 z-30 w-11 h-11 rounded-full bg-black/85 hover:bg-pink-600/40 border border-white/20 hover:border-pink-400/60 items-center justify-center text-white backdrop-blur-md shadow-2xl transition-all cursor-pointer active:scale-95"
            title="Ver liga anterior"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Carrusel Horizontal Adaptable a Pantalla Completa */}
          <div
            ref={sliderRef}
            className="w-full flex items-stretch overflow-x-auto snap-x snap-mandatory py-2 px-3 sm:px-8 lg:px-12 gap-4 sm:gap-6 md:gap-7 scrollbar-none"
            style={{ scrollBehavior: 'smooth' }}
          >
            {/* TARJETA 1: TU ELO ACTUAL (Siempre al inicio a la izquierda) */}
            <div
              className="elo-slide-card w-[86vw] max-w-[340px] sm:w-[380px] md:w-[420px] lg:w-[455px] xl:w-[485px] min-h-[460px] sm:min-h-[500px] md:min-h-[530px] flex-none snap-center rounded-3xl p-5 sm:p-7 border flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all my-1"
              style={{
                background: `radial-gradient(circle at 50% 25%, color-mix(in srgb, ${rank.league.color} 34%, #140d25), #090614 85%)`,
                borderColor: `color-mix(in srgb, ${rank.league.color} 80%, rgba(255,255,255,0.25))`,
                boxShadow: `0 12px 45px color-mix(in srgb, ${rank.league.color} 32%, rgba(0,0,0,0.85))`
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Tu Liga Actual
                  </span>
                  {rank.league.hasPips && (
                    <span className="text-xs font-mono font-bold text-pink-300">
                      División {rank.divisionName}
                    </span>
                  )}
                </div>

                <div className="my-5 flex flex-col items-center justify-center">
                  <span
                    className={`rk ${rank.league.hi ? 'hi' : ''}`}
                    style={{ '--s': '145px', '--c': rank.league.color }}
                  >
                    <svg viewBox="0 0 120 120" role="img" aria-label={rank.fullName}>
                      <use href={`#${rank.league.key}`} />
                    </svg>
                  </span>
                </div>

                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                    {rank.fullName}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    {rank.league.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-mono font-bold">
                    {currentLp} LP Acumulados
                  </span>
                  <span className="text-pink-300 font-mono text-[11px] font-semibold">
                    {rank.league.hasPips ? `${rank.lpInDivision} / 100 LP` : 'Rango Máximo'}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-black/80 border border-white/15 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 shadow-[0_0_12px_rgba(236,72,153,0.9)]"
                    style={{ width: `${rank.progressPercent}%` }}
                  />
                </div>

                <div className="text-[11px] text-left mt-1">
                  {rank.league.hasPips ? (
                    <span className="text-gray-200">
                      Te faltan <b className="text-pink-300 font-mono font-bold">+{rank.lpNeededNext} LP</b> para ascender a <b className="text-white">{rank.nextRankName}</b>
                    </span>
                  ) : (
                    <span className="text-amber-300 font-semibold">
                      Liga Dúo Maestro: Clasificas por puesto en el Top 60 del servidor.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* TARJETAS SIGUIENTES: DESLIZAR A LA DERECHA */}
            {LEAGUES.slice(rank.leagueIndex + 1).map((l, index) => {
              const lpRemaining = Math.max(0, l.minLp - currentLp);
              const stepNum = index + 1;

              return (
                <div
                  key={l.id}
                  className="elo-slide-card w-[86vw] max-w-[340px] sm:w-[380px] md:w-[420px] lg:w-[455px] xl:w-[485px] min-h-[460px] sm:min-h-[500px] md:min-h-[530px] flex-none snap-center rounded-3xl p-5 sm:p-7 border flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all my-1 hover:border-white/40"
                  style={{
                    background: `radial-gradient(circle at 50% 20%, color-mix(in srgb, ${l.color} 24%, #120c22), #080512 85%)`,
                    borderColor: `color-mix(in srgb, ${l.color} 45%, rgba(255,255,255,0.12))`,
                    boxShadow: `0 12px 40px color-mix(in srgb, ${l.color} 22%, rgba(0,0,0,0.85))`
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono uppercase tracking-wider text-gray-200 font-bold flex items-center gap-1.5">
                        <span className="text-pink-400 font-extrabold">#{stepNum}</span>
                        <span>Siguiente Escalón</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {l.minLp} LP Mínimos
                      </span>
                    </div>

                    <div className="my-5 flex flex-col items-center justify-center">
                      <span
                        className={`rk ${l.id >= 6 ? 'hi' : ''}`}
                        style={{ '--s': '145px', '--c': l.color }}
                      >
                        <svg viewBox="0 0 120 120" role="img" aria-label={l.name}>
                          <use href={`#${l.key}`} />
                        </svg>
                      </span>
                    </div>

                    <div className="text-center">
                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                        {l.name}
                      </h3>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                        {l.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono uppercase tracking-wider text-[10px]">
                        Puntos restantes
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs">
                        Faltan +{lpRemaining} LP
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between text-xs">
                      <div className="text-left">
                        <span className="text-[10px] font-mono uppercase text-gray-400 block">Estructura</span>
                        <b className="text-gray-200 text-xs">
                          {l.hasPips ? '4 Divisiones (IV a I)' : 'Rango Maestro Servidor'}
                        </b>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-gray-400 block">Meta</span>
                        <b className="text-pink-300 font-mono text-xs">{l.minLp} LP</b>
                      </div>
                    </div>

                    {l.id >= 8 && (
                      <div className="text-[10px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-400/20 p-2 rounded-xl text-center">
                        {l.id === 8 ? 'Requiere estar en el Top 60 del servidor' : 'Requiere estar en el Top 10 del servidor'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flecha Flotante Derecha */}
          <button
            type="button"
            onClick={() => scrollSlider(1)}
            className="hidden md:flex absolute right-2 z-30 w-11 h-11 rounded-full bg-black/85 hover:bg-pink-600/40 border border-white/20 hover:border-pink-400/60 items-center justify-center text-white backdrop-blur-md shadow-2xl transition-all cursor-pointer active:scale-95"
            title="Ver siguiente liga"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* 3. Barra Inferior con Controles y Guía */}
        <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs text-gray-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse flex-none" />
            <span>Gana partidas cooperativas y duelos en el Arcade para sumar LP y ascender.</span>
          </div>

          <div className="flex items-center gap-2 flex-none">
            <button
              type="button"
              onClick={() => scrollSlider(-1)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold transition-all cursor-pointer text-xs active:scale-95"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => scrollSlider(1)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold transition-all cursor-pointer text-xs active:scale-95"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6 animate-in fade-in duration-300">
      {/* 1. HERO CARD DEL RANGO ACTUAL: Diseño dividido en 2 zonas limpias (Izquierda: Rango y Barra / Derecha: Vitrina despejada del Rompecabezas) */}
      <div 
        className="rounded-3xl relative overflow-hidden border shadow-2xl grid grid-cols-1 lg:grid-cols-12"
        style={{
          background: `radial-gradient(circle at 18% 45%, color-mix(in srgb, ${rank.league.color} 28%, transparent), rgba(14, 9, 24, 0.98) 70%)`,
          borderColor: `color-mix(in srgb, ${rank.league.color} 50%, rgba(255,255,255,0.12))`,
          boxShadow: `0 16px 48px color-mix(in srgb, ${rank.league.color} 22%, rgba(0,0,0,0.85))`
        }}
      >
        {/* ZONA IZQUIERDA (7 columnas en desktop): Emblema, Rango, Controles y Barra de Progreso (sin pisar la foto) */}
        <div className={`relative z-10 p-5 sm:p-7 flex flex-col justify-between gap-5 ${activePortrait && activePortraitSrc ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {/* Fila Superior: Etiqueta de categoría + División + Botón Editar con SVG profesional */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: rank.league.color, boxShadow: `0 0 8px ${rank.league.color}` }}
              />
              <span className="text-[11px] font-mono uppercase tracking-widest text-pink-300 font-bold">
                Tu Rango Actual
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rank.league.hasPips && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
                  <span className="text-[11px] font-mono text-gray-300">División</span>
                  <div className="pips-hearts">
                    {[1, 2, 3, 4].map((n) => (
                      <i key={n} className={n <= rank.pipsCount ? 'on' : ''} />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-pink-300 font-bold">
                    {rank.divisionName}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsEditingProfile(prev => !prev)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isEditingProfile
                    ? 'bg-pink-500/25 text-pink-100 border-pink-400/60 shadow-[0_0_15px_rgba(236,72,153,0.35)]'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 hover:text-white border-white/15'
                }`}
              >
                {isEditingProfile ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-pink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Cerrar</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Editar Perfil</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Fila Central: Emblema Oficial (Clickeable directamente para abrir la vista épica de Elos) + Nombre de Liga y Descripción */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
            <button
              type="button"
              onClick={() => setShowEloModal(true)}
              title="Haz clic en tu emblema para ver tu Elo y las siguientes ligas"
              className="flex flex-col items-center flex-none group cursor-pointer hover:scale-105 active:scale-95 transition-transform text-center focus:outline-none"
            >
              <span 
                className={`rk ${rank.league.hi ? 'hi' : ''}`}
                style={{ '--s': '118px', '--c': rank.league.color }}
              >
                <svg viewBox="0 0 120 120" role="img" aria-label={rank.fullName}>
                  <use href={`#${rank.league.key}`} />
                </svg>
              </span>
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide leading-tight">
                {rank.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                {rank.league.desc}
              </p>
            </div>
          </div>

          {/* Fila Inferior: Barra de Progreso de LP (contenida en la zona izquierda) */}
          <div className="w-full pt-3.5 border-t border-white/10 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-200 font-medium flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Puntos de Liga:</span>
                <b className="font-mono text-purple-300 text-sm">{currentLp} LP</b>
              </span>
              <span className="text-[11px] font-mono text-pink-300 font-semibold">
                {rank.league.hasPips ? `${rank.lpInDivision} / 100 LP` : 'Rango Máximo'}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-black/75 border border-white/15 overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                style={{ width: `${rank.progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] text-gray-400">
              {rank.league.hasPips ? (
                <span>
                  Faltan <b className="text-pink-300 font-mono">+{rank.lpNeededNext} LP</b> para ascender a <b className="text-gray-100">{rank.nextRankName}</b>
                </span>
              ) : (
                <span className="text-amber-300 font-semibold">Liga Dúo Maestro: clasifica por puesto en el Top 60.</span>
              )}
            </div>
          </div>
        </div>

        {/* ZONA DERECHA: Fusión orgánica y épica del Retrato Armado (sin línea divisoria dura, emergiendo de la niebla cósmica) */}
        {activePortrait && activePortraitSrc && (
          <>
            {/* Capa de fondo extendida con máscara S-curve suave y transición diagonal orgánica */}
            <div
              className="absolute inset-y-0 right-0 w-full lg:w-[58%] pointer-events-none select-none overflow-hidden z-0"
              style={{
                WebkitMaskImage: 'linear-gradient(102deg, transparent 0%, rgba(0,0,0,0.03) 14%, rgba(0,0,0,0.15) 26%, rgba(0,0,0,0.42) 40%, rgba(0,0,0,0.76) 56%, rgba(0,0,0,0.95) 74%, rgba(0,0,0,1) 100%)',
                maskImage: 'linear-gradient(102deg, transparent 0%, rgba(0,0,0,0.03) 14%, rgba(0,0,0,0.15) 26%, rgba(0,0,0,0.42) 40%, rgba(0,0,0,0.76) 56%, rgba(0,0,0,0.95) 74%, rgba(0,0,0,1) 100%)'
              }}
            >
              {/* Imagen del retrato completado */}
              <img
                src={activePortraitSrc}
                alt="Fondo de rompecabezas completado"
                onError={(e) => {
                  if (activePortrait.portrait && e.currentTarget.src !== activePortrait.portrait) {
                    e.currentTarget.src = activePortrait.portrait;
                  } else if (activePortrait.fallbackUrl && e.currentTarget.src !== activePortrait.fallbackUrl) {
                    e.currentTarget.src = activePortrait.fallbackUrl;
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover object-center scale-[1.03] saturate-110"
              />

              {/* Niebla de enlace cromático con el color de la liga actual */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 65% 95% at 15% 50%, color-mix(in srgb, ${rank.league.color} 32%, rgba(14, 9, 24, 0.85)) 0%, transparent 68%), linear-gradient(to top, rgba(14, 9, 24, 0.65) 0%, transparent 35%, transparent 75%, rgba(14, 9, 24, 0.45) 100%)`
                }}
              />

              {/* Retícula SVG sutil de piezas de rompecabezas reales (geometría Bézier auténtica con trazo delicado) */}
              <svg
                className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="jigsawHeroPattern"
                    width={jigsawPatternData.tileSpan}
                    height={jigsawPatternData.tileSpan}
                    patternUnits="userSpaceOnUse"
                  >
                    {/* Surco sutil entre piezas */}
                    {jigsawPatternData.pieces.map((d, idx) => (
                      <path
                        key={`shadow-${idx}`}
                        d={d}
                        fill="none"
                        stroke="rgba(5, 2, 12, 0.55)"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    ))}

                    {/* Bisel de luz delicado para relieve sutil */}
                    <g transform="translate(0.6, 0.6)">
                      {jigsawPatternData.pieces.map((d, idx) => (
                        <path
                          key={`bevel-${idx}`}
                          d={d}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.35)"
                          strokeWidth="0.7"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>
                  </pattern>
                </defs>

                <rect width="100%" height="100%" fill="url(#jigsawHeroPattern)" />
              </svg>
            </div>

            {/* Reserva espacial derecha sin bordes duros + Etiqueta inferior derecha minimalista */}
            <div className="relative z-10 lg:col-span-5 min-h-[190px] sm:min-h-[210px] lg:min-h-full flex items-end justify-end p-4 pointer-events-none select-none">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-white/15 backdrop-blur-md shadow-lg">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
                </svg>
                <span className="text-[10px] font-mono font-semibold text-gray-100">
                  {activePortraitPieces} piezas · <span className="text-emerald-300">{activePortraitDiffLabel}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* PANEL DESPLEGABLE: EDITOR DE PERFIL DE JUEGO (SOLO PERMITE ELEGIR RETRATOS COMPLETADOS AL 100% EN ROMPECABEZAS) */}
      {isEditingProfile && (
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#1a1228]/98 to-[#0d0917]/98 border border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.18)] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  Configuración de Perfil
                </span>
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  Editar Perfil de Juego y Fondo de Rango
                </h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-[11px] font-mono text-emerald-300 font-bold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Retratos 100% Armados ({availablePortraits.length})</span>
            </span>
          </div>

          {/* 1. Nombre del Dúo Arcade */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 text-left">
              <label className="text-xs font-mono uppercase tracking-wider text-gray-300 font-bold block mb-1.5">
                Nombre de su Dupla Arcade
              </label>
              <input
                type="text"
                maxLength={36}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={defaultTeamName}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-pink-400 focus:outline-none text-sm font-serif font-bold text-white"
              />
            </div>
          </div>

          {/* 2. Historial de Retratos Armados en Rompecabezas (Solo visible al apretar Editar Perfil) */}
          <div className="rounded-2xl p-4 sm:p-5 bg-black/45 border border-emerald-500/25 flex flex-col gap-3.5 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-none">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200">
                    Historial de Retratos Armados en Rompecabezas
                  </h4>
                  <p className="text-xs text-gray-400">
                    Selecciona cualquiera de tus retratos completados al 100% para mostrarlo en la barra de tu liga.
                  </p>
                </div>
              </div>
              {onGoToPuzzle && (
                <button
                  type="button"
                  onClick={onGoToPuzzle}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-xs font-bold text-emerald-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Desbloquear más retratos</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>

            {availablePortraits.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* Opción para dejar sin foto de fondo */}
                <div
                  onClick={() => setDraftBannerKey('none')}
                  className={`rounded-2xl p-3 border transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[150px] bg-black/50 ${
                    draftBannerKey === 'none'
                      ? 'border-pink-400 ring-2 ring-pink-400/50 shadow-[0_0_20px_rgba(236,72,153,0.35)]'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <svg className="w-6 h-6 text-gray-400 mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <b className="text-xs text-white">Sin Imagen</b>
                  <span className="text-[10px] text-gray-400 mt-0.5">Solo color de liga</span>
                  {draftBannerKey === 'none' && (
                    <span className="mt-2 px-2 py-0.5 rounded-full bg-pink-500/30 border border-pink-400/50 text-[9px] font-mono text-pink-200 font-bold">
                      Seleccionado
                    </span>
                  )}
                </div>

                {/* Retratos 100% completados en el Rompecabezas con su historial de dificultades */}
                {availablePortraits.map((item, idx) => {
                  const maxP = item.maxPieces || Math.max(...(item.levels || [30]));
                  const maxLabel = maxP >= 500 ? 'Imposible' : maxP >= 240 ? 'Difícil' : maxP >= 120 ? 'Media' : maxP >= 60 ? 'Fácil' : 'Muy fácil';
                  const imgSrc = item.displaySrc || item.liveUrl || item.portrait || item.url;
                  const isSelected = draftBannerKey === item.key || (!draftBannerKey && idx === 0);

                  return (
                    <div
                      key={item.key || idx}
                      onClick={() => setDraftBannerKey(item.key)}
                      className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-[#120d1d] shadow-md ${
                        isSelected
                          ? 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-[1.01]'
                          : 'border-white/15 hover:border-emerald-400/60'
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full bg-black/60 overflow-hidden">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt="Retrato completado"
                            onError={(e) => {
                              if (item.portrait && e.currentTarget.src !== item.portrait) {
                                e.currentTarget.src = item.portrait;
                              } else if (item.fallbackUrl && e.currentTarget.src !== item.fallbackUrl) {
                                e.currentTarget.src = item.fallbackUrl;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                            </svg>
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 border border-emerald-400/50 text-[9px] font-mono font-bold text-emerald-300">
                          Máx: {maxP}p
                        </span>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-mono font-bold shadow flex items-center gap-1">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Elegido</span>
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2 pt-4">
                          <span className="text-[10px] text-gray-200 block leading-tight">
                            Llegó hasta: <b className="text-emerald-300">{maxLabel} ({maxP}p)</b>
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-[#161024] border-t border-white/10 flex flex-wrap gap-1 justify-center">
                        {[30, 60, 120, 240, 500].map(lv => {
                          const done = (item.levels || []).includes(lv);
                          return (
                            <span
                              key={lv}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                done
                                  ? 'bg-emerald-500/80 text-white font-bold'
                                  : 'bg-white/5 text-gray-500'
                              }`}
                            >
                              {lv}p{done ? ' ✓' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-black/50 border border-white/10 text-center flex flex-col items-center gap-2">
                <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <b className="text-sm text-white">Aún no tienen retratos de Rompecabezas completados al 100%</b>
                <p className="text-xs text-gray-400 max-w-md">
                  Completen cualquier foto de su galería en el juego de Rompecabezas (desde 30 hasta 500 piezas) para desbloquearla como fondo de su barra de rango.
                </p>
                {onGoToPuzzle && (
                  <button
                    type="button"
                    onClick={onGoToPuzzle}
                    className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Ir al Rompecabezas
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botones Guardar / Cancelar */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSavingProfile}
              onClick={() => handleSaveProfile()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-pink-500 hover:from-emerald-400 hover:to-pink-400 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. RÉCORDS DE LA PAREJA POR JUEGO (con su presentación animada de fondo sin tapar los puntajes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Gominola */}
        <div
          className="arcade-record-card p-4 min-h-[112px] flex flex-col justify-between"
          style={{ '--c': '#ff5aaa' }}
        >
          <div
            className="arcade-scene record-scene s-gominola"
            dangerouslySetInnerHTML={{ __html: RECORD_GAME_SCENES.gominola }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(96deg, rgba(12, 7, 22, 0.92) 0%, rgba(12, 7, 22, 0.78) 48%, rgba(12, 7, 22, 0.22) 100%)'
            }}
          />
          <div className="relative z-10 flex items-center gap-1.5 flex-wrap pr-12">
            <span className="text-[10px] font-bold uppercase text-pink-300 tracking-wider drop-shadow">
              Gominola
            </span>
          </div>
          <b className="relative z-10 text-xl sm:text-2xl font-mono font-extrabold text-white mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {(bestScores.gomi || 0).toLocaleString()}
          </b>
          <span className="relative z-10 text-[10px] text-gray-200/90 font-medium drop-shadow">
            Puntaje total
          </span>
        </div>

        {/* Tetris */}
        <div
          className="arcade-record-card p-4 min-h-[112px] flex flex-col justify-between"
          style={{ '--c': '#ff7ac8' }}
        >
          <div
            className="arcade-scene record-scene s-tetris"
            dangerouslySetInnerHTML={{ __html: RECORD_GAME_SCENES.tetris }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(96deg, rgba(13, 7, 24, 0.92) 0%, rgba(13, 7, 24, 0.78) 48%, rgba(13, 7, 24, 0.22) 100%)'
            }}
          />
          <span className="relative z-10 text-[10px] font-bold uppercase text-purple-300 tracking-wider drop-shadow pr-12">
            Tetris
          </span>
          <b className="relative z-10 text-xl sm:text-2xl font-mono font-extrabold text-white mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {(bestScores.tetris || 0).toLocaleString()}
          </b>
          <span className="relative z-10 text-[10px] text-gray-200/90 font-medium drop-shadow">
            Puntaje máx
          </span>
        </div>

        {/* Sudoku */}
        <div
          className="arcade-record-card p-4 min-h-[112px] flex flex-col justify-between"
          style={{ '--c': '#4aa8ff' }}
        >
          <div
            className="arcade-scene record-scene s-sudoku"
            dangerouslySetInnerHTML={{ __html: RECORD_GAME_SCENES.sudoku }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(96deg, rgba(7, 13, 26, 0.92) 0%, rgba(7, 13, 26, 0.78) 48%, rgba(7, 13, 26, 0.22) 100%)'
            }}
          />
          <span className="relative z-10 text-[10px] font-bold uppercase text-sky-300 tracking-wider drop-shadow pr-12">
            Sudoku
          </span>
          <b className="relative z-10 text-xl sm:text-2xl font-mono font-extrabold text-white mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {bestScores.sudoku || 0}
          </b>
          <span className="relative z-10 text-[10px] text-gray-200/90 font-medium drop-shadow">
            Rendimiento S
          </span>
        </div>

        {/* Puzzle */}
        <div
          className="arcade-record-card p-4 min-h-[112px] flex flex-col justify-between"
          style={{ '--c': '#3ddc97' }}
        >
          <div
            className="arcade-scene record-scene s-puzzle"
            dangerouslySetInnerHTML={{ __html: RECORD_GAME_SCENES.puzzle }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(96deg, rgba(7, 18, 18, 0.92) 0%, rgba(7, 18, 18, 0.78) 48%, rgba(7, 18, 18, 0.22) 100%)'
            }}
          />
          <div className="relative z-10 flex items-center gap-1.5 flex-wrap pr-12">
            <span className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider drop-shadow">
              Puzzle
            </span>
            {availablePortraits.length > 0 && (
              <span className="text-[9px] font-mono text-emerald-200 font-bold bg-emerald-500/30 border border-emerald-400/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {availablePortraits.length} retratos
              </span>
            )}
          </div>
          <b className="relative z-10 text-xl sm:text-2xl font-mono font-extrabold text-white mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {bestScores.puzzle || 0} {bestScores.puzzle ? 'pzs' : ''}
          </b>
          <span className="relative z-10 text-[10px] text-gray-200/90 font-medium drop-shadow">
            {bestScores.puzzle >= 500
              ? 'Máx: Imposible (500p)'
              : bestScores.puzzle >= 240
                ? 'Máx: Difícil (240p)'
                : bestScores.puzzle >= 120
                  ? 'Máx: Media (120p)'
                  : bestScores.puzzle >= 60
                    ? 'Máx: Fácil (60p)'
                    : bestScores.puzzle >= 30
                      ? 'Máx: Muy fácil (30p)'
                      : 'Máx piezas armadas'}
          </span>
        </div>
      </div>
    </div>
  );
}
