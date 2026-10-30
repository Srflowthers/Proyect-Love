import React, { useState, useRef } from 'react';
import { GlitterWarp, PALETTES } from '@/components/ui/glitter-warp';
import { GameIcons } from './gameIcons';
import './arcadeCards.css';

const GAME_SCENE_CLASS = {
  gomi: 's-gominola',
  tetris: 's-tetris',
  sudoku: 's-sudoku',
  puzzle: 's-puzzle',
  pool: 's-pool',
  airhockey: 's-airhockey'
};

const ARCADE_META = {
  gomi: {
    title: 'Gominola Romántica',
    subtitle: 'Match-3 de caramelos, ositos y corazones explosivos',
    iconKey: 'gomi',
    tag: 'Casual & Adictivo',
    accent: 'from-pink-500 to-rose-500',
    help: 'Intercambia caramelos adyacentes para juntar 3 o más. ¡Junta corazones para una explosión total!'
  },
  tetris: {
    title: 'Tetris Pareja',
    subtitle: 'Tetris cooperativo diseñado para jugar juntos',
    iconKey: 'tetris',
    tag: 'Cooperativo',
    accent: 'from-purple-500 to-pink-500',
    help: 'Controla las piezas que caen, completa líneas completas y sumen puntos juntos como equipo.'
  },
  sudoku: {
    title: 'Sudoku de Amor',
    subtitle: 'Sudoku colaborativo para resolver desafíos matemáticos',
    iconKey: 'sudoku',
    tag: 'Lógica & Mente',
    accent: 'from-indigo-500 to-cyan-500',
    help: 'Completa la cuadrícula sin repetir números del 1 al 9 en ninguna fila, columna o bloque.'
  },
  puzzle: {
    title: 'Rompecabezas de Recuerdos',
    subtitle: 'Arma tus fotografías favoritas pieza por pieza',
    iconKey: 'puzzle',
    tag: 'Personalizado',
    accent: 'from-amber-500 to-rose-500',
    help: 'Sube o elige una foto especial, arrastra las piezas al tablero y reconstruyan su recuerdo.'
  },
  pool: {
    title: 'Pool 3D en Pareja',
    subtitle: 'Billar 3D con física realista y partidas por turnos',
    iconKey: 'pool',
    tag: '3D Realista',
    accent: 'from-emerald-500 to-teal-500',
    help: 'PC: Clic derecho para mover la mira (360°), mantén Clic izquierdo (o barra FUERZA / Espacio) para ejercer la fuerza y suelta para disparar. Móvil: Desliza para apuntar y mantén FUERZA.'
  },
  test: {
    title: 'Test LP & Oro',
    subtitle: 'Prueba interactiva +1 LP y +1 Oro por clic',
    iconKey: 'test',
    tag: 'Modo Prueba',
    accent: 'from-pink-500 to-yellow-500',
    help: 'Haz clic en el botón para sumar 1 LP y 1 moneda y comprobar su guardado inmediato en Firebase.'
  }
};

