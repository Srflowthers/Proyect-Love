import React, { useState } from 'react';
import { ROMANTIC_FONTS } from './letterConstants';
import { getPaperStyleById, getRarityInfo } from './paperStylesCatalog';
import PaperStyleModal from './PaperStyleModal';

export default function LetterControlsBar({
  currentTitle,
  currentStyle,
  currentFont,
  currentAlign,
  onTitleChange,
  onStyleChange,
  onFontChange,
  onAlignChange
}) {
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  const currentPaper = getPaperStyleById(currentStyle);
  const currentRarity = getRarityInfo(currentPaper.rarity);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 bg-gray-950/70 p-3 sm:p-4 rounded-2xl border border-white/5">
      {/* 1. Título opcional de esta página */}
      <div className="w-full">
        <label className="block text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-1.5 truncate">
          Título / Saludo:
        </label>
        <input
          type="text"
          value={currentTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ej: Para mi amor..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* 2. Papel de esta página - Selector Ergonómico Modal (500+ Estilos) */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[11px] text-gray-400 uppercase tracking-wider font-bold truncate">
            Estilo de Papel:
          </label>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentRarity.badgeClass}`}>
            {currentRarity.label}
          </span>
        </div>

        {/* Botón disparador con vista previa miniatura */}
        <button
          type="button"
          onClick={() => setIsPaperModalOpen(true)}
          className="w-full bg-gray-900 hover:bg-gray-850 border border-gray-700 hover:border-purple-500/80 rounded-xl px-3 py-1.5 text-xs text-white flex items-center justify-between gap-2.5 transition-all group shadow-sm text-left"
          title="Abrir catálogo completo de papeles"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mini preview */}
            <div
              className="w-5 h-6 rounded border flex-shrink-0 shadow-sm relative overflow-hidden"
              style={{
                background: currentPaper.preview?.bg || '#f4f0e8',
                borderColor: currentPaper.preview?.border || '#ccc'
              }}
            >
              {currentPaper.isBurnt && (
                <div className="absolute inset-0 border border-amber-950" />
              )}
            </div>

            <div className="truncate">
              <span className="block font-medium truncate group-hover:text-purple-300 transition-colors text-xs leading-tight">
                {currentPaper.name}
              </span>
              <span className="block text-[10px] text-gray-500 font-mono">
                {currentRarity.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-purple-400 group-hover:text-purple-300 flex-shrink-0 bg-purple-950/40 border border-purple-500/30 px-2 py-1 rounded-lg">
            <span className="text-[10px] font-bold">Cambiar</span>
            <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Modal de selección */}
        {isPaperModalOpen && (
          <PaperStyleModal
            isOpen={isPaperModalOpen}
            currentStyle={currentStyle}
            onSelect={(newStyleId) => {
              onStyleChange(newStyleId);
              setIsPaperModalOpen(false);
            }}
            onClose={() => setIsPaperModalOpen(false)}
          />
        )}
      </div>

      {/* 3. Tipografías Románticas */}
      <div className="w-full">
        <label className="block text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-1.5 truncate">
          Tipografía Romántica:
        </label>
        <select
          value={currentFont}
          onChange={(e) => onFontChange(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none transition-colors"
        >
          {ROMANTIC_FONTS.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* 4. Alineación de Texto */}
      <div className="w-full">
        <label className="block text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-1.5 truncate">
          Alineación:
        </label>
        <div className="flex border border-gray-700 rounded-xl overflow-hidden w-full bg-gray-900">
          {[
            { id: 'left', label: 'Izquierda', icon: 'M4 6h16M4 12h10M4 18h14' },
            { id: 'center', label: 'Centro', icon: 'M4 6h16M7 12h10M5 18h14' },
            { id: 'justify', label: 'Justificado', icon: 'M4 6h16M4 12h16M4 18h16' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onAlignChange(opt.id)}
              className={`flex-1 py-2 flex items-center justify-center transition-colors ${
                currentAlign === opt.id 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={opt.label}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={opt.icon} />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
