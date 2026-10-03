import React from 'react';

const PaperPlane3D = () => {
  return (
    <div className="relative w-20 h-24" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(60deg) rotateZ(0deg)' }}>
      
      {/* Ala Izquierda */}
      <div 
        className="absolute top-0 right-1/2 w-10 h-24 bg-pink-200 origin-right border-r border-pink-300"
        style={{ 
          clipPath: 'polygon(100% 0, 0 70%, 100% 100%)', 
          transform: 'rotateY(-45deg)',
          backfaceVisibility: 'visible'
        }} 
      />
      
      {/* Ala Derecha */}
      <div 
        className="absolute top-0 left-1/2 w-10 h-24 bg-pink-100 origin-left border-l border-pink-300"
        style={{ 
          clipPath: 'polygon(0 0, 100% 70%, 0 100%)', 
          transform: 'rotateY(45deg)',
          backfaceVisibility: 'visible'
        }} 
      />
      
      {/* Pliegue central (Cuerpo Inferior Izquierdo) */}
      <div 
        className="absolute top-0 right-1/2 w-4 h-24 bg-pink-400 origin-right"
        style={{ 
          clipPath: 'polygon(100% 0, 0 100%, 100% 100%)', 
          transform: 'rotateY(-85deg)',
          backfaceVisibility: 'visible'
        }} 
      />
      
      {/* Pliegue central (Cuerpo Inferior Derecho) */}
      <div 
        className="absolute top-0 left-1/2 w-4 h-24 bg-pink-500 origin-left"
        style={{ 
          clipPath: 'polygon(0 0, 100% 100%, 0 100%)', 
          transform: 'rotateY(85deg)',
          backfaceVisibility: 'visible'
        }} 
      />
      
      {/* Estela luminosa interna (fuego rosa) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-6 bg-white rounded-full blur-[4px] animate-pulse" style={{ transform: 'translateZ(-5px)' }}></div>
    </div>
  );
};

export default PaperPlane3D;
