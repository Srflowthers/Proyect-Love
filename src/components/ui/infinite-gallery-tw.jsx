import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import InteractiveFlower from './interactive-flower';

// Componente para una fila infinita
const InfiniteRow = ({ items, reverse = false, speed = 40 }) => {
  // Duplicamos los items para crear la ilusión de infinito
  const duplicatedItems = [...items, ...items];
  
  return (
    <div className="flex w-max overflow-visible relative group">
      <motion.div
        className="flex gap-4 px-2"
        animate={{
          x: reverse ? ["-50%", "0%"] : ["0%", "-50%"]
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: speed
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div 
            key={`${item.src}-${index}`}
            className="relative h-48 sm:h-64 md:h-72 aspect-[3/4] rounded-xl overflow-hidden shrink-0 cursor-pointer shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-rose-500/20"
            onClick={() => item.onClick(item)}
          >
            {item.isVideo ? (
              <video 
                src={item.src} 
                className="w-full h-full object-cover" 
                muted 
                loop 
                autoPlay 
                playsInline
              />
            ) : (
              <img 
                src={item.src} 
                alt={item.title} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
              <span className="text-white p-4 text-sm font-medium">{item.title}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default function InfiniteGallery({ items, toggleView }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [shuffled, setShuffled] = useState([]);

  // Solo barajamos las fotos NUEVAS y las añadimos al final.
  // Esto evita re-renderizar y romper la animación de las fotos que ya están en pantalla.
  React.useEffect(() => {
    setShuffled(prev => {
      const existingIds = new Set(prev.map(item => item.public_id || item.src));
      const newItems = items.filter(item => !existingIds.has(item.public_id || item.src));
      if (newItems.length === 0) return prev;
      
      const newShuffled = [...newItems].sort(() => 0.5 - Math.random());
      return [...prev, ...newShuffled];
    });
  }, [items]);
  
  const itemsWithClick = React.useMemo(() => {
    return shuffled.map(item => ({
      ...item,
      onClick: (img) => setSelectedItem(img)
    }));
  }, [shuffled]);

  const third = Math.ceil(itemsWithClick.length / 3);
  const row1 = itemsWithClick.slice(0, third);
  const row2 = itemsWithClick.slice(third, third * 2);
  const row3 = itemsWithClick.slice(third * 2);

  return (
    <div className="w-full h-full flex flex-col justify-center gap-6 overflow-hidden pt-32 pb-20 relative">
      
      <InteractiveFlower onClick={toggleView} />

      <div className="rotate-[-2deg] scale-110 flex flex-col gap-6">
        <InfiniteRow items={row1} speed={60} reverse={false} />
        <InfiniteRow items={row2} speed={50} reverse={true} />
        <InfiniteRow items={row3} speed={65} reverse={false} />
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-purple-900/80 backdrop-blur-md p-4 md:p-12"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedItem.isVideo ? (
                <video src={selectedItem.src} className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl" controls autoPlay />
              ) : (
                <img src={selectedItem.src} alt={selectedItem.title} className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl" />
              )}
              <button className="absolute top-4 right-4 bg-black/50 hover:bg-pink-600 text-white rounded-full p-2 transition-colors backdrop-blur-md" onClick={() => setSelectedItem(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
