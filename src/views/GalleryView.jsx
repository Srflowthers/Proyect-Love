import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DEMO_IMAGES } from '@/data/demoImages';
import CanvasGallery from '@/components/ui/canvas-gallery';
import InfiniteGallery from '@/components/ui/infinite-gallery-tw';
import Counter from '@/components/ui/counter';
import LuxurySections from '@/components/ui/luxury-sections';
import TreeGallery from '@/components/ui/tree-gallery';

const GalleryView = ({ user, onOpenSettings }) => {
  const [images, setImages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [viewMode, setViewMode] = useState('home');
  const [isWarping, setIsWarping] = useState(false);
  const [musicActive, setMusicActive] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Fetch real user data and images from Firestore
  useEffect(() => {
    if (!user) {
      // Si es un visitante sin loguear, le mostramos todas las fotos de demostración locales
      setImages(DEMO_IMAGES);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          
          if (data.galleryImages && data.galleryImages.length > 0) {
            setImages(data.galleryImages);
          } else {
            // El usuario está logueado pero no tiene imágenes.
            // NO le mostramos la demo, le mostramos SU universo (que actualmente está vacío).
            setImages([]);
          }
        }
      } catch (err) {
        console.error("Error fetching user data from Firestore:", err);
      }
    };
    fetchUserData();
  }, [user]);

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
    } catch(e) {}
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

  return (
    <div className={`w-screen relative text-white ${viewMode === 'home' ? 'min-h-screen overflow-y-auto overflow-x-hidden bg-black' : 'h-screen overflow-hidden bg-gradient-to-br from-purple-950 via-pink-900 to-black'}`}>

      {/* Contenedor Global del Iframe de Spotify API */}
      <div className="fixed opacity-0 pointer-events-none -z-50">
        <div id="spotify-global-iframe"></div>
      </div>

      {viewMode === 'home' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[url('/fotos/Imagenes-amor/IMG_20221008_115919.jpg')] bg-cover bg-center opacity-30 blur-2xl scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1c0f16]/90 to-black" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-900/20 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Botón de Configuración SOLO visible en Home (Y si está logueado) */}
      {viewMode === 'home' && user && onOpenSettings && (
        <button 
          onClick={onOpenSettings}
          className="fixed top-8 right-8 z-[9999] px-6 py-3 bg-black/50 hover:bg-black/80 border border-pink-500/50 backdrop-blur-md text-white rounded-full font-bold shadow-xl transition-all"
        >
          ⚙️ Configurar Mi Universo
        </button>
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
              <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden opacity-30 group-hover:opacity-70 transition-opacity duration-1000 blur-[2px] group-hover:blur-[1px] pointer-events-none py-2 px-1">
                <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left">
                  {images.slice(0, 22).map((img, i) => <img key={`r1a-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                  {images.slice(0, 22).map((img, i) => <img key={`r1b-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                </div>
                <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '50s', animationDirection: 'reverse' }}>
                  {images.slice(22, 44).map((img, i) => <img key={`r2a-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                  {images.slice(22, 44).map((img, i) => <img key={`r2b-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                </div>
                <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '70s' }}>
                  {images.slice(44, 66).map((img, i) => <img key={`r3a-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
                  {images.slice(44, 66).map((img, i) => <img key={`r3b-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />)}
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
        <div className="w-full h-full animate-focus-in">
          <CanvasGallery items={images} toggleView={toggleView} hasFlightMode={userData?.hasFlightMode} />
        </div>
      )}

      {viewMode === 'rows' && (
        <div className="w-full h-full animate-focus-in">
          <InfiniteGallery items={images} toggleView={toggleView} />
        </div>
      )}

      {viewMode === '3dtest' && (
        <div className="w-full h-full animate-focus-in">
          <TreeGallery items={images} toggleView={toggleView} />
        </div>
      )}
    </div>
  );
};

export default GalleryView;
