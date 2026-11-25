import React from 'react';
import { createPortal } from 'react-dom';

export default function ExpiredPlanModal({ isOpen, onClose, actionName = 'realizar esta acción' }) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Fondo clickeable para cerrar */}
      <div 
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor de la Tarjeta Modal */}
      <div className="w-full max-w-lg md:max-w-xl bg-gradient-to-b from-[#181322] via-[#120f19] to-[#0a0810] border border-pink-500/40 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_0_80px_rgba(236,72,153,0.3)] text-center relative z-10 animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Resplandores ambientales decorativos */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar (X) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
          title="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icono Candado Premium */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-tr from-pink-950/80 via-purple-900/50 to-pink-600/30 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 border border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.4)]">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-pink-300 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Título */}
        <h3 className="text-2xl sm:text-3xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-pink-100 to-purple-200 mb-3 drop-shadow-sm">
          Tu universo está en pausa
        </h3>
        
        {/* Descripción principal */}
        <p className="text-gray-300 text-sm sm:text-base mb-4 leading-relaxed max-w-md mx-auto">
          Tu plan ha expirado. Tu universo se encuentra en modo <strong className="text-pink-300 font-semibold">solo lectura</strong>: puedes seguir disfrutando y navegando por todas tus fotos y recuerdos.
        </p>

        {/* Notificación de acción restringida */}
        <div className="text-gray-300 text-xs sm:text-sm mb-6 bg-pink-950/30 border border-pink-500/25 rounded-2xl p-3.5 sm:p-4 max-w-md mx-auto">
          Para <strong>{actionName}</strong> (subir, borrar, editar o descargar), renueva tu membresía.
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          <a
            href="https://wa.me/56956710377?text=Hola,%20mi%20plan%20ha%20expirado%20y%20deseo%20renovarlo."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 rounded-xl font-bold shadow-lg shadow-green-500/25 transition-all text-white flex items-center justify-center gap-2.5 text-sm sm:text-base active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.974.55 1.761.815 2.796.815 3.183 0 5.768-2.587 5.768-5.766.001-3.182-2.585-5.77-5.768-5.772zm3.377 8.219c-.141.396-.713.727-1.002.766-.279.037-.643.064-1.921-.469-1.554-.648-2.535-2.222-2.613-2.327-.078-.105-.632-.84-.632-1.602 0-.762.399-1.135.541-1.288.141-.153.308-.192.411-.192.103 0 .205.001.296.006.096.004.225-.036.352.269.13.313.447 1.089.486 1.168.039.079.065.171.013.275-.052.105-.078.17-.156.262-.078.092-.164.205-.234.275-.078.079-.16.164-.069.32.091.156.404.667.868 1.08 1.015.904 1.87 1.183 2.136 1.314.266.13.422.115.578-.065.156-.179.667-.777.844-1.043.178-.266.356-.222.597-.133.241.089 1.531.722 1.794.853.263.13.438.196.503.304.065.108.065.626-.076 1.022z"/>
            </svg>
            Contactar por WhatsApp para Renovar
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all border border-white/10 text-sm font-semibold active:scale-[0.98] cursor-pointer"
          >
            Continuar Explorando mi Universo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
