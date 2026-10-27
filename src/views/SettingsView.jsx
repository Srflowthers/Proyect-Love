import React, { useState, useEffect, useRef } from 'react';

import imageCompression from 'browser-image-compression';
import { PLANS } from '@/services/userService';
import { logout } from '@/services/authService';
import Dock from '@/components/Dock';
import { GlitterWarp, VARIANTS, PALETTES } from '@/components/ui/glitter-warp';
import ProfileTab from './settings/ProfileTab';
import LettersTab from './settings/LettersTab';
import ImagesTab from './settings/ImagesTab';
import MusicTab from './settings/MusicTab';
import ExpiredPlanModal from '@/components/ui/ExpiredPlanModal';

const SettingsView = ({ user, onSaveComplete, initialTab = 'profile', globalUserData, setGlobalUserData, globalImages, setGlobalImages, globalNextCursor, setGlobalNextCursor, onOpenPricing }) => {
  const [expiredActionModal, setExpiredActionModal] = useState({ isOpen: false, actionName: '' });
  const [formData, setFormData] = useState({
    user1Name: '',
    user2Name: '',
    anniversaryDate: '',
    pets: '',
    kids: '',
    spotifyUrl: '',
    customMessage: '',
    letterPages: ['Escribe aquí todo lo que sientes por esa persona especial...\n\nPuedes borrar este texto de ejemplo y utilizar todas las páginas que necesites para expresar tu amor y crear un recuerdo inolvidable.'],
    letterTitle: 'Mi Primera Carta',
    letterStyle: 'modern',
    letterStyles: [],
    letterTitles: [],
    letterFonts: [],
    letterAligns: [],
    letterTextColors: [],
    letterTextColor: '',
    letterFont: 'georgia',
    letterAlign: 'left',
    letterShowTitle: true,
    universeColor: 'purple',
    universePalette: 'Cósmico',
    universeVariant: 'tunnel',
    universeParticleSize: 1,
    universeParticleSpeed: 1,
    customAudioUrl: '',
    customAudios: [],
    arcadeName: ''
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  
  // Bandera Maestra de Arquitectura: Forzado a TRUE para testing en local
    
  // Paginación de Imágenes
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalImages, setTotalImages] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const observerRef = useRef(null);

  const isInitialLoad = useRef(true);
  const debounceTimerRef = useRef(null);

  // Autoguardado global de formData (excluye cartas para que el usuario guarde manualmente sin lag ni re-render al escribir)
  const prevLetterDataRef = useRef({
    letterPages: formData.letterPages,
    letterTitle: formData.letterTitle,
    letterStyle: formData.letterStyle,
    letterStyles: formData.letterStyles,
    letterTitles: formData.letterTitles,
    letterFonts: formData.letterFonts,
    letterAligns: formData.letterAligns,
    letterTextColors: formData.letterTextColors,
    letterTitleColors: formData.letterTitleColors,
    letterTextColor: formData.letterTextColor,
    letterTitleColor: formData.letterTitleColor,
    letterFont: formData.letterFont,
    letterAlign: formData.letterAlign,
    letterShowTitle: formData.letterShowTitle
  });

  useEffect(() => {
    if (isInitialLoad.current || !user) return;
    
    // Comparar si el único cambio fue en cartas
    const currentLetters = {
      letterPages: formData.letterPages,
      letterTitle: formData.letterTitle,
      letterStyle: formData.letterStyle,
      letterStyles: formData.letterStyles,
      letterTitles: formData.letterTitles,
      letterFonts: formData.letterFonts,
      letterAligns: formData.letterAligns,
      letterTextColors: formData.letterTextColors,
      letterTitleColors: formData.letterTitleColors,
      letterTextColor: formData.letterTextColor,
      letterTitleColor: formData.letterTitleColor,
      letterFont: formData.letterFont,
      letterAlign: formData.letterAlign,
      letterShowTitle: formData.letterShowTitle
    };
    const letterChanged = JSON.stringify(currentLetters) !== JSON.stringify(prevLetterDataRef.current);
    prevLetterDataRef.current = currentLetters;

    if (letterChanged) {
      // Si el cambio proviene de editar cartas, NO disparar el autoguardado automático
      return;
    }
    
    const isSilent = formData._silentSave;

    if (isExpired) {
      // Si el plan expiró, no persistir cambios en el backend
      return;
    }

    if (!isSilent) {
      setSaveStatus('saving'); // Feedback instantáneo solo para textos/inputs
    }
    
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        
        // Remove _silentSave before sending
        const { _silentSave, ...dataToSend } = formData;
        
        const res = await fetch(`${apiUrl}/api/users/me`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });
        if (!res.ok) throw new Error("Fallo al autoguardar");

        if (setGlobalUserData) {
          setGlobalUserData(prev => ({ ...(prev || {}), ...dataToSend }));
        }
        
        if (!isSilent) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 2500);
        }
      } catch (error) {
        console.error("Error en autoguardado:", error);
        if (!isSilent) {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(''), 3000);
        }
      }
    }, 1500); // Esperar 1.5s de inactividad antes de golpear el backend
  }, [formData, user]);

  // Prevenir cierre accidental de pestaña si hay datos pendientes de guardar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = ''; // Muestra la advertencia nativa del navegador
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Asegurar que no se pierdan datos si el usuario cambia de vista dentro de la app (desmontaje)
  const formDataRef = useRef(formData);
  const saveStatusRef = useRef(saveStatus);
  const userRef = useRef(user);

  useEffect(() => {
    formDataRef.current = formData;
    saveStatusRef.current = saveStatus;
    userRef.current = user;
  }, [formData, saveStatus, user]);

  useEffect(() => {
    return () => {
      if (saveStatusRef.current === 'saving' && userRef.current) {
        userRef.current.getIdToken().then(token => {
          const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
          fetch(`${apiUrl}/api/users/me`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(formDataRef.current),
            keepalive: true
          }).catch(console.error);
        });
      }
    };
  }, []);
  const [uploading, setUploading] = useState(false); // is queue processing?
  
  const handleExit = async () => {
    if (uploading) {
      alert("Por favor espera a que terminen de subirse las imágenes antes de salir.");
      return;
    }
    if (saveStatus === 'saving') {
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        await fetch(`${apiUrl}/api/users/me`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } catch (e) {
        console.error("Error forzando guardado al salir", e);
      }
    }
    onSaveComplete();
  };
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile', 'pages', 'images'
  const [draggedAudioIdx, setDraggedAudioIdx] = useState(null);
  
  // Audio preview state
  const [playingAudioIdx, setPlayingAudioIdx] = useState(null);
  const audioPreviewRef = useRef(null);

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const togglePlayPreview = (url, idx) => {
    if (playingAudioIdx === idx) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPlayingAudioIdx(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = url;
        audioPreviewRef.current.play().catch(e => {
          console.error("Playback error:", e);
          setPlayingAudioIdx(null);
        });
        setPlayingAudioIdx(idx);
        
        audioPreviewRef.current.onended = () => {
          setPlayingAudioIdx(null);
        };
        audioPreviewRef.current.onerror = (e) => {
          console.error("Audio playback error event:", e);
          setPlayingAudioIdx(null);
        };
      }
    }
  };
  
  // Selección múltiple y Modal de borrado
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'single', item: img } o { type: 'bulk' }
  const [deletingStatus, setDeletingStatus] = useState(null); // { current: number, total: number, targetId?: string }
  const longPressTimerRef = useRef(null);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Nuevo sistema de cola en segundo plano
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [planData, setPlanData] = useState(PLANS.gratis);
  const [isExpired, setIsExpired] = useState(false);
  const [mediaCounts, setMediaCounts] = useState({ total: 0, images: 0, videos: 0 });

  // Función para cargar más imágenes usando el Cursor
  const loadMoreImages = async () => {
    if (!nextCursor || isLoadingMore || !user) return;
    setIsLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const imgRes = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/images?limit=20&cursor=${nextCursor}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.items && imgData.items.length > 0) {
          setImages(prev => [...prev, ...imgData.items]);
        }
        setNextCursor(imgData.nextCursor || null);
        if (imgData.total !== undefined) {
          setTotalImages(imgData.total);
          setMediaCounts({
            total: imgData.total,
            images: imgData.imageCount !== undefined ? imgData.imageCount : imgData.total,
            videos: imgData.videoCount || 0,
          });
        }
      }
    } catch (e) {
      console.error("Error cargando más imágenes:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Intersection Observer para disparar la carga infinita
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
        loadMoreImages();
      }
    }, { threshold: 0.1 });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [nextCursor, isLoadingMore, user]);

  useEffect(() => {
    const loadUserData = async () => {
      // 1. Si tenemos datos en memoria, pintarlos inmediatamente para evitar flashes
      if (globalUserData) {
        const data = globalUserData;
        setFormData({
          user1Name: data.user1Name || '',
          user2Name: data.user2Name || '',
          anniversaryDate: data.anniversaryDate || '',
          pets: data.pets || '',
          kids: data.kids || '',
          spotifyUrl: data.spotifyUrl || '',
          customMessage: data.customMessage || '',
          letterPages: (data.letterPages && data.letterPages[0] !== '') 
                       ? data.letterPages 
                       : ['Escribe aquí todo lo que sientes por esa persona especial...\n\nPuedes borrar este texto de ejemplo y utilizar todas las páginas que necesites para expresar tu amor y crear un recuerdo inolvidable.'],
          letterTitle: data.letterTitle || 'Mi Primera Carta',
          letterStyle: data.letterStyle || 'modern',
          universeColor: data.universeColor || 'purple',
          universePalette: data.universePalette || 'Cósmico',
          universeVariant: data.universeVariant || 'tunnel',
          customAudioUrl: data.customAudioUrl || '',
          customAudios: data.customAudios || (data.customAudioUrl ? [{ url: data.customAudioUrl, name: 'Canción Principal' }] : []),
          arcadeName: data.arcadeName || ''
        });
        
        setTotalImages(data.galleryImages ? data.galleryImages.length : data.imageCount || 0);
        const calcGalleryBytes = data.galleryImages ? data.galleryImages.reduce((sum, img) => sum + (img.bytes || 0), 0) : (data.imageBytes || 0);
        const calcAudioBytes = (data.customAudios || []).reduce((sum, audio) => sum + (audio.bytes || audio.size || 0), 0);
        setTotalBytes(data.totalStorageBytes !== undefined ? data.totalStorageBytes : (calcGalleryBytes + calcAudioBytes));

        if (data.plan && PLANS[data.plan]) {
          setPlanData(PLANS[data.plan]);
        }
        if (data.planExpiresAt) {
          const expDate = new Date(data.planExpiresAt);
          setIsExpired(expDate.getTime() < Date.now());
        }

        if (globalImages && globalImages.length > 0) {
          setImages(globalImages);
          setNextCursor(globalNextCursor);
        }
      }

      // 2. Siempre consultar /api/users/me para tener datos frescos del servidor
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

        const res = await fetch(`${apiUrl}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const snap = await res.json();
        if (snap.exists) {
          const data = snap.data;
          if (setGlobalUserData) setGlobalUserData(data);

          setFormData({
            user1Name: data.user1Name || '',
            user2Name: data.user2Name || '',
            anniversaryDate: data.anniversaryDate || '',
            pets: data.pets || '',
            kids: data.kids || '',
            spotifyUrl: data.spotifyUrl || '',
            customMessage: data.customMessage || '',
            letterPages: (data.letterPages && data.letterPages[0] !== '') 
                         ? data.letterPages 
                         : ['Escribe aquí todo lo que sientes por esa persona especial...\n\nPuedes borrar este texto de ejemplo y utilizar todas las páginas que necesites para expresar tu amor y crear un recuerdo inolvidable.'],
            letterTitle: data.letterTitle || 'Mi Primera Carta',
            letterStyle: data.letterStyle || 'modern',
            universeColor: data.universeColor || 'purple',
            universePalette: data.universePalette || 'Cósmico',
            universeVariant: data.universeVariant || 'tunnel',
            customAudioUrl: data.customAudioUrl || '',
            customAudios: data.customAudios || (data.customAudioUrl ? [{ url: data.customAudioUrl, name: 'Canción Principal' }] : []),
            arcadeName: data.arcadeName || ''
          });

          const initialTotal = data.galleryImages ? data.galleryImages.length : data.imageCount || 0;
          setTotalImages(initialTotal);
          const initialVideos = data.usage?.videoCount ?? data.videoCount ?? 0;
          const initialOnlyImages = data.usage?.onlyImageCount ?? (initialTotal - initialVideos);
          setMediaCounts({
            total: initialTotal,
            images: initialOnlyImages,
            videos: initialVideos,
          });

          const calcGalleryBytes = data.galleryImages ? data.galleryImages.reduce((sum, img) => sum + (img.bytes || 0), 0) : (data.imageBytes || 0);
          const calcAudioBytes = (data.customAudios || []).reduce((sum, audio) => sum + (audio.bytes || audio.size || 0), 0);
          setTotalBytes(data.totalStorageBytes !== undefined ? data.totalStorageBytes : (calcGalleryBytes + calcAudioBytes));

          if (data.plan && PLANS[data.plan]) {
            setPlanData(PLANS[data.plan]);
          }
          if (data.planExpiresAt) {
            const expDate = new Date(data.planExpiresAt);
            setIsExpired(expDate.getTime() < Date.now());
          }
        }
        
        // 3. Cargar imágenes si no estaban en caché o refrescar metadatos de conteo
        try {
          console.log("[SettingsView] Solicitando /api/images para conteo y medios...");
          const hasCachedImages = globalImages && globalImages.length > 0;
          const fetchLimit = hasCachedImages ? 1 : 50;
          const imgRes = await fetch(`${apiUrl}/api/images?limit=${fetchLimit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log("[SettingsView] Respuesta /api/images status:", imgRes.status);
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            console.log("[SettingsView] Datos recibidos de /api/images:", imgData);
            const fetchedImages = imgData.items || [];
            console.log(`[SettingsView] Imágenes recibidas: ${fetchedImages.length}. Cached existente:`, hasCachedImages);
            if (!hasCachedImages && fetchedImages.length > 0) {
              setImages(fetchedImages);
              if (setGlobalImages) setGlobalImages(fetchedImages);
            }
            
            const fetchedCursor = imgData.nextCursor || null;
            if (!hasCachedImages) {
              setNextCursor(fetchedCursor);
              if (setGlobalNextCursor) setGlobalNextCursor(fetchedCursor);
            }

            if (imgData.total !== undefined) {
              setTotalImages(imgData.total);
              setMediaCounts({
                total: imgData.total,
                images: imgData.imageCount !== undefined ? imgData.imageCount : imgData.total,
                videos: imgData.videoCount || 0,
              });
            }
          } else {
            const errBody = await imgRes.text();
            console.error("[SettingsView] Error HTTP al consultar /api/images:", imgRes.status, errBody);
          }
        } catch (e) {
          console.error("[SettingsView] Error fetching images count:", e);
        }

        setTimeout(() => { isInitialLoad.current = false; }, 800);
      } catch (error) {
        console.error("Error cargando perfil:", error);
        setTimeout(() => { isInitialLoad.current = false; }, 800);
      }
    };
    loadUserData();
  }, [user]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveTextData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Name: formData.user1Name,
          user2Name: formData.user2Name,
          anniversaryDate: formData.anniversaryDate,
          pets: formData.pets,
          kids: formData.kids,
          spotifyUrl: formData.spotifyUrl,
          customMessage: formData.customMessage,
          letterPages: formData.letterPages,
          letterTitle: formData.letterTitle,
          letterStyle: formData.letterStyle,
          letterStyles: formData.letterStyles,
          universeColor: formData.universeColor,
          universePalette: formData.universePalette,
          universeVariant: formData.universeVariant,
          universeParticleSize: formData.universeParticleSize,
          universeParticleSpeed: formData.universeParticleSpeed,
          customAudioUrl: formData.customAudioUrl,
          customAudios: formData.customAudios
        })
      });
      if (!res.ok) throw new Error("Fallo al actualizar");
      setMessage('¡Datos guardados con éxito! 💖');
      setTimeout(() => onSaveComplete(), 1500); // Volver a la galería después de guardar
    } catch (error) {
      console.error("Error guardando datos:", error);
      setMessage('Error al guardar los datos.');
    }
    setLoading(false);
  };

  const uploadQueueRef = useRef([]);
  const uploadingRef = useRef(false);

  const autoSavePlaylist = async (newAudios, newFallbackUrl) => {
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      const payload = { customAudios: newAudios };
      if (newFallbackUrl !== undefined) {
        payload.customAudioUrl = newFallbackUrl;
      }
      await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (setGlobalUserData) {
        setGlobalUserData(prev => ({ ...(prev || {}), ...payload }));
      }
    } catch (e) {
      console.error("Auto-save playlist error:", e);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (isExpired) {
      if (e.target) e.target.value = '';
      setExpiredActionModal({ isOpen: true, actionName: 'subir tu propia música' });
      return;
    }
    
    if (planData?.id === 'free' || planData?.id === 'gratis') {
      alert("¡El plan Gratis solo permite enlaces de Spotify! Mejora tu plan para subir tu propia música en formato MP3.");
      return;
    }

    // Validación de cuota total de almacenamiento (Imágenes + Música)
    if (totalBytes + file.size > (planData?.maxBytes || 0)) {
      const maxMB = ((planData?.maxBytes || 0) / (1024 * 1024)).toFixed(0);
      alert(`¡Límite de almacenamiento excedido! Tu plan actual (${planData?.name || 'actual'}) permite un máximo de ${maxMB} MB totales. Borra archivos antiguos para hacer espacio o mejora tu plan.`);
      return;
    }

    setUploading(true);
    setMessage('Subiendo y procesando tu canción...');

    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      // 1. Pedir firma para R2
      const sigRes = await fetch(`${apiUrl}/api/r2-presigned-url-batch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{
            name: file.name,
            format: file.type.split('/')[1] || 'mp3',
            type: file.type
          }]
        })
      });

      if (!sigRes.ok) throw new Error('Error al solicitar permisos de subida');
      const { signatures } = await sigRes.json();
      const sig = signatures[0];

      // 2. Subir directamente a Cloudflare R2
      const r2Res = await fetch(sig.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!r2Res.ok) throw new Error(`Error de red al subir la canción`);

      // 3. Agregar a la playlist con sus bytes
      const newAudioItem = { 
        url: sig.downloadUrl, 
        name: file.name, 
        public_id: sig.fileKey,
        bytes: file.size 
      };
      const newAudios = [...(formData.customAudios || []), newAudioItem];
      
      setFormData(prev => ({ 
        ...prev, 
        customAudioUrl: sig.downloadUrl, // Mantenemos compatibilidad hacia atrás
        customAudios: newAudios
      }));

      // 4. Acumular inmediatamente a totalBytes
      setTotalBytes(prev => prev + file.size);

      // Guardar playlist inmediatamente en backend
      await autoSavePlaylist(newAudios, sig.downloadUrl);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (error) {
      console.error(error);
      setMessage('Error al subir la canción.');
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

// Generador ligero de miniatura WebP en el navegador (resolución máx 800px, WebP ~40-60KB)
const createWebPThumbnail = async (file) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/webp', 0.80);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (isExpired) {
      if (e.target) e.target.value = '';
      setExpiredActionModal({ isOpen: true, actionName: 'subir fotos o videos' });
      return;
    }

    // Límite estricto por archivo para evitar que Cloudinary rechace la subida (Free tier)
    // o que el navegador colapse al intentar subir gigabytes de golpe en una sola petición.
    const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB R2
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB

    for (let file of files) {
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
        alert(`El video "${file.name}" supera el límite máximo de 100MB por archivo. Por favor recórtalo o comprímelo.`);
        return;
      }
      if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
        alert(`La imagen "${file.name}" supera el límite de 20MB por archivo.`);
        return;
      }
    }

    // Límite de capacidad (MB/GB) del plan (Única métrica restrictiva ahora)
    // Se toma en cuenta el tamaño del original + la miniatura WebP (~50KB por imagen)
    const currentBytes = totalBytes;
    const newFilesBytes = files.reduce((sum, file) => {
      const thumbEstimate = file.type.startsWith('image/') ? 50000 : 0;
      return sum + file.size + thumbEstimate;
    }, 0);

    if (currentBytes + newFilesBytes > planData.maxBytes) {
      const maxMB = (planData.maxBytes / (1024 * 1024)).toFixed(0);
      alert(`¡Límite de almacenamiento excedido! Tu plan actual (${planData.name}) permite un máximo de ${maxMB} MB totales. Borra archivos antiguos para hacer espacio o mejora tu plan.`);
      return;
    }

    // Permitir fotos y videos en todos los planes respetando el límite de almacenamiento
    let filesToProcess = files;

    setUploading(true);
    setMessage('Preparando archivos para subir con calidad 100% original...');

    // Se suben los archivos con su calidad, peso y resolución original 100%
    uploadQueueRef.current = [...uploadQueueRef.current, ...filesToProcess];
    setUploadQueue([...uploadQueueRef.current]); // Para UI

    if (!uploadingRef.current) {
      setUploadProgress({ current: 1, total: filesToProcess.length });
      processQueue();
    } else {
      setUploadProgress(prev => ({ ...prev, total: prev.total + filesToProcess.length }));
    }
  };

  const processQueue = async () => {
    if (uploadingRef.current || uploadQueueRef.current.length === 0) return;

    uploadingRef.current = true;
    setUploading(true);

    let erroresDetectados = 0;
    let archivosTotales = uploadQueueRef.current.length;

    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      let batchQueue = [];
      const MAX_BATCH_SIZE = 50;
      let processedCount = 0;

      while (uploadQueueRef.current.length > 0) {
        const filesToProcess = uploadQueueRef.current.slice(0, MAX_BATCH_SIZE);
        
        try {
          setMessage(`Optimizando y preparando subida de ${filesToProcess.length} archivo(s)...`);

          // Generar miniaturas WebP para todas las fotos del lote en paralelo
          const preparedItems = await Promise.all(filesToProcess.map(async (file) => {
            const isImage = file.type.startsWith('image/');
            let thumbBlob = null;
            if (isImage) {
              thumbBlob = await createWebPThumbnail(file);
            }
            return {
              file,
              thumbBlob,
              hasThumbnail: !!thumbBlob
            };
          }));

          const presignedRes = await fetch(`${apiUrl}/api/r2-presigned-url-batch`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              files: preparedItems.map(item => ({
                name: item.file.name,
                format: item.file.type.split('/')[1] || 'bin',
                type: item.file.type,
                hasThumbnail: item.hasThumbnail
              }))
            })
          });
          
          if (!presignedRes.ok) {
            const err = await presignedRes.json();
            throw new Error(err.message || 'Error solicitando firmas masivas');
          }
          
          const { signatures } = await presignedRes.json();

          // SUBIDA ULTRA RÁPIDA EN PARALELO A R2 (en bloques concurrentes de 6)
          const CHUNK_CONCURRENCY = 6;
          for (let cIdx = 0; cIdx < preparedItems.length; cIdx += CHUNK_CONCURRENCY) {
            const chunk = preparedItems.slice(cIdx, cIdx + CHUNK_CONCURRENCY);
            await Promise.all(chunk.map(async (item, relIdx) => {
              const i = cIdx + relIdx;
              const fileToUpload = item.file;
              const sig = signatures[i];

              try {
                // 1. Subir original y miniatura WebP simultáneamente
                const uploadPromises = [
                  fetch(sig.uploadUrl, { 
                    method: 'PUT', 
                    body: fileToUpload,
                    headers: { 'Content-Type': fileToUpload.type }
                  })
                ];

                let thumbPromise = null;
                if (sig.uploadThumbUrl && item.thumbBlob) {
                  thumbPromise = fetch(sig.uploadThumbUrl, {
                    method: 'PUT',
                    body: item.thumbBlob,
                    headers: { 'Content-Type': 'image/webp' }
                  });
                  uploadPromises.push(thumbPromise);
                }

                const results = await Promise.all(uploadPromises);
                const r2Res = results[0];
                if (!r2Res.ok) throw new Error(`Error de red al subir archivo original`);

                const thumbUploaded = thumbPromise ? (await thumbPromise).ok : false;
                const combinedBytes = fileToUpload.size + (item.thumbBlob ? item.thumbBlob.size : 0);

                batchQueue.push({
                  public_id: `r2|${sig.fileKey}`,
                  secure_url: sig.downloadUrl,
                  thumb_url: (thumbUploaded && sig.downloadThumbUrl) ? sig.downloadThumbUrl : sig.downloadUrl,
                  thumb_public_id: (thumbUploaded && sig.thumbKey) ? `r2|${sig.thumbKey}` : null,
                  bytes: combinedBytes,
                  format: fileToUpload.type.split('/')[1] || 'bin',
                  width: 1080,
                  height: 1920
                });

              } catch (error) {
                erroresDetectados++;
                console.error("Error en archivo:", fileToUpload.name, error);
              } finally {
                processedCount++;
                setUploadProgress({ current: processedCount, total: archivosTotales });
              }
            }));
          }
        } catch (globalBatchError) {
          erroresDetectados += filesToProcess.length;
          console.error("Error en batch presign:", globalBatchError);
        }

        // Avanzar cola y actualizar progreso UI
        uploadQueueRef.current = uploadQueueRef.current.slice(filesToProcess.length);
        setUploadQueue([...uploadQueueRef.current]);

        // Si el lote llegó al límite o la cola terminó, mandamos el confirm-batch
        if (batchQueue.length >= MAX_BATCH_SIZE || uploadQueueRef.current.length === 0) {
           if (batchQueue.length > 0) {
             setMessage(`Finalizando guardado...`);
             try {
                const confirmRes = await fetch(`${apiUrl}/api/images/confirm-batch`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ images: batchQueue })
                });

                if (!confirmRes.ok) {
                  const errData = await confirmRes.json().catch(() => ({}));
                  throw new Error(`Fallo confirmación batch: ${errData.message || confirmRes.statusText}`);
                }
                
                const confirmData = await confirmRes.json();
                if (confirmData.code === 'SUCCESS' && confirmData.imagesAdded) {
                  const addedItems = confirmData.imagesAdded;
                  const addedVideos = addedItems.filter(i => !!i.isVideo).length;
                  const addedImages = addedItems.length - addedVideos;

                  setImages(prev => {
                     const newImages = [...prev, ...addedItems];
                     if (setGlobalImages) setGlobalImages(newImages); // Actualiza la caché global para la Galería
                     if (setGlobalUserData) {
                       setGlobalUserData(old => old ? { ...old, galleryImages: newImages } : old);
                     }
                     return newImages;
                  });
                  setTotalImages(prev => prev + addedItems.length);
                  setMediaCounts(prev => ({
                    total: (prev.total || 0) + addedItems.length,
                    images: (prev.images || 0) + addedImages,
                    videos: (prev.videos || 0) + addedVideos
                  }));
                  const bytesAdded = addedItems.reduce((sum, img) => sum + (img.bytes || 0), 0);
                  setTotalBytes(prev => prev + bytesAdded);
                }
                
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(''), 2500);
             } catch (batchError) {
                erroresDetectados += batchQueue.length;
                console.error("Error confirmando lote:", batchError);
             }
             batchQueue = []; // Limpiar lote para el siguiente ciclo
           }
        }
      }

      if (erroresDetectados > 0) {
        setMessage(`Proceso terminado. ${erroresDetectados} de ${archivosTotales} archivo(s) no se pudieron guardar.`);
      } else if (archivosTotales > 1) { 
        setMessage('¡Imágenes guardadas con éxito!'); 
      } else {
        setMessage('¡Imagen guardada con éxito!'); 
      }
      setTimeout(() => { setMessage(''); }, 4500);

    } catch (globalError) {
      console.error("Error global de subida:", globalError);
      setMessage('Ocurrió un error inesperado al subir las imágenes.');
      setTimeout(() => { setMessage(''); }, 4500);
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const requestDeleteImage = (img) => {
    if (isExpired) {
      setExpiredActionModal({ isOpen: true, actionName: 'eliminar recuerdos' });
      return;
    }
    setDeleteModal({ type: 'single', item: img });
  };

  const executeDeleteImage = async () => {
    const imageToDelete = deleteModal.item;
    setDeleteModal(null);
    
    setLoading(true);
    setDeletingStatus({ current: 1, total: 1, targetId: imageToDelete.public_id });
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      // 1. Borrar de Cloudflare R2 / Storage usando el backend
      const delRes = await fetch(`${apiUrl}/api/images/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          public_id: imageToDelete.public_id,
          thumb_public_id: imageToDelete.thumb_public_id || null
        })
      });

      if (!delRes.ok) throw new Error('No se pudo borrar la imagen en el servidor seguro.');

      // 2. Quitar inmediatamente de la vista y actualizar en caché
      const updatedImages = images.filter(img => img.public_id !== imageToDelete.public_id);
      setImages(updatedImages);
      if (setGlobalImages) setGlobalImages(updatedImages);
      
      const isVideo = !!imageToDelete.isVideo;
      setTotalImages(prev => Math.max(0, prev - 1));
      setMediaCounts(prev => ({
        total: Math.max(0, (prev.total || 0) - 1),
        images: Math.max(0, (prev.images || 0) - (isVideo ? 0 : 1)),
        videos: Math.max(0, (prev.videos || 0) - (isVideo ? 1 : 0))
      }));
      setTotalBytes(prev => Math.max(0, prev - (imageToDelete.bytes || 0)));
      setMessage('Imagen eliminada.');
    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setDeletingStatus(null);
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // --- Funciones de Selección Múltiple ---
  const toggleSelection = (img) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(img)) {
        newSet.delete(img);
        if (newSet.size === 0) setIsSelectionMode(false);
      } else {
        newSet.add(img);
      }
      return newSet;
    });
  };

  const handleTouchStart = (img) => {
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelection(img);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500); // 500ms para Long Press en móviles
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleItemClick = (img, e) => {
    if (isSelectionMode) {
      e.preventDefault();
      toggleSelection(img);
    }
  };

  const triggerDownload = async (url, filename) => {
    if (isExpired) {
      setExpiredActionModal({ isOpen: true, actionName: 'descargar fotos o recuerdos' });
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'recuerdo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      // Fallback si CORS restringe fetch
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'recuerdo';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBulkDownload = async () => {
    if (isExpired) {
      setExpiredActionModal({ isOpen: true, actionName: 'descargar fotos o recuerdos' });
      return;
    }
    const items = Array.from(selectedImages);
    setMessage(`Descargando ${items.length} archivo(s)...`);
    
    for (let idx = 0; idx < items.length; idx++) {
      const img = items[idx];
      const url = img.original_url || img.src;
      const ext = img.format || (img.isVideo ? 'mp4' : 'jpg');
      const filename = `Recuerdo_${idx + 1}.${ext}`;
      await triggerDownload(url, filename);
      if (idx < items.length - 1) {
        await new Promise(r => setTimeout(r, 400));
      }
    }
    
    setIsSelectionMode(false);
    setSelectedImages(new Set());
    setMessage('¡Descarga completada!');
    setTimeout(() => setMessage(''), 3000);
  };

  const requestBulkDelete = () => {
    if (isExpired) {
      setExpiredActionModal({ isOpen: true, actionName: 'eliminar recuerdos' });
      return;
    }
    setDeleteModal({ type: 'bulk' });
  };

  const executeBulkDelete = async () => {
    setDeleteModal(null);
    
    setLoading(true);
    const imagesToDelete = Array.from(selectedImages);
    const totalCount = imagesToDelete.length;
    setDeletingStatus({ current: totalCount, total: totalCount });

    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      // 1 Petición atómica en bloque para borrar todos los archivos (R2 + Firestore)
      const res = await fetch(`${apiUrl}/api/images/delete-batch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: imagesToDelete.map(img => ({
            public_id: img.public_id,
            thumb_public_id: img.thumb_public_id || null
          }))
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error eliminando lote de archivos');
      }

      // Quitar todos los elementos seleccionados de la UI y de la caché global
      const deletedIds = new Set(imagesToDelete.map(i => i.public_id));
      const deletedCleanIds = new Set(imagesToDelete.map(i => (i.public_id || '').replace('r2|', '')));
      
      setImages(prev => {
        const next = prev.filter(item => !deletedIds.has(item.public_id) && !deletedCleanIds.has((item.public_id || '').replace('r2|', '')));
        if (setGlobalImages) setGlobalImages(next);
        return next;
      });

      // Actualizar contadores en memoria de golpe
      const videosCount = imagesToDelete.filter(i => !!i.isVideo).length;
      const imagesCount = totalCount - videosCount;
      const bytesFreed = imagesToDelete.reduce((sum, img) => sum + (img.bytes || 0), 0);

      setTotalImages(prev => Math.max(0, prev - totalCount));
      setMediaCounts(prev => ({
        total: Math.max(0, (prev.total || 0) - totalCount),
        images: Math.max(0, (prev.images || 0) - imagesCount),
        videos: Math.max(0, (prev.videos || 0) - videosCount)
      }));
      setTotalBytes(prev => Math.max(0, prev - bytesFreed));

      setIsSelectionMode(false);
      setSelectedImages(new Set());
      setMessage(`¡${totalCount} archivo(s) eliminados con éxito en 1 segundo!`);
    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setDeletingStatus(null);
      setLoading(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };


  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row pb-32 md:pb-0 md:pl-24 relative overflow-hidden">
      {/* Background Live Preview */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <GlitterWarp
          variant={formData.universeVariant || 'tunnel'}
          colors={PALETTES[formData.universePalette || 'Cósmico']}
          sizeMult={formData.universeParticleSize}
          speedMult={formData.universeParticleSpeed}
          background="transparent"
        />
      </div>
      
      {/* Floating Global Toast Notification */}
      <div 
        className={`fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full flex items-center gap-3 font-bold text-xs md:text-sm shadow-2xl transition-all duration-300 pointer-events-none ${
          saveStatus === 'saving' 
            ? 'opacity-100 translate-y-0 bg-blue-600/95 text-white backdrop-blur-md border border-blue-400/50' 
            : saveStatus === 'saved' || (message && !uploading) 
              ? 'opacity-100 translate-y-0 bg-green-600/95 text-white backdrop-blur-md border border-green-400/50' 
              : saveStatus === 'error'
                ? 'opacity-100 translate-y-0 bg-red-600/95 text-white backdrop-blur-md border border-red-400/50'
                : 'opacity-0 -translate-y-10'
        }`}
      >
        {saveStatus === 'saving' && (
          <>
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30" strokeLinecap="round" className="opacity-50"></circle></svg>
            Guardando cambios...
          </>
        )}
        {(saveStatus === 'saved' || message) && saveStatus !== 'saving' && (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            {message || '¡Cambios guardados exitosamente!'}
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Error al guardar
          </>
        )}
      </div>
      <audio ref={audioPreviewRef} className="hidden" preload="auto" />
      


      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 lg:p-16 overflow-y-auto min-h-screen relative z-10">
        <div className="max-w-3xl mx-auto bg-[#111] border border-pink-500/20 rounded-2xl p-6 md:p-10 shadow-[0_0_50px_rgba(236,72,153,0.05)]">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
            <h1 className="text-2xl font-serif italic text-pink-400">Configuración</h1>
            <button
              onClick={handleExit}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm transition-colors"
            >
              Ver Galería
            </button>
          </div>

          {message && !uploading && (
            <div className="mb-8 p-4 bg-pink-900/30 border border-pink-500/50 rounded-xl text-pink-200 text-center animate-pulse">
              {message}
            </div>
          )}

          {/* TAB 1: PROFILE & STYLE */}
          {activeTab === 'profile' && (
            <ProfileTab 
              formData={formData} 
              setFormData={setFormData} 
              handleChange={handleChange} 
              currentUser={user}
              userPlan={planData?.id || globalUserData?.plan}
              onOpenPricing={onOpenPricing}
              globalUserData={globalUserData}
              setGlobalUserData={setGlobalUserData}
            />
          )}

          {/* TAB 2: LETTERS */}
          {activeTab === 'pages' && (
            <LettersTab 
              formData={formData} 
              setFormData={setFormData} 
              handleChange={handleChange} 
              user={user}
              setGlobalUserData={setGlobalUserData}
              isExpired={isExpired}
              onExpiredAction={(action) => setExpiredActionModal({ isOpen: true, actionName: action })}
            />
          )}

          {/* TAB 3: IMAGES */}
          {activeTab === 'images' && (
            <ImagesTab 
              images={images}
              planData={planData}
              totalBytes={totalBytes}
              totalImages={totalImages}
              mediaCounts={mediaCounts}
              handleImageUpload={handleImageUpload}
              uploadQueue={uploadQueue}
              uploadProgress={uploadProgress}
              selectedImages={selectedImages}
              handleItemClick={handleItemClick}
              handleTouchStart={handleTouchStart}
              handleTouchEnd={handleTouchEnd}
              isSelectionMode={isSelectionMode}
              setIsSelectionMode={setIsSelectionMode}
              toggleSelection={toggleSelection}
              requestDeleteImage={requestDeleteImage}
              triggerDownload={triggerDownload}
              deletingStatus={deletingStatus}
              nextCursor={nextCursor}
              observerRef={observerRef}
              globalUserData={globalUserData}
              isExpired={isExpired}
              onExpiredAction={(action) => setExpiredActionModal({ isOpen: true, actionName: action })}
            />
          )}

          {/* TAB 4: MÚSICA */}
          {activeTab === 'music' && (
            <MusicTab 
              formData={formData}
              setFormData={setFormData}
              planData={planData}
              handleAudioUpload={handleAudioUpload}
              draggedAudioIdx={draggedAudioIdx}
              setDraggedAudioIdx={setDraggedAudioIdx}
              playingAudioIdx={playingAudioIdx}
              togglePlayPreview={togglePlayPreview}
              setDeleteModal={setDeleteModal}
              user={user}
              totalBytes={totalBytes}
              setTotalBytes={setTotalBytes}
              isExpired={isExpired}
              onExpiredAction={(action) => setExpiredActionModal({ isOpen: true, actionName: action })}
            />
          )}

        </div>

        {/* Barra Flotante de Selección Múltiple */}
        {isSelectionMode && selectedImages.size > 0 && (
          <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-full px-6 py-4 flex items-center gap-6 z-[100] animate-slideUp">
            <span className="text-white font-bold whitespace-nowrap">{selectedImages.size} Seleccionadas</span>
            {(!globalUserData?.isCollaborator || globalUserData?.collaboratorPermissions?.download !== false) && (
              <button onClick={handleBulkDownload} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold whitespace-nowrap">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="hidden md:inline">Descargar</span>
              </button>
            )}
            {(!globalUserData?.isCollaborator || globalUserData?.collaboratorPermissions?.delete !== false) && (
              <button onClick={requestBulkDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold whitespace-nowrap">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span className="hidden md:inline">Eliminar</span>
              </button>
            )}
            <button onClick={() => { setIsSelectionMode(false); setSelectedImages(new Set()); }} className="ml-2 bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {deleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 md:p-8 w-full max-w-sm text-center shadow-2xl animate-scaleUp">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-3 uppercase tracking-widest text-red-400">
                {deleteModal.title || (deleteModal.type === 'bulk' ? '¿Eliminar Archivos?' : '¿Eliminar Archivo?')}
              </h3>
              <p className="text-gray-400 mb-8 text-sm md:text-base leading-relaxed">
                {deleteModal.message || (deleteModal.type === 'bulk' 
                  ? `Estás a punto de borrar ${selectedImages.size} recuerdos de tu universo. Esta acción es irreversible.` 
                  : 'Estás a punto de borrar este recuerdo de tu universo. Esta acción es irreversible.')}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors uppercase tracking-widest text-xs md:text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={deleteModal.onConfirm ? deleteModal.onConfirm : (deleteModal.type === 'bulk' ? executeBulkDelete : executeDeleteImage)}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all uppercase tracking-widest text-xs md:text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Plan Expirado para Acciones Restringidas */}
        <ExpiredPlanModal
          isOpen={expiredActionModal.isOpen}
          onClose={() => setExpiredActionModal({ isOpen: false, actionName: '' })}
          actionName={expiredActionModal.actionName}
        />

      </main>
    </div>
  );
};

export default SettingsView;


