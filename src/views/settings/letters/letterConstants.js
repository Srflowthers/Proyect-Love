export const INK_COLORS = [
  { label: 'Tinta Natural', value: '' },
  { label: 'Negro Azabache', value: '#111111' },
  { label: 'Sepia Antiguo', value: '#3e2723' },
  { label: 'Rojo Pasión', value: '#c2185b' },
  { label: 'Vino Tinto', value: '#880e4f' },
  { label: 'Rosa Romance', value: '#e91e63' },
  { label: 'Dorado Cálido', value: '#b8860b' },
  { label: 'Azul Noche', value: '#1a237e' },
  { label: 'Púrpura Profundo', value: '#4a148c' },
  { label: 'Verde Esmeralda', value: '#1b5e20' },
];

export const QUICK_SWATCHES = [
  { color: '#c2185b', title: 'Rojo Pasión' },
  { color: '#e91e63', title: 'Rosa Romance' },
  { color: '#880e4f', title: 'Vino' },
  { color: '#4a148c', title: 'Púrpura' },
  { color: '#1a237e', title: 'Azul' },
  { color: '#b8860b', title: 'Dorado' },
  { color: '#111111', title: 'Negro' },
];

export const ROMANTIC_FONTS = [
  { id: 'georgia', name: 'Romance Clásico (Georgia Serif)' },
  { id: 'caveat', name: 'Manuscrita Espontánea (Caveat)' },
  { id: 'parisienne', name: 'Caligrafía Francesa (Parisienne)' },
  { id: 'greatvibes', name: 'Poema Elegante (Great Vibes)' },
  { id: 'alexbrush', name: 'Pluma Antigua (Alex Brush)' },
  { id: 'garamond', name: 'Editorial Fina (Cormorant Garamond)' },
  { id: 'playfair', name: 'Novela de Época (Playfair Display)' },
];

export const PAPER_THEME_STYLES = {
  parchment: {
    containerClass: 'text-[#2a1a0f] border-4 border-[#b88c52]',
    style: {
      background: 'radial-gradient(circle at center, #f1dcb8 0%, #e4c494 70%, #c79c65 100%)',
      boxShadow: 'inset 0 0 35px rgba(100, 60, 20, 0.4), 0 15px 35px rgba(0,0,0,0.7)',
    }
  },
  burnt: {
    containerClass: 'text-[#241409]',
    isBurnt: true,
    style: {
      background: 'radial-gradient(circle at center, #f1dcb8 0%, #e4c494 70%, #c79c65 100%)',
      boxShadow: 'inset 0 0 45px rgba(80, 30, 5, 0.5), inset 0 0 15px rgba(40, 15, 0, 0.8), 0 15px 40px rgba(0,0,0,0.85)',
      filter: 'drop-shadow(0 0 12px rgba(26, 10, 0, 0.9))'
    }
  },
  modern: {
    containerClass: 'text-[#2d2a26] border border-[#e6dfd1]',
    style: {
      backgroundColor: '#f4f0e8',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03), 0 10px 25px rgba(0,0,0,0.5)'
    }
  }
};

export const getFontFamilyStyle = (fontKey) => {
  if (fontKey === 'caveat') return '"Caveat", cursive, sans-serif';
  if (fontKey === 'parisienne') return '"Parisienne", cursive, sans-serif';
  if (fontKey === 'greatvibes') return '"Great Vibes", cursive, sans-serif';
  if (fontKey === 'alexbrush') return '"Alex Brush", cursive, sans-serif';
  if (fontKey === 'garamond') return '"Cormorant Garamond", Georgia, serif';
  if (fontKey === 'playfair') return '"Playfair Display", Georgia, serif';
  return '"Georgia", "Cambria", serif';
};
