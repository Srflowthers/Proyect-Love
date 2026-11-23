import React, { useState, useMemo } from 'react';
import { 
  PAPER_STYLES_CATALOG, 
  RARITY_TIERS, 
  getPaperStyleById, 
  getPaperCategoryCounts 
} from './paperStylesCatalog';

export default function PaperStyleModal({ isOpen, currentStyle, onSelect, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('todas'); // 'todas' | 'comun' | 'rara' | 'epica' | 'legendaria' | 'mitica'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 32;

  const categoryCounts = useMemo(() => getPaperCategoryCounts(), []);

  // Filtrado reactivo por categoría y término de búsqueda
  const filteredStyles = useMemo(() => {
    return PAPER_STYLES_CATALOG.filter(style => {
      const matchesCategory = activeTab === 'todas' || style.rarity === activeTab;
      const matchesSearch = 
        !searchTerm.trim() || 
        style.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (style.description && style.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeTab, searchTerm]);

  // Paginación para fluidez total a 60 FPS con más de 500 elementos
  const totalPages = Math.ceil(filteredStyles.length / itemsPerPage) || 1;
  const paginatedStyles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStyles.slice(start, start + itemsPerPage);
  }, [filteredStyles, currentPage, itemsPerPage]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const currentSelection = useMemo(() => getPaperStyleById(currentStyle), [currentStyle]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-gray-950 border border-purple-500/30 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-6 border-b border-gray-800/80 flex items-center justify-between gap-4 bg-gradient-to-r from-gray-950 via-purple-950/20 to-gray-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-purple-300 text-lg shadow-inner">
              📜
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
                Colección de Estilos de Papel
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {categoryCounts.todas}+ Diseños
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Selecciona la textura y atmósfera perfecta para inmortalizar tu carta de amor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white flex items-center justify-center transition-all"
            title="Cerrar (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de Filtros: Búsqueda y Pestañas por Rareza */}
        <div className="p-3 sm:p-5 border-b border-gray-800 bg-gray-900/40 flex flex-col gap-3.5">
          {/* Buscador de texto en vivo */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar estilo por nombre o temática (ej: pergamino, noche, sakura, dorado)..."
              className="w-full bg-gray-950 border border-gray-700 focus:border-purple-500 pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categorías por Nivel de Rareza (Común 55, Rara 101, Épica 160, Legendaria 8, Mítica 4) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => handleTabChange('todas')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'todas'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                  : 'bg-gray-950/80 text-gray-400 hover:text-gray-200 border-gray-800 hover:border-gray-700'
              }`}
            >
              <span>Todas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {categoryCounts.todas}
              </span>
            </button>

            {Object.values(RARITY_TIERS).map(rarity => {
              const count = categoryCounts[rarity.id] || 0;
              const isActive = activeTab === rarity.id;
              return (
                <button
                  key={rarity.id}
                  type="button"
                  onClick={() => handleTabChange(rarity.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive 
                      ? rarity.tabActiveClass 
                      : 'bg-gray-950/80 text-gray-400 hover:text-gray-200 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <span style={{ color: isActive ? 'inherit' : rarity.color }}>●</span>
                  <span>{rarity.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/15">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido: Cuadrícula Visual de Papeles */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-h-[52vh] sm:max-h-[58vh]">
          {filteredStyles.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm font-semibold">No se encontraron estilos de papel</p>
              <p className="text-xs text-gray-600 mt-1">Prueba con otra palabra o selecciona otra categoría de rareza</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
              {paginatedStyles.map(style => {
                const isSelected = currentStyle === style.id;
                const rarity = RARITY_TIERS[style.rarity] || RARITY_TIERS.comun;

                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => onSelect(style.id)}
                    className={`relative flex flex-col items-center p-3 rounded-2xl border text-left transition-all group overflow-hidden ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.02]'
                        : `bg-gray-900/60 ${rarity.borderClass} ${rarity.glowClass} hover:bg-gray-850 hover:scale-[1.01]`
                    }`}
                  >
                    {/* Badge de Seleccionado */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 z-10 bg-purple-500 text-white rounded-full p-1 shadow-md">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}

                    {/* Miniatura visual de la hoja de papel */}
                    <div 
                      className="w-full h-24 sm:h-28 rounded-xl relative shadow-md overflow-hidden flex flex-col justify-between p-2.5 transition-transform group-hover:scale-105"
                      style={{
                        background: style.preview?.bg || '#f4f0e8',
                        border: `2px solid ${style.preview?.border || '#ccc'}`
                      }}
                    >
                      {/* Borde quemado simulado si es burnt */}
                      {style.isBurnt && (
                        <div className="absolute inset-0 border-4 border-amber-950/80 rounded-lg pointer-events-none shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]" />
                      )}

                      {/* Líneas tenues decorativas de escritura */}
                      <div className="space-y-1.5 opacity-30 pointer-events-none">
                        <div className="h-1 rounded w-3/4" style={{ backgroundColor: style.preview?.textColor || '#000' }} />
                        <div className="h-1 rounded w-full" style={{ backgroundColor: style.preview?.textColor || '#000' }} />
                        <div className="h-1 rounded w-5/6" style={{ backgroundColor: style.preview?.textColor || '#000' }} />
                        <div className="h-1 rounded w-2/3" style={{ backgroundColor: style.preview?.textColor || '#000' }} />
                      </div>

                      <div className="text-[9px] font-bold tracking-wider uppercase opacity-40 self-end" style={{ color: style.preview?.textColor || '#000' }}>
                        Love Letter
                      </div>
                    </div>

                    {/* Información y Rareza */}
                    <div className="w-full mt-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                          {style.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${rarity.badgeClass}`}>
                          {rarity.label}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] text-purple-400 font-bold">Activo</span>
                        ) : (
                          <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Aplicar</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginador (si hay más de una página) */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-gray-800/80 bg-gray-950 flex items-center justify-between gap-3 text-xs">
            <span className="text-gray-400">
              Mostrando <strong className="text-white">{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredStyles.length)}</strong> de <strong className="text-white">{filteredStyles.length}</strong> estilos
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="px-2 font-semibold text-purple-400">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Pie del Modal con selección actual y confirmación */}
        <div className="p-3.5 sm:p-5 border-t border-gray-800 bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 truncate w-full sm:w-auto">
            <div 
              className="w-5 h-6 rounded border flex-shrink-0"
              style={{
                background: currentSelection.preview?.bg || '#f4f0e8',
                borderColor: currentSelection.preview?.border || '#ccc'
              }}
            />
            <div className="truncate">
              <div className="text-[11px] text-gray-400">Papel actualmente en uso:</div>
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                {currentSelection.name}
                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${(RARITY_TIERS[currentSelection.rarity] || RARITY_TIERS.comun).badgeClass}`}>
                  {(RARITY_TIERS[currentSelection.rarity] || RARITY_TIERS.comun).label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-all"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
            >
              Confirmar Selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
