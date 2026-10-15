import React from 'react';
import { ROMANTIC_FONTS } from './letterConstants';

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

      {/* 2. Papel de esta página */}
      <div className="w-full">
        <label className="block text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-1.5 truncate">
          Estilo de Papel:
        </label>
        <select
          value={currentStyle}
          onChange={(e) => onStyleChange(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none transition-colors"
        >
          <option value="modern">Moderna (Papel Crema)</option>
          <option value="parchment">Antigua (Pergamino)</option>
          <option value="burnt">Antigua (Bordes Quemados)</option>
        </select>
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
