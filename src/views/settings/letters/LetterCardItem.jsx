import React from 'react';
import LetterControlsBar from './LetterControlsBar';
import LetterFormattingToolbar from './LetterFormattingToolbar';
import LetterPaperSheet from './LetterPaperSheet';

export default function LetterCardItem({
  index,
  totalLetters,
  pageText,
  originalText,
  currentStyle,
  originalStyle,
  currentTitle,
  originalTitle,
  currentTitleColor,
  originalTitleColor,
  currentFont,
  originalFont,
  currentAlign,
  originalAlign,
  currentColor,
  originalColor,
  isSaving,
  isSaved,
  signatureName,
  onPageChange,
  onTitleChange,
  onStyleChange,
  onFontChange,
  onAlignChange,
  onDeletePage,
  onExecuteSave,
  onFormat,
  onApplyInkColor
}) {
  const isPageModified = 
    pageText !== originalText || 
    currentStyle !== originalStyle || 
    currentTitle !== originalTitle || 
    currentTitleColor !== originalTitleColor ||
    currentFont !== originalFont || 
    currentAlign !== originalAlign || 
    currentColor !== originalColor;

  return (
    <div 
      className={`bg-black/60 border p-4 sm:p-8 rounded-2xl sm:rounded-3xl relative transition-all duration-300 ${
        isPageModified 
          ? 'border-purple-500/60 shadow-[0_0_35px_rgba(168,85,247,0.15)]' 
          : 'border-gray-800'
      }`}
    >
      {/* Cabecera y botón eliminar */}
      <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-800 flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-base font-black text-purple-400 uppercase tracking-widest bg-purple-950/60 border border-purple-500/30 px-3.5 py-1 rounded-xl">
              Carta / Página {index + 1}
            </span>
            {isPageModified && (
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 animate-pulse">
                Modificada
              </span>
            )}
          </div>

          {totalLetters > 1 && (
            <button 
              type="button" 
              onClick={() => onDeletePage(index)} 
              className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5" 
              title="Eliminar esta carta"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar Hoja
            </button>
          )}
        </div>

        {/* 1. Barra de Controles (Título, Papel, Tipografía, Alineación) */}
        <LetterControlsBar
          currentTitle={currentTitle}
          currentStyle={currentStyle}
          currentFont={currentFont}
          currentAlign={currentAlign}
          onTitleChange={(val) => onTitleChange(index, val)}
          onStyleChange={(val) => onStyleChange(index, val)}
          onFontChange={(val) => onFontChange(index, val)}
          onAlignChange={(val) => onAlignChange(index, val)}
        />

        {/* 2. Barra de Formato (Deshacer, Rehacer, Negrita, Cursiva, Paleta de Color) */}
        <LetterFormattingToolbar
          index={index}
          currentColor={currentColor}
          currentTitleColor={currentTitleColor}
          onFormat={onFormat}
          onApplyInkColor={onApplyInkColor}
        />
      </div>

      {/* 3. Hoja de Papel interactiva en vivo */}
      <LetterPaperSheet
        index={index}
        pageText={pageText}
        currentTitle={currentTitle}
        currentStyle={currentStyle}
        currentFont={currentFont}
        currentAlign={currentAlign}
        currentColor={currentColor}
        currentTitleColor={currentTitleColor}
        isLastPage={index === totalLetters - 1}
        signatureName={signatureName}
        onPageChange={onPageChange}
        onTitleChange={onTitleChange}
      />

      {/* 4. Botón Contextual de Guardar de esta carta */}
      {isPageModified && (
        <div className="mt-6 pt-5 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <span className="text-xs text-purple-300">
            Has personalizado la <strong>Página {index + 1}</strong>
          </span>

          <button
            type="button"
            onClick={() => onExecuteSave(index)}
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30" strokeLinecap="round" className="opacity-50" />
                </svg>
                Guardando Página {index + 1}...
              </>
            ) : isSaved ? (
              <>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                ¡Página {index + 1} Guardada!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar Página {index + 1}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
