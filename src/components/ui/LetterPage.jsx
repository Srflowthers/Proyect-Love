import React, { useState, useEffect } from 'react';
import PaperCrumple from './PaperCrumple';

const LetterPage = ({ text, userName, signature, index, isLastPage, theme }) => {
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
      // Usar tinta oscura para los temas antiguos
      ctx.fillStyle = (theme === 'parchment' || theme === 'burnt') ? '#2a1a0f' : '#2d2a26';
      ctx.textAlign = 'left';
      
      const lines = text.split('\\n').flatMap(l => l.split('\n')); 
      let y = 60;
      
      if (index === 0) {
        ctx.font = 'bold 24px "Georgia", serif';
        ctx.fillText(`Para ${userName || 'Ti'},`, 40, y);
        y += 50;
      }
      
      ctx.font = 'bold 21px "Georgia", serif';
      const maxWidth = 400 - 80;
      const lineHeight = 30;

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
            ctx.fillText(line, 40, y);
            line = words[n] + ' ';
            y += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 40, y);
        y += lineHeight;
      });

      if (isLastPage && signature) {
          y += 40;
          ctx.font = 'bold italic 23px "Georgia", serif';
          ctx.fillStyle = '#e91e63'; // pinkish red for the signature / heart
          ctx.fillText(signature, 40, y);
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
  }, [text, userName, signature, index, isLastPage, theme]);

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
