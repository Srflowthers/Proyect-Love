import React from 'react';
import { QUICK_SWATCHES } from './letterConstants';

export default function LetterFormattingToolbar({
  index,
  currentColor,
  currentTitleColor,
  onFormat,
  onApplyInkColor
}) {
  return (
    <div className="bg-gray-950/50 p-2.5 sm:p-3 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-gray-300">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Botón Deshacer (Undo / Ctrl+Z) */}
        <button
          type="button"
          onMouseDown={(e) => { 
            e.preventDefault(); 
            onFormat('undo', null, index); 
          }}
          className="px-2 py-1 sm:px-2.5 sm:py-1 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-700 text-gray-300 hover:text-white transition-colors active:scale-95 text-xs flex items-center gap-1"
          title="Deshacer (Ctrl + Z)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
          <span className="hidden sm:inline">Deshacer</span>
        </button>

        {/* Botón Rehacer (Redo / Ctrl+Y) */}
        <button
          type="button"
          onMouseDown={(e) => { 
            e.preventDefault(); 
            onFormat('redo', null, index); 
          }}
          className="px-2 py-1 sm:px-2.5 sm:py-1 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-700 text-gray-300 hover:text-white transition-colors active:scale-95 text-xs flex items-center gap-1 mr-1"
          title="Rehacer (Ctrl + Y)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
          </svg>
          <span className="hidden sm:inline">Rehacer</span>
        </button>

        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5 mr-1 shrink-0">
          <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.8-6.2l-2.1 2.1m-8.2 8.2l-2.1 2.1m12.4 0l-2.1-2.1m-8.2-8.2l-2.1-2.1" />
            <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
          </svg>
          Formato:
        </span>

        {/* Botón Negrita */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onFormat('bold'); }}
          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-900 hover:bg-gray-800 rounded-lg font-bold border border-gray-700 text-white transition-colors active:scale-95 text-xs"
          title="Poner texto seleccionado en Negrita"
        >
          B
        </button>

        {/* Botón Cursiva */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onFormat('italic'); }}
          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-900 hover:bg-gray-800 rounded-lg italic font-serif border border-gray-700 text-white transition-colors active:scale-95 text-xs"
          title="Poner texto seleccionado en Cursiva"
        >
          I
        </button>

        {/* Botón Subrayado */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onFormat('underline'); }}
          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-900 hover:bg-gray-800 rounded-lg underline border border-gray-700 text-white transition-colors active:scale-95 text-xs"
          title="Subrayar texto seleccionado"
        >
          U
        </button>
      </div>

      {/* Paleta rápida para colorear el texto seleccionado o la tinta */}
      <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-gray-800 pt-2 md:pt-0 md:pl-3">
        <span className="text-[11px] font-semibold text-gray-300 shrink-0 select-none">Tinta / Color:</span>
        <div className="flex items-center gap-2 py-1">
          {QUICK_SWATCHES.map(swatch => (
            <button
              key={swatch.color}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onApplyInkColor(swatch.color, index);
              }}
              className="w-5 h-5 rounded-full border border-white/25 hover:border-white hover:ring-2 hover:ring-purple-400/50 transition-all shadow-sm shrink-0"
              style={{ backgroundColor: swatch.color }}
              title={swatch.title}
            />
          ))}
          
          {/* Selector circular cromático para color personalizado */}
          <label 
            className="relative shrink-0 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white/30 hover:border-white hover:ring-2 hover:ring-purple-400/50 shadow-sm cursor-pointer overflow-hidden transition-all ml-1"
            style={{
              background: currentColor || currentTitleColor
                ? (currentColor || currentTitleColor)
                : 'conic-gradient(from 180deg, #f43f5e, #a855f7, #3b82f6, #10b981, #eab308, #f43f5e)'
            }}
            title="Elegir cualquier otro color con paleta cromática"
          >
            <input
              type="color"
              defaultValue="#e91e63"
              onInput={(e) => {
                onApplyInkColor(e.target.value, index);
              }}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
