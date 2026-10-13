import React, { useState } from 'react';

const COUPONS = [
  { id: 1, title: 'Vale por un Masaje', desc: '15 minutos de masaje relajante sin interrupciones.', icon: '💆' },
  { id: 2, title: 'Cena a Tu Elección', desc: 'Tú eliges qué comemos hoy y quién cocina o pide.', icon: '🍕' },
  { id: 3, title: 'Control del Mando', desc: 'Tú eliges la serie o película completa esta noche.', icon: '🎬' },
  { id: 4, title: 'Beso Interminable', desc: 'Válido para un beso largo y apasionado cuando lo desees.', icon: '💋' },
  { id: 5, title: 'Desayuno en la Cama', desc: 'Un rico desayuno servido con mucho amor el fin de semana.', icon: '☕' },
  { id: 6, title: 'Pase Libre de Enojo', desc: 'Válido para terminar cualquier pequeña discusión con un abrazo.', icon: '🕊️' },
];

export default function LoveScratch() {
  const [coupons, setCoupons] = useState(
    COUPONS.map(c => ({ ...c, revealed: false }))
  );

  const handleReveal = (id) => {
    setCoupons(prev =>
      prev.map(c => (c.id === id ? { ...c, revealed: true } : c))
    );
  };

  const handleReset = () => {
    setCoupons(COUPONS.map(c => ({ ...c, revealed: false })));
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-300 to-rose-400">
          Vales & Cupones del Amor
        </h2>
        <p className="text-sm text-gray-400">
          Toca cada tarjeta para rascar y revelar el cupón canjeable de amor.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            onClick={() => handleReveal(coupon.id)}
            className="cursor-pointer select-none group relative h-44 rounded-2xl transition-all duration-300 transform hover:scale-[1.03] active:scale-95"
          >
            {/* Front (Hidden / Scratch cover) */}
            {!coupon.revealed ? (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-zinc-900 via-purple-950 to-zinc-900 border border-pink-500/30 p-4 flex flex-col items-center justify-center text-center shadow-lg hover:border-pink-500/60 transition-colors">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform">
                  ✨
                </div>
                <span className="text-xs uppercase tracking-widest text-pink-300 font-bold">
                  Rasca Aquí
                </span>
                <span className="text-[11px] text-gray-500 mt-1">
                  Toca para descubrir
                </span>
              </div>
            ) : (
              /* Revealed Content */
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-pink-900/60 via-zinc-900 to-purple-900/60 border border-pink-400 p-4 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-fadeIn">
                <div className="text-3xl mb-1">{coupon.icon}</div>
                <h4 className="text-sm font-bold text-white mb-1">{coupon.title}</h4>
                <p className="text-[11px] text-gray-300 leading-tight">{coupon.desc}</p>
                <span className="mt-2 text-[9px] uppercase tracking-wider text-green-400 font-bold bg-green-950/60 px-2 py-0.5 rounded-full border border-green-500/40">
                  ¡Canjeable!
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-pink-300 transition-colors uppercase tracking-widest font-semibold flex items-center gap-1.5"
        >
          <span>🔄</span> Ocultar todos los cupones nuevamente
        </button>
      </div>
    </div>
  );
}
