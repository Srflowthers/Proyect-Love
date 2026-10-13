import React, { useState } from 'react';

const QUESTIONS = [
  {
    id: 1,
    question: '¿Quién es más probable que se quede dormido viendo una película?',
    options: ['Tú siempre 😴', 'Yo sin duda 🍿', 'Los dos a la vez', 'Depende de qué película sea'],
  },
  {
    id: 2,
    question: '¿Cuál es nuestro plan ideal para un domingo por la tarde?',
    options: ['Maratón de series y comida rica', 'Paseo al aire libre y cafecito', 'Dormir hasta tarde y flojear', 'Cocinar algo rico juntos'],
  },
  {
    id: 3,
    question: '¿Quién es más detallista en los momentos sorpresa?',
    options: ['Tú me sorprendes siempre ❤️', 'Yo preparo los mejores detalles', 'Ambos tenemos nuestros toques mágicos', 'Lo dejamos al destino'],
  },
  {
    id: 4,
    question: 'Si viajáramos juntos mañana a cualquier lugar, ¿a dónde iríamos?',
    options: ['Una cabaña en la montaña nevada', 'Playa paradisíaca con aguas turquesas', 'Una ciudad llena de luces y arte', 'Donde sea, mientras sea contigo'],
  },
  {
    id: 5,
    question: '¿Quién tarda más en alistarse antes de salir?',
    options: ['Tú (te pruebas 10 outfits) 👗', 'Yo (siempre al último minuto) ⏱️', 'Estamos empatados', 'Siempre salimos a tiempo milagrosamente'],
  },
  {
    id: 6,
    question: '¿Qué canción define mejor nuestra historia?',
    options: ['Nuestra canción en Spotify', 'Cualquiera que bailemos juntos', 'Una balada romántica nostálgica', 'Un tema alegre que nos haga sonreír'],
  }
];

export default function LoveTrivia() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  const q = QUESTIONS[currentIdx];

  const handleSelect = (option) => {
    const updated = { ...selectedAnswers, [currentIdx]: option };
    setSelectedAnswers(updated);

    if (currentIdx + 1 < QUESTIONS.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    setCurrentIdx(0);
    setSelectedAnswers({});
    setFinished(false);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-rose-400">
          ¿Cuánto Nos Conocemos?
        </h2>
        <p className="text-sm text-gray-400">
          Respondan juntos estas preguntas y descubran qué tan sincronizados están.
        </p>
      </div>

      {!finished ? (
        <div className="w-full relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition duration-700"></div>
          
          <div className="relative bg-zinc-950/80 border border-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            {/* Progress indicator */}
            <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span>Pregunta {currentIdx + 1} de {QUESTIONS.length}</span>
              <span className="text-pink-400">{Math.round(((currentIdx + 1) / QUESTIONS.length) * 100)}%</span>
            </div>
            
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300" 
                style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <h3 className="text-xl md:text-2xl font-serif text-white text-center py-2">
              {q.question}
            </h3>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  className="p-4 rounded-xl text-left text-sm md:text-base font-medium bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-gray-200 hover:text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-pink-400 mr-2 font-bold">{String.fromCharCode(65 + i)}.</span> {opt}
                </button>
              ))}
            </div>

            {currentIdx > 0 && (
              <div className="flex justify-start pt-2">
                <button
                  onClick={() => setCurrentIdx(prev => prev - 1)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  ← Pregunta anterior
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 rounded-3xl blur-lg opacity-40"></div>
          <div className="relative bg-zinc-950/90 border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg shadow-pink-500/40 animate-bounce">
              💖
            </div>
            <h3 className="text-2xl md:text-3xl font-serif italic text-white">
              ¡Compatibilidad Cósmica al 100%!
            </h3>
            <p className="text-gray-300 max-w-md mx-auto text-sm leading-relaxed">
              No importa qué opción hayan elegido, lo más valioso es que cada día eligen seguir escribiendo su historia juntos en este universo.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={restart}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
              >
                Volver a jugar 🔄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
