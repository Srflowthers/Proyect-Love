import React, { useState, useMemo } from 'react';

export default function ImagesTab({
  images,
  planData,
  totalBytes,
  totalImages,
  mediaCounts,
  handleImageUpload,
  uploadQueue,
  uploadProgress,
  selectedImages,
  handleItemClick,
  handleTouchStart,
  handleTouchEnd,
  isSelectionMode,
  setIsSelectionMode,
  toggleSelection,
  requestDeleteImage,
  triggerDownload,
  deletingStatus,
  nextCursor,
  observerRef,
  globalUserData,
}) {
  const isCollaborator = !!globalUserData?.isCollaborator;
  const collabPerms = globalUserData?.collaboratorPermissions || {};
  const canUpload = !isCollaborator || collabPerms.upload !== false;
  const canDownload = !isCollaborator || collabPerms.download !== false;
  const canDelete = !isCollaborator || collabPerms.delete !== false;

  // Estados para Filtros y Ordenamiento
  const [filterType, setFilterType] = useState('all'); // 'all' | 'images' | 'videos'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'oldest' | 'size_desc' | 'size_asc'

  // Contadores reales (desde la base de datos completa sin necesidad de descargar todos los archivos)
  const actualTotalCount = mediaCounts?.total > 0 
    ? mediaCounts.total 
    : (totalImages > 0 ? totalImages : images.length);

  const actualImageCount = mediaCounts?.images > 0 
    ? mediaCounts.images 
    : (mediaCounts?.total > 0 && mediaCounts?.videos !== undefined 
        ? (mediaCounts.total - mediaCounts.videos) 
        : (totalImages > 0 && images.length === 0 ? totalImages : images.filter((img) => !img.isVideo).length));

  const actualVideoCount = mediaCounts?.videos !== undefined && mediaCounts?.total > 0
    ? mediaCounts.videos
    : images.filter((img) => !!img.isVideo).length;

  // Aplicar Filtro y Ordenamiento sobre las imágenes
  const processedImages = useMemo(() => {
    // 1. Filtrar por tipo
    let list = images.map((img, originalIndex) => ({ ...img, _originalIndex: originalIndex }));
    if (filterType === 'images') {
      list = list.filter((img) => !img.isVideo);
    } else if (filterType === 'videos') {
      list = list.filter((img) => !!img.isVideo);
    }

    // 2. Ordenar
    return list.sort((a, b) => {
      if (sortBy === 'recent') {
        // Si tienen timestamp explícito o por orden de llegada (últimos subidos al inicio)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a._originalIndex;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b._originalIndex;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a._originalIndex;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b._originalIndex;
        return timeA - timeB;
      }
      if (sortBy === 'size_desc') {
        const bytesA = Number(a.bytes) || 0;
        const bytesB = Number(b.bytes) || 0;
        return bytesB - bytesA;
      }
      if (sortBy === 'size_asc') {
        const bytesA = Number(a.bytes) || 0;
        const bytesB = Number(b.bytes) || 0;
        return bytesA - bytesB;
      }
      return 0;
    });
  }, [images, filterType, sortBy]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return null;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
        <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Galería de Fotos y Recuerdos
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Sube contenido para llenar tu Universo 3D. Has usado {(totalBytes / (1024 * 1024)).toFixed(1)} MB de {((planData?.maxBytes || 0) / (1024 * 1024)).toFixed(1)} MB permitidos en tu plan.
        <br />
        <span className="text-green-400 font-bold">Te quedan {(((planData?.maxBytes || 0) - totalBytes) / (1024 * 1024)).toFixed(1)} MB disponibles.</span>
      </p>

      {!canUpload ? (
        <div className="mb-8 p-5 bg-purple-950/20 border border-purple-500/30 rounded-2xl flex items-center gap-4 text-purple-200">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Modo Solo Lectura (Sin Subir Fotos)</h4>
            <p className="text-xs text-purple-300/80">
              Quien te invitó configuró tu acceso para visualizar y recorrer los recuerdos de este universo sin agregar contenido.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-8 relative">
          <input
            type="file" 
            multiple 
            accept={planData?.id === 'free' || planData?.id === 'gratis' ? 'image/*' : 'image/*,video/mp4,video/quicktime,video/webm'} 
            onChange={handleImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title={planData?.id === 'free' || planData?.id === 'gratis' ? "Añadir fotos a la cola" : "Añadir fotos y videos a la cola"}
          />
          <div className={`w-full py-10 border-2 border-dashed ${uploadQueue.length > 0 ? 'border-pink-400 bg-pink-900/20' : deletingStatus ? 'border-red-500/70 bg-red-950/20' : 'border-gray-700 hover:border-pink-500/50 bg-black hover:bg-[#151515]'} rounded-2xl flex flex-col items-center justify-center transition-all`}>
            {uploadQueue.length > 0 ? (
              <>
                <svg className="w-12 h-12 text-pink-400 mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-pink-200 font-bold text-lg text-center">
                  Subiendo archivo ({Math.min(uploadProgress.current, uploadProgress.total)} de {uploadProgress.total})
                </span>
              </>
            ) : deletingStatus ? (
              <>
                <svg className="w-12 h-12 text-red-500 mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-red-300 font-bold text-lg text-center">
                  Eliminando archivo {deletingStatus.total > 1 ? `(${deletingStatus.current} de ${deletingStatus.total})...` : '...'}
                </span>
                <span className="text-red-400/70 text-xs mt-1">Liberando espacio en tu almacenamiento</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-pink-900/30 rounded-full flex items-center justify-center mb-4 text-pink-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-gray-300 font-bold text-lg">Toca para añadir Fotos o Videos</span>
                <span className="text-gray-500 text-sm mt-1">Soporta selección múltiple en máxima calidad</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS Y ORDENAMIENTO (JUSTO DEBAJO DE AGREGAR) */}
      {images.length > 0 && (
        <div className="mb-6 p-3 bg-gray-950/70 border border-gray-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
          {/* Filtro por Tipo de Contenido */}
          <div className="flex items-center gap-1.5 bg-gray-900/90 p-1 rounded-xl border border-gray-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Todos ({actualTotalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('images')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterType === 'images'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Imágenes ({actualImageCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('videos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterType === 'videos'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Videos ({actualVideoCount})</span>
            </button>
          </div>

          {/* Selector de Ordenamiento */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>Ordenar:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-900 text-white text-xs border border-gray-700 rounded-xl px-3 py-2 outline-none focus:border-purple-500 transition-colors cursor-pointer"
            >
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="size_desc">Mayor peso</option>
              <option value="size_asc">Menor peso</option>
            </select>
          </div>
        </div>
      )}

      {/* Renderizado de Imágenes Filtradas */}
      {processedImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {processedImages.map((img, idx) => {
            const fileSize = formatFileSize(img.bytes);
            const isBeingDeleted = deletingStatus?.targetId 
              ? deletingStatus.targetId === img.public_id 
              : (selectedImages.has(img) && deletingStatus !== null);
            return (
              <div 
                key={img.public_id || idx} 
                className={`aspect-square rounded-xl overflow-hidden border-2 relative group shadow-lg transition-all ${isBeingDeleted ? 'border-red-500 scale-95 opacity-75' : selectedImages.has(img) ? 'border-pink-500 scale-95 opacity-80' : 'border-gray-800'}`}
                onClick={(e) => handleItemClick(img, e)}
                onTouchStart={() => handleTouchStart(img)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                {/* Overlay de Eliminando */}
                {isBeingDeleted && (
                  <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-2 text-center animate-fadeIn pointer-events-none">
                    <svg className="w-8 h-8 text-red-400 mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-red-200 font-bold text-xs uppercase tracking-wider">
                      Eliminando...
                    </span>
                  </div>
                )}

                {/* Checkbox Icon */}
                <div 
                  className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-20 cursor-pointer ${selectedImages.has(img) ? 'bg-pink-500 border-pink-500' : 'border-white/50 bg-black/30 opacity-0 group-hover:opacity-100'}`} 
                  onClick={(e) => { e.stopPropagation(); setIsSelectionMode(true); toggleSelection(img); }}
                >
                  {selectedImages.has(img) && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Badge de Video o Peso en la esquina superior derecha */}
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10 pointer-events-none">
                  {img.isVideo && (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-purple-300 border border-purple-500/40 flex items-center gap-1">
                      <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Video</span>
                    </span>
                  )}
                  {fileSize && (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-medium text-gray-300 border border-gray-700/60">
                      {fileSize}
                    </span>
                  )}
                </div>

                {img.isVideo ? (
                  <video src={img.src} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={img.src} alt="Recuerdo" className="w-full h-full object-cover" />
                )}
                
                {!isSelectionMode && (canDownload || canDelete) && (
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 gap-3 backdrop-blur-sm pointer-events-none md:pointer-events-auto">
                    {canDownload && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = img.original_url || img.src;
                          const ext = img.format || (img.isVideo ? 'mp4' : 'jpg');
                          const filename = `Recuerdo_${idx + 1}.${ext}`;
                          if (triggerDownload) {
                            triggerDownload(url, filename);
                          } else {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = filename;
                            link.target = '_blank';
                            link.click();
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg shadow-xl pointer-events-auto flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Descargar</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); requestDeleteImage(img); }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg shadow-xl pointer-events-auto flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : images.length > 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-950/40 rounded-2xl border border-gray-800">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <p className="text-sm font-semibold text-gray-300">No hay archivos en este filtro.</p>
          <p className="text-xs text-gray-500 mt-1">Prueba seleccionando "Todos" para ver el resto de tu galería.</p>
        </div>
      ) : null}

      
      {/* Trigger del Scroll Infinito */}
      {nextCursor && (
        <div ref={observerRef} className="w-full py-8 flex justify-center">
          <svg className="w-8 h-8 text-pink-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>Aún no has subido fotos. ¡Agrega la primera arriba!</p>
        </div>
      )}
    </div>
  );
}
