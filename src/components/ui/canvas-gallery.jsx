import React, { useState, useEffect, useMemo, useRef } from 'react';
import InteractiveFlower from './interactive-flower';
import PaperPlane3D from './paper-plane';

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

    // Aplicar volumen solo si cambia significativamente para evitar saturar el motor de audio 60 veces por segundo (Lag Leak)
    if (Math.abs(videoRef.current.volume - vol) > 0.05) {
      videoRef.current.volume = vol;
    }
    
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

export default function CanvasGallery({ items, toggleView, hasFlightMode = true }) {
  const containerRef = useRef(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, z: -2000, yaw: 0, pitch: 0 });
  const [isFlightMode, setIsFlightMode] = useState(false);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Controles de vuelo (WASD + Space + C)
  const keys = useRef({ w: false, a: false, s: false, d: false, ' ': false, c: false });
  const requestRef = useRef();
  
  // Nave de Amor Física
  const shipRef = useRef(null);
  const shipRotation = useRef({ roll: 0, pitch: 0 });

  const scatteredItems = useMemo(() => {
    const random = mulberry32(9999); 
    
    // 1. Generamos un "Universo Maestro" con distribución 3D uniforme
    const BLOCK_X = 8000;
    const BLOCK_Y = 8000;
    const BLOCK_Z = 16000; // Universo más profundo para volar lejos
    
    const baseItems = [];
    
    // Por petición del usuario, NUNCA se deben duplicar imágenes.
    // Iteramos estrictamente sobre las imágenes originales una sola vez.
    items.forEach((item, index) => {
      let x, y, z;
      
      // 🚀 HERO CLUSTER: Asegurar que las primeras 9-12 fotos aparezcan justo frente a la cámara al entrar
      // La cámara inicia en z: -2000, mirando hacia el centro (z: 0)
      if (index < 12) {
        x = (random() * 4000) - 2000; // Esparcidas a lo ancho (-2000 a 2000)
        y = (random() * 2500) - 1250; // Esparcidas a lo alto (-1250 a 1250)
        z = -1000 + (random() * 2500); // Distancia perfecta para que se vean de diferentes tamaños (Z: -1000 a 1500)
      } else {
        // Resto del universo distribuido normalmente
        x = (random() * BLOCK_X) - (BLOCK_X / 2); 
        y = (random() * BLOCK_Y) - (BLOCK_Y / 2);
        z = (random() * BLOCK_Z) - (BLOCK_Z / 2); 
      }

      const rotation = (random() * 30) - 15;
      const width = 250 + (random() * 250);
      
      baseItems.push({ 
        ...item, 
        uniqueId: `${item.id || index}`, // Key única original
        x, y, z, rotation, width 
      });
    });

    return baseItems;
  }, [items]);

  const handleWheel = (e) => {
    if (isFlightMode) return; // En modo vuelo, el wheel se desactiva o se deja para otra cosa
    e.preventDefault();
    const zoomSpeed = 3; 
    setCamera(prev => {
      let newZ = prev.z + (e.deltaY * zoomSpeed);
      
      // BUCLE INFINITO Z
      const BLOCK_Z = 16000;
      if (newZ > BLOCK_Z / 2) newZ -= BLOCK_Z;
      else if (newZ < -BLOCK_Z / 2) newZ += BLOCK_Z;
      
      return { ...prev, z: newZ };
    });
  };

  const handlePointerDown = (e) => {
    if (isFlightMode) return;
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (isFlightMode || !isDragging.current) return;
    
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    setCamera(prev => {
      let newX = prev.x + deltaX * 2;
      let newY = prev.y + deltaY * 2;

      // BUCLE INFINITO EN X
      const BLOCK_X = 8000;
      if (newX > BLOCK_X / 2) newX -= BLOCK_X;
      else if (newX < -BLOCK_X / 2) newX += BLOCK_X;

      // BUCLE INFINITO EN Y
      const BLOCK_Y = 8000;
      if (newY > BLOCK_Y / 2) newY -= BLOCK_Y;
      else if (newY < -BLOCK_Y / 2) newY += BLOCK_Y;

      return { ...prev, x: newX, y: newY };
    });
    
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

  // Bucle de vuelo WASD + Space/C
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar que el Space haga scroll en la página si estamos enfocados
      if (e.key === ' ') e.preventDefault();
      const key = e.key.toLowerCase();
      if (keys.current.hasOwnProperty(key)) keys.current[key] = true;
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (keys.current.hasOwnProperty(key)) keys.current[key] = false;
    };
    
    // Si el usuario cambia de pestaña o hace clic fuera, detener el avión
    const handleBlur = () => {
      keys.current = { w: false, a: false, s: false, d: false, ' ': false, c: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    const updateCamera = () => {
      if (!isFlightMode) {
        requestRef.current = requestAnimationFrame(updateCamera);
        return;
      }

      if (keys.current.w || keys.current.s || keys.current.a || keys.current.d || keys.current[' '] || keys.current.c) {
        setCamera(prev => {
          let newZ = prev.z;
          let newX = prev.x;
          let newY = prev.y;
          let newYaw = prev.yaw || 0;
          let newPitch = prev.pitch || 0;
          
          const flySpeed = 10; // Velocidad de vuelo ultra lenta y relajante
          const turnSpeed = 0.7; // Aumentado para mayor agilidad y precisión de puntería
          const pitchSpeed = 0.6; // Aumentado para mayor agilidad

          // A/D: Girar Izquierda / Derecha (Yaw)
          // A = Izquierda, D = Derecha
          if (keys.current.a) newYaw -= turnSpeed; 
          if (keys.current.d) newYaw += turnSpeed; 

          // Evitar que el Yaw crezca hasta el infinito y cause lag de precisión flotante en CSS
          if (newYaw >= 360) newYaw -= 360;
          if (newYaw <= -360) newYaw += 360; 

          // Espacio/C: Mirar Arriba / Abajo (Pitch)
          // Espacio = Arriba (Pitch negativo), C = Abajo (Pitch positivo)
          if (keys.current[' ']) newPitch -= pitchSpeed; 
          if (keys.current.c) newPitch += pitchSpeed; 
          
          // Limitar el pitch suavemente para evitar el "Gimbal Lock" (que el universo gire como ruleta)
          if (newPitch > 60) newPitch = 60;
          if (newPitch < -60) newPitch = -60;

          // W/S: Acelerar Adelante / Atrás (En la dirección de la cámara)
          if (keys.current.w || keys.current.s) {
            const yawRad = newYaw * (Math.PI / 180);
            const pitchRad = newPitch * (Math.PI / 180);
            
            // Fórmula matemática EXACTA para volar hacia donde miras en CSS 3D
            const dirX = -Math.sin(yawRad) * Math.cos(pitchRad);
            const dirY = -Math.sin(pitchRad); // Corregido: para mirar arriba (pitch negativo), dirY debe ser positivo para que las fotos bajen
            const dirZ = Math.cos(yawRad) * Math.cos(pitchRad);

            // Restaurado a la normalidad: W adelante, S atrás
            const speed = keys.current.w ? flySpeed : -flySpeed;

            newX += dirX * speed;
            newY += dirY * speed;
            newZ += dirZ * speed;
          }

          // Bucle infinito Z
          const WRAP_Z = 16000;
          if (newZ > WRAP_Z / 2) newZ -= WRAP_Z;
          else if (newZ < -WRAP_Z / 2) newZ += WRAP_Z;

          // Tope Y: Límite para que no viajen infinitamente hacia arriba o abajo
          const LIMIT_Y = 3000;
          if (newY > LIMIT_Y) newY = LIMIT_Y;
          else if (newY < -LIMIT_Y) newY = -LIMIT_Y;

          // Bucle infinito X
          const WRAP_X = 8000;
          if (newX > WRAP_X / 2) newX -= WRAP_X;
          else if (newX < -WRAP_X / 2) newX += WRAP_X;

          // --- Animación Física de la Nave de Amor ---
          let targetRoll = 0;
          let targetShipPitch = 0;
          
          if (keys.current.a) targetRoll -= 35; // Alabeo izquierda fuerte al girar
          if (keys.current.d) targetRoll += 35; // Alabeo derecha fuerte al girar
          if (keys.current.w) targetShipPitch += 15; // Inclinación hacia adelante
          if (keys.current.s) targetShipPitch -= 20; // Inclinación hacia atrás
          if (keys.current[' ']) targetShipPitch += 25; // Nariz arriba
          if (keys.current.c) targetShipPitch -= 25; // Nariz abajo

          // Lerp (Suavizado de la rotación)
          shipRotation.current.roll += (targetRoll - shipRotation.current.roll) * 0.1;
          shipRotation.current.pitch += (targetShipPitch - shipRotation.current.pitch) * 0.1;

          if (shipRef.current) {
            shipRef.current.style.transform = `translateX(-50%) perspective(800px) rotateZ(${shipRotation.current.roll}deg) rotateX(${shipRotation.current.pitch}deg)`;
          }
          // -------------------------------------------

          return { ...prev, x: newX, y: newY, z: newZ, yaw: newYaw, pitch: newPitch };
        });
      }
      requestRef.current = requestAnimationFrame(updateCamera);
    };
    
    requestRef.current = requestAnimationFrame(updateCamera);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      cancelAnimationFrame(requestRef.current);
    };
  }, [isFlightMode]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-screen bg-transparent overflow-hidden relative select-none ${isFlightMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
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

      {/* Botón de Modo Vuelo (Premium) */}
      <div className="absolute bottom-6 right-6 z-[120]">
        {hasFlightMode && (
          <button
            onClick={() => {
              setIsFlightMode(prev => {
                const next = !prev;
                if (!next) {
                  // Al salir del modo vuelo, reseteamos el ángulo de la cámara (Yaw y Pitch) a 0
                  setCamera(c => ({ ...c, yaw: 0, pitch: 0 }));
                }
                return next;
              });
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-xl transition-all duration-300 ${
              isFlightMode 
                ? 'bg-pink-500 text-white shadow-pink-500/50 scale-105 border border-pink-400' 
                : 'bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 border border-white/20'
            }`}
          >
            {isFlightMode ? '✈️ MODO VUELO ACTIVO' : '🚀 DESBLOQUEAR MODO VUELO'}
          </button>
        )}
      </div>

      {isFlightMode && (
        <>
          {/* 🎯 MIRA DINÁMICA (HUD) CENTRADA EXACTAMENTE 🎯 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex items-center justify-center opacity-60 pointer-events-none">
            <div className="w-10 h-[2px] bg-pink-300 absolute rounded-full"></div>
            <div className="w-[2px] h-10 bg-pink-300 absolute rounded-full"></div>
            <div className="w-4 h-4 rounded-full border border-pink-400 absolute"></div>
            <div className="w-1 h-1 rounded-full bg-white absolute shadow-[0_0_5px_#fff]"></div>
          </div>

          {/* ✈️ EL AVIÓN DE PAPEL 3D ✈️ */}
          <div 
            ref={shipRef}
            className="absolute top-1/2 left-1/2 mt-20 z-[100] pointer-events-none flex flex-col items-center justify-center transition-transform"
            style={{ transformOrigin: 'center center', transform: 'translateX(-50%) perspective(800px) rotateZ(0deg) rotateX(0deg)' }}
          >
            <div className="relative drop-shadow-[0_15px_30px_rgba(236,72,153,0.8)]">
              <PaperPlane3D />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl animate-[ping_1s_infinite]">💖</div>
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-xl animate-[ping_1.5s_infinite] delay-150">💗</div>
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-lg animate-[ping_2s_infinite] delay-300">💓</div>
            </div>
          </div>
        </>
      )}

      <div 
        className="absolute top-1/2 left-1/2 w-0 h-0"
        style={{ 
          transformStyle: 'preserve-3d',
          // Girar todo el universo para simular la cámara girando
          // El orden correcto para cámara FPS es Yaw primero (rotateY), luego Pitch (rotateX)
          transform: `translate3d(0px, 0px, 0px) rotateY(${camera.yaw || 0}deg) rotateX(${camera.pitch || 0}deg)`
        }}
      >
        {scatteredItems.map((item) => {
          // Matemática Toroidal Perfecta (Torus Wrapping) 3D
          const BLOCK_X = 8000;
          const BLOCK_Y = 8000;
          const BLOCK_Z = 16000;
          
          let absoluteX = ((item.x + camera.x) % BLOCK_X + BLOCK_X) % BLOCK_X;
          if (absoluteX > BLOCK_X / 2) absoluteX -= BLOCK_X;

          let absoluteY = ((item.y + camera.y) % BLOCK_Y + BLOCK_Y) % BLOCK_Y;
          if (absoluteY > BLOCK_Y / 2) absoluteY -= BLOCK_Y;

          let absoluteZ = ((item.z + camera.z) % BLOCK_Z + BLOCK_Z) % BLOCK_Z;
          if (absoluteZ > BLOCK_Z / 2) absoluteZ -= BLOCK_Z;
          
          // Distancia esférica real en 3D para la "Niebla" (Fog)
          // Esto garantiza que sin importar hacia dónde mires, el universo se difumina de forma esférica perfecta.
          const distance = Math.sqrt(absoluteX * absoluteX + absoluteY * absoluteY + absoluteZ * absoluteZ);
          
          let opacity = 1;
          if (distance > 7000) {
            opacity = 0; 
          } else if (distance > 3000) {
            opacity = 1 - ((distance - 3000) / 4000);
          }
          
          // Eliminamos el fade-out de proximidad por completo
          // para que el usuario pueda volar A TRAVÉS de las imágenes si así lo desea.

          return (
            <div
              key={item.uniqueId}
              className="absolute rounded-lg overflow-hidden border border-pink-500/20"
              style={{
                width: `${item.width}px`,
                aspectRatio: '3/4',
                // Al quitar el billboarding, las imágenes tienen profundidad 3D real en el mapa.
                transform: `translate3d(calc(-50% + ${absoluteX}px), calc(-50% + ${absoluteY}px), ${absoluteZ}px) rotateZ(${item.rotation}deg)`,
                opacity: opacity,
                visibility: opacity <= 0.01 ? 'hidden' : 'visible',
                willChange: 'transform, opacity',
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
