import React, { useState, useEffect } from 'react';
import { CONFIG } from '../../config/configuracion';
import LetterPage from './LetterPage';

// Contorno de alturas de onda (inspirado exactamente en la referencia visual de audio)
const WAVEFORM_BARS = [
  12, 14, 16, 20, 28, 48, 64, 52, 34, 22, 28, 42, 60, 50, 36, 24, 
  32, 54, 76, 62, 40, 26, 32, 52, 78, 100, 86, 60, 38, 24, 30, 48, 
  70, 84, 62, 42, 28, 34, 50, 44, 30, 22, 30, 52, 66, 50, 32, 18
];

const formatTime = (secs) => {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function LuxurySections({
  userData,
  playlist = [],
  currentAudioIndex = 0,
  setCurrentAudioIndex,
  isAudioPlaying = false,
  setIsAudioPlaying,
  customAudioRef,
  musicActive = false,
  setMusicActive
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [localTheme, setLocalTheme] = useState(userData?.letterStyle || 'modern');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Escuchar tiempo y duración del elemento de audio nativo
  useEffect(() => {
    const audio = customAudioRef?.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleDuration);
    audio.addEventListener('durationchange', handleDuration);

    if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
    if (audio.currentTime) {
      setCurrentTime(audio.currentTime);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleDuration);
      audio.removeEventListener('durationchange', handleDuration);
    };
  }, [customAudioRef, currentAudioIndex]);

  // Si userData cambia (ej. el usuario guarda en Configuración), actualizamos el tema local
  useEffect(() => {
    if (userData?.letterStyle) {
      setLocalTheme(userData.letterStyle);
    }
  }, [userData?.letterStyle]);

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('spotify.com/embed/')) return url;
    const match = url.match(/spotify\.com\/(?:[a-zA-Z-]+\/)?(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    return url;
  };

  const embedUrl = getEmbedUrl(userData?.spotifyUrl || CONFIG.spotifyUrl);

  // Detectar si el usuario tiene audios propios subidos (MP3/WAV)
  const hasCustomAudio = (userData?.customAudios && userData.customAudios.length > 0) || !!userData?.customAudioUrl;

  // Lista de canciones activas
  const activePlaylist = React.useMemo(() => {
    if (playlist && playlist.length > 0) return playlist;
    if (userData?.customAudios && userData.customAudios.length > 0) return userData.customAudios;
    if (userData?.customAudioUrl) return [{ url: userData.customAudioUrl, name: 'Nuestra Canción' }];
    return [];
  }, [playlist, userData?.customAudios, userData?.customAudioUrl]);

  const currentTrack = activePlaylist[currentAudioIndex] || activePlaylist[0];
  const currentTrackName = currentTrack?.name || 'Nuestra Canción Especial';

  // Toggle Play / Pausa
  const handleTogglePlay = () => {
    if (setMusicActive) setMusicActive(true);
    let audio = customAudioRef?.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setIsAudioPlaying?.(true)).catch(console.warn);
    } else {
      audio.pause();
      setIsAudioPlaying?.(false);
    }
  };

  // Adelantar o retroceder haciendo clic en cualquier barra de la onda sonora
  const handleWaveformClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    if (customAudioRef?.current) {
      const audio = customAudioRef.current;
      if (setMusicActive) setMusicActive(true);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        audio.currentTime = percentage * audio.duration;
        setCurrentTime(audio.currentTime);
        if (audio.paused) {
          audio.play().then(() => setIsAudioPlaying?.(true)).catch(console.warn);
        }
      }
    }
  };

  const handlePrevTrack = () => {
    if (activePlaylist.length <= 1) return;
    if (setCurrentAudioIndex) {
      setCurrentAudioIndex(prev => (prev - 1 + activePlaylist.length) % activePlaylist.length);
    }
  };

  const handleNextTrack = () => {
    if (activePlaylist.length <= 1) return;
    if (setCurrentAudioIndex) {
      setCurrentAudioIndex(prev => (prev + 1) % activePlaylist.length);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) : 0;

  // Extraer las páginas base recibidas
  const rawPages = userData?.letterPages && userData.letterPages.length > 0 && userData.letterPages[0] !== ""
    ? userData.letterPages
    : [
      CONFIG.mensajeFinal || "Página 1",
      "Esta es una segunda página de prueba para que puedas ver cómo funciona la paginación. Puedes editar todas tus páginas o borrarlas desde la sección de Configuración."
    ];

  // Filtrar páginas que tengan contenido real (título O texto en el cuerpo)
  const isPageNotEmpty = (text, idx) => {
    const title = userData?.letterTitles?.[idx] !== undefined 
      ? userData?.letterTitles?.[idx] 
      : (idx === 0 ? (userData?.letterTitle || '') : '');
    
    // Limpiar HTML para ver si hay texto real
    const cleanText = (text || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const cleanTitle = (title || '').trim();

    return cleanText.length > 0 || cleanTitle.length > 0;
  };

  const pages = rawPages
    .map((text, originalIndex) => ({
      text,
      originalIndex,
      title: userData?.letterTitles?.[originalIndex] !== undefined 
        ? userData?.letterTitles?.[originalIndex] 
        : (originalIndex === 0 ? (userData?.letterTitle || '') : '')
    }))
    .filter(item => isPageNotEmpty(item.text, item.originalIndex));

  // Asegurar que currentPage no sobrepase el nuevo límite si se borraron páginas
  useEffect(() => {
    if (currentPage >= pages.length && pages.length > 0) {
      setCurrentPage(pages.length - 1);
    }
  }, [pages.length, currentPage]);

  const userName = userData?.user1Name || CONFIG.nombrePareja;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-32 pb-32">

      {/* SECCIÓN: MÚSICA (NUESTRA CANCIÓN) */}
      {(hasCustomAudio || embedUrl) && (
        <section className="w-full max-w-4xl px-4 flex flex-col items-center">
          <div className="flex flex-col items-center mb-8 text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-400 bg-pink-950/60 border border-pink-500/30 px-3.5 py-1 rounded-full mb-3 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
              Banda Sonora de Nuestro Universo
            </span>
            <h3 className="text-3xl md:text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-300 drop-shadow-md">
              Nuestra Canción
            </h3>
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-pink-400 to-transparent mt-4"></div>
          </div>

          {hasCustomAudio ? (
            /* REPRODUCTOR ELEGANTE CON VISUALIZADOR DE ONDA DE AUDIO (SOUNDWAVE) */
            <div className="w-full bg-gradient-to-b from-slate-950/90 via-[#0d0d14]/95 to-purple-950/40 p-6 sm:p-8 rounded-3xl border border-pink-500/30 backdrop-blur-xl shadow-[0_0_60px_rgba(236,72,153,0.2)] relative overflow-hidden group">
              {/* Resplandor ambiental de fondo */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Cabecera: Disco Giratorio + Info de la Pista */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Disco de Vinilo animado */}
                  <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-gray-900 via-purple-950 to-pink-900 border-2 border-pink-500/40 flex items-center justify-center shadow-lg shrink-0 ${isAudioPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <div className="absolute inset-1.5 rounded-full border border-white/10" />
                    <div className="absolute inset-3.5 rounded-full border border-white/5" />
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-inner">
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    </div>
                  </div>

                  {/* Nombre y datos */}
                  <div className="min-w-0">
                    <h4 className="text-lg sm:text-xl font-serif font-bold text-white truncate drop-shadow-sm">
                      {currentTrackName}
                    </h4>
                    <p className="text-xs text-pink-300/80 font-medium mt-0.5 flex items-center gap-2">
                      <span>Pista {currentAudioIndex + 1} de {activePlaylist.length}</span>
                      <span>•</span>
                      <span className="text-indigo-300">Audio Personalizado</span>
                    </p>
                  </div>
                </div>

                {/* Badge de Estado: Sonando / En Pausa */}
                <div className="self-start sm:self-center shrink-0">
                  <div className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all ${
                    isAudioPlaying 
                      ? 'bg-pink-950/60 border-pink-500/40 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                      : 'bg-gray-900/80 border-gray-800 text-gray-400'
                  }`}>
                    {isAudioPlaying ? (
                      <>
                        <span className="flex gap-1 items-end h-3">
                          <span className="w-1 bg-pink-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" style={{ height: '70%' }}></span>
                          <span className="w-1 bg-purple-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" style={{ height: '100%' }}></span>
                          <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" style={{ height: '50%' }}></span>
                        </span>
                        <span>Sonando</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-gray-500" />
                        <span>En Pausa</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* VISUALIZADOR DE ONDA DE AUDIO (WAVEFORM) INTERACTIVO */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 mb-5 relative z-10 backdrop-blur-md">
                <div
                  onClick={handleWaveformClick}
                  className="w-full h-16 sm:h-20 flex items-center justify-between cursor-pointer group/wave select-none"
                  title="Haz clic para adelantar o retroceder la canción"
                >
                  {WAVEFORM_BARS.map((baseH, idx) => {
                    const barProgress = idx / WAVEFORM_BARS.length;
                    const isPlayed = progress >= barProgress;
                    const animDelay = `${(idx % 12) * 0.08}s`;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex items-center justify-center h-full px-[1px] sm:px-[1.5px]"
                      >
                        <span
                          className={`w-full rounded-full transition-all duration-150 ${
                            isPlayed
                              ? 'bg-gradient-to-t from-blue-500 via-indigo-400 to-pink-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                              : 'bg-white/20 group-hover/wave:bg-white/30'
                          } ${isAudioPlaying ? 'animate-soundwave' : ''}`}
                          style={{
                            height: `${baseH}%`,
                            minHeight: '6px',
                            animationDelay: animDelay,
                            animationDuration: '1.1s',
                            animationIterationCount: 'infinite',
                            animationTimingFunction: 'ease-in-out'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Tiempos de reproducción (Actual / Total) */}
                <div className="flex justify-between items-center text-xs font-mono mt-2 px-1 text-gray-400">
                  <span className="text-pink-300 font-semibold">{formatTime(currentTime)}</span>
                  <span className="text-gray-500">
                    {duration > 0 ? formatTime(duration) : '--:--'}
                  </span>
                </div>
              </div>

              {/* BARRA DE CONTROLES */}
              <div className="flex items-center justify-between relative z-10">
                {/* Control de pistas previo / siguiente si hay más de 1 audio */}
                <div className="flex items-center gap-2">
                  {activePlaylist.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevTrack}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10 active:scale-95 cursor-pointer"
                        title="Canción anterior"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTrack}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10 active:scale-95 cursor-pointer"
                        title="Siguiente canción"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Botón Central Grande: Play / Pause con Resplandor */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-pink-400/50"
                    title={isAudioPlaying ? "Pausar música" : "Reproducir música"}
                  >
                    {isAudioPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 ml-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Botón Mute / Sonido */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (customAudioRef?.current) {
                        customAudioRef.current.muted = !customAudioRef.current.muted;
                        setIsMuted(customAudioRef.current.muted);
                      }
                    }}
                    className={`p-2.5 rounded-full transition-all border cursor-pointer ${
                      isMuted 
                        ? 'bg-red-950/60 border-red-500/40 text-red-400' 
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
                    }`}
                    title={isMuted ? "Activar sonido" : "Silenciar"}
                  >
                    {isMuted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* SPOTIFY IFRAME FALLBACK (Solo si no hay audio MP3 propio subido) */
            <div className="w-full premium-glass p-2 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(236,72,153,0.15)]">
              <iframe
                src={embedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allowFullScreen=""
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: '24px' }}
              ></iframe>
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN: LÍNEA DE TIEMPO (HISTORIA) */}
      {/* 
      {CONFIG.historia && CONFIG.historia.length > 0 && (
        <section className="w-full max-w-4xl px-4 flex flex-col items-center relative">
          <h3 className="text-3xl md:text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-200 drop-shadow-md mb-4 text-center">
            Nuestra Historia
          </h3>
          <div className="h-[1px] w-24 bg-purple-400/50 mb-16"></div>
          
          <div className="relative border-l border-white/20 ml-4 md:ml-0 md:pl-0">
            {CONFIG.historia.map((paso, index) => (
              <div key={index} className="mb-12 ml-6 md:ml-0 flex flex-col md:flex-row items-start md:items-center relative group">
                <div className="absolute -left-[35px] md:-left-[24px] top-0 md:top-auto w-12 h-12 rounded-full bg-black border border-pink-400/30 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(236,72,153,0.2)] group-hover:scale-110 group-hover:border-pink-300 transition-all">
                  {paso.icono}
                </div>
                <div className="md:ml-12 premium-glass p-6 rounded-2xl border border-white/5 w-full md:w-[400px]">
                  <h4 className="text-xl font-bold text-pink-100 mb-2">{paso.titulo}</h4>
                  <p className="text-white/60 font-light">{paso.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      */}

      {/* SECCIÓN: CUENTITOS */}
      {/* 
      {CONFIG.cuentos && CONFIG.cuentos.length > 0 && (
        <section className="w-full max-w-6xl px-4 flex flex-col items-center">
          <h3 className="text-3xl md:text-5xl font-serif italic text-white drop-shadow-md mb-4 text-center">
            Nuestros Cuentitos
          </h3>
          <div className="h-[1px] w-24 bg-white/30 mb-16"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CONFIG.cuentos.map((cuento, i) => (
              <div key={i} className="premium-glass p-8 rounded-3xl border border-white/10 hover:border-pink-500/30 transition-colors flex flex-col items-center text-center group">
                <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">{cuento.emoji}</span>
                <h4 className="text-xl font-bold text-pink-200 mb-2">{cuento.titulo}</h4>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-4 font-semibold">{cuento.subtitulo}</p>
                <p className="text-sm text-white/70 font-light leading-relaxed">{cuento.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      */}

      {/* SECCIÓN: CARTA FINAL */}
      {pages.length > 0 && (
        <section className="w-full max-w-3xl px-4 flex flex-col items-center mt-16 pb-16">
          {pages.length > 1 && (
            <div className="flex flex-col items-center w-full max-w-md mb-8 space-y-4">
              <div className="flex justify-between items-center w-full bg-black/60 border border-pink-500/20 backdrop-blur-md px-6 py-3 rounded-full shadow-[0_0_25px_rgba(236,72,153,0.15)]">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className={`px-4 py-1.5 rounded-full border border-pink-500/40 text-xs md:text-sm font-semibold transition-all flex items-center gap-1 ${
                    currentPage === 0 
                      ? 'opacity-20 cursor-not-allowed border-gray-700 text-gray-500' 
                      : 'hover:bg-pink-500/20 text-pink-200 active:scale-95'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </button>

                <div className="flex flex-col items-center">
                  <span className="text-pink-200 font-serif text-sm md:text-base font-semibold tracking-wide">
                    Página {currentPage + 1} de {pages.length}
                  </span>
                  <div className="flex gap-1.5 mt-1">
                    {pages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === currentPage 
                            ? 'w-5 bg-gradient-to-r from-pink-500 to-purple-500' 
                            : 'w-1.5 bg-gray-600 hover:bg-gray-400'
                        }`}
                        title={`Ir a página ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                  disabled={currentPage === pages.length - 1}
                  className={`px-4 py-1.5 rounded-full border border-pink-500/40 text-xs md:text-sm font-semibold transition-all flex items-center gap-1 ${
                    currentPage === pages.length - 1 
                      ? 'opacity-20 cursor-not-allowed border-gray-700 text-gray-500' 
                      : 'hover:bg-pink-500/20 text-pink-200 active:scale-95'
                  }`}
                >
                  Siguiente
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {pages[currentPage] && (
            <LetterPage
              key={userData?.letterStyles?.[pages[currentPage].originalIndex] || localTheme}
              index={currentPage}
              text={pages[currentPage].text}
              title={pages[currentPage].title}
              userName={userName}
              signature={CONFIG.firmaFinal}
              isLastPage={currentPage === pages.length - 1}
              theme={userData?.letterStyles?.[pages[currentPage].originalIndex] || localTheme}
              textColor={userData?.letterTextColors?.[pages[currentPage].originalIndex] || userData?.letterTextColor}
              titleColor={userData?.letterTitleColors?.[pages[currentPage].originalIndex] || userData?.letterTitleColor}
              textFont={userData?.letterFonts?.[pages[currentPage].originalIndex] || userData?.letterFont}
              textAlign={userData?.letterAligns?.[pages[currentPage].originalIndex] || userData?.letterAlign}
            />
          )}
        </section>
      )}

    </div>
  );
}
