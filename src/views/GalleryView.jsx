import React, { useState, useEffect } from 'react';

import { DEMO_IMAGES } from '@/data/demoImages';
import CanvasGallery from '@/components/ui/canvas-gallery';
import InfiniteGallery from '@/components/ui/infinite-gallery-tw';
import Counter from '@/components/ui/counter';
import LuxurySections from '@/components/ui/luxury-sections';
import TreeGallery from '@/components/ui/tree-gallery';
import { logout } from '@/services/authService';
import Dock from '@/components/Dock';
import { GlitterWarp, PALETTES } from '@/components/ui/glitter-warp';

const GalleryView = ({ user, onOpenSettings, onOpenAdmin, onDockVisibilityChange }) => {
  const [images, setImages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userData, setUserData] = useState(null);
  const [viewMode, setViewMode] = useState('home');
  const [isWarping, setIsWarping] = useState(false);
  const [musicActive, setMusicActive] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (onDockVisibilityChange) {
      onDockVisibilityChange(viewMode !== 'home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Fetch real user data and images from Firestore
  useEffect(() => {
    // QA/desarrollo: ?stress=10000 genera N fotos sintéticas para validar la escala
    // (solo existe en dev; el build de producción lo elimina por completo)
    if (import.meta.env.DEV) {
      const stress = parseInt(new URLSearchParams(window.location.search).get('stress') || '', 10);
      if (stress > 0) {
        const base = DEMO_IMAGES;
        setImages(Array.from({ length: stress }, (_, i) => ({
          // DEMO_IMAGES es un array de objetos {src}: hay que extraer el string
          // (si no, <img src=[object Object]> pide /%5Bobject%20Object%5D)
          src: (base.length && base[i % base.length]?.src) || '/fotos/Imagenes-amor/Foto0144.jpg',
          public_id: `stress-${i}`,
          id: `stress-${i}`,
        })));
        return;
      }
    }
    if (!user) {
      // Si es un visitante sin loguear, intentamos obtener las fotos de demostración del backend
      const fetchDemoImages = async () => {
        try {
          const cached = localStorage.getItem('demo-images-v1');
          if (cached) {
            const { t, images } = JSON.parse(cached);
            if (Date.now() - t < 3600000 && images && images.length > 0) {
              setImages(images.map(img => typeof img === 'string' ? { src: img, public_id: img } : img));
              return;
            }
          }
        } catch (e) { }

        try {
          const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/demo-images`);
          if (res.ok) {
            const data = await res.json();
            if (data.images && data.images.length > 0) {
              try {
                localStorage.setItem('demo-images-v1', JSON.stringify({ t: Date.now(), images: data.images }));
              } catch (e) { }
              const mappedImages = data.images.map(img =>
                typeof img === 'string' ? { src: img, public_id: img } : img
              );
              setImages(mappedImages);
              return;
            }
          }
        } catch (err) {
          console.error("Error fetching demo images del backend:", err);
        }
        // Fallback local
        setImages(DEMO_IMAGES);
      };
      fetchDemoImages();
      return;
    }

    const fetchUserData = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const snap = await res.json();

        if (snap.exists) {
          const data = snap.data;
          setUserData(data);

          if (data.planExpiresAt) {
            const expDate = new Date(data.planExpiresAt);
            setIsExpired(expDate.getTime() < Date.now());
          }

          // Petición optimizada a la ruta paginada (evita traer 3000 imágenes de golpe)
          try {
            const imgRes = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/images?limit=70`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              setImages(imgData.items || []);
              setNextCursor(imgData.nextCursor || null);
            } else {
              setImages([]);
            }
          } catch (e) {
            console.error("Error fetching paginated images:", e);
            setImages([]);
          }
        }
      } catch (err) {
        console.error("Error fetching user data from Firestore:", err);
      }
    };
    fetchUserData();
  }, [user]);

  const loadMoreImages = async () => {
    if (!nextCursor || isLoadingMore || !user) return;
    setIsLoadingMore(true);
    try {
      const token = await user.getIdToken();
      // Traemos lotes de 50 para que el universo se expanda más rápido pero sin asfixiar la red
      const imgRes = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/images?limit=50&cursor=${nextCursor}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.items && imgData.items.length > 0) {
          setImages(prev => [...prev, ...imgData.items]);
        }
        setNextCursor(imgData.nextCursor || null);
      }
    } catch (e) {
      console.error("Error loading more images:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Carga progresiva en segundo plano ("lazy loading" automático)
  useEffect(() => {
    if (!nextCursor || isLoadingMore || !user) return;
    const timer = setTimeout(() => {
      loadMoreImages();
    }, 2500); // Cada 2.5 segundos intentará traer el siguiente lote silenciosamente
    return () => clearTimeout(timer);
  }, [nextCursor, isLoadingMore, user]);

  // Helper para extraer la URI de Spotify desde una URL (ej: https://open.spotify.com/track/...)
  const getSpotifyUri = (url) => {
    const defaultUri = 'spotify:track:3lGMtkONrZdJ8kTCg6KIFf';
    if (!url) return defaultUri;
    if (url.includes('spotify:track:')) return url;
    try {
      const parts = url.split('track/');
      if (parts.length > 1) {
        const id = parts[1].split('?')[0].split('&')[0];
        return `spotify:track:${id}`;
      }
    } catch (e) { }
    return defaultUri;
  };

  // Spotify Logic
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      const element = document.getElementById('spotify-global-iframe');
      if (!element) return;
      const options = {
        uri: getSpotifyUri(userData?.spotifyUrl),
        width: 300,
        height: 80,
        theme: '0'
      };
      const callback = (EmbedController) => {
        window.spotifyController = EmbedController;
      };
      IFrameAPI.createController(element, options, callback);
    };

    return () => {
      window.onSpotifyIframeApiReady = null;
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Si cambia el userData (después de montar) y el controller ya existe, actualizar la canción
  useEffect(() => {
    if (userData?.spotifyUrl && window.spotifyController) {
      window.spotifyController.loadUri(getSpotifyUri(userData.spotifyUrl));
    }
  }, [userData?.spotifyUrl]);

  // Routing Logic
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === '3d' || hash === 'rows' || hash === '3dtest') {
        setViewMode(hash);
      } else {
        setViewMode('home');
      }
    };
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeView = (mode) => {
    if (mode === 'home') {
      window.history.pushState(null, '', window.location.pathname);
      setViewMode('home');
    } else {
      window.location.hash = mode;
      setViewMode(mode);
    }
  };

  const triggerEpicTransition = () => {
    setIsWarping(true);
    setTimeout(() => {
      const isTest = window.location.hash.replace('#', '') === '3dtest';
      changeView(isTest ? '3dtest' : '3d');
      setClickCount(0);
    }, 1000);
    setTimeout(() => {
      setIsWarping(false);
    }, 1500);
  };

  const toggleView = () => {
    if (viewMode === '3d') changeView('rows');
    else if (viewMode === 'rows') changeView('3dtest');
    else if (viewMode === '3dtest') changeView('3d');
  };

  const getBannerText = () => {
    if (clickCount === 0) return "¡Haz Tap Tap Tap para Desbloquear!";
    if (clickCount === 1) return "¡Sigue! (1/3)";
    if (clickCount === 2) return "¡Una vez más! (2/3)";
    return "¡Iniciando viaje!";
  };

  if (isExpired) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px]"></div>

        <div className="w-full max-w-md bg-[#111] border border-pink-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(236,72,153,0.1)] text-center relative z-10">
          <div className="w-20 h-20 mx-auto bg-pink-900/30 rounded-full flex items-center justify-center mb-6 border border-pink-500/50">
            <svg className="w-10 h-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif italic text-pink-400 mb-4">Tu universo está en pausa</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Tu plan ha expirado. Renueva tu membresía para seguir disfrutando de tus recuerdos invaluables y mantener viva tu galería.
          </p>
          <a
            href="https://wa.me/56956710377?text=Hola,%20mi%20plan%20ha%20expirado%20y%20deseo%20renovarlo."
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg font-bold shadow-lg shadow-green-500/30 transition-all mb-4 text-white"
          >
            Contactar por WhatsApp para Renovar
          </a>
          <button
            onClick={async () => {
              if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
                await logout();
                window.location.reload();
              }
            }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-semibold"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const getUniverseBgClass = () => {
    const color = userData?.universeColor || 'purple';
    if (color === 'blue') return 'bg-gradient-to-br from-blue-950 via-cyan-900 to-black';
    if (color === 'red') return 'bg-gradient-to-br from-red-950 via-rose-900 to-black';
    if (color === 'gold') return 'bg-gradient-to-br from-yellow-950 via-amber-900 to-black';
    if (color === 'black') return 'bg-gradient-to-br from-gray-900 via-[#111] to-black';
    return 'bg-gradient-to-br from-purple-950 via-pink-900 to-black';
  };

  const getAuraColor = () => {
    const color = userData?.universeColor || 'purple';
    if (color === 'blue') return 'rgba(6,182,212,0.15)'; // Cyan
    if (color === 'red') return 'rgba(239,68,68,0.12)';  // Red
    if (color === 'gold') return 'rgba(245,158,11,0.12)'; // Gold
    if (color === 'black') return 'rgba(156,163,175,0.1)'; // Gray/White
    return 'rgba(131,24,67,0.15)'; // Pink/Purple (Default)
  };

  return (
    <div
      className={`w-screen relative text-white ${viewMode === 'home' ? 'min-h-screen overflow-y-auto overflow-x-hidden bg-black' : `h-screen overflow-hidden overscroll-none ${getUniverseBgClass()}`}`}
      style={viewMode !== 'home' ? { height: '100svh' } : undefined}
    >

      {/* Contenedor Global del Iframe de Spotify API */}
      <div className="fixed opacity-0 pointer-events-none -z-50">
        <div id="spotify-global-iframe"></div>
      </div>

      {viewMode === 'home' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[url('/fotos/Imagenes-amor/IMG_20221008_115919.jpg')] bg-cover bg-center opacity-10 scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1c0f16]/95 to-black" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none" style={{ background: `radial-gradient(circle, ${getAuraColor()} 0%, transparent 70%)` }} />
        </div>
      )}

      {isWarping && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden bg-black">
          <div className="absolute w-64 h-64 bg-pink-500/30 rounded-full animate-warp blur-lg" />
          <div className="absolute w-96 h-96 bg-purple-600/30 rounded-full animate-warp blur-xl" style={{ animationDelay: '0.1s' }} />
          <div className="absolute w-[150vw] h-[150vh] bg-[radial-gradient(circle,transparent_20%,rgba(255,255,255,0.8)_80%)] animate-warp" />
          <div className="absolute inset-0 bg-white animate-flash" />
        </div>
      )}

      {viewMode !== 'home' && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <GlitterWarp
            variant={userData?.universeVariant || 'tunnel'}
            colors={PALETTES[userData?.universePalette || 'Cósmico']}
            background="transparent"
          />
        </div>
      )}

      {viewMode !== 'home' && (
        <button
          onClick={() => changeView('home')}
          className="absolute top-8 left-8 z-[100] px-4 py-2 bg-pink-500/20 hover:bg-pink-500/50 border border-pink-400/50 rounded-full font-bold transition-all hover:scale-105 backdrop-blur-md cursor-pointer"
        >
          ← Volver
        </button>
      )}

      {viewMode === 'home' && (
        <div className="flex flex-col min-h-screen w-full relative z-10">
          <div className="w-full h-32 md:h-40 bg-black/90 border-b border-pink-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative shrink-0 flex items-center justify-center cursor-pointer">
            <div
              className={`w-full h-full relative group transition-transform duration-100 ${clickCount > 0 ? 'scale-[0.98]' : 'scale-100'} active:scale-[0.95]`}
              onClick={() => {
                if (clickCount === 0) {
                  if (window.spotifyController) window.spotifyController.play();
                  setMusicActive(true);
                  setClickCount(1);
                } else if (clickCount === 1) {
                  setClickCount(2);
                } else {
                  setClickCount(3);
                  triggerEpicTransition();
                }
              }}
            >
              <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden opacity-30 group-hover:opacity-70 transition-opacity duration-1000 pointer-events-none py-2 px-1">
                <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left">
                  {images.slice(0, 8).map((img, i) => <img key={`r1a-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                  {images.slice(0, 8).map((img, i) => <img key={`r1b-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                </div>
                <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '50s', animationDirection: 'reverse' }}>
                  {images.slice(8, 16).map((img, i) => <img key={`r2a-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                  {images.slice(8, 16).map((img, i) => <img key={`r2b-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                </div>
                <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '70s' }}>
                  {images.slice(16, 24).map((img, i) => <img key={`r3a-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                  {images.slice(16, 24).map((img, i) => <img key={`r3b-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-black/90 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center justify-center h-full pointer-events-none px-4 text-center">
                <span className={`text-xs md:text-sm uppercase tracking-[0.5em] font-sans mb-2 font-semibold transition-colors duration-300 ${clickCount > 0 ? 'text-white' : 'text-pink-300/70'}`}>
                  {getBannerText()}
                </span>
                <h1 className={`text-3xl md:text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-200 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] transition-all duration-300 ${clickCount === 1 ? 'scale-105' : clickCount === 2 ? 'scale-110' : 'group-hover:scale-[1.02]'}`}>
                  Nuestro Universo
                </h1>
                <div className="w-0 group-hover:w-48 h-[1px] bg-gradient-to-r from-transparent via-pink-400 to-transparent transition-all duration-700 mt-4 opacity-50"></div>
              </div>

              {/* Marca de agua de los nombres en la esquina inferior derecha */}
              {(userData?.user1Name || userData?.user2Name) && (
                <div className="absolute bottom-2 right-4 md:bottom-4 md:right-8 opacity-40 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none">
                  <span className="font-[Caveat,cursive] text-2xl md:text-3xl text-pink-200 italic tracking-wider drop-shadow-md">
                    {userData.user1Name || 'Jorge'} & {userData.user2Name || 'Abigail'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-b from-transparent to-black relative">
            <Counter
              anniversaryDate={userData?.anniversaryDate}
              isGuest={!user}
              customMessage={userData?.customMessage}
            />
          </div>

          <div className="relative z-10 bg-black">
            <LuxurySections userData={userData} />
          </div>
        </div>
      )}

      {viewMode === '3d' && (
        <div className="w-full h-full animate-focus-in relative">
          {images.length === 0 && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none p-4 text-center">
              <h2 className="text-3xl font-serif text-pink-300 italic mb-4">Tu universo está naciendo</h2>
              <p className="text-gray-300 max-w-md">No tienes fotos guardadas aún. Ve a "Configurar" y luego a "Fotos" para empezar a poblar tu universo con recuerdos invaluables.</p>
            </div>
          )}
          <CanvasGallery items={images} toggleView={toggleView} hasFlightMode={userData?.hasFlightMode} />
        </div>
      )}

      {viewMode === 'rows' && (
        <div className="w-full h-full animate-focus-in relative">
          {images.length === 0 && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none p-4 text-center">
              <h2 className="text-3xl font-serif text-pink-300 italic mb-4">Tu universo está naciendo</h2>
              <p className="text-gray-300 max-w-md">No tienes fotos guardadas aún. Ve a "Configurar" y luego a "Fotos" para empezar a poblar tu universo con recuerdos invaluables.</p>
            </div>
          )}
          <InfiniteGallery items={images} toggleView={toggleView} />
        </div>
      )}

      {viewMode === '3dtest' && (
        <div className="w-full h-full animate-focus-in relative">
          {images.length === 0 && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none p-4 text-center">
              <h2 className="text-3xl font-serif text-pink-300 italic mb-4">Tu universo está naciendo</h2>
              <p className="text-gray-300 max-w-md">No tienes fotos guardadas aún. Ve a "Configurar" y luego a "Fotos" para empezar a poblar tu universo con recuerdos invaluables.</p>
            </div>
          )}
          <TreeGallery items={images} toggleView={toggleView} />
        </div>
      )}

      {/* Indicador sutil de que el universo sigue expandiéndose (reemplaza al botón manual) */}
      {(viewMode === '3d' || viewMode === 'rows' || viewMode === '3dtest') && nextCursor && (
        <div className="fixed bottom-4 left-4 z-[100] pointer-events-none opacity-50">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm text-pink-200/80 text-xs font-mono">
            <svg className="animate-spin h-3 w-3 text-pink-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Expandiendo universo...
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryView;
