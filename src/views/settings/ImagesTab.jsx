import React from 'react';

export default function ImagesTab({
  images,
  planData,
  totalBytes,
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
  nextCursor,
  observerRef
}) {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
        <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Galería de Fotos
      </h2>
      <p className="text-sm text-gray-400 mb-8">
        Sube contenido para llenar tu Universo 3D. Has usado {(totalBytes / (1024 * 1024)).toFixed(1)} MB de {((planData?.maxBytes || 0) / (1024 * 1024)).toFixed(1)} MB permitidos en tu plan.
        <br />
        <span className="text-green-400 font-bold">Te quedan {(((planData?.maxBytes || 0) - totalBytes) / (1024 * 1024)).toFixed(1)} MB disponibles.</span>
      </p>

      <div className="mb-10 relative">
        <input
          type="file" 
          multiple 
          accept={planData?.id === 'free' || planData?.id === 'gratis' ? 'image/*' : 'image/*,video/mp4,video/quicktime,video/webm'} 
          onChange={handleImageUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          title={planData?.id === 'free' || planData?.id === 'gratis' ? "Añadir fotos a la cola" : "Añadir fotos y videos a la cola"}
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
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
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
                {selectedImages.has(img) && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
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
