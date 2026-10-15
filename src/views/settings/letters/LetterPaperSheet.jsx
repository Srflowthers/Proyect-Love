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

  return (
    <div className="flex justify-center w-full py-2 sm:py-4">
      <div 
        className={`w-full max-w-2xl min-h-[440px] sm:min-h-[540px] rounded-2xl p-5 sm:p-14 relative shadow-2xl transition-all duration-300 flex flex-col ${paperTheme.containerClass}`}
        style={paperTheme.style}
      >
        {/* Título de la página directo sobre el papel */}
        <div className="mb-6 pb-3 border-b border-black/10">
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
            className="font-bold text-2xl sm:text-3xl opacity-90 italic block outline-none bg-transparent cursor-text select-text"
            style={{
              fontFamily: getFontFamilyStyle(currentFont),
              textAlign: currentAlign,
              color: currentTitleColor || currentColor || '#111111'
            }}
          />
        </div>

        {/* Editor de texto directo sobre el papel */}
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
          className="w-full flex-1 bg-transparent border-none outline-none text-base sm:text-lg leading-relaxed select-text min-h-[350px] cursor-text"
          style={{
            fontFamily: getFontFamilyStyle(currentFont),
            color: currentColor || undefined,
            textAlign: currentAlign,
            letterSpacing: '0.01em',
            lineHeight: '1.9'
          }}
        />

        {/* Firma en la última página */}
        {isLastPage && (
          <div className="mt-8 pt-4 text-right pointer-events-none">
            <span 
              className="italic font-bold text-xl text-pink-600/90 block"
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
