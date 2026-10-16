import React, { useState, useEffect } from 'react';
import { GlitterWarp, PALETTES } from '@/components/ui/glitter-warp';
import ArcadeFrame from './games/ArcadeFrame';
import { GameIcons, ARCADE_ICONS_RAW, ARCADE_SCENES } from './games/gameIcons';
import { DEMO_IMAGES } from '@/data/demoImages';
import './games/arcadeCards.css';

const ALL_GAMES = [
  { 
    id: 'gomi', 
    sceneKey: 'gominola', 
    name: 'Gominola', 
    tag: 'Match-3', 
    desc: 'Match-3', 
    c: '#ff5aaa'
  },
  { 
    id: 'tetris', 
    sceneKey: 'tetris', 
    name: 'Tetris Pareja', 
    tag: 'Cooperativo', 
    desc: 'Cooperativo', 
    c: '#ff7ac8'
  },
  { 
    id: 'sudoku', 
    sceneKey: 'sudoku', 
    name: 'Sudoku Pareja', 
    tag: 'Lógica', 
    desc: 'Lógica', 
    c: '#4aa8ff'
  },
  { 
    id: 'puzzle', 
    sceneKey: 'puzzle', 
    name: 'Rompecabezas', 
    tag: 'Recuerdos', 
    desc: 'Recuerdos', 
    c: '#3ddc97'
  },
  { 
    id: 'pool', 
    sceneKey: 'pool', 
    name: 'Pool 3D', 
    tag: '2v2 Pareja vrs Pareja', 
    desc: '2v2 Pareja vrs Pareja', 
    c: '#a77bff'
  },
  { 
    id: 'airhockey', 
    sceneKey: 'airhockey', 
    name: 'Air Hockey', 
    tag: 'Duelo', 
    desc: 'Duelo 1v1', 
    c: '#ff8a3d',
    comingSoon: true
  },
];

// Precomputar escenas en memoria una sola vez para 60 FPS garantizados
const GAME_SCENES_STATIC = ALL_GAMES.reduce((acc, game) => {
  acc[game.id] = (ARCADE_SCENES[game.sceneKey] ? ARCADE_SCENES[game.sceneKey]() : '') +
    `<div class="fg">${ARCADE_ICONS_RAW[game.sceneKey] || ''}</div>`;
  return acc;
}, {});