export default function ArcadeFrame({ 
  gameKey = 'gomi', 
  gameParams = '',
  userData, 
  user,
  universeBgClass = 'bg-gradient-to-br from-purple-950 via-pink-900 to-black', 
  auraColor = 'rgba(131,24,67,0.18)',
  onBackToCatalog 
}) {
  const meta = ARCADE_META[gameKey] || ARCADE_META.gomi;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Asegurar que el token de sesión esté activo para validar la carga interna del iframe
  React.useEffect(() => {
    if (user?.uid) {
      sessionStorage.setItem('arcade_session_auth', user.uid);
    } else {
      sessionStorage.setItem('arcade_session_auth', 'authenticated_client');
    }
  }, [user]);

  const GameIconComponent = GameIcons[meta.iconKey] || GameIcons.pool;

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Escuchar mensaje del iframe para salir al catálogo (ej. desde el menú del Pool)
  React.useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'EXIT_TO_CATALOG' || e.data?.type === 'ARCADE_EXIT') {
        onBackToCatalog?.();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onBackToCatalog]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-40 w-screen h-screen flex flex-col m-0 p-0 overflow-hidden select-none bg-black"
    >
      {/* Botón universal para volver al catálogo de juegos */}
      {onBackToCatalog && (
        <button
          onClick={onBackToCatalog}
          title="Volver al Catálogo de Juegos"
          className="fixed top-3 left-3 z-[60] px-3.5 py-1.5 bg-black/80 hover:bg-black/95 border border-white/30 hover:border-pink-500/80 rounded-full text-xs font-bold text-gray-200 hover:text-white transition-all backdrop-blur-md flex items-center gap-1.5 shadow-2xl active:scale-95 cursor-pointer pointer-events-auto"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Catálogo</span>
        </button>
      )}

      {/* Contenedor del Juego 100% Pantalla con su fondo real de iconos-arcade */}
      <div 
        className={`relative w-full h-full flex-1 overflow-hidden transition-all duration-300 ${
          gameKey === 'pool' ? `${universeBgClass} border-none` : (GAME_SCENE_CLASS[gameKey] || 's-gominola')
        }`}
        style={gameKey === 'pool' ? {
          background: undefined
        } : undefined}
      >
        
        {/* Fondo de Partículas 3D del Universo idéntico a Perfil / Nuestro Universo */}
        {userData?.universeVariant !== 'none' && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
            <GlitterWarp
              variant={userData?.universeVariant || 'tunnel'}
              colors={PALETTES[userData?.universePalette || 'Cósmico']}
              sizeMult={(userData?.universeParticleSize || 1)}
              speedMult={(userData?.universeParticleSpeed || 1) * 0.9}
              count={35}
              background="transparent"
            />
          </div>
        )}

        {/* Resplandor de Aura Cósmico */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${auraColor} 0%, transparent 75%)` }}
        />

        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-pink-300 gap-3 backdrop-blur-sm">
            <svg className="w-8 h-8 animate-spin text-pink-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30" strokeLinecap="round" className="opacity-40" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-300">
              Cargando {meta.title}...
            </span>
          </div>
        )}

        {/* Iframe del juego a pantalla completa 100% */}
        {(() => {
          const authParam = `auth=${encodeURIComponent(user?.uid || 'authenticated')}`;
          const currentLp = Number(userData?.lp) || 0;
          const currentRound = Number(userData?.round) || 1;
          const currentCoins = Number(userData?.coins) || 0;
          const universeParams = `&uColor=${encodeURIComponent(userData?.universeColor || 'purple')}&uVariant=${encodeURIComponent(userData?.universeVariant || 'tunnel')}&uPalette=${encodeURIComponent(userData?.universePalette || 'Cósmico')}`;
          const userParams = `&lp=${currentLp}&round=${currentRound}&coins=${currentCoins}${universeParams}`;
          const modularGames = ['gomi', 'pool', 'puzzle', 'tetris', 'sudoku', 'test'];
          const gamePath = modularGames.includes(gameKey) ? `/arcade/${gameKey}/index.html` : `/arcade/${gameKey}.html`;
          const fullSrc = `${gamePath}?${authParam}${userParams}${gameParams ? `&${gameParams}` : ''}`;
          return (
            <iframe
              key={`${gameKey}-${iframeKey}-${gameParams}`}
              src={fullSrc}
              title={meta.title}
              onLoad={() => setIsLoading(false)}
              allowtransparency="true"
              className={`relative z-10 w-full h-full border-0 block transition-opacity duration-300 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                height: '100%',
                width: '100%',
                backgroundColor: 'transparent',
                background: 'transparent'
              }}
              loading="eager"
              allow="autoplay; fullscreen"
            />
          );
        })()}
      </div>
    </div>
  );
}
