import React, { useState, useEffect } from 'react';
import PaperCrumple from './PaperCrumple';

const LetterPage = ({ text, title, userName, signature, index, isLastPage, theme, textColor, textFont, textAlign, titleColor }) => {
  const [letterSrc, setLetterSrc] = useState(null);

  useEffect(() => {
    if (!text) return;

    const scale = 5; // Ultra-high resolution para evitar cualquier borrosidad en 3D
    const canvas = document.createElement('canvas');
    canvas.width = 400 * scale;
    canvas.height = 550 * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const drawTextAndFinish = () => {
      // Usar color personalizado si se definió, o la tinta por defecto según el papel
      const defaultInk = (theme === 'parchment' || theme === 'burnt') ? '#2a1a0f' : '#2d2a26';
      const baseColor = textColor || defaultInk;
      
      const align = textAlign || 'left';
      ctx.textAlign = align;

      const getFamily = (font) => {
        if (font === 'caveat') return '"Caveat", cursive';
        if (font === 'parisienne') return '"Parisienne", cursive';
        if (font === 'greatvibes') return '"Great Vibes", cursive';
        if (font === 'alexbrush') return '"Alex Brush", cursive';
        if (font === 'playfair') return '"Playfair Display", serif';
        if (font === 'garamond') return '"Cormorant Garamond", serif';
        return '"Georgia", serif';
      };

      const baseFontFace = getFamily(textFont);
      let y = 60;
      const xAnchor = align === 'center' ? 200 : align === 'right' ? 360 : 40;

      if (title && title.trim() !== '') {
        ctx.font = `bold 24px ${baseFontFace}`;
        ctx.fillStyle = titleColor || baseColor;
        ctx.fillText(title, xAnchor, y);
        y += 45;
      }

      // Si el texto contiene HTML (etiquetas span, b, strong, i, em, font, etc.)
      const isHtml = /<[a-z][\s\S]*>/i.test(text);

      if (!isHtml) {
        // Modo texto plano
        ctx.font = `20px ${baseFontFace}`;
        ctx.fillStyle = baseColor;
        const maxWidth = 400 - 80;
        const lineHeight = 28;

        const lines = text.split('\\n').flatMap(l => l.split('\n'));
        lines.forEach(textLine => {
          if (textLine.trim() === '') {
            y += lineHeight;
            return;
          }
          const words = textLine.split(' ');
          let line = '';
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              ctx.fillText(line, xAnchor, y);
              line = words[n] + ' ';
              y += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, xAnchor, y);
          y += lineHeight;
        });
      } else {
        // Modo Rich HTML: creamos un elemento temporal para extraer nodos con formato
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;

        const maxWidth = 400 - 80;
        const lineHeight = 28;
        let currentLine = [];
        let currentLineWidth = 0;

        const flushLine = () => {
          if (currentLine.length === 0) {
            y += lineHeight;
            return;
          }
          let startX = 40;
          if (align === 'center') {
            startX = (400 - currentLineWidth) / 2;
          } else if (align === 'right') {
            startX = 360 - currentLineWidth;
          }

          let drawX = startX;
          ctx.textAlign = 'left';
          currentLine.forEach(span => {
            ctx.font = `${span.isBold ? 'bold' : 'normal'} ${span.isItalic ? 'italic' : 'normal'} 20px ${baseFontFace}`;
            ctx.fillStyle = span.color || baseColor;
            ctx.fillText(span.text, drawX, y);
            drawX += span.width;
          });

          y += lineHeight;
          currentLine = [];
          currentLineWidth = 0;
        };

        const processNode = (node, isBold = false, isItalic = false, nodeColor = null) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const nodeText = node.textContent;
            if (!nodeText) return;
            const words = nodeText.split(/(\s+)/); // Preserva espacios
            
            words.forEach(word => {
              if (word === '') return;
              ctx.font = `${isBold ? 'bold' : 'normal'} ${isItalic ? 'italic' : 'normal'} 20px ${baseFontFace}`;
              const wordWidth = ctx.measureText(word).width;

              if (word.includes('\n')) {
                flushLine();
                return;
              }

              if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                flushLine();
              }

              currentLine.push({
                text: word,
                width: wordWidth,
                isBold,
                isItalic,
                color: nodeColor
              });
              currentLineWidth += wordWidth;
            });
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const nextBold = isBold || tagName === 'b' || tagName === 'strong';
            const nextItalic = isItalic || tagName === 'i' || tagName === 'em';
            let nextColor = nodeColor;
            if (node.style && node.style.color) {
              nextColor = node.style.color;
            } else if (node.getAttribute('color')) {
              nextColor = node.getAttribute('color');
            }

            if (tagName === 'br' || tagName === 'p' || tagName === 'div') {
              flushLine();
            }

            Array.from(node.childNodes).forEach(child => {
              processNode(child, nextBold, nextItalic, nextColor);
            });

            if (tagName === 'p' || tagName === 'div') {
              flushLine();
            }
          }
        };

        Array.from(tempDiv.childNodes).forEach(child => processNode(child));
        if (currentLine.length > 0) {
          flushLine();
        }
      }

      if (isLastPage && signature) {
        y += 40;
        ctx.font = `bold italic 22px ${baseFontFace}`;
        ctx.fillStyle = '#e91e63';
        ctx.textAlign = 'right';
        ctx.fillText(signature, 360, y);
      }

      setLetterSrc(canvas.toDataURL('image/png'));
    };

    if (theme === 'parchment' || theme === 'burnt') {
      // Generar textura de pergamino nativa en canvas sin bordes/fondos indeseados
      const grad = ctx.createRadialGradient(200, 275, 0, 200, 275, 400);
      grad.addColorStop(0, '#f1dcb8');
      grad.addColorStop(0.7, '#e4c494');
      grad.addColorStop(1, '#c79c65');
      
      if (theme === 'burnt') {
        // Rellenamos el lienzo de negro (mismo color que el fondo de la app) para camuflar los bordes
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 400, 550);

        // Creamos la forma irregular de la hoja quemada
        ctx.beginPath();
        ctx.moveTo(10, 10);
        // Generar bordes dentados de alta resolución (cada 2 píxeles)
        // Top
        for(let x=10; x<=390; x+=2) ctx.lineTo(x, Math.random() * 8 + 10);
        // Right
        for(let y=10; y<=540; y+=2) ctx.lineTo(400 - (Math.random() * 8 + 10), y);
        // Bottom
        for(let x=390; x>=10; x-=2) ctx.lineTo(x, 550 - (Math.random() * 8 + 10));
        // Left
        for(let y=540; y>=10; y-=2) ctx.lineTo(Math.random() * 8 + 10, y);
        ctx.closePath();

        // Recortamos (clip)
        ctx.save();
        ctx.clip();

        // Rellenar la hoja irregular
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 550);

        // Borde interior difuminado (sombra de la quemadura)
        ctx.strokeStyle = 'rgba(80, 30, 5, 0.4)';
        ctx.lineWidth = 15;
        ctx.stroke();
        
        // Borde central quemado más oscuro y nítido
        ctx.strokeStyle = 'rgba(40, 15, 0, 0.8)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Línea de carbonización extrema en el mero borde (súper nítido)
        ctx.strokeStyle = '#1a0a00';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      } else {
        // Estilo 'parchment' normal (papel entero)
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 550);
        
        // Borde quemado/desgastado muy sutil (estilo pergamino normal)
        ctx.strokeStyle = 'rgba(100, 60, 20, 0.4)';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, 392, 542);
      }
      
      drawTextAndFinish();
    } else {
      ctx.fillStyle = '#f4f0e8';
      ctx.fillRect(0, 0, 400, 550);
      ctx.strokeStyle = '#e6dfd1';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 380, 530);
      drawTextAndFinish();
    }
  }, [text, userName, signature, index, isLastPage, theme, textColor, textFont, textAlign, title]);

  if (!letterSrc) return null;

  return (
    <div className="w-full max-w-md mx-auto mb-16 relative">
      <PaperCrumple
        src={letterSrc}
        alt={`Carta de amor página ${index + 1}`}
        width={320}
        height={440}
        sceneHeight={500}
        releaseBehavior="restore"
        crumpleAmount={0.85}
        crumpleDuration={0.55}
        releaseDuration={0.4}
        foldCount={6}
        foldSharpness={0.6}
        wrinkleDepth={0.65}
        creaseStrength={0.18}
        paperColor={(theme === 'parchment' || theme === 'burnt') ? '#e5cca5' : '#f4f0e8'}
        paperTexture={(theme === 'parchment' || theme === 'burnt') ? 0.2 : 0.08}
        draggable
        returnToOrigin
      />
    </div>
  );
};

export default LetterPage;
