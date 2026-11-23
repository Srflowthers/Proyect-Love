import { getPaperStyleById } from './paperStylesCatalog';

// Función centralizada para dibujar el fondo de papel (compartida entre inicio y editor)
export function drawPaperBackground(ctx, width, height, theme, randomSeed = 42) {
  const styleDef = getPaperStyleById(theme);
  const isBurnt = theme === 'burnt' || (styleDef && styleDef.isBurnt);

  if (isBurnt) {
    // Fondo negro circundante
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Gradiente pergamino
    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
    grad.addColorStop(0, '#f1dcb8');
    grad.addColorStop(0.7, '#e4c494');
    grad.addColorStop(1, '#c79c65');

    // Generador pseudo-aleatorio con semilla fija para que el borde sea 100% IDÉNTICO
    let seed = randomSeed;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    ctx.beginPath();
    ctx.moveTo(10, 10);
    // Top
    for (let x = 10; x <= width - 10; x += 2) ctx.lineTo(x, pseudoRandom() * 8 + 10);
    // Right
    for (let y = 10; y <= height - 10; y += 2) ctx.lineTo(width - (pseudoRandom() * 8 + 10), y);
    // Bottom
    for (let x = width - 10; x >= 10; x -= 2) ctx.lineTo(x, height - (pseudoRandom() * 8 + 10));
    // Left
    for (let y = height - 10; y >= 10; y -= 2) ctx.lineTo(pseudoRandom() * 8 + 10, y);
    ctx.closePath();

    ctx.save();
    ctx.clip();

    // Rellenar la hoja irregular
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Borde interior difuminado (sombra de la quemadura)
    ctx.strokeStyle = 'rgba(80, 30, 5, 0.4)';
    ctx.lineWidth = 15;
    ctx.stroke();

    // Borde central quemado más oscuro y nítido
    ctx.strokeStyle = 'rgba(40, 15, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Línea de carbonización extrema en el mero borde
    ctx.strokeStyle = '#1a0a00';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (theme === 'parchment') {
    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
    grad.addColorStop(0, '#f1dcb8');
    grad.addColorStop(0.7, '#e4c494');
    grad.addColorStop(1, '#c79c65');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(100, 60, 20, 0.4)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    return;
  }

  // Si tiene definición en catálogo con background personalizado
  if (styleDef && styleDef.preview) {
    const bg = styleDef.preview.bg || '#f4f0e8';

    if (bg.startsWith('#') || bg.startsWith('rgb')) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    } else if (bg.includes('radial-gradient')) {
      const colors = bg.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g);
      if (colors && colors.length >= 2) {
        const radGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
        colors.forEach((c, i) => {
          radGrad.addColorStop(i / (colors.length - 1), c);
        });
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#f4f0e8';
        ctx.fillRect(0, 0, width, height);
      }
    } else if (bg.includes('linear-gradient')) {
      const colors = bg.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g);
      if (colors && colors.length >= 2) {
        const linGrad = ctx.createLinearGradient(0, 0, width, height);
        colors.forEach((c, i) => {
          linGrad.addColorStop(i / (colors.length - 1), c);
        });
        ctx.fillStyle = linGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#f4f0e8';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = '#f4f0e8';
      ctx.fillRect(0, 0, width, height);
    }

    // Borde refinado según rareza
    const borderColor = styleDef.preview.border || '#e6dfd1';
    ctx.strokeStyle = borderColor;
    const isSpecialRarity = styleDef.rarity === 'legendaria' || styleDef.rarity === 'mitica';
    ctx.lineWidth = isSpecialRarity ? 3.5 : 2;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    if (isSpecialRarity) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(13, 13, width - 26, height - 26);
    }
    return;
  }

  // Estilo moderno estándar
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#e6dfd1';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, width - 20, height - 20);
}
