import React, { useRef, useEffect } from 'react';
import { getFontFamilyStyle } from './letterConstants';
import { drawPaperBackground } from './drawPaperBackground';

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
  const isBurnt = currentStyle === 'burnt';
  const defaultInk = (currentStyle === 'parchment' || currentStyle === 'burnt') ? '#2a1a0f' : '#2d2a26';
  const bgCanvasRef = useRef(null);

  // Generar exactamente la misma hoja de inicio compartiendo drawPaperBackground
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const scale = 5; // Misma resolución ultra alta que LetterPage
    canvas.width = 400 * scale;
    canvas.height = 550 * scale;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    ctx.clearRect(0, 0, 400, 550);
    drawPaperBackground(ctx, 400, 550, currentStyle, 42);
  }, [currentStyle]);

  return (
    <div className="flex justify-center w-full py-4 sm:py-6 overflow-x-auto">
      {/* Contenedor idéntico en proporción y dimensiones al Canvas de Inicio (400px x 550px) */}
      <div 
        className="w-[400px] h-[550px] relative transition-all duration-300 flex flex-col px-[40px] pt-[60px] pb-[40px] select-text shadow-2xl flex-shrink-0 rounded-xl overflow-hidden"
        style={{
          boxShadow: isBurnt ? '0 15px 35px rgba(0,0,0,0.9)' : '0 15px 30px rgba(0,0,0,0.6)'
        }}
      >
        {/* Canvas de fondo idéntico al de Inicio */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: '400px', height: '550px' }}
        />

        {/* Título de la página directo sobre el papel */}
        <div className="mb-4 relative z-10">
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
            onPaste={(e) => {
              e.preventDefault();
              const text = (e.clipboardData || window.clipboardData).getData('text/plain');
              document.execCommand('insertText', false, text);
              onTitleChange(index, e.currentTarget.innerText);
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
          onPaste={(e) => {
            e.preventDefault();
            // Obtener texto plano limpio para evitar que arrastre fondos negros o estilos externos
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
            onPageChange(index, e.currentTarget.innerHTML);
          }}
          onBlur={(e) => {
            onPageChange(index, e.currentTarget.innerHTML);
          }}
          onInput={(e) => {
            onPageChange(index, e.currentTarget.innerHTML);
          }}
          className="w-full flex-1 bg-transparent border-none outline-none text-[20px] select-text min-h-[360px] cursor-text relative z-10"
          style={{
            fontFamily: getFontFamilyStyle(currentFont),
            color: currentColor || defaultInk,
            textAlign: currentAlign || 'left',
            lineHeight: '28px'
          }}
        />

        {/* Firma en la última página (idéntico a ctx.font = 'bold italic 22px') */}
        {isLastPage && (
          <div className="mt-6 pt-2 text-right pointer-events-none relative z-10">
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