export default function GamesView({ 
  user, 
  onBack, 
  globalUserData, 
  setGlobalUserData, 
  globalImages, 
  setGlobalImages 
}) {
  const [userData, setUserData] = useState(globalUserData || null);
  // Inicia en null para mostrar el catálogo centrado al entrar a la vista
  const [activeGame, setActiveGame] = useState(null);
  const [activeParams, setActiveParams] = useState('');
  const [sudokuModalOpen, setSudokuModalOpen] = useState(false);
  const [puzzleModalOpen, setPuzzleModalOpen] = useState(false);
  const [showGameTabs, setShowGameTabs] = useState(false);

  const currentGame = ALL_GAMES.find(g => g.id === activeGame) || null;
  const CurrentGameIcon = currentGame ? (GameIcons[currentGame.id] || GameIcons.pool) : null;

  // Fetch real user data si aún no está en caché
  useEffect(() => {
    if (globalUserData) {
      setUserData(globalUserData);
      return;
    }
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const snap = await res.json();
          if (snap.exists && snap.data) {
            setUserData(snap.data);
            if (setGlobalUserData) setGlobalUserData(snap.data);
          }
        }
      } catch (err) {
        console.error('Error cargando datos de usuario en GamesView:', err);
      }
    };

    fetchUserData();
  }, [user, globalUserData, setGlobalUserData]);

  // Mantener token de sesión en storage para los iframes de la zona arcade
  useEffect(() => {
    if (user?.uid) {
      sessionStorage.setItem('arcade_session_auth', user.uid);
    } else {
      sessionStorage.removeItem('arcade_session_auth');
    }
  }, [user]);

  // Si no tenemos fotos en globalImages y el usuario está logueado, precargarlas silenciosamente
  useEffect(() => {
    if (globalImages && globalImages.length > 0) return;
    if (!user) return;

    const fetchUserImages = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/api/images?limit=70`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            if (setGlobalImages) setGlobalImages(data.items);
          }
        }
      } catch (e) {
        console.error('Error precargando imágenes en GamesView:', e);
      }
    };

    fetchUserImages();
  }, [user, globalImages, setGlobalImages]);

  // Helper para extraer URL limpia de una foto descartando videos
  const extractPhotoUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') {
      if (img.match(/\.(mp4|webm|mov)$/i)) return null;
      return img;
    }
    if (img.isVideo) return null;
    const u = img.src || img.url || img.original_url || img.thumbnailUrl;
    if (typeof u === 'string' && !u.match(/\.(mp4|webm|mov)$/i)) return u;
    return null;
  };

  // Lanzar Sudoku directamente con la dificultad seleccionada
  const launchSudoku = (size) => {
    setSudokuModalOpen(false);
    setActiveParams(`size=${size}`);
    setActiveGame('sudoku');
  };

  // Lanzar Rompecabezas con una foto al azar de sus fotos propias y cantidad de piezas
  const launchRandomPuzzle = (level = 60) => {
    setPuzzleModalOpen(false);
    let pool = (globalImages || []).map(extractPhotoUrl).filter(Boolean);

    // Fallback si aún no hay fotos en memoria: localStorage o DEMO_IMAGES
    if (pool.length === 0) {
      try {
        const cached = localStorage.getItem('demo-images-v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.images) {
            pool = parsed.images.map(extractPhotoUrl).filter(Boolean);
          }
        }
      } catch (e) {}
    }

    if (pool.length === 0 && Array.isArray(DEMO_IMAGES)) {
      pool = DEMO_IMAGES.map(extractPhotoUrl).filter(Boolean);
    }

    // Guardar la lista para que dentro del juego puedan pedir "otra foto al azar"
    try {
      sessionStorage.setItem('couple_photos', JSON.stringify(pool));
    } catch (e) {}

    const chosenPhoto = pool.length > 0 
      ? pool[Math.floor(Math.random() * pool.length)] 
      : '/fotos/Imagenes-amor/Foto0144.jpg';

    try {
      sessionStorage.setItem('puzzle_random_photo', chosenPhoto);
    } catch (e) {}

    setActiveParams(`img=${encodeURIComponent(chosenPhoto)}&level=${level}`);
    setActiveGame('puzzle');
  };

  // Manejador centralizado para iniciar cualquier juego
  const handlePlayGame = (gameId) => {
    if (gameId === 'sudoku') {
      setSudokuModalOpen(true);
      return;
    }
    if (gameId === 'puzzle') {
      setPuzzleModalOpen(true);
      return;
    }
    setActiveParams('');
    setActiveGame(gameId);
  };

  // Fondos idénticos al universo
  const getUniverseBgClass = () => {
    const color = userData?.universeColor || 'purple';
    if (color === 'space') return 'bg-black';
    if (color === 'blue') return 'bg-gradient-to-br from-blue-950 via-cyan-900 to-black';
    if (color === 'red') return 'bg-gradient-to-br from-red-950 via-rose-900 to-black';
    if (color === 'gold') return 'bg-gradient-to-br from-yellow-950 via-amber-900 to-black';
    if (color === 'black') return 'bg-gradient-to-br from-gray-900 via-[#111] to-black';
    return 'bg-gradient-to-br from-purple-950 via-pink-900 to-black';
  };

  const getAuraColor = () => {
    const color = userData?.universeColor || 'purple';
    if (color === 'space') return 'rgba(59,130,246,0.15)';
    if (color === 'blue') return 'rgba(6,182,212,0.18)';
    if (color === 'red') return 'rgba(239,68,68,0.15)';
    if (color === 'gold') return 'rgba(245,158,11,0.15)';
    if (color === 'black') return 'rgba(156,163,175,0.12)';
    return 'rgba(131,24,67,0.18)';
  };

  // Protección de ruta: Solo usuarios autenticados con al menos Plan Free
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none relative z-50">
        <div className="w-20 h-20 rounded-3xl bg-pink-500/15 border border-pink-500/40 flex items-center justify-center text-4xl mb-5 shadow-[0_0_35px_rgba(236,72,153,0.35)] animate-pulse">
          🔒
        </div>
        <span className="text-xs font-mono uppercase tracking-widest text-pink-400 mb-2">
          Ruta Protegida
        </span>
        <h2 className="text-3xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-indigo-200 mb-3">
          Zona Arcade de Parejas
        </h2>
        <p className="text-sm text-gray-300 max-w-md mb-8 leading-relaxed">
          Los minijuegos están disponibles únicamente para usuarios registrados (Plan Free o superior) y requieren pasar por la verificación de seguridad anti-bot con Cloudflare Turnstile.
        </p>
        <button
          onClick={() => {
            window.location.replace('/?auth_required=arcade');
          }}
          className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-bold shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all border border-pink-400 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Acceder con Google</span>
          <span className="text-xs opacity-75">(Plan Free mínimo) →</span>
        </button>
      </div>
    );
  }

  const coupleNames = userData?.user1Name && userData?.user2Name 
    ? `${userData.user1Name} & ${userData.user2Name}`
    : 'Nuestro Universo';

  return (
    <div 
      className="min-h-screen text-white flex flex-col relative overflow-x-hidden pb-32 md:pb-12"
      style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0, rgba(120,40,160,0.38), transparent 70%), #07050c'
      }}
    >
      
      {/* 1. Fondo de Partículas 3D Optimizado a 60 FPS */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-35" style={{ contain: 'strict', transform: 'translateZ(0)' }}>
        <GlitterWarp
          variant={userData?.universeVariant || 'tunnel'}
          colors={PALETTES[userData?.universePalette || 'Cósmico']}
          sizeMult={(userData?.universeParticleSize || 1) * 0.8}
          speedMult={(userData?.universeParticleSpeed || 1) * 0.7}
          count={20}
          background="transparent"
        />
      </div>

      {/* 2. Resplandor de Aura Cósmico */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none opacity-60"
          style={{ background: `radial-gradient(circle, ${getAuraColor()} 0%, transparent 70%)` }}
        />
      </div>

      {/* 3. Header de Navegación (Solo en Modo Catálogo) */}
      {!activeGame && (
        <header className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-xs font-bold text-gray-200 hover:text-white transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                ← Galería
              </button>
            )}
            <div>
              <h1 className="text-base md:text-xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 leading-tight">
                Arcade del Amor
              </h1>
              <p className="text-[10px] text-gray-400">
                {userData?.arcadeName || coupleNames} • 6 Minijuegos de Pareja
              </p>
            </div>
          </div>

          {/* Marcador de Monedas y LP de Pareja */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Puntos de Liga (LP) */}
            <div 
              title="Puntos de Liga (LP) para el Ranking Competitivo"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-md"
            >
              <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="font-mono">{userData?.lp ?? 0}</span>
              <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold hidden sm:inline">LP</span>
            </div>

            {/* Monedas del Arcade */}
            <div 
              title="Monedas acumuladas en partidas del Arcade"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-950/70 via-yellow-950/50 to-black/80 border border-amber-500/40 text-amber-200 text-xs font-bold shadow-[0_0_18px_rgba(245,158,11,0.25)] backdrop-blur-md animate-in fade-in"
            >
              {/* Icono de Moneda Dorada con brillo */}
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_8px_rgba(250,204,21,0.8)] border border-yellow-200/60">
                <span className="text-[9px] font-black text-amber-950 leading-none">🪙</span>
              </div>
              <span className="font-mono tracking-tight text-amber-300 text-sm">
                {(userData?.coins ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-400/80 font-medium hidden sm:inline">monedas</span>
            </div>
          </div>
        </header>
      )}

      {/* 4. Área Principal: Catálogo al medio O Juego Activo a Pantalla Completa */}
      {activeGame ? (
        <ArcadeFrame 
          gameKey={activeGame} 
          gameParams={activeParams}
          userData={userData}
          user={user}
          universeBgClass={getUniverseBgClass()}
          auraColor={getAuraColor()}
          onBackToCatalog={() => {
            setActiveGame(null);
            setActiveParams('');
          }}
        />
      ) : (
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col justify-center items-center">
          {/* ================= CATÁLOGO CENTRADO CON FONDOS DE ICONOS-ARCADE ================= */}
          <div className="w-full max-w-5xl flex flex-col items-center justify-center my-auto animate-in fade-in duration-300">
            {/* Cuadrícula de Tarjetas con Fondos Animados y SVGs de iconos-arcade.html */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 w-full justify-center">
              {ALL_GAMES.map((game) => (
                <div
                  key={game.id}
                  className={`arcade-card group ${game.comingSoon ? 'opacity-90 hover:opacity-100 cursor-default' : ''}`}
                  style={{ '--c': game.c }}
                  onClick={() => {
                    if (!game.comingSoon) handlePlayGame(game.id);
                  }}
                >
                  {/* Fondo animado del juego con su icono en primer plano */}
                  <div 
                    className={`arcade-scene s-${game.sceneKey}`}
                    dangerouslySetInnerHTML={{ __html: GAME_SCENES_STATIC[game.id] || '' }}
                  />

                  {/* Información y Botón JUGAR o PRÓXIMAMENTE */}
                  <div className="arcade-card-body">
                    <div>
                      <b className="text-base md:text-lg font-bold text-white group-hover:text-pink-200 transition-colors block">
                        {game.name}
                      </b>
                      <small className="text-xs text-gray-400 font-medium block mt-0.5">
                        {game.desc}
                      </small>
                    </div>

                    {game.comingSoon ? (
                      <button
                        disabled
                        className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2 border border-amber-500/40 bg-amber-500/15 text-amber-300 opacity-90 cursor-not-allowed shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>PRÓXIMAMENTE</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayGame(game.id);
                        }}
                        className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-95 cursor-pointer text-white"
                        style={{
                          background: `linear-gradient(135deg, ${game.c}, color-mix(in srgb, ${game.c} 65%, #000))`,
                          boxShadow: `0 4px 15px color-mix(in srgb, ${game.c} 40%, transparent)`
                        }}
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>JUGAR</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Modal interactivo de selección de dificultad para Sudoku */}
      {sudokuModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSudokuModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-[#1b152b] to-[#0c0915] border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setSudokuModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* Icono decorativo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-pink-500/20 border border-blue-400/30 flex items-center justify-center text-2xl shadow-inner mb-3">
              🔢
            </div>

            <h3 className="text-xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-sky-200 to-indigo-200">
              Sudoku Pareja
            </h3>
            <p className="text-xs text-gray-400 mt-1 mb-6">
              Elige la dificultad para comenzar a jugar:
            </p>

            {/* Opciones de Dificultad (SIN dimensiones numéricas 6x6, 9x9, 12x12) */}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => launchSudoku(6)}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-200 hover:text-white shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#34d399]" />
                  <span className="text-base font-semibold">Fácil</span>
                </div>
                <span className="text-xs text-emerald-400/80 group-hover:text-emerald-200">Jugar →</span>
              </button>

              <button
                onClick={() => launchSudoku(9)}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-200 hover:text-white shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-base font-semibold">Normal</span>
                </div>
                <span className="text-xs text-sky-400/80 group-hover:text-sky-200">Jugar →</span>
              </button>

              <button
                onClick={() => launchSudoku(12)}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/25 text-pink-200 hover:text-white shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#f472b6]" />
                  <span className="text-base font-semibold">Difícil</span>
                </div>
                <span className="text-xs text-pink-400/80 group-hover:text-pink-200">Jugar →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal interactivo de selección de piezas/dificultad para Rompecabezas */}
      {puzzleModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPuzzleModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-[#1c1427] to-[#0c0915] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setPuzzleModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* Icono decorativo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-pink-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl shadow-inner mb-3">
              🧩
            </div>

            <h3 className="text-xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-pink-200 to-amber-200">
              Rompecabezas de Amor
            </h3>
            <p className="text-xs text-gray-400 mt-1 mb-5">
              Elige cuántas piezas armar con una foto al azar de ustedes:
            </p>

            {/* Opciones de Piezas / Dificultad solicitadas */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => launchRandomPuzzle(30)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/25 text-teal-200 hover:text-white shadow-[0_0_12px_rgba(20,184,166,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#2dd4bf]" />
                  <span className="text-sm font-semibold">Muy fácil</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-[11px] font-mono text-teal-300">30 piezas</span>
                  <span className="text-xs text-teal-400/80 group-hover:text-teal-200">→</span>
                </div>
              </button>

              <button
                onClick={() => launchRandomPuzzle(60)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-200 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#34d399]" />
                  <span className="text-sm font-semibold">Fácil</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-mono text-emerald-300">60 piezas</span>
                  <span className="text-xs text-emerald-400/80 group-hover:text-emerald-200">→</span>
                </div>
              </button>

              <button
                onClick={() => launchRandomPuzzle(120)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-200 hover:text-white shadow-[0_0_12px_rgba(14,165,233,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-sm font-semibold">Media</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[11px] font-mono text-sky-300">120 piezas</span>
                  <span className="text-xs text-sky-400/80 group-hover:text-sky-200">→</span>
                </div>
              </button>

              <button
                onClick={() => launchRandomPuzzle(240)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/25 text-pink-200 hover:text-white shadow-[0_0_12px_rgba(236,72,153,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#f472b6]" />
                  <span className="text-sm font-semibold">Difícil</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-[11px] font-mono text-pink-300">240 piezas</span>
                  <span className="text-xs text-pink-400/80 group-hover:text-pink-200">→</span>
                </div>
              </button>

              <button
                onClick={() => launchRandomPuzzle(500)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/25 text-purple-200 hover:text-white shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#c084fc]" />
                  <span className="text-sm font-semibold">¡Imposible! 💀</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[11px] font-mono text-purple-300">500 piezas</span>
                  <span className="text-xs text-purple-400/80 group-hover:text-purple-200">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
