import React from 'react';
import { PAPER_THEME_STYLES, getFontFamilyStyle } from './letterConstants';

export default function LetterPaperSheet({
  index,
  pageText,
  currentTitle,
  currentStyle,
  currentFont,
  currentAlign,
  currentColor,
  currentTitleColor,
  isLastPage,
  signatureName,
  onPageChange,
  onTitleChange
}) {
  const paperTheme = PAPER_THEME_STYLES[currentStyle] || PAPER_THEME_STYLES.modern;
  const isBurnt = currentStyle === 'burnt';
  const defaultInk = (currentStyle === 'parchment' || currentStyle === 'burnt') ? '#2a1a0f' : '#2d2a26';

  return (
    <div className="flex justify-center w-full py-4 sm:py-6 overflow-x-auto">
      {/* Contenedor con tamaño exacto correspondiente al Canvas (400px x 550px base) */}
      <div 
        className={`w-[400px] max-w-full min-h-[550px] relative transition-all duration-300 flex flex-col px-[40px] pt-[50px] pb-[40px] select-text ${
          isBurnt ? 'rounded-none' : currentStyle === 'parchment' ? 'rounded-lg' : 'rounded-lg shadow-2xl'
        } ${paperTheme.containerClass}`}
        style={{
          ...paperTheme.style,
          ...(isBurnt ? {
            clipPath: 'polygon(0% 2%, 2% 0%, 5% 1.5%, 8% 0%, 12% 1.8%, 15% 0%, 20% 1.5%, 25% 0%, 30% 1.8%, 35% 0%, 40% 1.5%, 45% 0%, 50% 1.8%, 55% 0%, 60% 1.5%, 65% 0%, 70% 1.8%, 75% 0%, 80% 1.5%, 85% 0%, 90% 1.8%, 95% 0%, 98% 1.5%, 100% 2%, 98.5% 5%, 100% 8%, 98.2% 12%, 100% 16%, 98.5% 20%, 100% 25%, 98.2% 30%, 100% 35%, 98.5% 40%, 100% 45%, 98.2% 50%, 100% 55%, 98.5% 60%, 100% 65%, 98.2% 70%, 100% 75%, 98.5% 80%, 100% 85%, 98.2% 90%, 100% 95%, 98% 98%, 95% 100%, 90% 98.2%, 85% 100%, 80% 98.5%, 75% 100%, 70% 98.2%, 65% 100%, 60% 98.5%, 55% 100%, 50% 98.2%, 45% 100%, 40% 98.5%, 35% 100%, 30% 98.2%, 25% 100%, 20% 98.5%, 15% 100%, 12% 98.2%, 8% 100%, 5% 98.5%, 2% 100%, 0% 98%, 1.5% 95%, 0% 90%, 1.8% 85%, 0% 80%, 1.5% 75%, 0% 70%, 1.8% 65%, 0% 60%, 1.5% 55%, 0% 50%, 1.8% 45%, 0% 40%, 1.5% 35%, 0% 30%, 1.8% 25%, 0% 20%, 1.5% 16%, 0% 12%, 1.8% 8%, 0% 5%)',
            border: '2px solid #1a0a00',
            boxShadow: 'inset 0 0 20px 8px rgba(80, 30, 5, 0.4), inset 0 0 10px 4px rgba(40, 15, 0, 0.8), 0 10px 30px rgba(0,0,0,0.85)'
          } : {})
        }}
      >
        {/* Título de la página directo sobre el papel (idéntico a ctx.font = 'bold 24px') */}
        <div className="mb-4">
          <div 
            contentEditable
            suppressContentEditableWarning
            data-letter-title={index}
            ref={(el) => {
              if (el && document.activeElement !== el) {
                if (el.innerText !== currentTitle) {
                  el.innerText = currentTitle || '';
                }
              }
            }}
            onInput={(e) => {
              onTitleChange(index, e.currentTarget.innerText);
            }}
            onBlur={(e) => {
              onTitleChange(index, e.currentTarget.innerText);
            }}
            placeholder="Título / Saludo..."
            className="font-bold text-[24px] leading-normal block outline-none bg-transparent cursor-text select-text"
            style={{
              fontFamily: getFontFamilyStyle(currentFont),
              textAlign: currentAlign || 'left',
              color: currentTitleColor || currentColor || defaultInk
            }}
          />
        </div>

        {/* Editor de texto directo sobre el papel (idéntico a ctx.font = '20px', lineHeight = 28px) */}
        <div
          contentEditable
          suppressContentEditableWarning
          data-letter-editor={index}
          ref={(el) => {
            if (el && document.activeElement !== el) {
              if (el.innerHTML !== pageText) {
                el.innerHTML = pageText || '';
              }
            }
          }}
          onBlur={(e) => {
            onPageChange(index, e.currentTarget.innerHTML);
          }}
          onInput={(e) => {
            onPageChange(index, e.currentTarget.innerHTML);
          }}
          className="w-full flex-1 bg-transparent border-none outline-none text-[20px] select-text min-h-[360px] cursor-text"
          style={{
            fontFamily: getFontFamilyStyle(currentFont),
            color: currentColor || defaultInk,
            textAlign: currentAlign || 'left',
            lineHeight: '28px'
          }}
        />

        {/* Firma en la última página (idéntico a ctx.font = 'bold italic 22px') */}
        {isLastPage && (
          <div className="mt-6 pt-2 text-right pointer-events-none">
            <span 
              className="italic font-bold text-[22px] text-[#e91e63] block"
              style={{
                fontFamily: getFontFamilyStyle(currentFont),
                textAlign: 'right'
              }}
            >
              {signatureName || 'Con todo mi amor'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
