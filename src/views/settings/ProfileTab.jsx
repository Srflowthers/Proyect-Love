import React from 'react';
import { GlitterWarp, VARIANTS, PALETTES } from '@/components/ui/glitter-warp';

export default function ProfileTab({ formData, setFormData, handleChange }) {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Información Personal
      </h2>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Tu Nombre o Apodo</label>
            <input type="text" name="user1Name" value={formData.user1Name} onChange={handleChange} placeholder="Ej: Jorge o Coke" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Nombre de tu Pareja</label>
            <input type="text" name="user2Name" value={formData.user2Name} onChange={handleChange} placeholder="Ej: Abigail o Mosholate" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Fecha de Aniversario</label>
          <input type="date" name="anniversaryDate" value={formData.anniversaryDate} onChange={handleChange} className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Mascotas (Opcional)</label>
            <input type="text" name="pets" value={formData.pets} onChange={handleChange} placeholder="Ej: Max (Perrito)" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Hijos (Opcional)</label>
            <input type="text" name="kids" value={formData.kids} onChange={handleChange} placeholder="Ej: Sofía y Mateo" className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800">
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Mensaje de Amor Directo (Pantalla Principal)</label>
          <textarea name="customMessage" value={formData.customMessage} onChange={handleChange} rows={3} placeholder="Ej: Cada segundo a tu lado es un regalo." className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors" />
        </div>

        <div className="pt-4 border-t border-gray-800">
          <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">Color del Fondo (Base)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'purple' ? 'border-pink-500 scale-105 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
              <input type="radio" name="universeColor" value="purple" checked={formData.universeColor === 'purple'} onChange={handleChange} className="hidden" />
              <div className="w-full h-16 rounded-lg bg-gradient-to-br from-purple-950 via-pink-900 to-black"></div>
              <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Nebulosa Rosa</p>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'blue' ? 'border-cyan-500 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
              <input type="radio" name="universeColor" value="blue" checked={formData.universeColor === 'blue'} onChange={handleChange} className="hidden" />
              <div className="w-full h-16 rounded-lg bg-gradient-to-br from-blue-950 via-cyan-900 to-black"></div>
              <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Océano Cósmico</p>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'red' ? 'border-red-500 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
              <input type="radio" name="universeColor" value="red" checked={formData.universeColor === 'red'} onChange={handleChange} className="hidden" />
              <div className="w-full h-16 rounded-lg bg-gradient-to-br from-red-950 via-rose-900 to-black"></div>
              <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Pasión Carmesí</p>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'gold' ? 'border-amber-500 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
              <input type="radio" name="universeColor" value="gold" checked={formData.universeColor === 'gold'} onChange={handleChange} className="hidden" />
              <div className="w-full h-16 rounded-lg bg-gradient-to-br from-yellow-950 via-amber-900 to-black"></div>
              <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Polvo de Oro</p>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.universeColor === 'black' ? 'border-gray-400 scale-105 shadow-[0_0_15px_rgba(156,163,175,0.3)]' : 'border-transparent hover:border-gray-600'}`}>
              <input type="radio" name="universeColor" value="black" checked={formData.universeColor === 'black'} onChange={handleChange} className="hidden" />
              <div className="w-full h-16 rounded-lg bg-gradient-to-br from-gray-900 via-[#111] to-black border border-gray-800"></div>
              <p className="text-[10px] text-center mt-2 font-bold text-gray-300">Vacío Elegante</p>
            </label>
          </div>
        </div>

        <div className="pt-8 mt-2 border-t border-gray-800">
          <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
              <path d="M20 3v4"/>
              <path d="M22 5h-4"/>
              <path d="M4 17v2"/>
              <path d="M5 18H3"/>
            </svg>
            Efectos Especiales (Partículas 3D)
          </h3>
          
          <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">1. Paleta de Colores de Partículas</label>
          <div className="flex gap-2 flex-wrap mb-6">
            {Object.keys(PALETTES).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const isNone = formData.universeVariant === 'none' || !formData.universeVariant;
                  setFormData({ 
                    ...formData, 
                    universePalette: p,
                    universeVariant: isNone ? 'tunnel' : formData.universeVariant,
                    _silentSave: true
                  });
                }}
                className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                  formData.universePalette === p
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                    : 'border-gray-700 bg-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">2. Estilo de Movimiento</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
                type="button"
                onClick={() => setFormData({ ...formData, universeVariant: 'none', _silentSave: true })}
                className={`relative h-28 rounded-xl overflow-hidden border-2 text-left cursor-pointer transition-all flex items-center justify-center ${
                  formData.universeVariant === 'none' || !formData.universeVariant
                    ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-105 z-10 bg-gray-900'
                    : 'border-gray-800 hover:border-gray-600 hover:scale-105 bg-black'
                }`}
              >
                <span className="font-bold text-gray-400">Sin Efecto</span>
            </button>
            {Object.entries(VARIANTS).map(([key, v]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormData({ ...formData, universeVariant: key, _silentSave: true })}
                className={`relative h-28 rounded-xl overflow-hidden border-2 text-left cursor-pointer transition-all ${
                  formData.universeVariant === key
                    ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-105 z-10'
                    : 'border-gray-800 hover:border-gray-600 hover:scale-105'
                }`}
              >
                <div className="absolute inset-0 pointer-events-none opacity-80">
                  <GlitterWarp 
                    variant={key} 
                    colors={PALETTES[formData.universePalette || 'Cósmico']} 
                    background="#05030f" 
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                <span className="absolute bottom-2 left-2 right-2 text-xs font-bold text-white text-center drop-shadow-md z-20">
                  {v.label}
                </span>
              </button>
            ))}
          </div>

          {/* Dinamismo de Partículas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 p-6 bg-gray-900/50 rounded-2xl border border-pink-500/10">
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  3. Tamaño de Partículas
                </label>
                <span className="text-pink-400 font-mono text-sm">
                  {formData.universeParticleSize ? `${Math.round(formData.universeParticleSize * 100)}%` : '100%'}
                </span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.1"
                value={formData.universeParticleSize || 1}
                onChange={(e) => setFormData({ ...formData, universeParticleSize: parseFloat(e.target.value) })}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-2">
                <span>Micro</span>
                <span>Normal</span>
                <span>Gigante</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  4. Velocidad de Movimiento
                </label>
                <span className="text-pink-400 font-mono text-sm">
                  {formData.universeParticleSpeed ? `${Math.round(formData.universeParticleSpeed * 100)}%` : '100%'}
                </span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.1"
                value={formData.universeParticleSpeed || 1}
                onChange={(e) => setFormData({ ...formData, universeParticleSpeed: parseFloat(e.target.value) })}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-2">
                <span>Lento</span>
                <span>Normal</span>
                <span>Muy Rápido</span>
              </div>
            </div>
          </div>

        </div>
        {/* Guardado Automático Activado */}
      </form>
    </div>
  );
}
