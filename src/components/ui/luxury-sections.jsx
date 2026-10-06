import React, { useState, useEffect } from 'react';
import { CONFIG } from '../../config/configuracion';
import LetterPage from './LetterPage';

export default function LuxurySections({ userData }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [localTheme, setLocalTheme] = useState(userData?.letterStyle || 'modern');

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

  const pages = userData?.letterPages && userData.letterPages.length > 0 && userData.letterPages[0] !== ""
    ? userData.letterPages
    : [
      CONFIG.mensajeFinal || "Página 1",
      "Esta es una segunda página de prueba para que puedas ver cómo funciona la paginación. Puedes editar todas tus páginas o borrarlas desde la sección de Configuración."
    ];
  const userName = userData?.user1Name || CONFIG.nombrePareja;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-32 pb-32">

      {/* SECCIÓN: MÚSICA */}
      {embedUrl && (
        <section className="w-full max-w-4xl px-4 flex flex-col items-center">
          <h3 className="text-3xl md:text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-purple-300 drop-shadow-md mb-4 text-center">
            Nuestra Canción
          </h3>
          <div className="h-[1px] w-24 bg-pink-400/50 mb-12"></div>
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
          {/*
          <div className="flex flex-col items-center w-full max-w-md mb-8 space-y-4">
            
            <div className="flex justify-between items-center w-full">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className={`px-4 py-2 rounded-full border border-pink-500/50 text-sm transition-colors ${currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-pink-500/20 text-pink-200'}`}
              >
                ← Anterior
              </button>
              <span className="text-pink-300 font-serif">
                Página {currentPage + 1} de {pages.length}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                disabled={currentPage === pages.length - 1}
                className={`px-4 py-2 rounded-full border border-pink-500/50 text-sm transition-colors ${currentPage === pages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-pink-500/20 text-pink-200'}`}
              >
                Siguiente →
              </button>
            </div>

            <button
              onClick={() => {
                setLocalTheme(prev => {
                  if (prev === 'modern') return 'parchment';
                  if (prev === 'parchment') return 'burnt';
                  return 'modern';
                });
              }}
              className="px-4 py-1 text-xs uppercase tracking-widest text-pink-400 border border-pink-500/30 rounded-full hover:bg-pink-500/10 transition-colors"
            >
              Estilo actual: {localTheme === 'modern' ? 'Moderno (Crema)' : localTheme === 'parchment' ? 'Antiguo (Pergamino)' : 'Antiguo Quemado'} 🔄
            </button>
          </div>
          */}

          <LetterPage
            key={`${currentPage}-${localTheme}`}
            index={currentPage}
            text={pages[currentPage]}
            title={userData?.letterTitle}
            userName={userName}
            signature={CONFIG.firmaFinal}
            isLastPage={currentPage === pages.length - 1}
            theme={localTheme}
          />
        </section>
      )}

    </div>
  );
}
