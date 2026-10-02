import React, { useState, useEffect, useMemo, useRef } from 'react';
import InteractiveFlower from './interactive-flower';

// Generador pseudo-aleatorio
const mulberry32 = (a) => {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Componente especial para videos con Audio Espacial (Proximidad)
const ProximityVideo = ({ item, camera }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Calcular la distancia real en 3D (Teorema de Pitágoras en 3 dimensiones)
    const dx = item.x + camera.x;
    const dy = item.y + camera.y;
    const dz = item.z + camera.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Mapear la distancia a un volumen entre 0.0 y 1.0
    // A 800px o menos = 100% volumen. A más de 3500px = 0% volumen
    let vol = 0;
    if (distance < 800) {
      vol = 1;
    } else if (distance > 3500) {
      vol = 0;
    } else {
      vol = 1 - ((distance - 800) / 2700);
    }

    // Aplicar volumen
    videoRef.current.volume = vol;
    
    // Desmutear si tiene volumen (los navegadores requieren interacción previa)
    if (vol > 0.01 && videoRef.current.muted) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {
        // Ignorar el error de autoplay si el usuario aún no hizo clic en la página
      });
    } else if (vol <= 0.01 && !videoRef.current.muted) {
      videoRef.current.muted = true;
    }

  }, [camera.x, camera.y, camera.z, item.x, item.y, item.z]);

  return (
    <video 
      ref={videoRef}
      src={item.src} 
      className="w-full h-full object-cover pointer-events-none" 
      muted // Inicia muteado para permitir autoplay
      loop 
      autoPlay 
      playsInline
    />
  );
};

export default function CanvasGallery({ items, toggleView }) {
  const containerRef = useRef(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, z: -2000 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const scatteredItems = useMemo(() => {
    const random = mulberry32(9999); 
    
    // 1. Generamos un "Bloque Maestro" de fotos con un tamaño exacto
    const BLOCK_SIZE = 15000;
    const baseItems = [];
    
    // Usamos las fotos, multiplicadas un poco para llenar el bloque
    const massiveItems = [...items, ...items, ...items];
    
    massiveItems.forEach((item) => {
      const x = (random() * 16000) - 8000; 
      const y = (random() * 12000) - 6000;
      // Z va de 0 hasta -15000
      const z = (random() * BLOCK_SIZE) - BLOCK_SIZE; 
      const rotation = (random() * 30) - 15;
      const width = 250 + (random() * 250);
      
      baseItems.push({ ...item, x, y, z, rotation, width });
    });

    // 2. Duplicamos este bloque perfectamente hacia adelante y hacia atrás
    // para que la transición sea 100% invisible
    const finalItems = [];
    baseItems.forEach(item => {
      finalItems.push({ ...item, z: item.z + BLOCK_SIZE });     // Bloque Frontal
      finalItems.push({ ...item, z: item.z });                  // Bloque Central
      finalItems.push({ ...item, z: item.z - BLOCK_SIZE });     // Bloque Trasero 1
      finalItems.push({ ...item, z: item.z - BLOCK_SIZE * 2 }); // Bloque Trasero 2
    });

    return finalItems;
  }, [items]);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 3; 
    setCamera(prev => {
      let newZ = prev.z + (e.deltaY * zoomSpeed);
      
      // BUCLE INFINITO INVISIBLE
      const BLOCK_SIZE = 15000;
      
      // Si avanzamos exactamente el tamaño de un bloque, restamos un bloque
      // Como el diseño es idéntico, el salto de 15000px es visualmente indetectable
      if (newZ > BLOCK_SIZE) {
        newZ -= BLOCK_SIZE;
      } 
      // Si retrocedemos exactamente el tamaño de un bloque, sumamos un bloque
      else if (newZ < 0) {
        newZ += BLOCK_SIZE;
      }
      
      return { ...prev, z: newZ };
    });
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    setCamera(prev => ({
      ...prev,
      x: prev.x + deltaX * 2,
      y: prev.y + deltaY * 2
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowTitle(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-screen bg-transparent overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
      style={{ perspective: '1200px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <InteractiveFlower onClick={toggleView} />

      {showTitle && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center animate-[fadeOut_1s_ease-in_2s_forwards]">
          <h1 className="text-2xl font-bold tracking-widest text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            UNIVERSO DE RECUERDOS
          </h1>
        </div>
      )}

      <div 
        className="absolute top-1/2 left-1/2 w-0 h-0"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: `translate3d(${camera.x}px, ${camera.y}px, ${camera.z}px)`
        }}
      >
        {scatteredItems.map((item, i) => {
          // Profundidad real respecto a la cámara
          const absoluteZ = item.z + camera.z;
          
          // Lógica de "Niebla"
          let opacity = 1;
          
          if (absoluteZ < -15000) {
            opacity = 0; // Extremadamente lejos
          } else if (absoluteZ < -6000) {
            opacity = 1 - ((-6000 - absoluteZ) / 9000);
          } else if (absoluteZ > 1200) {
            opacity = 0; 
          } else if (absoluteZ > 600) {
            opacity = 1 - ((absoluteZ - 600) / 600);
          }

          // Filtro para mejorar el rendimiento ocultando lo que no se ve
          if (opacity <= 0.01) return null;

          return (
            <div
              key={i}
              className="absolute rounded-lg overflow-hidden shadow-[0_30px_60px_rgba(236,72,153,0.3)] border border-pink-500/20"
              style={{
                width: `${item.width}px`,
                aspectRatio: '3/4',
                transform: `translate3d(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px), ${item.z}px) rotateZ(${item.rotation}deg)`,
                opacity: opacity,
                // Aplicamos un filtro de brillo para que se oscurezcan de lejos
                filter: `brightness(${Math.max(0.3, opacity)})`,
                pointerEvents: opacity > 0.5 ? 'auto' : 'none',
                // Quité transition para que el scroll del mouse no tenga delay y sea más reactivo al calcular opacity en tiempo real
              }}
            >
              {item.isVideo ? (
                <ProximityVideo item={item} camera={camera} />
              ) : (
                <img 
                  src={item.src} 
                  alt={item.title} 
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
