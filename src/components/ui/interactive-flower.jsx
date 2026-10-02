import React, { useState } from 'react';

export default function InteractiveFlower({ onClick }) {
  // Matriz 5x5 para dibujar una flor pixel-art
  const flowerPixels = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 2, 1, 0],
    [0, 0, 3, 0, 0],
    [0, 3, 0, 3, 0]
  ];

  // Colores según el número en la matriz
  const getColor = (val) => {
    if (val === 1) return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'; // Pétalos
    if (val === 2) return 'bg-amber-600'; // Centro
    if (val === 3) return 'bg-green-500'; // Tallo/Hojas
    return 'bg-transparent';
  };

  return (
    <div 
      className="absolute top-8 right-8 z-50 cursor-pointer group"
      onClick={onClick}
      title="Cambiar de Vista"
    >
      <div className="flex flex-col gap-1 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-purple-500/30 transition-transform duration-300 group-hover:scale-110">
        {flowerPixels.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {row.map((cell, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`} 
                className={`w-3 h-3 md:w-4 md:h-4 rounded-sm transition-all duration-300 hover:scale-150 hover:-translate-y-1 hover:rotate-12 ${getColor(cell)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
