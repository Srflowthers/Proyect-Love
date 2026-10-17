import React from 'react';
import './arcadeCards.css';

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

export default function ArcadeProfileView({
  userData,
  user,
  onBack,
}) {
  const currentLp = userData?.lp ?? 0;
  const currentCoins = userData?.coins ?? 0;
  const rank = getRankData(currentLp);
  const arcadeTeamName = userData?.arcadeName || `${userData?.user1Name || 'Tú'} & ${userData?.user2Name || 'Tu Pareja'}`;
  const bestScores = userData?.best || {};

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-6 animate-in fade-in duration-300">
      {/* 1. HERO CARD DEL RANGO ACTUAL */}
      <div 
        className="rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border"
        style={{
          background: `radial-gradient(circle at 20% 40%, color-mix(in srgb, ${rank.league.color} 30%, transparent), rgba(18, 10, 30, 0.95) 75%)`,
          borderColor: `color-mix(in srgb, ${rank.league.color} 55%, transparent)`,
          boxShadow: `0 0 45px color-mix(in srgb, ${rank.league.color} 25%, transparent)`
        }}
      >
        {/* Insignia Grande Animada */}
        <div className="flex flex-col items-center text-center flex-none">
          <span 
            className={`rk ${rank.league.hi ? 'hi' : ''}`}
            style={{ '--s': '150px', '--c': rank.league.color }}
          >
            <svg viewBox="0 0 120 120" role="img" aria-label={rank.fullName}>
              <use href={`#${rank.league.key}`} />
            </svg>
          </span>
          <span className="text-[11px] font-mono text-gray-400 mt-2">Emblema Oficial de Liga</span>
        </div>

        {/* Detalles del Rango y Barra de Progreso */}
        <div className="flex-1 flex flex-col gap-3 text-left w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-pink-400 font-bold">
                Tu Rango Actual
              </span>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide">
                {rank.fullName}
              </h1>
            </div>

            {/* Pips de División */}
            {rank.league.hasPips && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10">
                <span className="text-xs font-mono text-gray-300">División:</span>
                <div className="pips-hearts">
                  {[1, 2, 3, 4].map((n) => (
                    <i key={n} className={n <= rank.pipsCount ? 'on' : ''} />
                  ))}
                </div>
                <span className="text-xs font-mono text-pink-300 font-bold ml-1">
                  {rank.divisionName}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-300 max-w-xl">
            {rank.league.desc}
          </p>

          {/* Barra de Progreso de LP hacia la siguiente división */}
          <div className="w-full mt-2 pt-3 border-t border-white/10 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-gray-200 font-medium flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                <span>Puntos de Liga:</span>
                <b className="font-mono text-purple-300 text-base">{currentLp} LP</b>
              </span>
              <span className="text-xs font-mono text-pink-300 font-bold">
                {rank.league.hasPips ? `${rank.lpInDivision} / 100 LP en esta división` : 'Rango Superior Máximo'}
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full bg-black/70 border border-white/15 overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-500 shadow-[0_0_12px_rgba(236,72,153,0.9)]"
                style={{ width: `${rank.progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-between items-center text-xs sm:text-sm text-gray-300">
              {rank.league.hasPips ? (
                <span>
                  Te faltan <b className="text-pink-300 font-mono text-sm sm:text-base">+{rank.lpNeededNext} LP</b> para ascender a <b className="text-white">{rank.nextRankName}</b>
                </span>
              ) : (
                <span className="text-amber-300 font-semibold">Liga Dúo Maestro: clasifica por puesto en el Top 60.</span>
              )}
              <span className="text-xs text-gray-400">Cada partida y ronda superada otorga de ~15 a 45 LP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RÉCORDS DE LA PAREJA POR JUEGO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-pink-400 tracking-wider">Gominola</span>
            {userData?.round > 0 && (
              <span className="text-[10px] font-mono text-pink-300 font-bold bg-pink-500/20 px-2 py-0.5 rounded-full">
                Ronda {userData.round}
              </span>
            )}
          </div>
          <b className="text-xl font-mono text-white mt-1">{(bestScores.gomi || 0).toLocaleString()}</b>
          <span className="text-[10px] text-gray-400">
            {userData?.round > 0 ? `Puntaje máx · En ronda ${userData.round}` : 'Puntaje máx'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Tetris</span>
          <b className="text-xl font-mono text-white mt-1">{(bestScores.tetris || 0).toLocaleString()}</b>
          <span className="text-[10px] text-gray-400">Puntaje máx</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider">Sudoku</span>
          <b className="text-xl font-mono text-white mt-1">{bestScores.sudoku || 0}</b>
          <span className="text-[10px] text-gray-400">Rendimiento S</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Puzzle</span>
          <b className="text-xl font-mono text-white mt-1">{bestScores.puzzle || 0}</b>
          <span className="text-[10px] text-gray-400">Rendimiento S</span>
        </div>
      </div>

      {/* 3. SECCIÓN 6 DE LA DOCUMENTACIÓN: "6. Ligas y puntos necesarios" COMPLETA */}
      <div className="rounded-3xl p-6 sm:p-8 bg-black/60 border border-white/10 flex flex-col gap-6 shadow-xl">
        <div className="border-b border-white/10 pb-3">
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200">
            6. Ligas y puntos necesarios (Todos los Elos)
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Cada liga tiene 4 divisiones de 100 LP (de IV, la más baja, a I, la más alta). Cada liga completa son 400 LP. Los LP se ganan completando rondas y partidas en los minijuegos cooperativos y en línea.
          </p>
        </div>

        {/* Galería de las 10 Insignias Oficiales de Liga (SVG con halo y animación) */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-pink-400 font-bold mb-3">
            Insignia de cada liga (10 Elos Oficiales)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {LEAGUES.map((l) => {
              const isCurrent = l.id === rank.leagueIndex;
              const isUnlocked = currentLp >= l.minLp;
              const lpLeft = Math.max(0, l.minLp - currentLp);

              return (
                <div
                  key={l.id}
                  className={`p-3.5 rounded-2xl text-center border flex flex-col items-center justify-between transition-all ${
                    isCurrent 
                      ? 'bg-gradient-to-b from-pink-950/70 to-black border-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.5)] scale-105 z-10'
                      : isUnlocked 
                        ? 'bg-white/[0.05] border-white/15 hover:border-pink-500/50'
                        : 'bg-black/50 border-white/5 opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Insignia SVG */}
                  <span 
                    className={`rk ${l.id >= 6 ? 'hi' : ''} ${!isUnlocked ? 'lk' : ''}`}
                    style={{ '--s': '72px', '--c': l.color }}
                  >
                    <svg viewBox="0 0 120 120" role="img" aria-label={l.name}>
                      <use href={`#${l.key}`} />
                    </svg>
                  </span>

                  <div className="mt-2 w-full">
                    <b className={`text-xs block font-serif truncate ${isCurrent ? 'text-pink-300 font-bold' : 'text-white'}`}>
                      {l.name}
                    </b>
                    <small className="text-[10px] font-mono text-gray-400 block mt-0.5">
                      {l.minLp} LP
                    </small>
                    <small className="text-[9px] text-gray-500 block line-clamp-2 mt-1 leading-tight">
                      {l.desc}
                    </small>
                  </div>

                  {/* Estado de bloqueo / LP que faltan para este Elo */}
                  <div className="mt-2 w-full pt-2 border-t border-white/10">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded-full block">
                        Tu Liga Actual
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[10px] text-emerald-400 font-mono block">
                        ✓ Desbloqueada
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-300 font-mono block">
                        Faltan {lpLeft} LP
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla Exacta de la Documentación: LP mínimos para entrar a cada división */}
        <div className="mt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-pink-400 font-bold mb-3">
            LP mínimos para entrar a cada división
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
            <table className="w-full text-left text-xs text-gray-200">
              <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/10 font-mono">
                <tr>
                  <th className="py-3 px-4">Liga</th>
                  <th className="py-3 px-3">División IV</th>
                  <th className="py-3 px-3">III</th>
                  <th className="py-3 px-3">II</th>
                  <th className="py-3 px-3">I</th>
                  <th className="py-3 px-4">Siguiente liga</th>
                  <th className="py-3 px-4">Victorias netas*</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {LEAGUES.slice(0, 8).map((l) => {
                  const isCurrent = l.id === rank.leagueIndex;
                  const isUnlocked = currentLp >= l.minLp;
                  const lpLeft = Math.max(0, l.minLp - currentLp);

                  return (
                    <tr 
                      key={l.id}
                      className={isCurrent ? 'bg-pink-500/15 font-semibold text-white' : 'hover:bg-white/[0.02]'}
                    >
                      <td className="py-2.5 px-4 flex items-center gap-2">
                        <span 
                          className="rk"
                          style={{ '--s': '26px', '--c': l.color }}
                        >
                          <svg viewBox="0 0 120 120">
                            <use href={`#${l.key}`} />
                          </svg>
                        </span>
                        <span className="font-serif">{l.name}</span>
                      </td>

                      {l.hasPips ? (
                        <>
                          <td className="py-2.5 px-3 font-mono text-gray-300">{l.divLps[0]}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-300">{l.divLps[1]}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-300">{l.divLps[2]}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-300">{l.divLps[3]}</td>
                        </>
                      ) : (
                        <td colSpan={4} className="py-2.5 px-3 font-mono text-pink-300 text-center">
                          {l.specialReq}
                        </td>
                      )}

                      <td className="py-2.5 px-4 font-mono text-gray-300">
                        {l.nextName} desde {l.nextLp}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-gray-400">
                        {l.winsNeeded}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {isCurrent ? (
                          <span className="text-pink-400 font-bold">● Estás aquí</span>
                        ) : isUnlocked ? (
                          <span className="text-emerald-400">Superada</span>
                        ) : (
                          <span className="text-amber-300">Faltan {lpLeft} LP</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            * Victorias netas = victorias menos derrotas contra rivales de tu mismo nivel, a unos 16 LP por partida.
          </p>
        </div>

        {/* Ligas Superiores por Puesto (Top 60 y Top 10) */}
        <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-black border border-pink-500/20">
          <h4 className="text-xs font-mono uppercase tracking-wider text-pink-400 font-bold mb-2">
            Las dos ligas de arriba dependen del puesto en el servidor
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="rk hi" style={{ '--s': '44px', '--c': '#ee2a45' }}>
                <svg viewBox="0 0 120 120"><use href="#rk8" /></svg>
              </span>
              <div>
                <b className="text-white block font-serif">Amor Verdadero</b>
                <span className="text-gray-300">Tener 2.800 LP o más y estar entre los <b>60 mejores</b> del servidor</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="rk hi" style={{ '--s': '44px', '--c': '#ffd24a' }}>
                <svg viewBox="0 0 120 120"><use href="#rk9" /></svg>
              </span>
              <div>
                <b className="text-amber-200 block font-serif">Leyendas del Amor</b>
                <span className="text-gray-300">Tener 2.800 LP o más y estar entre los <b>10 mejores</b> del servidor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
