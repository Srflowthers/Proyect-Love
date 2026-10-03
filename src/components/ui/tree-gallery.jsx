import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Image, QuadraticBezierLine, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';

const BLOCK_HEIGHT = 100; 
const RADIUS = 8;         

function TreeItem({ url, index, total, blockOffset = 0, isVideo }) {
  const ref = useRef();
  
  const [pos, angle] = useMemo(() => {
    const yStep = BLOCK_HEIGHT / total;
    const yBase = index * yStep;
    const y = yBase + blockOffset * BLOCK_HEIGHT;
    
    const a = index * (Math.PI * 2.4); 
    const r = RADIUS + Math.sin(index * 123) * 2;
    
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    
    return [[x, y, z], a];
  }, [index, total, blockOffset]);

  const rotation = useMemo(() => {
    return [0, -angle - Math.PI / 2, 0];
  }, [angle]);

  const trunkPos = [-pos[0], -2, -pos[2]];

  return (
    <group position={pos}>
      <group rotation={rotation}>
        <Image
          ref={ref}
          url={isVideo ? '/fotos/Imagenes-amor/1000043105.jpg' : url} 
          transparent
          side={THREE.DoubleSide}
          scale={[2.2, 2.8]} 
          position={[0, 0, 0]}
          radius={0.1}
        />
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.3, 2.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
        </mesh>
      </group>
      
      {/* Rama Principal (Madera mística) */}
      <QuadraticBezierLine
        start={trunkPos} 
        end={[0, 0, 0]}  
        mid={[trunkPos[0] * 0.5, -1, trunkPos[2] * 0.5]} 
        color="#2c1a12"  
        lineWidth={3.5}
      />
    </group>
  );
}

