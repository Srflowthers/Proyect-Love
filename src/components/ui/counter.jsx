import React, { useState, useEffect } from 'react';

export default function Counter() {
  const [timePassed, setTimePassed] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // 06/14/2021
    const startDate = new Date('2021-06-14T00:00:00');

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now - startDate;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimePassed({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Formatear números para que siempre tengan 2 dígitos
  const pad = (num) => String(num).padStart(2, '0');

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] w-full font-serif text-center p-4 py-16">
      <div className="z-10 flex flex-col items-center animate-[fadeIn_2s_ease-out]">
        <div className="mb-8 relative">
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-pink-200 drop-shadow-[0_0_20px_rgba(236,72,153,0.5)] tracking-tight">
            Nuestra Historia
          </h2>
          <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-pink-400 to-transparent mx-auto mt-6 opacity-60"></div>
        </div>

        <p className="text-xl md:text-3xl text-pink-100/80 mb-16 font-light italic tracking-wide">
          Cada segundo a tu lado es un regalo.<br/>
          <span className="text-sm md:text-lg opacity-70 mt-2 block font-sans">Desde el 14 de Junio, 2021</span>
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 max-w-6xl w-full px-4">
          
          {/* Tarjeta de Días */}
          <div className="premium-glass p-8 rounded-3xl flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:bg-white/5 border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="text-6xl md:text-8xl font-black text-white drop-shadow-lg tracking-tighter">{timePassed.days}</span>
            <span className="text-white/60 text-xs md:text-sm uppercase tracking-[0.4em] mt-4 font-sans font-semibold">Días</span>
          </div>

          {/* Tarjeta de Horas */}
          <div className="premium-glass p-8 rounded-3xl flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:bg-white/5 border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="text-6xl md:text-8xl font-black text-white drop-shadow-lg tracking-tighter">{pad(timePassed.hours)}</span>
            <span className="text-white/60 text-xs md:text-sm uppercase tracking-[0.4em] mt-4 font-sans font-semibold">Horas</span>
          </div>

          {/* Tarjeta de Minutos */}
          <div className="premium-glass p-8 rounded-3xl flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:bg-white/5 border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="text-6xl md:text-8xl font-black text-white drop-shadow-lg tracking-tighter">{pad(timePassed.minutes)}</span>
            <span className="text-white/60 text-xs md:text-sm uppercase tracking-[0.4em] mt-4 font-sans font-semibold">Minutos</span>
          </div>

          {/* Tarjeta de Segundos */}
          <div className="premium-glass p-8 rounded-3xl flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:bg-white/5 border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="text-6xl md:text-8xl font-black text-white drop-shadow-lg tracking-tighter">{pad(timePassed.seconds)}</span>
            <span className="text-white/60 text-xs md:text-sm uppercase tracking-[0.4em] mt-4 font-sans font-semibold">Segundos</span>
          </div>

        </div>
      </div>
    </div>
  );
}
