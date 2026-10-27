import React from 'react';

export default function MusicTab({
  formData,
  setFormData,
  planData,
  handleAudioUpload,
  draggedAudioIdx,
  setDraggedAudioIdx,
  playingAudioIdx,
  togglePlayPreview,
  setDeleteModal,
  user,
  totalBytes,
  setTotalBytes,
  isExpired,
  onExpiredAction
}) {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        Tu Música de Fondo
      </h2>
      <p className="text-sm text-gray-400 mb-6">Personaliza la banda sonora que sonará al entrar a tu Universo.</p>

      {/* Indicador de Almacenamiento Global */}
      <div className="bg-black/50 border border-gray-800 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-green-400 font-bold block mb-1">
            Almacenamiento del Plan ({planData?.name || 'Tu Plan'})
          </span>
          <p className="text-sm text-gray-300">
            Has usado <strong className="text-white font-bold">{((totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB</strong> de {(((planData?.maxBytes || 0)) / (1024 * 1024)).toFixed(1)} MB permitidos (fotos y música).
          </p>
        </div>
        <div className="text-left sm:text-right min-w-[160px]">
          <span className="text-xs text-green-400 font-bold block">
            {Math.max(0, (((planData?.maxBytes || 0) - (totalBytes || 0)) / (1024 * 1024))).toFixed(1)} MB disponibles
          </span>
          <div className="w-full sm:w-40 bg-gray-800 h-2.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-green-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, (((totalBytes || 0) / (planData?.maxBytes || 1)) * 100)))}%` }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        
        {/* Caja 1: Subir MP3 */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
          <label className="block text-sm text-green-400 mb-4 uppercase tracking-wider font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Sube Tu Propia Canción (Plan Premium)
          </label>
          <p className="text-xs text-gray-400 mb-4">Esta música tiene prioridad absoluta. Si subes un MP3 o WAV, reemplazará a Spotify automáticamente.</p>
          
          <div className={`w-full border-2 border-dashed ${planData?.id === 'free' || planData?.id === 'gratis' ? 'border-gray-800 bg-gray-900/50' : 'border-green-600/50 bg-green-900/10 hover:border-green-500'} rounded-xl p-8 text-center relative transition-all min-h-[200px] flex flex-col justify-center items-center`}>
            {planData?.id === 'free' || planData?.id === 'gratis' ? (
              <div className="text-gray-500 flex flex-col items-center">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-base font-bold text-gray-400">Opción Premium Bloqueada</p>
                <p className="text-xs mt-1 max-w-xs">Los planes gratis solo pueden usar enlaces de Spotify. ¡Sube de plan para agregar tu archivo original!</p>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept="audio/*"
                  onClick={(e) => {
                    if (isExpired) {
                      e.preventDefault();
                      if (onExpiredAction) onExpiredAction('subir canciones en MP3 o WAV');
                    }
                  }}
                  onChange={handleAudioUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Subir archivo MP3 o WAV"
                />
                <div className="flex flex-col items-center text-green-300">
                  <svg className="w-12 h-12 mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
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
                      {audio.bytes ? (
                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-gray-800 font-mono shrink-0">
                          {(audio.bytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isExpired) {
                          if (onExpiredAction) onExpiredAction('eliminar canciones de tu playlist');
                          return;
                        }
                        setDeleteModal({
                          type: 'single_audio',
                          title: '¿Eliminar Pista?',
                          message: `¿Estás seguro de que deseas eliminar "${audio.name}" de la playlist?`,
                          onConfirm: async () => {
                            const audioToDelete = formData.customAudios[idx];
                            
                            // 1. Quitarlo de la playlist (se autoguarda)
                            setFormData(prev => ({
                              ...prev,
                              customAudios: prev.customAudios.filter((_, i) => i !== idx)
                            }));
                            setDeleteModal(null);

                            // Restar bytes de totalBytes
                            if (setTotalBytes && audioToDelete?.bytes) {
                              setTotalBytes(prev => Math.max(0, prev - audioToDelete.bytes));
                            }

                            // 2. Eliminar archivo físico en segundo plano
                            let pubId = audioToDelete.public_id;
                            if (!pubId && audioToDelete.url && audioToDelete.url.includes('Produccion/users/')) {
                              pubId = audioToDelete.url.substring(audioToDelete.url.indexOf('Produccion/users/')).split('?')[0];
                            }

                            if (pubId && !audioToDelete.isSpotify) {
                              try {
                                const token = await user.getIdToken();
                                const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
                                fetch(`${apiUrl}/api/images/delete`, {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ public_id: `r2|${pubId}` })
                                }).catch(console.error);
                              } catch (e) {
                                console.error(e);
                              }
                            }
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
                if (isExpired) {
                  if (onExpiredAction) onExpiredAction('añadir música a tu playlist');
                  return;
                }
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

      </form>
    </div>
  );
}
