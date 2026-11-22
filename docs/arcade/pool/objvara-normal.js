/**
 * objvara-normal.js
 * Módulo 3D reutilizable e independiente para generar el objeto de la Vara de Pool en Three.js.
 * Utilizado por Pool 3D, el Estudio de Diseño y la Tienda de Accesorios.
 */

export const POOL_CUE_PRESETS = {
  clasico: {
    id: 'clasico',
    name: 'Vara Clásica Normal',
    shaftColor: '#d9a95f',
    buttColor: '#141418',
    ringsColor: '#fbbf24',
    ferruleColor: '#f8fafc',
    tipColor: '#4aa3df',
    roughness: 0.35,
    metalness: 0.05,
    emissive: '#000000',
    emissiveIntensity: 0
  },
  ebano: {
    id: 'ebano',
    name: 'Ébano Imperial',
    shaftColor: '#1b1b1f',
    buttColor: '#101012',
    ringsColor: '#d4af37',
    ferruleColor: '#f8fafc',
    tipColor: '#d4af37',
    roughness: 0.25,
    metalness: 0.25,
    emissive: '#000000',
    emissiveIntensity: 0
  },
  neon: {
    id: 'neon',
    name: 'Neón Cian',
    shaftColor: '#10202a',
    buttColor: '#091319',
    ringsColor: '#00e5ff',
    ferruleColor: '#00bcd4',
    tipColor: '#00e5ff',
    roughness: 0.28,
    metalness: 0.15,
    emissive: '#00bcd4',
    emissiveIntensity: 0.9
  },
  rubi: {
    id: 'rubi',
    name: 'Carmesí de Amor',
    shaftColor: '#3b0718',
    buttColor: '#20030c',
    ringsColor: '#ff4d94',
    ferruleColor: '#f8fafc',
    tipColor: '#ff4d94',
    roughness: 0.22,
    metalness: 0.35,
    emissive: '#e11d48',
    emissiveIntensity: 0.78
  },
  oro: {
    id: 'oro',
    name: 'Oro Real',
    shaftColor: '#d4af37',
    buttColor: '#593e09',
    ringsColor: '#ffffff',
    ferruleColor: '#ffffff',
    tipColor: '#ffffff',
    roughness: 0.16,
    metalness: 0.95,
    emissive: '#785508',
    emissiveIntensity: 0.28
  },
  galaxia: {
    id: 'galaxia',
    name: 'Vara Cósmica',
    shaftColor: '#1e1035',
    buttColor: '#110820',
    ringsColor: '#e879f9',
    ferruleColor: '#e879f9',
    tipColor: '#e879f9',
    roughness: 0.2,
    metalness: 0.5,
    emissive: '#9333ea',
    emissiveIntensity: 0.88
  }
};

/**
 * Crea y devuelve un THREE.Group con la vara 3D completa.
 * @param {typeof import('three')} THREE
 * @param {Object} options Configuración opcional de colores y materiales
 */
export function createCue3DObject(THREE, options = {}) {
  const presetKey = options.preset || 'clasico';
  const base = POOL_CUE_PRESETS[presetKey] || POOL_CUE_PRESETS.clasico;
  const cfg = { ...base, ...options };

  const group = new THREE.Group();
  group.name = 'PoolCue3D';

  // Materiales
  const shaftMat = new THREE.MeshStandardMaterial({
    color: cfg.shaftColor,
    roughness: cfg.roughness,
    metalness: cfg.metalness,
    emissive: cfg.emissive ? new THREE.Color(cfg.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: cfg.emissiveIntensity || 0
  });

  const buttMat = new THREE.MeshStandardMaterial({
    color: cfg.buttColor,
    roughness: cfg.roughness,
    metalness: Math.min(1, cfg.metalness + 0.2)
  });

  const ringMat = new THREE.MeshStandardMaterial({
    color: cfg.ringsColor,
    roughness: 0.18,
    metalness: 0.92
  });

  const ferruleMat = new THREE.MeshStandardMaterial({
    color: cfg.ferruleColor,
    roughness: 0.18
  });

  const tipMat = new THREE.MeshStandardMaterial({
    color: cfg.tipColor,
    roughness: 0.35
  });

  // 1. Cuerpo / Flecha cónica
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.6, 132, 28), shaftMat);
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = 12;
  group.add(shaft);

  // 2. Mango / Butt
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.6, 54, 28), buttMat);
  butt.rotation.z = -Math.PI / 2;
  butt.position.x = -81;
  group.add(butt);

  // 3. Anillos de unión
  const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(4.75, 4.75, 3.8, 28), ringMat);
  ring1.rotation.z = -Math.PI / 2;
  ring1.position.x = -54;
  group.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 5.4, 4.4, 28), ringMat);
  ring2.rotation.z = -Math.PI / 2;
  ring2.position.x = -108;
  group.add(ring2);

  // 4. Virola
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.25, 6.2, 28), ferruleMat);
  ferrule.rotation.z = -Math.PI / 2;
  ferrule.position.x = 81;
  group.add(ferrule);

  // 5. Puntera de tiza
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.18, 5.5, 28), tipMat);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 86.8;
  group.add(tip);

  // Exponer referencias directas a materiales para updates dinámicos
  group.userData = {
    shaftMat,
    buttMat,
    ringMat,
    ferruleMat,
    tipMat,
    applyPreset: (k) => {
      const p = POOL_CUE_PRESETS[k];
      if (!p) return;
      shaftMat.color.set(p.shaftColor);
      shaftMat.roughness = p.roughness;
      shaftMat.metalness = p.metalness;
      if (p.emissive) {
        shaftMat.emissive.set(p.emissive);
        shaftMat.emissiveIntensity = p.emissiveIntensity;
      } else {
        shaftMat.emissive.set('#000000');
        shaftMat.emissiveIntensity = 0;
      }
      buttMat.color.set(p.buttColor);
      ringMat.color.set(p.ringsColor);
      ferruleMat.color.set(p.ferruleColor);
      tipMat.color.set(p.tipColor);
    }
  };

  return group;
}
