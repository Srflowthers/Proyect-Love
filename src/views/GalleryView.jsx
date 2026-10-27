import React, { useState, useEffect, useRef } from 'react';

import { DEMO_IMAGES } from '@/data/demoImages';
import CanvasGallery from '@/components/ui/canvas-gallery';
import InfiniteGallery from '@/components/ui/infinite-gallery-tw';
import Counter from '@/components/ui/counter';
import LuxurySections from '@/components/ui/luxury-sections';
import TreeGallery from '@/components/ui/tree-gallery';
import { logout } from '@/services/authService';
import Dock from '@/components/Dock';
import { GlitterWarp, PALETTES } from '@/components/ui/glitter-warp';

const GalleryView = ({ user, onOpenSettings, onOpenAdmin, onDockVisibilityChange, globalUserData, setGlobalUserData, globalImages, setGlobalImages, globalNextCursor, setGlobalNextCursor }) => {
  const [images, setImages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userData, setUserData] = useState(null);
  const [viewMode, setViewMode] = useState('home');
  const [isWarping, setIsWarping] = useState(false);
  const [musicActive, setMusicActive] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
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
      // Si ya tenemos globalUserData, pintarlo inmediatamente
      if (globalUserData) {
        setUserData(globalUserData);
        if (globalUserData.planExpiresAt) {
          const expDate = new Date(globalUserData.planExpiresAt);
          setIsExpired(expDate.getTime() < Date.now());
        }
      }

      if (globalImages && globalImages.length > 0) {
        setImages(globalImages);
        setNextCursor(globalNextCursor);
      }

      try {
        console.log("[GalleryView] Iniciando carga de usuario e imágenes...");
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        console.log("[GalleryView] Consultando /api/users/me en:", apiUrl);

        console.log("[GalleryView] Auth User UID:", user?.uid, "Email:", user?.email);
        const res = await fetch(`${apiUrl}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("[GalleryView] Respuesta /api/users/me status:", res.status);
        const snap = await res.json().catch(err => {
          console.error("[GalleryView] Error parseando JSON de /api/users/me:", err);
          return null;
        });
        console.log("[GalleryView] Datos obtenidos de /api/users/me:", snap?.data ? { id: snap.data.id || snap.data.uid, email: snap.data.email, coupleId: snap.data.coupleId, galleryImagesCount: snap.data.galleryImages?.length || 0 } : snap);

        if (snap && snap.exists) {
          const data = snap.data;
          setUserData(data);
          if (setGlobalUserData) setGlobalUserData(data);

          if (data.planExpiresAt) {
            const expDate = new Date(data.planExpiresAt);
            setIsExpired(expDate.getTime() < Date.now());
          }

          // Cargar imágenes
          try {
            console.log("[GalleryView] Solicitando /api/images?limit=24...");
            const imgRes = await fetch(`${apiUrl}/api/images?limit=24`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("[GalleryView] Respuesta /api/images status:", imgRes.status);
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              console.log("[GalleryView] Datos de /api/images:", imgData);
              const fetchedImages = imgData.items || [];
              console.log(`[GalleryView] Total imágenes recibidas del backend: ${fetchedImages.length}`, fetchedImages);
              if (fetchedImages.length > 0) {
                setImages(fetchedImages);
                if (setGlobalImages) setGlobalImages(fetchedImages);
              } else {
                console.warn("[GalleryView] La lista de imágenes retornada por el backend está vacía.");
              }
              
              const fetchedCursor = imgData.nextCursor || null;
              setNextCursor(fetchedCursor);
              if (setGlobalNextCursor) setGlobalNextCursor(fetchedCursor);
            } else {
              const errBody = await imgRes.text();
              console.error("[GalleryView] Error HTTP al consultar /api/images:", imgRes.status, errBody);
            }
          } catch (e) {
            console.error("[GalleryView] Excepción en fetch /api/images:", e);
          }
        } else {
          console.warn("[GalleryView] /api/users/me respondió con exists: false o cuerpo nulo:", snap);
        }
      } catch (err) {
        console.error("[GalleryView] Error general en fetchUserData:", err);
      }
    };
    fetchUserData();
  }, [user?.uid]);

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
        const incoming = imgData.items || [];
        if (incoming.length > 0) {
          setImages(prev => {
            const seen = new Set();
            prev.forEach(p => {
              const key = p.public_id || p.id || p.src;
              if (key) seen.add(key);
            });
            const fresh = incoming.filter(item => {
              const key = item.public_id || item.id || item.src;
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        // Si el backend no devuelve un nuevo cursor o ya no hay items nuevos, finalizamos la paginación
        setNextCursor(imgData.nextCursor || null);
      }
    } catch (e) {
      console.error("Error loading more images:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // La carga progresiva ya NO se ejecuta sola cada 2.5s mientras el usuario está quieto.
  // Ahora solo se invoca cuando el usuario realmente se desplaza y explora el universo (onMove / onLoadMore).

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

  // Lógica de Playlist Unificada (MP3/WAV + Spotify)
  const customAudioRef = useRef(null);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  const playlist = React.useMemo(() => {
    let audios = userData?.customAudios?.length > 0 
      ? [...userData.customAudios] 
      : (userData?.customAudioUrl ? [{ url: userData.customAudioUrl, name: 'Canción' }] : []);
      
    if (userData?.spotifyUrl && !audios.some(a => a.isSpotify || (a.url && a.url.includes('spotify')))) {
       audios.push({ url: userData.spotifyUrl, name: 'Spotify Legacy', isSpotify: true });
    }
    return audios;
  }, [userData?.customAudios, userData?.customAudioUrl, userData?.spotifyUrl]);

  useEffect(() => {
    // Solo inicializar el SDK de Spotify si hay al menos una pista de Spotify en la playlist
    const hasSpotify = playlist.some(t => t.isSpotify || (t.url && t.url.includes('spotify')));
    if (!hasSpotify) return;

    if (document.getElementById('spotify-iframe-api-script')) return;

    const script = document.createElement("script");
    script.id = "spotify-iframe-api-script";
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      const element = document.getElementById('spotify-global-iframe');
      if (!element) return;
      const firstSpotifyTrack = playlist.find(t => t.isSpotify || (t.url && t.url.includes('spotify')));
      const options = {
        uri: getSpotifyUri(firstSpotifyTrack?.url || ''),
        width: 300,
        height: 80,
        theme: '0'
      };
      const callback = (EmbedController) => {
        window.spotifyController = EmbedController;
        EmbedController.addListener('playback_update', e => {
          if (e.data.position === e.data.duration && e.data.duration > 0 && e.data.position > 0) {
            setCurrentAudioIndex(prev => (prev + 1) % playlist.length);
          }
        });
      };
      IFrameAPI.createController(element, options, callback);
    };

    return () => {
      window.onSpotifyIframeApiReady = null;
    };
  }, [playlist]);

  useEffect(() => {
    if (playlist.length === 0) {
      if (customAudioRef.current) customAudioRef.current.pause();
      if (window.spotifyController) window.spotifyController.pause();
      return;
    }

    const currentTrack = playlist[currentAudioIndex];
    if (!currentTrack) return;

    const isSpotify = currentTrack.isSpotify || (currentTrack.url && currentTrack.url.includes('spotify'));

    if (isSpotify) {
      if (customAudioRef.current) customAudioRef.current.pause();
      if (window.spotifyController) {
        try {
          window.spotifyController.loadUri(getSpotifyUri(currentTrack.url));
          if (musicActive) {
            Promise.resolve(window.spotifyController.play()).catch(err => {
              // Ignorar error si el usuario no ha interactuado aún o si el iframe está cargando
              console.warn('[Spotify Playback]', err?.message || err);
            });
          }
        } catch (err) {
          console.warn('[Spotify loadUri]', err);
        }
      }
    } else {
      if (window.spotifyController) {
        try {
          Promise.resolve(window.spotifyController.pause()).catch(() => {});
        } catch (e) {}
      }
      
      if (!customAudioRef.current) {
        customAudioRef.current = new Audio(currentTrack.url);
      } else if (customAudioRef.current.src !== currentTrack.url) {
        customAudioRef.current.src = currentTrack.url;
      }
      
      const onPlay = () => setIsAudioPlaying(true);
      const onPause = () => setIsAudioPlaying(false);
      const handleEnded = () => {
        setCurrentAudioIndex(prev => (prev + 1) % playlist.length);
      };

      customAudioRef.current.addEventListener('play', onPlay);
      customAudioRef.current.addEventListener('pause', onPause);
      customAudioRef.current.addEventListener('ended', handleEnded);

      if (musicActive) {
        customAudioRef.current.play()
          .then(() => setIsAudioPlaying(true))
          .catch(e => console.error("Play error", e));
      }

      return () => {
        if (customAudioRef.current) {
          customAudioRef.current.removeEventListener('play', onPlay);
          customAudioRef.current.removeEventListener('pause', onPause);
          customAudioRef.current.removeEventListener('ended', handleEnded);
        }
      };
    }
  }, [playlist, currentAudioIndex, musicActive]);

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
    if (color === 'space') return 'rgba(59,130,246,0.15)'; // Azul tierra y sol
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

      {/* Contenedor persistente para el Iframe de Spotify API */}
      <div className="fixed opacity-0 pointer-events-none -z-50" aria-hidden="true">
        <div id="spotify-global-iframe"></div>
      </div>

      {/* Reproductor de Audio Flotante (Burbuja Compacta) */}
      {(userData?.customAudios?.length > 0 || userData?.customAudioUrl) && (
        <div className={`fixed bottom-4 left-4 z-[100] transition-all duration-700 ${musicActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (customAudioRef.current) {
                if (customAudioRef.current.paused) {
                  customAudioRef.current.play().then(() => setIsAudioPlaying(true)).catch(console.warn);
                } else {
                  customAudioRef.current.pause();
                  setIsAudioPlaying(false);
                }
              } else if (window.spotifyController) {
                try {
                  window.spotifyController.togglePlay();
                  setIsAudioPlaying(prev => !prev);
                } catch (err) {}
              }
            }}
            title={isAudioPlaying ? `Pausar: ${userData?.customAudios?.[currentAudioIndex]?.name || 'Música'}` : `Reproducir: ${userData?.customAudios?.[currentAudioIndex]?.name || 'Música'}`}
            className={`group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md cursor-pointer border ${
              isAudioPlaying 
                ? 'bg-gradient-to-tr from-purple-700/80 via-pink-600/80 to-rose-500/80 border-pink-400/60 shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:scale-105' 
                : 'bg-black/60 border-purple-500/30 text-white/50 hover:text-white hover:border-pink-500/50 hover:bg-black/80'
            }`}
          >
            {/* Anillo de pulso sutil cuando está reproduciendo */}
            {isAudioPlaying && (
              <span className="absolute inset-0 rounded-full border border-pink-400/40 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }}></span>
            )}

            {/* Icono de Nota Musical / Pausa */}
            {isAudioPlaying ? (
              <div className="relative flex items-center justify-center">
                {/* Barras de ecualizador en vivo / pausa al hover */}
                <div className="flex items-center gap-[2.5px] group-hover:hidden">
                  <span className="w-[3px] h-3.5 bg-white rounded-full animate-[pulse_0.8s_ease-in-out_infinite]"></span>
                  <span className="w-[3px] h-4.5 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s]"></span>
                  <span className="w-[3px] h-2.5 bg-white rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.4s]"></span>
                </div>
                {/* Icono pausa cuando pasas el mouse por encima */}
                <svg className="w-4 h-4 text-white hidden group-hover:block" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5 text-pink-300 group-hover:text-white transition-colors ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}

            {/* Tooltip flotante sutil a la derecha al hacer hover */}
            <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              {userData?.customAudios?.[currentAudioIndex]?.name || 'Música de Fondo'}
            </span>
          </button>
        </div>
      )}

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
            sizeMult={userData?.universeParticleSize}
            speedMult={userData?.universeParticleSpeed}
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
                {(() => {
                  if (!images || images.length === 0) return null;
                  
                  // Repartir las imágenes entre las 3 filas cíclicamente
                  const row1Imgs = images.filter((_, idx) => idx % 3 === 0);
                  const row2Imgs = images.filter((_, idx) => idx % 3 === 1);
                  const row3Imgs = images.filter((_, idx) => idx % 3 === 2);

                  // Función auxiliar para asegurar que cada fila tenga suficientes imágenes para llenar la pantalla
                  const buildInfiniteRow = (rowItems) => {
                    const source = rowItems.length > 0 ? rowItems : images;
                    let list = [];
                    // Asegurar al menos 12 imágenes por mitad para que cubra cualquier ancho de pantalla
                    while (list.length < 12) {
                      list = list.concat(source);
                    }
                    return list;
                  };

                  const r1 = buildInfiniteRow(row1Imgs);
                  const r2 = buildInfiniteRow(row2Imgs);
                  const r3 = buildInfiniteRow(row3Imgs);

                  return (
                    <>
                      <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left">
                        {r1.map((img, i) => <img key={`r1a-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                        {r1.map((img, i) => <img key={`r1b-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                      </div>
                      <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '50s', animationDirection: 'reverse' }}>
                        {r2.map((img, i) => <img key={`r2a-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                        {r2.map((img, i) => <img key={`r2b-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                      </div>
                      <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '70s' }}>
                        {r3.map((img, i) => <img key={`r3a-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                        {r3.map((img, i) => <img key={`r3b-${i}`} src={img.src} loading="lazy" className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                      </div>
                    </>
                  );
                })()}
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
          <CanvasGallery 
            items={images} 
            toggleView={toggleView} 
            hasFlightMode={userData?.hasFlightMode} 
            onLoadMore={loadMoreImages} 
          />
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
