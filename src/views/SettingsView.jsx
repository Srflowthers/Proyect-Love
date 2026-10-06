import React, { useState, useEffect, useRef } from 'react';

import imageCompression from 'browser-image-compression';
import { PLANS } from '@/services/userService';
import { logout } from '@/services/authService';
import Dock from '@/components/Dock';
import LetterPage from '@/components/ui/LetterPage';
import { GlitterWarp, VARIANTS, PALETTES } from '@/components/ui/glitter-warp';

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
    universeVariant: 'tunnel'
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // is queue processing?
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile', 'pages', 'images'
  
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
            universeVariant: data.universeVariant || 'tunnel'
          });
          setImages(data.galleryImages || []);
          if (data.plan && PLANS[data.plan]) {
            setPlanData(PLANS[data.plan]);
          }
          if (data.planExpiresAt) {
            const expDate = new Date(data.planExpiresAt);
            setIsExpired(expDate.getTime() < Date.now());
          }
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
          universeVariant: formData.universeVariant
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

    setUploading(true);
    setMessage('Comprimiendo imágenes para que la galería vuele...');

    const compressedFiles = [];
    const options = {
      maxSizeMB: 1, // Máximo 1MB por foto
      maxWidthOrHeight: 1920, // Resolución Full HD máxima
      useWebWorker: true
    };

    for (let file of files) {
      try {
        const compressedFile = await imageCompression(file, options);
        compressedFiles.push(compressedFile);
      } catch (error) {
        console.error("Error comprimiendo, usando original", error);
        compressedFiles.push(file); // Fallback
      }
    }

    uploadQueueRef.current = [...uploadQueueRef.current, ...compressedFiles];
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
          // Agregamos f_auto (formato WebP), q_auto (compresión IA), w_800 (redimensiona a 800px para la galería 3D)
          const urlParts = cloudData.secure_url.split('/upload/');
          const optimizedUrl = `${urlParts[0]}/upload/f_auto,q_auto,w_800/${urlParts[1]}`;

          const newImg = {
            src: optimizedUrl,
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

  const handleDeleteImage = async (imageToDelete) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen de tu universo?')) return;

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
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row pb-32 md:pb-0 md:pl-24">
      


      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 lg:p-16 overflow-y-auto min-h-screen">
        <div className="max-w-3xl mx-auto bg-[#111] border border-pink-500/20 rounded-2xl p-6 md:p-10 shadow-[0_0_50px_rgba(236,72,153,0.05)]">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
            <h1 className="text-2xl font-serif italic text-pink-400">Configuración</h1>
            <button
              onClick={onSaveComplete}
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
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Información Personal
              </h2>
              <form onSubmit={handleSaveTextData} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Tu Nombre o Apodo</label>
                    <input type="text" name="user1Name" value={formData.user1Name} onChange={handleChange} placeholder="Ej: Jorge o Coke" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Nombre de tu Pareja</label>
                    <input type="text" name="user2Name" value={formData.user2Name} onChange={handleChange} placeholder="Ej: Abigail o Mosholate" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Fecha de Aniversario</label>
                  <input type="date" name="anniversaryDate" value={formData.anniversaryDate} onChange={handleChange} className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Mascotas (Opcional)</label>
                    <input type="text" name="pets" value={formData.pets} onChange={handleChange} placeholder="Ej: Max (Perrito)" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Hijos (Opcional)</label>
                    <input type="text" name="kids" value={formData.kids} onChange={handleChange} placeholder="Ej: Sofía y Mateo" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Link de Spotify (Tu Canción)</label>
                  <input type="text" name="spotifyUrl" value={formData.spotifyUrl} onChange={handleChange} placeholder="Ej: https://open.spotify.com/track/..." className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Mensaje de Amor Directo (Pantalla Principal)</label>
                  <textarea name="customMessage" value={formData.customMessage} onChange={handleChange} rows={3} placeholder="Ej: Cada segundo a tu lado es un regalo." className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">Color del Fondo (Base)</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'purple' ? 'border-pink-500 scale-105 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
                      <input type="radio" name="universeColor" value="purple" checked={formData.universeColor === 'purple'} onChange={handleChange} className="hidden" />
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-purple-950 via-pink-900 to-black"></div>
                      <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Nebulosa Rosa</p>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'blue' ? 'border-cyan-500 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
                      <input type="radio" name="universeColor" value="blue" checked={formData.universeColor === 'blue'} onChange={handleChange} className="hidden" />
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-blue-950 via-cyan-900 to-black"></div>
                      <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Océano Cósmico</p>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'red' ? 'border-red-500 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
                      <input type="radio" name="universeColor" value="red" checked={formData.universeColor === 'red'} onChange={handleChange} className="hidden" />
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-red-950 via-rose-900 to-black"></div>
                      <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Pasión Carmesí</p>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'gold' ? 'border-amber-500 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
                      <input type="radio" name="universeColor" value="gold" checked={formData.universeColor === 'gold'} onChange={handleChange} className="hidden" />
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-yellow-950 via-amber-900 to-black"></div>
                      <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Polvo de Oro</p>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'black' ? 'border-gray-400 scale-105 shadow-[0_0_15px_rgba(156,163,175,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
                      <input type="radio" name="universeColor" value="black" checked={formData.universeColor === 'black'} onChange={handleChange} className="hidden" />
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-gray-900 via-[#111] to-black border border-gray-800"></div>
                      <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Vacío Elegante</p>
                    </label>
                  </div>
                </div>

                <div className="pt-8 mt-2 border-t border-gray-800">
                  <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                      <path d="M20 3v4"/>
                      <path d="M22 5h-4"/>
                      <path d="M4 17v2"/>
                      <path d="M5 18H3"/>
                    </svg>
                    Efectos Especiales (Partículas 3D)
                  </h3>
                  
                  <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">1. Paleta de Colores de Partículas</label>
                  <div className="flex gap-2 flex-wrap mb-6">
                    {Object.keys(PALETTES).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const isNone = formData.universeVariant === 'none' || !formData.universeVariant;
                          setFormData({ 
                            ...formData, 
                            universePalette: p,
                            universeVariant: isNone ? 'tunnel' : formData.universeVariant
                          });
                        }}
                        className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                          formData.universePalette === p
                            ? 'border-pink-500 bg-pink-500/20 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                            : 'border-gray-700 bg-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">2. Estilo de Movimiento</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, universeVariant: 'none' })}
                        className={`relative h-28 rounded-xl overflow-hidden border-2 text-left cursor-pointer transition-all flex items-center justify-center ${
                          formData.universeVariant === 'none' || !formData.universeVariant
                            ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-105 z-10 bg-gray-900'
                            : 'border-gray-800 hover:border-gray-600 hover:scale-105 bg-black'
                        }`}
                      >
                        <span className="font-bold text-gray-400">Sin Efecto</span>
                    </button>
                    {Object.entries(VARIANTS).map(([key, v]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, universeVariant: key })}
                        className={`relative h-28 rounded-xl overflow-hidden border-2 text-left cursor-pointer transition-all ${
                          formData.universeVariant === key
                            ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-105 z-10'
                            : 'border-gray-800 hover:border-gray-600 hover:scale-105'
                        }`}
                      >
                        <GlitterWarp
                          key={`${key}-${formData.universePalette || 'Cósmico'}`}
                          variant={key}
                          colors={PALETTES[formData.universePalette || 'Cósmico']}
                          count={v.n ? Math.min(v.n, 50) : 50} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <span className="absolute bottom-2 left-2 right-2 text-xs font-bold text-white text-center drop-shadow-md">
                          {v.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 mt-8">
                  {loading ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: LETTERS */}
          {activeTab === 'pages' && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Cartas 3D
              </h2>
              <p className="text-sm text-gray-400 mb-8">Escribe cartas largas. Cada página se representará como una carta arrugada en tu galería 3D.</p>
              
              <form onSubmit={handleSaveTextData}>
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

                <button type="submit" disabled={loading} className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 mt-8">
                  {loading ? 'Guardando Cartas...' : 'Guardar Cartas'}
                </button>
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
                  type="file" multiple accept="image/*" onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Añadir fotos a la cola"
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
                      <span className="text-gray-300 font-bold text-lg">Toca para seleccionar fotos</span>
                      <span className="text-gray-500 text-sm mt-1">Soporta selección múltiple</span>
                    </>
                  )}
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-800 relative group shadow-lg">
                      <img src={img.src} alt="Recuerdo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 gap-3 backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg shadow-xl"
                        >
                          Eliminar
                        </button>
                      </div>
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
        </div>
      </main>
    </div>
  );
};

export default SettingsView;
