import React from 'react';
import LetterPage from '@/components/ui/LetterPage';

export default function LettersTab({ formData, setFormData, handleChange }) {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-200 mb-2 flex items-center gap-2">
        <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Cartas 3D
      </h2>
      <p className="text-sm text-gray-400 mb-8">Escribe cartas largas. Cada página se representará como una carta arrugada en tu galería 3D.</p>
      
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="mb-8">
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Estilo de Papel 3D</label>
          <select 
            name="letterStyle" 
            value={formData.letterStyle} 
            onChange={handleChange} 
            className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-colors mb-4"
          >
            <option value="modern">Moderna (Papel Crema)</option>
            <option value="parchment">Antigua (Pergamino)</option>
            <option value="burnt">Antigua (Bordes Quemados)</option>
          </select>
        </div>

        <div className="space-y-6">
          {/* Título de la carta */}
          <div className="bg-black border border-gray-800 p-5 rounded-2xl relative">
            <label className="block text-sm text-purple-400 font-bold uppercase tracking-widest mb-3">Título de la Carta (Opcional)</label>
            <input
              type="text"
              name="letterTitle"
              value={formData.letterTitle}
              onChange={handleChange}
              placeholder="Ej: Para el amor de mi vida"
              className="w-full bg-transparent text-gray-200 text-lg outline-none border-b border-gray-800 focus:border-purple-500 pb-2 transition-colors"
            />
          </div>

          {formData.letterPages.map((pageText, index) => (
            <div key={index} className="bg-black border border-gray-800 p-5 rounded-2xl relative group flex flex-col lg:flex-row gap-6">
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm text-purple-400 font-bold uppercase tracking-widest">Página {index + 1}</label>
                  {formData.letterPages.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const newPages = formData.letterPages.filter((_, i) => i !== index);
                        setFormData({ ...formData, letterPages: newPages });
                      }} 
                      className="text-red-500 bg-red-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" 
                      title="Eliminar Página"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <textarea
                  value={pageText}
                  onChange={(e) => {
                    const newPages = [...formData.letterPages];
                    newPages[index] = e.target.value;
                    setFormData({ ...formData, letterPages: newPages });
                  }}
                  rows={12}
                  placeholder="Escribe aquí los pensamientos más profundos..."
                  className="w-full h-full min-h-[300px] bg-transparent text-gray-200 outline-none resize-y"
                />
              </div>
              
              {/* Vista Previa de la Página Individual */}
              <div className="w-full lg:w-[320px] shrink-0 flex flex-col items-center lg:border-l border-gray-800 lg:pl-6 pt-4 lg:pt-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Vista Previa 3D (Pág {index + 1})</p>
                <div className="w-full h-[420px] bg-gray-900/40 rounded-xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing border border-white/5">
                  <LetterPage 
                    text={pageText || "..."} 
                    title={formData.letterTitle}
                    userName={formData.user2Name || 'Ti'} 
                    signature={formData.user1Name || 'Yo'} 
                    index={index} 
                    isLastPage={index === formData.letterPages.length - 1} 
                    theme={formData.letterStyle} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          type="button" 
          onClick={() => setFormData({ ...formData, letterPages: [...formData.letterPages, ''] })} 
          className="w-full py-4 mt-6 border-2 border-dashed border-gray-700 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 rounded-xl transition-all font-semibold"
        >
          + Agregar Nueva Página
        </button>
      </form>
    </div>
  );
}
