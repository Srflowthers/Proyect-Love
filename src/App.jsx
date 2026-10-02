import React, { useState } from 'react';
import CanvasGallery from '@/components/ui/canvas-gallery';
import InfiniteGallery from '@/components/ui/infinite-gallery-tw';
import Counter from '@/components/ui/counter';

const images = [
  { src: '/fotos/Imagenes-amor/1000043105.jpg', title: 'Amor 1' },
  { src: '/fotos/Imagenes-amor/1000046753.jpg', title: 'Amor 2' },
  { src: '/fotos/Imagenes-amor/1000046754.jpg', title: 'Amor 3' },
  { src: '/fotos/Imagenes-amor/1000046762.jpg', title: 'Amor 4' },
  { src: '/fotos/Imagenes-amor/1759337817954.jpg', title: 'Amor 5' },
  { src: '/fotos/Imagenes-amor/7297f1c0d24917110d23963adf0da967.jpg', title: 'Amor 6' },
  { src: '/fotos/Imagenes-amor/Foto0144.jpg', title: 'Amor 7' },
  { src: '/fotos/Imagenes-amor/IMG-20211014-WA0001.jpg', title: 'Amor 8' },
  { src: '/fotos/Imagenes-amor/IMG-20221028-WA0035.jpg', title: 'Amor 9' },
  { src: '/fotos/Imagenes-amor/IMG-20230628-WA0064.jpg', title: 'Amor 10' },
  { src: '/fotos/Imagenes-amor/IMG-20240126-WA0002~3.jpg', title: 'Amor 11' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0018.jpg', title: 'Amor 12' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0028.jpg', title: 'Amor 13' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0050.jpg', title: 'Amor 14' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0065.jpg', title: 'Amor 15' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0094.jpg', title: 'Amor 16' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0100.jpg', title: 'Amor 17' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0103.jpg', title: 'Amor 18' },
  { src: '/fotos/Imagenes-amor/IMG-20240705-WA0067.jpg', title: 'Amor 19' },
  { src: '/fotos/Imagenes-amor/IMG-20240731-WA0007.jpg', title: 'Amor 20' },
  { src: '/fotos/Imagenes-amor/IMG-20240906-WA0001.jpg', title: 'Amor 21' },
  { src: '/fotos/Imagenes-amor/IMG-20250306-WA0050.jpg', title: 'Amor 22' },
  { src: '/fotos/Imagenes-amor/IMG-20250306-WA0067.jpg', title: 'Amor 23' },
  { src: '/fotos/Imagenes-amor/IMG-20250312-WA0015.jpg', title: 'Amor 24' },
  { src: '/fotos/Imagenes-amor/IMG_20220525_112804_946.jpg', title: 'Amor 25' },
  { src: '/fotos/Imagenes-amor/IMG_20220810_173718.jpg', title: 'Amor 26' },
  { src: '/fotos/Imagenes-amor/IMG_20220810_173741.jpg', title: 'Amor 27' },
  { src: '/fotos/Imagenes-amor/IMG_20220831_081917_104.jpg', title: 'Amor 28' },
  { src: '/fotos/Imagenes-amor/IMG_20220913_140824.jpg', title: 'Amor 29' },
  { src: '/fotos/Imagenes-amor/IMG_20221008_093043.jpg', title: 'Amor 30' },
  { src: '/fotos/Imagenes-amor/IMG_20221008_115919.jpg', title: 'Amor 31' },
  { src: '/fotos/Imagenes-amor/IMG_20221109_222313_405.jpg', title: 'Amor 32' },
  { src: '/fotos/Imagenes-amor/IMG_20221203_143747_971.jpg', title: 'Amor 33' },
  { src: '/fotos/Imagenes-amor/IMG_20230104_205354_801.jpg', title: 'Amor 34' },
  { src: '/fotos/Imagenes-amor/IMG_20230121_184407_392.jpg', title: 'Amor 35' },
  { src: '/fotos/Imagenes-amor/IMG_20230131_220451_862.jpg', title: 'Amor 36' },
  { src: '/fotos/Imagenes-amor/IMG_20230329_182657_681.jpg', title: 'Amor 37' },
  { src: '/fotos/Imagenes-amor/IMG_20230329_184446.jpg', title: 'Amor 38' },
  { src: '/fotos/Imagenes-amor/IMG_20231202_201745.jpg', title: 'Amor 39' },
  { src: '/fotos/Imagenes-amor/IMG_20231202_201844.jpg', title: 'Amor 40' },
  { src: '/fotos/Imagenes-amor/IMG_20231202_201856.jpg', title: 'Amor 41' },
  { src: '/fotos/Imagenes-amor/IMG_20231203_162826.jpg', title: 'Amor 42' },
  { src: '/fotos/Imagenes-amor/IMG_20240304_184938~2.jpg', title: 'Amor 43' },
  { src: '/fotos/Imagenes-amor/IMG_20240827_172950.jpg', title: 'Amor 44' },
  { src: '/fotos/Imagenes-amor/IMG_20241001_191820.jpg', title: 'Amor 45' },
  { src: '/fotos/Imagenes-amor/IMG_20241007_214508.jpg', title: 'Amor 46' },
  { src: '/fotos/Imagenes-amor/IMG_20241125_213128.jpg', title: 'Amor 47' },
  { src: '/fotos/Imagenes-amor/IMG_20241203_230756.jpg', title: 'Amor 48' },
  { src: '/fotos/Imagenes-amor/IMG_20241203_230802.jpg', title: 'Amor 49' },
  { src: '/fotos/Imagenes-amor/IMG_20250117_211901.jpg', title: 'Amor 50' },
  { src: '/fotos/Imagenes-amor/IMG_20250327112511468.jpg', title: 'Amor 51' },
  { src: '/fotos/Imagenes-amor/IMG_20250421_182432.jpg', title: 'Amor 52' },
  { src: '/fotos/Imagenes-amor/IMG_20250428_130924.jpg', title: 'Amor 53' },
  { src: '/fotos/Imagenes-amor/IMG_20250428_131034.jpg', title: 'Amor 54' },
  { src: '/fotos/Imagenes-amor/IMG_20251002_132911.jpg', title: 'Amor 55' },
  { src: '/fotos/Imagenes-amor/IMG_20260518_002038.jpg', title: 'Amor 56' },
  { src: '/fotos/Imagenes-amor/IMG_20260819_204656.jpg', title: 'Amor 57' },
  { src: '/fotos/Imagenes-amor/NESECITO BSUCAR DE ESAS.jpg', title: 'Amor 58' },
  { src: '/fotos/Imagenes-amor/Screenshot_20220711-234736.png', title: 'Amor 59' },
  { src: '/fotos/Imagenes-amor/Screenshot_2023-08-17-19-09-10-468_com.discord.jpg', title: 'Amor 60' },
  { src: '/fotos/Imagenes-amor/Screenshot_2023-08-17-19-12-13-574_com.discord.jpg', title: 'Amor 61' },
  { src: '/fotos/Imagenes-amor/Snapchat-1385529188.jpg', title: 'Amor 62' },
  { src: '/fotos/Imagenes-amor/Snapchat-1521522494.jpg', title: 'Amor 63' },
  { src: '/fotos/Imagenes-amor/VID_20240906_202630.mp4', title: 'Amor 64', isVideo: true },
  { src: '/fotos/Imagenes-amor/WIN_20250817_21_06_20_Pro.jpg', title: 'Amor 65' },
  { src: '/fotos/Imagenes-amor/aura.jpg', title: 'Amor 66' },
  { src: '/fotos/Imagenes-amor/b9bc2a4257e373cf1d8822c7a033b453.jpg', title: 'Amor 67' }
];

function App() {
  const [viewMode, setViewMode] = React.useState('home');
  const [isWarping, setIsWarping] = React.useState(false);

  React.useEffect(() => {
    // Escuchar los botones de "Atrás" o "Adelante" del navegador
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === '3d' || hash === 'rows') {
        setViewMode(hash);
      } else {
        setViewMode('home');
      }
    };

    // Revisar el hash actual cuando carga la página
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
    // Activa el efecto de deformación a velocidad de la luz
    setIsWarping(true);
    
    // Cambia la vista cuando la pantalla esté blanca (a la mitad del efecto)
    setTimeout(() => {
      changeView('3d');
    }, 1000);

    // Apaga el efecto después de 1.5s
    setTimeout(() => {
      setIsWarping(false);
    }, 1500);
  };

  const toggleView = () => {
    const nextMode = viewMode === '3d' ? 'rows' : '3d';
    changeView(nextMode);
  };

  return (
    <div className={`w-screen relative text-white ${viewMode === 'home' ? 'min-h-screen overflow-y-auto overflow-x-hidden bg-black' : 'h-screen overflow-hidden bg-gradient-to-br from-purple-950 via-pink-900 to-black'}`}>
      
      {/* Fondo Premium Minimalista para el Inicio */}
      {viewMode === 'home' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[url('/fotos/Imagenes-amor/IMG_20221008_115919.jpg')] bg-cover bg-center opacity-30 blur-2xl scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1c0f16]/90 to-black" />
          {/* Brillo central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-900/20 rounded-full blur-[120px]" />
        </div>
      )}

      {/* --- EFECTO ÉPICO DE WARP (VIAJE A LA LUZ) --- */}
      {isWarping && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden bg-black">
          {/* Luces de "Híper-velocidad" (Puro CSS, sin lag) */}
          <div className="absolute w-64 h-64 bg-pink-500/30 rounded-full animate-warp blur-lg" />
          <div className="absolute w-96 h-96 bg-purple-600/30 rounded-full animate-warp blur-xl" style={{ animationDelay: '0.1s' }} />
          <div className="absolute w-[150vw] h-[150vh] bg-[radial-gradient(circle,transparent_20%,rgba(255,255,255,0.8)_80%)] animate-warp" />
          
          {/* El flash de luz cegadora */}
          <div className="absolute inset-0 bg-white animate-flash" />
        </div>
      )}
      
      {/* Botón Global para Volver al Inicio (Solo visible en las galerías) */}
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
          {/* Banner Expandible de Galería (Ultra Premium) */}
          <div 
            onClick={triggerEpicTransition}
            className="w-full h-32 md:h-40 bg-black/90 border-b border-pink-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer overflow-hidden relative group shrink-0 flex items-center justify-center"
          >
            {/* Fila de imágenes moviéndose en el fondo (3 filas apiladas) */}
            <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden opacity-30 group-hover:opacity-70 transition-opacity duration-1000 blur-[2px] group-hover:blur-[1px] pointer-events-none py-2 px-1">
              {/* Fila 1 */}
              <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left">
                {images.slice(0, 22).map((img, i) => (
                   <img key={`r1a-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />
                ))}
                {images.slice(0, 22).map((img, i) => (
                   <img key={`r1b-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />
                ))}
              </div>
              {/* Fila 2 */}
              <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '50s', animationDirection: 'reverse' }}>
                {images.slice(22, 44).map((img, i) => (
                   <img key={`r2a-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />
                ))}
                {images.slice(22, 44).map((img, i) => (
                   <img key={`r2b-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />
                ))}
              </div>
              {/* Fila 3 */}
              <div className="flex shrink-0 gap-2 h-1/3 animate-scroll-left" style={{ animationDuration: '70s' }}>
                {images.slice(44, 66).map((img, i) => (
                   <img key={`r3a-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />
                ))}
                {images.slice(44, 66).map((img, i) => (
                   <img key={`r3b-${i}`} src={img.src} className="h-full w-auto aspect-[4/3] object-cover rounded-md" alt="" />
                ))}
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-black/90 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center pointer-events-none px-4 text-center">
              <span className="text-xs md:text-sm uppercase tracking-[0.5em] text-pink-300/70 font-sans mb-2 font-semibold">
                Toca para Desbloquear
              </span>
              <h1 className="text-3xl md:text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-200 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] group-hover:scale-[1.02] transition-transform duration-700">
                Nuestro Universo de Recuerdos
              </h1>
              {/* Línea decorativa */}
              <div className="w-0 group-hover:w-48 h-[1px] bg-gradient-to-r from-transparent via-pink-400 to-transparent transition-all duration-700 mt-4 opacity-50"></div>
            </div>
          </div>

          {/* Contador de Tiempo */}
          <div className="flex-1 bg-gradient-to-b from-transparent to-black/80 relative">
            <Counter />
          </div>
        </div>
      )}

      {viewMode === '3d' && (
        <div className="w-full h-full animate-focus-in">
          <CanvasGallery items={images} toggleView={toggleView} />
        </div>
      )}

      {viewMode === 'rows' && (
        <div className="w-full h-full animate-focus-in">
          <InfiniteGallery items={images} toggleView={toggleView} />
        </div>
      )}
    </div>
  );
}

export default App;
