import React, { useState } from 'react';

const DEFAULT_CHALLENGES = [
  { id: 1, type: 'romantico', title: 'Mirada Cósmica', desc: 'Mírense a los ojos fijamente durante 1 minuto sin reírse ni desviar la mirada.' },
  { id: 2, type: 'cita', title: 'Cita Express', desc: 'Preparen juntos una merienda o postre favorito con lo que encuentren en casa.' },
  { id: 3, type: 'tierno', title: 'Carta Instantánea', desc: 'Escríbanse 3 cosas que admiran el uno del otro en una servilleta o nota.' },
  { id: 4, type: 'romantico', title: 'Beso de Película', desc: 'Recreen su escena romántica o beso favorito de cine con música de fondo.' },
  { id: 5, type: 'divertido', title: 'Imitación Cósmica', desc: 'Imita la forma en que el otro reacciona cuando tiene hambre o sueño.' },
  { id: 6, type: 'tierno', title: 'Masaje Relajante', desc: '5 minutos de masaje en la espalda o cuello para tu persona favorita.' },
  { id: 7, type: 'cita', title: 'Noche de Estrellas', desc: 'Salgan a tomar aire fresco abrazados y cuéntense un sueño para este año.' },
  { id: 8, type: 'romantico', title: 'Baile Lento', desc: 'Bailen una canción lenta abrazados en la sala con la luz tenue.' },
];

export default function LoveRoulette({ coupleNames = 'Nuestra Pareja' }) {
  const [challenges, setChallenges] = useState(DEFAULT_CHALLENGES);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [newText, setNewText] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredChallenges = filterType === 'all' 
    ? challenges 
    : challenges.filter(c => c.type === filterType);

  const handleSpin = () => {
    if (isSpinning || filteredChallenges.length === 0) return;
    setIsSpinning(true);
    setSelectedChallenge(null);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * filteredChallenges.length);
      setSelectedChallenge(filteredChallenges[randomIdx]);
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        const finalIdx = Math.floor(Math.random() * filteredChallenges.length);
        setSelectedChallenge(filteredChallenges[finalIdx]);
        setIsSpinning(false);
      }
    }, 100);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const newItem = {
      id: Date.now(),
      type: 'romantico',
      title: 'Reto Personalizado',
      desc: newText.trim()
    };
    setChallenges(prev => [newItem, ...prev]);
    setNewText('');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300">
          Ruleta de Retos & Citas
        </h2>
        <p className="text-sm text-gray-400">
          Gira la ruleta y vivan un momento especial juntos en este instante.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'romantico', label: '💕 Románticos' },
          { key: 'tierno', label: '✨ Tiernos' },
          { key: 'cita', label: '🥂 Citas' },
          { key: 'divertido', label: '😂 Divertidos' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilterType(item.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === item.key
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/25 scale-105'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Wheel / Showcase Card */}
      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-60 transition duration-1000"></div>
        <div className="relative bg-zinc-950/80 border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center min-h-[220px] flex flex-col justify-center items-center shadow-2xl">
          {selectedChallenge ? (
            <div className={`transition-all duration-300 ${isSpinning ? 'scale-95 opacity-80 blur-[0.5px]' : 'scale-100 opacity-100'}`}>
              <span className="text-xs uppercase tracking-widest px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full font-bold">
                {selectedChallenge.title}
              </span>
              <p className="text-xl md:text-2xl font-serif text-white mt-4 max-w-lg leading-relaxed">
                "{selectedChallenge.desc}"
              </p>
            </div>
          ) : (
            <div className="text-gray-400 space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 flex items-center justify-center text-3xl border border-pink-500/30 animate-pulse">
                🎡
              </div>
              <p className="text-base text-gray-300 font-medium">¿Listos para descubrir su próximo momento?</p>
              <p className="text-xs text-gray-500">Pulsa el botón de abajo para hacer girar la ruleta</p>
            </div>
          )}
        </div>
      </div>

      {/* Botón de Girar */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || filteredChallenges.length === 0}
        className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:via-rose-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base uppercase tracking-wider flex items-center justify-center gap-3"
      >
        <span className={`text-xl ${isSpinning ? 'animate-spin' : ''}`}>🎲</span>
        {isSpinning ? 'Eligiendo destino...' : '¡Girar Ruleta del Amor!'}
      </button>

      {/* Agregar Reto Propio */}
      <form onSubmit={handleAddCustom} className="w-full pt-4 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Escribe tu propio reto o sorpresa de pareja..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-pink-300 font-semibold rounded-xl text-sm transition-colors shrink-0"
        >
          + Agregar
        </button>
      </form>
    </div>
  );
}
