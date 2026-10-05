import React, { useState, useEffect, useRef } from 'react';

import imageCompression from 'browser-image-compression';
import { PLANS } from '@/services/userService';
import { logout } from '@/services/authService';

const SettingsView = ({ user, onSaveComplete }) => {
  const [formData, setFormData] = useState({
    user1Name: '',
    user2Name: '',
    anniversaryDate: '',
    pets: '',
    kids: '',
    spotifyUrl: '',
    customMessage: '',
    letterPages: [''],
    letterStyle: 'modern'
  });
  
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // is queue processing?
  const [message, setMessage] = useState('');
  
  // Nuevo sistema de cola en segundo plano
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [planData, setPlanData] = useState(PLANS.pololos);

  // Cargar datos actuales de Firestore
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/users/me`, {
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
            letterPages: data.letterPages || [''],
            letterStyle: data.letterStyle || 'modern'
          });
          setImages(data.galleryImages || []);
          if (data.plan && PLANS[data.plan]) {
            setPlanData(PLANS[data.plan]);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/users/me`, {
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
          letterStyle: formData.letterStyle
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
      const maxMB = (planData.maxBytes / (1024*1024)).toFixed(0);
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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

      setMessage('¡Todas las imágenes subidas con éxito! 📸');
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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

  return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-[#111] border border-pink-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(236,72,153,0.1)]">
        
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-serif italic text-pink-400">Configura tu Universo</h1>
          <div className="flex gap-4">
            <button 
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 border border-red-500/50 rounded-lg text-sm text-white transition-colors"
            >
              Cerrar Sesión
            </button>
            <button 
              onClick={onSaveComplete}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Ir a la Galería ➔
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-pink-900/30 border border-pink-500/50 rounded-lg text-pink-200 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSaveTextData} className="space-y-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Tu Nombre o Apodo</label>
              <input 
                type="text" 
                name="user1Name"
                value={formData.user1Name}
                onChange={handleChange}
                placeholder="Ej: Jorge o Coke"
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Nombre o Apodo de tu Pareja</label>
              <input 
                type="text" 
                name="user2Name"
                value={formData.user2Name}
                onChange={handleChange}
                placeholder="Ej: Abigail o Mosholate"
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Fecha de Aniversario</label>
            <input 
              type="date" 
              name="anniversaryDate"
              value={formData.anniversaryDate}
              onChange={handleChange}
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Mensaje de Amor (Opcional)</label>
            <input 
              type="text" 
              name="customMessage"
              value={formData.customMessage}
              onChange={handleChange}
              placeholder="Ej: Cada segundo a tu lado es un regalo."
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
            />
          </div>

          <div className="border-t border-gray-800 pt-6 mt-6">
            <h3 className="text-xl font-serif text-pink-300 mb-4">Carta Final en 3D</h3>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Estilo del Papel</label>
              <select 
                name="letterStyle"
                value={formData.letterStyle}
                onChange={handleChange}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
              >
                <option value="modern">Moderna (Papel Crema)</option>
                <option value="parchment">Antigua (Pergamino)</option>
                <option value="burnt">Antigua (Bordes Quemados)</option>
              </select>
            </div>

            <p className="text-sm text-gray-400 mb-6">Agrega varias páginas. Cada página será una carta arrugada independiente al final de la página.</p>
            {formData.letterPages.map((pageText, index) => (
              <div key={index} className="mb-6 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <label className="block text-sm text-pink-400/80 mb-2 uppercase tracking-wider font-semibold">Página {index + 1}</label>
                <textarea 
                  value={pageText}
                  onChange={(e) => {
                    const newPages = [...formData.letterPages];
                    newPages[index] = e.target.value;
                    setFormData({...formData, letterPages: newPages});
                  }}
                  rows={5}
                  placeholder="Escribe aquí los párrafos de esta página..."
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors mb-2"
                />
                {formData.letterPages.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => {
                      const newPages = formData.letterPages.filter((_, i) => i !== index);
                      setFormData({...formData, letterPages: newPages});
                    }}
                    className="text-red-400 text-sm hover:text-red-300 font-semibold"
                  >
                    Eliminar Página
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button"
              onClick={() => setFormData({...formData, letterPages: [...formData.letterPages, '']})}
              className="px-4 py-2 border border-pink-500/50 text-pink-300 rounded-lg hover:bg-pink-500/10 transition-colors w-full"
            >
              + Agregar Nueva Página
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Mascotas (Opcional)</label>
              <input 
                type="text" 
                name="pets"
                value={formData.pets}
                onChange={handleChange}
                placeholder="Ej: Max (Perrito)"
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Hijos (Opcional)</label>
              <input 
                type="text" 
                name="kids"
                value={formData.kids}
                onChange={handleChange}
                placeholder="Ej: Sofía y Mateo"
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Link de Spotify (Tu Canción Especial)</label>
            <input 
              type="text" 
              name="spotifyUrl"
              value={formData.spotifyUrl}
              onChange={handleChange}
              placeholder="Ej: https://open.spotify.com/track/3lGMtkONrZdJ8kTCg6KIFf"
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">Copia y pega el enlace de tu canción favorita desde Spotify.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Guardando datos...' : 'Guardar Información'}
          </button>
        </form>

        <div className="border-t border-gray-800 pt-8">
          <h2 className="text-2xl font-serif italic text-purple-400 mb-6">Tus Recuerdos (Fotos)</h2>
          
          <div className="mb-6 relative">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Añadir fotos a la cola"
            />
            <div className={`w-full py-8 border-2 border-dashed ${uploadQueue.length > 0 ? 'border-pink-400 bg-pink-900/30' : 'border-pink-500/50 bg-pink-900/10 hover:bg-pink-900/20'} rounded-xl flex flex-col items-center justify-center transition-colors`}>
              {uploadQueue.length > 0 ? (
                <>
                  <svg className="w-10 h-10 text-pink-400 mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-pink-200 font-medium text-center">
                    Subiendo ({uploadProgress.current - 1} de {uploadProgress.total})<br/>
                    <span className="text-sm opacity-70">¡Puedes seguir seleccionando más fotos!</span>
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-10 h-10 text-pink-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-pink-300 font-medium">Toca aquí para seleccionar fotos</span>
                </>
              )}
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-gray-800 relative group">
                  <img src={img.src} alt="Recuerdo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
                    <span className="text-xs text-white uppercase tracking-wider">Subida</span>
                    <button 
                      type="button"
                      onClick={() => handleDeleteImage(img)}
                      className="px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white text-xs rounded-full shadow-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SettingsView;
