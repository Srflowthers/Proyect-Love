import React, { useState, useEffect } from 'react';
import LetterCardItem from './letters/LetterCardItem';

export default function LettersTab({ formData, setFormData, user, setGlobalUserData, isExpired, onExpiredAction }) {
  // Estado inicial original recibido del backend/formData
  const originalPages = formData.letterPages || [''];
  const originalStyles = formData.letterStyles || [];
  const originalTitles = formData.letterTitles || [];
  const originalFonts = formData.letterFonts || [];
  const originalAligns = formData.letterAligns || [];
  const originalTextColors = formData.letterTextColors || [];
  const originalTitleColors = formData.letterTitleColors || [];

  // Fallbacks generales
  const defaultTitle = formData.letterTitle || '';
  const defaultStyle = formData.letterStyle || 'modern';
  const defaultFont = formData.letterFont || 'georgia';
  const defaultAlign = formData.letterAlign || 'left';
  const defaultColor = formData.letterTextColor || '';
  const defaultTitleColor = formData.letterTitleColor || '';

  // Estado local por página
  const [localPages, setLocalPages] = useState(originalPages);
  const [localStyles, setLocalStyles] = useState(() => 
    originalPages.map((_, i) => originalStyles[i] || defaultStyle)
  );
  const [localTitles, setLocalTitles] = useState(() => 
    originalPages.map((_, i) => (originalTitles[i] !== undefined ? originalTitles[i] : (i === 0 ? defaultTitle : '')))
  );
  const [localFonts, setLocalFonts] = useState(() => 
    originalPages.map((_, i) => originalFonts[i] || defaultFont)
  );
  const [localAligns, setLocalAligns] = useState(() => 
    originalPages.map((_, i) => originalAligns[i] || defaultAlign)
  );
  const [localTextColors, setLocalTextColors] = useState(() => 
    originalPages.map((_, i) => originalTextColors[i] || defaultColor)
  );
  const [localTitleColors, setLocalTitleColors] = useState(() => 
    originalPages.map((_, i) => originalTitleColors[i] || defaultTitleColor)
  );

  // Índice de página activa en el paginador
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Estados de guardado individual/contextual
  const [savingTarget, setSavingTarget] = useState(null); // null | number (index) | 'all'
  const [savedTarget, setSavedTarget] = useState(null);

  // Sincronizar estado local si formData cambia externamente
  useEffect(() => {
    const pages = formData.letterPages || [''];
    const styles = formData.letterStyles || [];
    const titles = formData.letterTitles || [];
    const fonts = formData.letterFonts || [];
    const aligns = formData.letterAligns || [];
    const colors = formData.letterTextColors || [];
    const titleColors = formData.letterTitleColors || [];

    const genStyle = formData.letterStyle || 'modern';
    const genTitle = formData.letterTitle || '';
    const genFont = formData.letterFont || 'georgia';
    const genAlign = formData.letterAlign || 'left';
    const genColor = formData.letterTextColor || '';
    const genTitleColor = formData.letterTitleColor || '';

    setLocalPages(pages);
    setLocalStyles(pages.map((_, i) => styles[i] || genStyle));
    setLocalTitles(pages.map((_, i) => (titles[i] !== undefined ? titles[i] : (i === 0 ? genTitle : ''))));
    setLocalFonts(pages.map((_, i) => fonts[i] || genFont));
    setLocalAligns(pages.map((_, i) => aligns[i] || genAlign));
    setLocalTextColors(pages.map((_, i) => colors[i] || genColor));
    setLocalTitleColors(pages.map((_, i) => titleColors[i] || genTitleColor));
  }, [
    formData.letterPages, 
    formData.letterStyles,
    formData.letterTitles,
    formData.letterFonts,
    formData.letterAligns,
    formData.letterTextColors,
    formData.letterTitleColors,
    formData.letterStyle,
    formData.letterTitle,
    formData.letterFont,
    formData.letterAlign,
    formData.letterTextColor,
    formData.letterTitleColor
  ]);

  // Asegurar que activePageIndex no quede fuera de límites
  useEffect(() => {
    if (activePageIndex >= localPages.length) {
      setActivePageIndex(Math.max(0, localPages.length - 1));
    }
  }, [localPages.length, activePageIndex]);

  // Detectar si la cantidad de páginas cambió
  const isPagesCountModified = localPages.length !== originalPages.length;

  // Comprobar si una página específica tiene cambios sin guardar
  const isPageIndexModified = (idx) => {
    return (
      (localPages[idx] ?? '') !== (originalPages[idx] ?? '') ||
      (localStyles[idx] || defaultStyle) !== (originalStyles[idx] || defaultStyle) ||
      (localTitles[idx] !== undefined ? localTitles[idx] : '') !== (originalTitles[idx] !== undefined ? originalTitles[idx] : (idx === 0 ? defaultTitle : '')) ||
      (localTitleColors[idx] || '') !== (originalTitleColors[idx] || defaultTitleColor) ||
      (localFonts[idx] || defaultFont) !== (originalFonts[idx] || defaultFont) ||
      (localAligns[idx] || defaultAlign) !== (originalAligns[idx] || defaultAlign) ||
      (localTextColors[idx] || '') !== (originalTextColors[idx] || defaultColor)
    );
  };

  const modifiedPagesCount = localPages.filter((_, i) => isPageIndexModified(i)).length;
  const hasGlobalModifications = modifiedPagesCount > 0 || isPagesCountModified;

  // Guardar en backend
  const executeSave = async (targetId) => {
    if (isExpired) {
      if (onExpiredAction) onExpiredAction('editar o guardar cartas');
      return;
    }
    if (!user) return;
    setSavingTarget(targetId);
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

      const payload = {
        letterTitle: localTitles[0] || '',
        letterStyle: localStyles[0] || 'modern',
        letterPages: localPages,
        letterStyles: localStyles,
        letterTitles: localTitles,
        letterFonts: localFonts,
        letterAligns: localAligns,
        letterTextColors: localTextColors,
        letterTitleColors: localTitleColors,
        letterFont: localFonts[0] || 'georgia',
        letterAlign: localAligns[0] || 'left',
        letterTextColor: localTextColors[0] || '',
        letterTitleColor: localTitleColors[0] || ''
      };

      const res = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error al guardar carta");

      setFormData(prev => ({
        ...prev,
        ...payload
      }));

      if (setGlobalUserData) {
        setGlobalUserData(prev => ({ ...(prev || {}), ...payload }));
      }

      setSavedTarget(targetId);
      setTimeout(() => {
        setSavedTarget(null);
      }, 2500);
    } catch (err) {
      console.error("Error al guardar carta:", err);
    } finally {
      setSavingTarget(null);
    }
  };

  // Modificadores de estado
  const handlePageChange = (index, value) => {
    const updated = [...localPages];
    updated[index] = value;
    setLocalPages(updated);
  };

  const handlePageTitleChange = (index, value) => {
    const updated = [...localTitles];
    updated[index] = value;
    setLocalTitles(updated);
  };

  const handlePageStyleChange = (index, newStyle) => {
    const updated = [...localStyles];
    updated[index] = newStyle;
    setLocalStyles(updated);
  };

  const handlePageFontChange = (index, newFont) => {
    const updated = [...localFonts];
    updated[index] = newFont;
    setLocalFonts(updated);
  };

  const handlePageAlignChange = (index, newAlign) => {
    const updated = [...localAligns];
    updated[index] = newAlign;
    setLocalAligns(updated);
  };

  const handlePageColorChange = (index, newColor) => {
    const updated = [...localTextColors];
    updated[index] = newColor;
    setLocalTextColors(updated);
  };

  const handlePageTitleColorChange = (index, newColor) => {
    const updated = [...localTitleColors];
    updated[index] = newColor;
    setLocalTitleColors(updated);
  };

  const handleAddPage = () => {
    if (isExpired) {
      if (onExpiredAction) onExpiredAction('crear o agregar nuevas páginas de cartas');
      return;
    }
    const newIdx = localPages.length;
    setLocalPages([...localPages, '']);
    setLocalStyles([...localStyles, localStyles[localStyles.length - 1] || 'modern']);
    setLocalTitles([...localTitles, '']);
    setLocalFonts([...localFonts, localFonts[localFonts.length - 1] || 'georgia']);
    setLocalAligns([...localAligns, localAligns[localAligns.length - 1] || 'left']);
    setLocalTextColors([...localTextColors, localTextColors[localTextColors.length - 1] || '']);
    setLocalTitleColors([...localTitleColors, localTitleColors[localTitleColors.length - 1] || '']);

    // Pasar automáticamente a la nueva hoja creada
    setActivePageIndex(newIdx);
  };

  const handleDeletePage = (index) => {
    if (isExpired) {
      if (onExpiredAction) onExpiredAction('eliminar páginas de cartas');
      return;
    }
    if (localPages.length <= 1) return;
    setLocalPages(localPages.filter((_, i) => i !== index));
    setLocalStyles(localStyles.filter((_, i) => i !== index));
    setLocalTitles(localTitles.filter((_, i) => i !== index));
    setLocalFonts(localFonts.filter((_, i) => i !== index));
    setLocalAligns(localAligns.filter((_, i) => i !== index));
    setLocalTextColors(localTextColors.filter((_, i) => i !== index));
    setLocalTitleColors(localTitleColors.filter((_, i) => i !== index));

    // Ajustar índice de hoja activa para que no quede huérfana
    setActivePageIndex(prev => {
      if (prev >= localPages.length - 1) {
        return Math.max(0, localPages.length - 2);
      }
      return prev;
    });
  };

  // Función universal para aplicar color con la única barra de tinta
  const applyInkColor = (color, index) => {
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.toString().trim().length > 0;

    const titleEl = document.querySelector(`[data-letter-title="${index}"]`);
    const isSelectionInTitle = titleEl && sel && sel.anchorNode && titleEl.contains(sel.anchorNode);
    const isFocusedInTitle = document.activeElement === titleEl || (document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-letter-title') === String(index));

    if (hasSelection) {
      if (isSelectionInTitle) {
        handlePageTitleColorChange(index, color);
      } else {
        document.execCommand('foreColor', false, color);
        const activeEl = document.querySelector(`[data-letter-editor="${index}"]`);
        if (activeEl) {
          handlePageChange(index, activeEl.innerHTML);
        }
      }
      if (sel) {
        sel.collapseToEnd();
      }
    } else {
      if (isFocusedInTitle) {
        handlePageTitleColorChange(index, color);
      } else {
        handlePageColorChange(index, color);
        handlePageTitleColorChange(index, color);
      }
    }
  };

  // Formateo enriquecido al texto seleccionado o Deshacer / Rehacer
  const applyFormatting = (command, value = null, index = null) => {
    document.execCommand(command, false, value);
    if ((command === 'undo' || command === 'redo') && index !== null) {
      const activeEl = document.querySelector(`[data-letter-editor="${index}"]`);
      if (activeEl) {
        handlePageChange(index, activeEl.innerHTML);
      }
    }
  };

  const safePageIndex = Math.min(Math.max(0, activePageIndex), Math.max(0, localPages.length - 1));

  return (
    <div className="animate-fadeIn pb-12">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Cartas de Amor Personalizadas
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Escribe directo sobre el papel. Navega entre tus hojas con el paginador para una experiencia fluida y sin sobrecargar la pantalla.
          </p>
        </div>

        {/* Botón rápido Guardar Todo si hay cambios pendientes */}
        {hasGlobalModifications && (
          <button
            type="button"
            onClick={() => executeSave('all')}
            disabled={savingTarget === 'all'}
            className="self-start sm:self-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-md shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs"
          >
            {savingTarget === 'all' ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30" strokeLinecap="round" className="opacity-50" />
                </svg>
                Guardando Todo...
              </>
            ) : savedTarget === 'all' ? (
              <>
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                ¡Todo Guardado!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar Todas ({modifiedPagesCount > 0 ? `${modifiedPagesCount} mod.` : 'Estructura'})
              </>
            )}
          </button>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Barra de Navegación Limpia y Elegante: Anterior / Contador / Siguiente */}
        <div className="bg-gray-950/80 border border-purple-500/25 rounded-2xl p-3 sm:p-4 mb-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Controles de Navegación de Hoja */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
              disabled={safePageIndex === 0}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 hover:border-purple-500 text-gray-200 hover:text-white hover:bg-gray-850 disabled:opacity-30 disabled:border-gray-800 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Anterior</span>
            </button>

            {/* Contador Central: Hoja X de Y */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900/90 border border-purple-500/30 rounded-xl text-xs font-bold shadow-inner">
              <span className="text-gray-400">Hoja</span>
              <span className="text-purple-400 font-mono text-sm">{safePageIndex + 1}</span>
              <span className="text-gray-500">de</span>
              <span className="text-gray-300 font-mono text-sm">{localPages.length}</span>
              {isPageIndexModified(safePageIndex) && (
                <span 
                  className="w-2 h-2 rounded-full bg-pink-400 animate-pulse ml-1 shadow-[0_0_6px_rgba(244,114,182,0.8)]"
                  title="Esta hoja tiene modificaciones sin guardar"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setActivePageIndex(p => Math.min(localPages.length - 1, p + 1))}
              disabled={safePageIndex === localPages.length - 1}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 hover:border-purple-500 text-gray-200 hover:text-white hover:bg-gray-850 disabled:opacity-30 disabled:border-gray-800 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <span>Siguiente</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Botón para Agregar Nueva Hoja */}
          <button 
            type="button" 
            onClick={handleAddPage} 
            className="w-full sm:w-auto px-4 py-2 border border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/40 text-purple-300 hover:text-white rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="text-sm font-bold">+</span> Agregar Nueva Hoja
          </button>
        </div>

        {/* Hoja Activa Renderizada Única (Ultra optimizado: 1 solo canvas en DOM) */}
        <div>
          <LetterCardItem
            key={safePageIndex}
            index={safePageIndex}
            totalLetters={localPages.length}
            pageText={localPages[safePageIndex] ?? ''}
            originalText={originalPages[safePageIndex] ?? ''}
            currentStyle={localStyles[safePageIndex] || 'modern'}
            originalStyle={originalStyles[safePageIndex] || defaultStyle}
            currentTitle={localTitles[safePageIndex] || ''}
            originalTitle={originalTitles[safePageIndex] !== undefined ? originalTitles[safePageIndex] : (safePageIndex === 0 ? defaultTitle : '')}
            currentTitleColor={localTitleColors[safePageIndex] || ''}
            originalTitleColor={originalTitleColors[safePageIndex] || defaultTitleColor}
            currentFont={localFonts[safePageIndex] || 'georgia'}
            originalFont={originalFonts[safePageIndex] || defaultFont}
            currentAlign={localAligns[safePageIndex] || 'left'}
            originalAlign={originalAligns[safePageIndex] || defaultAlign}
            currentColor={localTextColors[safePageIndex] || ''}
            originalColor={originalTextColors[safePageIndex] || defaultColor}
            isSaving={savingTarget === safePageIndex}
            isSaved={savedTarget === safePageIndex}
            signatureName={formData.user1Name}
            onPageChange={handlePageChange}
            onTitleChange={handlePageTitleChange}
            onStyleChange={handlePageStyleChange}
            onFontChange={handlePageFontChange}
            onAlignChange={handlePageAlignChange}
            onDeletePage={handleDeletePage}
            onExecuteSave={executeSave}
            onFormat={applyFormatting}
            onApplyInkColor={applyInkColor}
          />
        </div>

        {/* Barra Inferior de Navegación y Adición de Hojas */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-800/80">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
              disabled={safePageIndex === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-850 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold"
            >
              ← Hoja Anterior
            </button>
            <button
              type="button"
              onClick={() => setActivePageIndex(p => Math.min(localPages.length - 1, p + 1))}
              disabled={safePageIndex === localPages.length - 1}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-850 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold"
            >
              Siguiente Hoja →
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              type="button" 
              onClick={handleAddPage} 
              className="px-5 py-2.5 border border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/40 text-purple-300 hover:text-white rounded-xl transition-all font-semibold text-xs flex items-center gap-2"
            >
              <span className="text-sm font-bold">+</span> Agregar Nueva Hoja
            </button>

            {hasGlobalModifications && (
              <button
                type="button"
                onClick={() => executeSave('all')}
                disabled={savingTarget === 'all'}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-xs"
              >
                {savingTarget === 'all' ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30" strokeLinecap="round" className="opacity-50" />
                    </svg>
                    Guardando...
                  </>
                ) : savedTarget === 'all' ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Todo Guardado!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardar Todas ({modifiedPagesCount > 0 ? `${modifiedPagesCount} mod.` : 'Estructura'})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