// Follaje realista (Hojas verdes agrupadas) usando InstancedMesh
function Foliage({ blockOffset }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const leafCount = 1500; // Más hojas para mayor realismo

  const leaves = useMemo(() => {
    const arr = [];
    for (let i = 0; i < leafCount; i++) {
      // Concentrar las hojas cerca de las ramas y darle forma de copa
      const y = Math.random() * BLOCK_HEIGHT + (blockOffset * BLOCK_HEIGHT);
      const angle = Math.random() * Math.PI * 2;
      
      const r = 2 + Math.pow(Math.random(), 1.5) * RADIUS;
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      
      const rotX = Math.random() * Math.PI;
      const rotY = Math.random() * Math.PI;
      const rotZ = Math.random() * Math.PI;
      
      const scale = 0.6 + Math.random() * 0.8;
      
      arr.push({ x, y, z, rotX, rotY, rotZ, scale });
    }
    return arr;
  }, [blockOffset]);

  useEffect(() => {
    if (meshRef.current) {
      leaves.forEach((leaf, i) => {
        dummy.position.set(leaf.x, leaf.y, leaf.z);
        dummy.rotation.set(leaf.rotX, leaf.rotY, leaf.rotZ);
        dummy.scale.set(leaf.scale, leaf.scale * 1.5, leaf.scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [leaves, dummy]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3 + blockOffset) * 0.1;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, leafCount]} frustumCulled={false}>
      {/* Usamos un plano redondeado simulando una hoja real */}
      <circleGeometry args={[0.4, 6]} />
      {/* Tonos verdes naturales y realistas */}
      <meshStandardMaterial 
        color="#2e4c23" 
        emissive="#0a1205"
        side={THREE.DoubleSide} 
        roughness={0.9} 
      />
    </instancedMesh>
  );
}

// Ramas decorativas realistas (Árbol de la Vida)
function DecorativeBranches({ blockOffset }) {
  const branches = useMemo(() => {
    const arr = [];
    for(let i=0; i<60; i++) {
      const y = Math.random() * BLOCK_HEIGHT + (blockOffset * BLOCK_HEIGHT);
      const a = Math.random() * Math.PI * 2;
      const r = RADIUS * 0.9 * Math.random() + 2; 
      
      const start = [0, y - 1, 0];
      const end = [Math.cos(a)*r, y + Math.random()*5, Math.sin(a)*r];
      // Curva natural de una rama hacia arriba
      const mid = [end[0]*0.5, start[1] + 2, end[2]*0.5];
      
      arr.push({ start, end, mid });
    }
    return arr;
  }, [blockOffset]);

  return (
    <group>
      {branches.map((b, i) => (
        <QuadraticBezierLine 
          key={i} 
          start={b.start} 
          end={b.end} 
          mid={b.mid} 
          color="#382215" 
          lineWidth={2 + Math.random() * 3} 
        />
      ))}
    </group>
  );
}

// Tronco Realista (Múltiples raíces retorcidas formando un árbol gigante antiguo)
function TreeOfLifeTrunk() {
  const trunkVines = useMemo(() => {
    const vines = [];
    for(let i=0; i<12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      vines.push(angle);
    }
    return vines;
  }, []);

  return (
    <group position={[0, BLOCK_HEIGHT / 2, 0]}>
      {/* Tronco Central Base (Más ancho abajo) */}
      <mesh frustumCulled={false}>
        <cylinderGeometry args={[1.5, 3.5, BLOCK_HEIGHT * 3, 32]} />
        <meshStandardMaterial color="#2d1c11" roughness={1} />
      </mesh>
      
      {/* Raíces y troncos secundarios retorcidos que le dan realismo 3D */}
      {trunkVines.map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5]} rotation={[0, angle, 0.05]} frustumCulled={false}>
          <cylinderGeometry args={[0.5, 1.5, BLOCK_HEIGHT * 3, 16]} />
          <meshStandardMaterial color="#23150d" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function InfiniteTree({ items }) {
  const { camera } = useThree();
  const virtualScrollY = useRef(0);
  const virtualTargetY = useRef(0);
  // Renderizar 4 bloques en vez de 3 para asegurar que siempre haya hojas arriba
  const [blocks] = useState([-1, 0, 1, 2]); 

  useEffect(() => {
    const handleWheel = (e) => {
      virtualTargetY.current += e.deltaY * 0.05;
      // Piso: ¡No permitir bajar más allá del inicio (raíces)!
      if (virtualTargetY.current < 0) virtualTargetY.current = 0;
    };
    
    let touchStart = 0;
    const handleTouchStart = (e) => touchStart = e.touches[0].clientY;
    const handleTouchMove = (e) => {
      const delta = touchStart - e.touches[0].clientY;
      virtualTargetY.current += delta * 0.1;
      // Piso para móviles
      if (virtualTargetY.current < 0) virtualTargetY.current = 0;
      touchStart = e.touches[0].clientY;
    };

    window.addEventListener('wheel', handleWheel);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  useFrame((state, delta) => {
    // Scroll fluido real hacia el infinito
    virtualScrollY.current = THREE.MathUtils.lerp(virtualScrollY.current, virtualTargetY.current, 0.05);
    
    // Truco matemático: Extraemos el valor del bucle (0 a 100)
    // Cuando virtualScroll pasa de 100 a 101, loopedY vuelve a 1.
    // Como los bloques son repetitivos, este salto de la cámara es 100% invisible.
    const loopedY = virtualScrollY.current % BLOCK_HEIGHT;
    
    camera.position.y = loopedY;
    
    // Rotación amplia constante para ver todo el follaje, sin importar cuánto suba
    const climbProgress = virtualScrollY.current / BLOCK_HEIGHT;
    camera.position.x = Math.sin(climbProgress * Math.PI * 2) * 22;
    camera.position.z = Math.cos(climbProgress * Math.PI * 2) * 22;
    camera.lookAt(0, camera.position.y + 2, 0); 
  });

  return (
    <group>
      <TreeOfLifeTrunk />

      {blocks.map((blockOffset) => (
        <group key={`block-${blockOffset}`}>
          {/* Ramas adicionales para rellenar */}
          <DecorativeBranches blockOffset={blockOffset} />
          
          {/* Follaje denso de Cerezo */}
          <Foliage blockOffset={blockOffset} />

          {/* Fotos colgadas de sus ramas */}
          {items.map((item, i) => (
            <TreeItem 
              key={`item-${blockOffset}-${i}`} 
              url={item.src} 
              index={i} 
              total={items.length} 
              blockOffset={blockOffset}
              isVideo={item.isVideo}
            />
          ))}
        </group>
      ))}

      {blocks.map((blockOffset) => (
        <Fireflies key={`ff-${blockOffset}`} blockOffset={blockOffset} total={60} />
      ))}
    </group>
  );
}

// Luciérnagas Mágicas (Polvo de hadas)
function Fireflies({ blockOffset, total }) {
  const points = useMemo(() => {
    const arr = [];
    for (let i = 0; i < total; i++) {
      const y = Math.random() * BLOCK_HEIGHT + (blockOffset * BLOCK_HEIGHT);
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 18;
      arr.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    }
    return arr;
  }, [blockOffset, total]);

  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.2;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 1;
    }
  });

  return (
    <group ref={ref}>
      {points.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[Math.random() * 0.08 + 0.03, 8, 8]} />
          <meshBasicMaterial color={Math.random() > 0.5 ? "#ffffff" : "#ffb7c5"} transparent opacity={0.6 + Math.random() * 0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function TreeGallery({ items }) {
  return (
    <div className="w-full h-full relative bg-[#050B14] overflow-hidden">
      
      {/* Fondo CSS: Cielo Nocturno y Estrellas */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#02050A] via-[#0A1128] to-[#050B14]" />
        
        {/* LUNA ULTRA REALISTA (Generada con IA) */}
        <img 
          src="/fotos/moon.jpg" 
          alt="Luna Llena"
          className="absolute top-8 right-8 md:top-16 md:right-24 w-48 h-48 md:w-80 md:h-80 object-contain mix-blend-screen opacity-90 drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]"
          style={{
            maskImage: 'radial-gradient(circle at center, black 45%, transparent 60%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 45%, transparent 60%)'
          }}
        />

        {/* Nubes místicas flotando debajo y alrededor de la luna */}
        <div className="absolute top-40 right-10 w-64 h-16 bg-blue-200/5 blur-2xl rounded-full mix-blend-screen" />
        <div className="absolute top-20 right-40 w-96 h-24 bg-purple-300/5 blur-3xl rounded-full mix-blend-screen" />
      </div>

      <Canvas camera={{ position: [0, 0, 15], fov: 60 }} gl={{ alpha: true }}>
        {/* Neblina reducida para poder ver las estrellas y la luna del fondo */}
        <fog attach="fog" args={['#050B14', 15, 45]} />
        <ambientLight intensity={0.4} />
        {/* Luz que simula luna desde la posición aproximada de la luna CSS (arriba a la derecha) */}
        <directionalLight position={[20, 30, -10]} intensity={2.5} color="#e0f2fe" />
        <pointLight position={[0, 0, 0]} intensity={1.5} color="#ffb7c5" distance={40} />
        
        <React.Suspense fallback={null}>
          <InfiniteTree items={items} />
          {/* Estrellas 3D inmersivas */}
          <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
          <Environment preset="night" />
        </React.Suspense>
      </Canvas>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#e0f2fe]/80 text-sm tracking-[0.3em] uppercase pointer-events-none animate-pulse drop-shadow-[0_0_8px_rgba(224,242,254,0.8)]">
        Trepa el Árbol de la Vida
      </div>
    </div>
  );
}
