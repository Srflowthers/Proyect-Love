import React, { useState, useEffect, useRef } from 'react';

import imageCompression from 'browser-image-compression';
import { PLANS } from '@/services/userService';
import { logout } from '@/services/authService';
import Dock from '@/components/Dock';
import LetterPage from '@/components/ui/LetterPage';
import { GlitterWarp, VARIANTS, PALETTES } from '@/components/ui/glitter-warp';
import ProfileTab from './settings/ProfileTab';

const SettingsView = ({ user, onSaveComplete, initialTab = 'profile' }) => {
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
    universeColor: 'purple',
    universePalette: 'Cósmico',
    universeVariant: 'tunnel',
    universeParticleSize: 1,
    universeParticleSpeed: 1,
    customAudioUrl: '',
    customAudios: []
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  
  const isInitialLoad = useRef(true);
  const debounceTimerRef = useRef(null);

  // Autoguardado global de formData
  useEffect(() => {
    if (isInitialLoad.current || !user) return;
    
    const isSilent = formData._silentSave;

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
    }, 8000); // Esperar 8s de inactividad antes de golpear el backend
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
      audioPreviewRef.current.pause();
      setPlayingAudioIdx(null);
    } else {
      audioPreviewRef.current.src = url;
      audioPreviewRef.current.play().catch(e => console.error("Playback error:", e));
      setPlayingAudioIdx(idx);
      
      audioPreviewRef.current.onended = () => {
        setPlayingAudioIdx(null);
      };
    }
  };
  
  // Selección múltiple y Modal de borrado
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'single', item: img } o { type: 'bulk' }
  const longPressTimerRef = useRef(null);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Nuevo sistema de cola en segundo plano
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [planData, setPlanData] = useState(PLANS.pololos);
  const [isExpired, setIsExpired] = useState(false);

  // Cargar datos actuales de Firestore
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '')}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const snap = await res.json();
        if (snap.exists) {
          const data = snap.data;
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
            customAudios: data.customAudios || (data.customAudioUrl ? [{ url: data.customAudioUrl, name: 'Canción Principal' }] : [])
          });
          setImages(data.galleryImages || []);
          if (data.plan && PLANS[data.plan]) {
            setPlanData(PLANS[data.plan]);
          }
          if (data.planExpiresAt) {
            const expDate = new Date(data.planExpiresAt);
            setIsExpired(expDate.getTime() < Date.now());
          }
          // Dar tiempo a que React aplique el estado inicial antes de activar el autoguardado
          setTimeout(() => { isInitialLoad.current = false; }, 1000);
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
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
    } catch (e) {
      console.error("Auto-save playlist error:", e);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (planData.id === 'free') {
      alert("¡El plan Gratis solo permite enlaces de Spotify! Mejora tu plan para subir tu propia música en formato MP3.");
      return;
    }

    setUploading(true);
    setMessage('Subiendo y procesando tu canción original...');

    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      // 1. Pedir firma
      const sigRes = await fetch(`${apiUrl}/api/upload-signature`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!sigRes.ok) throw new Error('Error de firma de seguridad');
      const { apiKey, timestamp, signature, folder, uploadUrl } = await sigRes.json();

      // 2. Subir a Cloudinary como raw/video auto format
      const cloudFormData = new FormData();
      cloudFormData.append('file', file);
      cloudFormData.append('api_key', apiKey);
      cloudFormData.append('timestamp', timestamp);
      cloudFormData.append('signature', signature);
      cloudFormData.append('folder', folder);

      const cloudRes = await fetch(uploadUrl, { method: 'POST', body: cloudFormData });
      if (!cloudRes.ok) throw new Error(`Error subiendo canción a la nube`);
      const cloudData = await cloudRes.json();

      // Agregar a la playlist (el useEffect de formData se encargará de guardarlo automáticamente)
      const newAudios = [...(formData.customAudios || []), { url: cloudData.secure_url, name: file.name }];
      setFormData(prev => ({ 
        ...prev, 
        customAudioUrl: cloudData.secure_url, // Mantenemos compatibilidad hacia atrás
        customAudios: newAudios
      }));
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Límite de cantidad de fotos del plan
    if (images.length + uploadQueueRef.current.length + files.length > planData.maxImages) {
      alert(`¡Límite de imágenes excedido! Tu plan actual (${planData.name}) permite un máximo de ${planData.maxImages} fotos.`);
      return;
    }

    // Límite de MB del plan
    const currentBytes = images.reduce((sum, img) => sum + (img.bytes || 0), 0);
    const newFilesBytes = files.reduce((sum, file) => sum + file.size, 0); // Estimación basada en archivo original
    if (currentBytes + newFilesBytes > planData.maxBytes) {
      const maxMB = (planData.maxBytes / (1024 * 1024)).toFixed(0);
      alert(`¡Límite de almacenamiento excedido! Tu plan actual (${planData.name}) permite un máximo de ${maxMB} MB.`);
      return;
    }

    // Filtrar videos si es el plan Free
    let filesToProcess = files;
    if (planData.id === 'free') {
      const hasVideos = files.some(f => f.type.startsWith('video/'));
      if (hasVideos) {
        alert('¡El plan Gratis solo permite fotos! Mejora tu plan para subir videos.');
        filesToProcess = files.filter(f => !f.type.startsWith('video/'));
        if (filesToProcess.length === 0) return;
      }
    }

    setUploading(true);

    if (planData.id === 'free') {
      setMessage('Comprimiendo imágenes para tu plan Gratis (Max 1MB)...');
      const compressedFiles = [];
      const options = {
        maxSizeMB: 1, // Máximo 1MB por foto
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };

      for (let file of filesToProcess) {
        try {
          const compressedFile = await imageCompression(file, options);
          compressedFiles.push(compressedFile);
        } catch (error) {
          console.error("Error comprimiendo, usando original", error);
          compressedFiles.push(file); // Fallback
        }
      }
      uploadQueueRef.current = [...uploadQueueRef.current, ...compressedFiles];
    } else {
      setMessage('Preparando archivos originales para subir (sin compresión)...');
      // Subimos los archivos directamente con la calidad original (límite backend: 200MB)
      uploadQueueRef.current = [...uploadQueueRef.current, ...filesToProcess];
    }
    setUploadQueue([...uploadQueueRef.current]); // Para UI

    if (!uploadingRef.current) {
      setUploadProgress({ current: 1, total: compressedFiles.length });
      processQueue();
    } else {
      setUploadProgress(prev => ({ ...prev, total: prev.total + compressedFiles.length }));
    }
  };

  const processQueue = async () => {
    if (uploadingRef.current || uploadQueueRef.current.length === 0) return;

    uploadingRef.current = true;
    setUploading(true);

    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      while (uploadQueueRef.current.length > 0) {
        const fileToUpload = uploadQueueRef.current[0];

        try {
          // 1. Pedir firma
          const sigRes = await fetch(`${apiUrl}/api/upload-signature`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!sigRes.ok) {
            const err = await sigRes.json();
            throw new Error(err.message || 'Error en firma');
          }
          const { apiKey, timestamp, signature, folder, uploadUrl } = await sigRes.json();

          // 2. Subir a Cloudinary
          const cloudFormData = new FormData();
          cloudFormData.append('file', fileToUpload);
          cloudFormData.append('api_key', apiKey);
          cloudFormData.append('timestamp', timestamp);
          cloudFormData.append('signature', signature);
          cloudFormData.append('folder', folder);

          const cloudRes = await fetch(uploadUrl, { method: 'POST', body: cloudFormData });
          if (!cloudRes.ok) throw new Error(`Error subiendo a Cloudinary`);
          const cloudData = await cloudRes.json();

          // 3. Confirmar con Backend
          const confirmRes = await fetch(`${apiUrl}/api/images/confirm`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_id: cloudData.public_id,
              secure_url: cloudData.secure_url,
              bytes: cloudData.bytes,
              format: cloudData.format,
              width: cloudData.width,
              height: cloudData.height
            })
          });

          if (!confirmRes.ok) throw new Error('Fallo confirmación.');

          // 4. Guardar en Firestore Atómicamente con URL Optimizada
          // Si es video no aplicamos las transformaciones de imagen estricta igual, Cloudinary lo maneja.
          let optimizedUrl = cloudData.secure_url;
          if (cloudData.resource_type === 'image') {
            const urlParts = cloudData.secure_url.split('/upload/');
            optimizedUrl = `${urlParts[0]}/upload/f_auto,q_auto,w_800/${urlParts[1]}`;
          }

          const newImg = {
            src: optimizedUrl,
            original_url: cloudData.secure_url,
            isVideo: cloudData.resource_type === 'video',
            public_id: cloudData.public_id,
            bytes: cloudData.bytes || 0
          };

          const getRes = await fetch(`${apiUrl}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const snap = await getRes.json();
          let currentImages = [];
          if (snap.exists && snap.data.galleryImages) {
            currentImages = snap.data.galleryImages;
          }
          const updatedImages = [...currentImages, newImg];
          const patchRes = await fetch(`${apiUrl}/api/users/me`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ galleryImages: updatedImages })
          });
          if (!patchRes.ok) throw new Error("Error guardando foto en backend");
          setImages(updatedImages);
          
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 2500);

        } catch (error) {
          console.error("Error en archivo:", fileToUpload.name, error);
          // Opcional: mostrar un toast de error, pero continuamos con la cola
        }

        // Avanzar cola
        uploadQueueRef.current.shift();
        setUploadQueue([...uploadQueueRef.current]); // Actualizar UI

        if (uploadQueueRef.current.length > 0) {
          setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }

      if (uploadProgress.current > 1) { setMessage('¡Imágenes procesadas!'); }
      setTimeout(() => { setMessage(''); }, 3000);

    } catch (globalError) {
      console.error("Error global de subida:", globalError);
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const requestDeleteImage = (img) => {
    setDeleteModal({ type: 'single', item: img });
  };

  const executeDeleteImage = async () => {
    const imageToDelete = deleteModal.item;
    setDeleteModal(null);
    
    setLoading(true);
    setMessage('Eliminando imagen...');
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      // 1. Borrar de Cloudinary usando el backend
      const delRes = await fetch(`${apiUrl}/api/images/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ public_id: imageToDelete.public_id })
      });

      if (!delRes.ok) throw new Error('No se pudo borrar la imagen en el servidor seguro.');

      // 2. Borrar de Firestore (ahora usando el API)
      const updatedImages = images.filter(img => img.public_id !== imageToDelete.public_id);

      const patchRes = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryImages: updatedImages })
      });
      if (!patchRes.ok) throw new Error("Error al eliminar imagen en DB");

      setImages(updatedImages);
      setMessage('Imagen eliminada.');
    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
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

  const handleBulkDownload = () => {
    setMessage(`Preparando descarga de ${selectedImages.size} archivos...`);
    let idx = 0;
    selectedImages.forEach(img => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = img.original_url || img.src;
        link.target = '_blank';
        link.download = `Recuerdo_${idx}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 500); // 500ms de retraso entre cada descarga para no bloquear popups
      idx++;
    });
    setIsSelectionMode(false);
    setSelectedImages(new Set());
    setTimeout(() => setMessage(''), 3000);
  };

  const requestBulkDelete = () => {
    setDeleteModal({ type: 'bulk' });
  };

  const executeBulkDelete = async () => {
    setDeleteModal(null);
    
    setLoading(true);
    setMessage(`Eliminando ${selectedImages.size} archivos...`);
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      const imagesToDelete = Array.from(selectedImages);
      const publicIdsToDelete = imagesToDelete.map(img => img.public_id);
      
      let fallos = 0;
      for (const public_id of publicIdsToDelete) {
        try {
          await fetch(`${apiUrl}/api/images/delete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id })
          });
        } catch(e) {
          fallos++;
        }
      }

      const updatedImages = images.filter(img => !publicIdsToDelete.includes(img.public_id));

      const patchRes = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryImages: updatedImages })
      });
      if (!patchRes.ok) throw new Error("Error al actualizar la base de datos");

      setImages(updatedImages);
      setIsSelectionMode(false);
      setSelectedImages(new Set());
      setMessage(`Archivos eliminados con éxito. ${fallos > 0 ? `(${fallos} fallaron en la nube)` : ''}`);
    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 4000);
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
            Tu plan ha expirado. Renueva tu membresía para seguir administrando y configurando tu galería de recuerdos invaluables.
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
              if (window.confirm("¿Estás seguro de que deseas salir de tu Universo?")) {
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
            : saveStatus === 'saved' || message 
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
      <audio ref={audioPreviewRef} className="hidden" crossOrigin="anonymous" />
      


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

          {message && (
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
            />
          )}

          {/* TAB 2: LETTERS */}
          {activeTab === 'pages' && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Cartas 3D
              </h2>
              <p className="text-sm text-gray-400 mb-8">Escribe cartas largas. Cada página se representará como una carta arrugada en tu galería 3D.</p>
              
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="mb-8">
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Estilo de Papel 3D</label>
                  <select name="letterStyle" value={formData.letterStyle} onChange={handleChange} className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-colors mb-4">
                    <option value="modern">Moderna (Papel Crema)</option>
                    <option value="parchment">Antigua (Pergamino)</option>
                    <option value="burnt">Antigua (Bordes Quemados)</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {/* Título de la carta */}
                  <div className="bg-black border border-gray-800 p-5 rounded-2xl relative">
                    <label className="block text-sm text-purple-400 font-bold uppercase tracking-widest mb-3">Título de la Carta (Opcional)</label>
                    <input
                      type="text"
                      name="letterTitle"
                      value={formData.letterTitle}
                      onChange={handleChange}
                      placeholder="Ej: Para el amor de mi vida"
                      className="w-full bg-transparent text-gray-200 text-lg outline-none border-b border-gray-800 focus:border-purple-500 pb-2 transition-colors"
                    />
                  </div>
                  {formData.letterPages.map((pageText, index) => (
                    <div key={index} className="bg-black border border-gray-800 p-5 rounded-2xl relative group flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm text-purple-400 font-bold uppercase tracking-widest">Página {index + 1}</label>
                          {formData.letterPages.length > 1 && (
                            <button type="button" onClick={() => {
                                const newPages = formData.letterPages.filter((_, i) => i !== index);
                                setFormData({ ...formData, letterPages: newPages });
                              }} 
                              className="text-red-500 bg-red-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar Página">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                        <textarea
                          value={pageText}
                          onChange={(e) => {
                            const newPages = [...formData.letterPages];
                            newPages[index] = e.target.value;
                            setFormData({ ...formData, letterPages: newPages });
                          }}
                          rows={12}
                          placeholder="Escribe aquí los pensamientos más profundos..."
                          className="w-full h-full min-h-[300px] bg-transparent text-gray-200 outline-none resize-y"
                        />
                      </div>
                      
                      {/* Vista Previa de la Página Individual */}
                      <div className="w-full lg:w-[320px] shrink-0 flex flex-col items-center lg:border-l border-gray-800 lg:pl-6 pt-4 lg:pt-0">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Vista Previa 3D (Pág {index + 1})</p>
                        <div className="w-full h-[420px] bg-gray-900/40 rounded-xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing border border-white/5">
                          <LetterPage 
                            text={pageText || "..."} 
                            title={formData.letterTitle}
                            userName={formData.user2Name || 'Ti'} 
                            signature={formData.user1Name || 'Yo'} 
                            index={index} 
                            isLastPage={index === formData.letterPages.length - 1} 
                            theme={formData.letterStyle} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setFormData({ ...formData, letterPages: [...formData.letterPages, ''] })} className="w-full py-4 mt-6 border-2 border-dashed border-gray-700 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 rounded-xl transition-all font-semibold">
                  + Agregar Nueva Página
                </button>

                {/* Guardado Automático Activado */}
              </form>
            </div>
          )}

          {/* TAB 3: IMAGES */}
          {activeTab === 'images' && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Galería de Fotos
              </h2>
              <p className="text-sm text-gray-400 mb-8">Sube fotos para llenar tu Universo 3D. Tienes {images.length} fotos de {planData.maxImages} permitidas.</p>

              <div className="mb-10 relative">
                <input
                  type="file" multiple accept={planData.id === 'free' ? 'image/*' : 'image/*,video/mp4,video/quicktime,video/webm'} onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title={planData.id === 'free' ? "Añadir fotos a la cola" : "Añadir fotos y videos a la cola"}
                />
                <div className={`w-full py-10 border-2 border-dashed ${uploadQueue.length > 0 ? 'border-pink-400 bg-pink-900/20' : 'border-gray-700 hover:border-pink-500/50 bg-black hover:bg-[#151515]'} rounded-2xl flex flex-col items-center justify-center transition-all`}>
                  {uploadQueue.length > 0 ? (
                    <>
                      <svg className="w-12 h-12 text-pink-400 mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-pink-200 font-bold text-lg text-center">
                        Procesando ({uploadProgress.current - 1} de {uploadProgress.total})
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-pink-900/30 rounded-full flex items-center justify-center mb-4 text-pink-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      </div>
                      <span className="text-gray-300 font-bold text-lg">Toca para añadir Fotos</span>
                      <span className="text-gray-500 text-sm mt-1">Soporta selección múltiple</span>
                    </>
                  )}
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`aspect-square rounded-xl overflow-hidden border-2 relative group shadow-lg transition-all ${selectedImages.has(img) ? 'border-pink-500 scale-95 opacity-80' : 'border-gray-800'}`}
                      onClick={(e) => handleItemClick(img, e)}
                      onTouchStart={() => handleTouchStart(img)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                    >
                      {/* Checkbox Icon */}
                      <div 
                        className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-20 cursor-pointer ${selectedImages.has(img) ? 'bg-pink-500 border-pink-500' : 'border-white/50 bg-black/30 opacity-0 group-hover:opacity-100'}`} 
                        onClick={(e) => { e.stopPropagation(); setIsSelectionMode(true); toggleSelection(img); }}
                      >
                        {selectedImages.has(img) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </div>

                      {img.isVideo ? (
                        <video src={img.src} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={img.src} alt="Recuerdo" className="w-full h-full object-cover" />
                      )}
                      
                      {!isSelectionMode && (
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 gap-3 backdrop-blur-sm pointer-events-none md:pointer-events-auto">
                          <a
                            href={img.original_url || img.src}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg shadow-xl pointer-events-auto"
                          >
                            Descargar Original
                          </a>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); requestDeleteImage(img); }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg shadow-xl pointer-events-auto"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {images.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p>Aún no has subido fotos. ¡Agrega la primera arriba!</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MÚSICA */}
          {activeTab === 'music' && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                Tu Música de Fondo
              </h2>
              <p className="text-sm text-gray-400 mb-8">Personaliza la banda sonora que sonará al entrar a tu Universo.</p>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                
                {/* Caja 1: Subir MP3 */}
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
                  <label className="block text-sm text-green-400 mb-4 uppercase tracking-wider font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Sube Tu Propia Canción (Plan Premium)
                  </label>
                  <p className="text-xs text-gray-400 mb-4">Esta música tiene prioridad absoluta. Si subes un MP3 o WAV, reemplazará a Spotify automáticamente.</p>
                  
                  <div className={`w-full border-2 border-dashed ${planData.id === 'free' ? 'border-gray-800 bg-gray-900/50' : 'border-green-600/50 bg-green-900/10 hover:border-green-500'} rounded-xl p-8 text-center relative transition-all min-h-[200px] flex flex-col justify-center items-center`}>
                    {planData.id === 'free' ? (
                      <div className="text-gray-500 flex flex-col items-center">
                        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                        <p className="text-base font-bold text-gray-400">Opción Premium Bloqueada</p>
                        <p className="text-xs mt-1 max-w-xs">Los planes gratis solo pueden usar enlaces de Spotify. ¡Sube de plan para agregar tu archivo original!</p>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          title="Subir archivo MP3 o WAV"
                        />
                        <div className="flex flex-col items-center text-green-300">
                          <svg className="w-12 h-12 mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                          <span className="font-bold text-lg">
                            Añadir Canción a la Playlist
                          </span>
                          <p className="text-xs text-gray-400 mt-2">Soporta archivos .mp3 y .wav</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Render Playlist */}
                  {formData.customAudios && formData.customAudios.length > 0 && (
                    <div className="mt-8 space-y-3">
                      <h3 className="text-sm text-green-400 font-bold uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Tu Playlist (Prioridad)</h3>
                      {formData.customAudios.map((audio, idx) => (
                        <div 
                          key={idx} 
                          draggable
                          onDragStart={(e) => {
                            setDraggedAudioIdx(idx);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedAudioIdx === null || draggedAudioIdx === idx) return;
                            const newAudios = [...formData.customAudios];
                            const [draggedItem] = newAudios.splice(draggedAudioIdx, 1);
                            newAudios.splice(idx, 0, draggedItem);
                            setFormData({ ...formData, customAudios: newAudios });
                            setDraggedAudioIdx(null);
                          }}
                          onDragEnd={() => setDraggedAudioIdx(null)}
                          className={`flex items-center justify-between bg-black/50 border border-gray-800 p-4 rounded-xl hover:border-gray-700 transition-colors cursor-grab active:cursor-grabbing ${draggedAudioIdx === idx ? 'opacity-50 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1 pointer-events-none">
                            <div className="flex items-center gap-3 pointer-events-auto w-full">
                              <svg className="w-5 h-5 text-gray-600 shrink-0 cursor-grab hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="Arrastra para reordenar"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                              {audio.isSpotify || (audio.url && audio.url.includes('spotify')) ? (
                                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954] shrink-0">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.261 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.54-1.02.72-1.56.3z"/></svg>
                                </div>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); togglePlayPreview(audio.url, idx); }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${playingAudioIdx === idx ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-green-900/30 text-green-400 hover:bg-green-800/50'}`}
                                >
                                  {playingAudioIdx === idx ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  )}
                                </button>
                              )}
                              <input
                                type="text"
                                value={audio.name || `Pista de audio ${idx + 1}`}
                                onPointerDown={(e) => e.stopPropagation()} 
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    customAudios: prev.customAudios.map((a, i) => i === idx ? { ...a, name: e.target.value } : a)
                                  }));
                                }}
                                className="bg-transparent border-none text-gray-300 font-medium text-sm md:text-base outline-none focus:text-white focus:ring-0 w-full hover:bg-white/5 px-2 py-1 rounded transition-colors"
                                title="Haz clic para editar el nombre"
                                placeholder="Nombre de la canción..."
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModal({
                                  type: 'single_audio',
                                  title: '¿Eliminar Pista?',
                                  message: `¿Estás seguro de que deseas eliminar "${audio.name}" de la playlist?`,
                                  onConfirm: () => {
                                    setFormData(prev => ({
                                      ...prev,
                                      customAudios: prev.customAudios.filter((_, i) => i !== idx)
                                    }));
                                    setDeleteModal(null);
                                  }
                                });
                              }}
                              className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                <div className="flex items-center gap-4 py-2 opacity-50">
                  <div className="flex-1 h-px bg-gray-700"></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">O Alternativamente</span>
                  <div className="flex-1 h-px bg-gray-700"></div>
                </div>

                {/* Caja 2: Spotify */}
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
                  <label className="block text-sm text-green-500 mb-2 uppercase tracking-wider font-bold">Añadir Canción de Spotify</label>
                  <p className="text-xs text-gray-400 mb-4">Pega el link aquí y añádelo a la lista de reproducción superior. Podrás combinarlo con tus propios audios.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="spotifyInput"
                      placeholder="Ej: https://open.spotify.com/track/..." 
                      className="flex-1 bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-green-500 outline-none transition-colors" 
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const val = document.getElementById('spotifyInput').value;
                        if (val && val.includes('spotify')) {
                          const newAudios = [...(formData.customAudios || []), { url: val, name: 'Canción de Spotify', isSpotify: true }];
                          setFormData({...formData, customAudios: newAudios});
                          document.getElementById('spotifyInput').value = '';
                        }
                      }}
                      className="px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* Botón de Guardar Eliminado por Auto-Save */}
              </form>
            </div>
          )}

        </div>

        {/* Barra Flotante de Selección Múltiple */}
        {isSelectionMode && selectedImages.size > 0 && (
          <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-full px-6 py-4 flex items-center gap-6 z-[100] animate-slideUp">
            <span className="text-white font-bold whitespace-nowrap">{selectedImages.size} Seleccionadas</span>
            <button onClick={handleBulkDownload} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold whitespace-nowrap">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="hidden md:inline">Descargar</span>
            </button>
            <button onClick={requestBulkDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold whitespace-nowrap">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span className="hidden md:inline">Eliminar</span>
            </button>
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

      </main>
    </div>
  );
};

export default SettingsView;


