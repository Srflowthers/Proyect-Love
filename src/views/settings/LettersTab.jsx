import React, { useState, useEffect } from 'react';
import LetterCardItem from './letters/LetterCardItem';

export default function LettersTab({ formData, setFormData, user, setGlobalUserData }) {
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

  // Detectar si la cantidad de páginas cambió
  const isPagesCountModified = localPages.length !== originalPages.length;

  // Guardar en backend
  const executeSave = async (targetId) => {
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
    setLocalPages([...localPages, '']);
    setLocalStyles([...localStyles, localStyles[localStyles.length - 1] || 'modern']);
    setLocalTitles([...localTitles, '']);
    setLocalFonts([...localFonts, localFonts[localFonts.length - 1] || 'georgia']);
    setLocalAligns([...localAligns, localAligns[localAligns.length - 1] || 'left']);
    setLocalTextColors([...localTextColors, localTextColors[localTextColors.length - 1] || '']);
    setLocalTitleColors([...localTitleColors, localTitleColors[localTitleColors.length - 1] || '']);
  };

  const handleDeletePage = (index) => {
    if (localPages.length <= 1) return;
    setLocalPages(localPages.filter((_, i) => i !== index));
    setLocalStyles(localStyles.filter((_, i) => i !== index));
    setLocalTitles(localTitles.filter((_, i) => i !== index));
    setLocalFonts(localFonts.filter((_, i) => i !== index));
    setLocalAligns(localAligns.filter((_, i) => i !== index));
    setLocalTextColors(localTextColors.filter((_, i) => i !== index));
    setLocalTitleColors(localTitleColors.filter((_, i) => i !== index));
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
      // Quitar el sombreado azul de selección para ver el color aplicado al instante
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

  return (
    <div className="animate-fadeIn pb-12">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Cartas de Amor Personalizadas
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Escribe directo en el papel. Selecciona cualquier palabra o frase para <strong>ponerla en negrita</strong>, <em>cursiva</em> o <strong>cambiarle el color de tinta individualmente</strong>.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-12">
          {localPages.map((pageText, index) => (
            <LetterCardItem
              key={index}
              index={index}
              totalLetters={localPages.length}
              pageText={pageText}
              originalText={originalPages[index] ?? ''}
              currentStyle={localStyles[index] || 'modern'}
              originalStyle={originalStyles[index] || defaultStyle}
              currentTitle={localTitles[index] || ''}
              originalTitle={originalTitles[index] !== undefined ? originalTitles[index] : (index === 0 ? defaultTitle : '')}
              currentTitleColor={localTitleColors[index] || ''}
              originalTitleColor={originalTitleColors[index] || defaultTitleColor}
              currentFont={localFonts[index] || 'georgia'}
              originalFont={originalFonts[index] || defaultFont}
              currentAlign={localAligns[index] || 'left'}
              originalAlign={originalAligns[index] || defaultAlign}
              currentColor={localTextColors[index] || ''}
              originalColor={originalTextColors[index] || defaultColor}
              isSaving={savingTarget === index}
              isSaved={savedTarget === index}
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
          ))}
        </div>

        {/* Sección inferior: Agregar nueva página y Guardar si cambió la cantidad de páginas */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button 
            type="button" 
            onClick={handleAddPage} 
            className="flex-1 py-4 border-2 border-dashed border-gray-700 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 rounded-xl transition-all font-semibold text-sm"
          >
            + Agregar Nueva Página
          </button>

          {isPagesCountModified && (
            <button
              type="button"
              onClick={() => executeSave('all')}
              disabled={savingTarget === 'all'}
              className="sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm animate-fadeIn"
            >
              {savingTarget === 'all' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30" strokeLinecap="round" className="opacity-50" />
                  </svg>
                  Guardando cambios...
                </>
              ) : savedTarget === 'all' ? (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  ¡Páginas Actualizadas!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar Estructura de Páginas
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
