# Nuestra Historia ❤️

Página romántica hecha con React + Vite, lista para publicarse en GitHub Pages.

## 1. Instalar y correr en local

```bash
npm install
npm run dev
```

Abre la URL que te muestre la terminal (normalmente `http://localhost:5173`).

## 2. Personalizar el contenido

Edita **un solo archivo**: `src/config/configuracion.js`.
Ahí cambias la fecha de inicio, los textos, la lista de fotos, la
línea de tiempo y el mensaje final. No necesitas tocar los
componentes.

## 3. Agregar tus fotos y tu música

- Fotos → carpeta `public/fotos/` (instrucciones detalladas en
  `public/fotos/LEEME.txt`).
- Música → carpeta `public/musica/` (instrucciones detalladas en
  `public/musica/LEEME.txt`).

Resumen rápido:

| Qué | Dónde va | Nombre esperado |
|---|---|---|
| Fotos | `public/fotos/` | `foto-01.jpg`, `foto-02.jpg`, ... (definido en `configuracion.js`) |
| Música | `public/musica/` | `nuestra-cancion.mp3` (definido en `configuracion.js`) |

## 4. Compilar para producción

```bash
npm run build
```

Esto genera automáticamente la carpeta `docs/` con todo listo
para GitHub Pages. No edites nada dentro de `docs/` a mano: se
regenera cada vez que corres `npm run build`.

## 5. Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub (incluyendo la
   carpeta `docs/` ya generada).
2. Ve a **Settings → Pages** en el repositorio.
3. En **Source**, elige **Deploy from a branch**.
4. En **Branch**, elige **main** y la carpeta **/docs**.
5. Guarda. En unos minutos tu página estará publicada en la URL
   que GitHub te indique.

Cada vez que cambies algo, corre `npm run build` de nuevo y sube
los cambios (incluida la carpeta `docs/` actualizada).

## 6. Funciones Avanzadas Implementadas (Oct 2026)

- **Carga Progresiva Infinita**: Las imágenes se cargan en lotes desde el backend respetando el Anti-Bot/Rate Limit (50 imágenes cada 2.5s) sin recargas manuales.
- **Universo 3D Dinámico**: Generación aleatoria de la semilla del universo 3D en cada sesión para garantizar un clúster de entrada siempre único.
- **Drift Diagonal (Zoom Infinito)**: Algoritmo matemático para que el avance en Z mueva de forma imperceptible los ejes X/Y, creando constelaciones siempre nuevas al dar la vuelta al universo.
- **Controles Táctiles (Móvil)**: Natural Scroll (inversión de ejes para arrastre) y sensibilidad calibrada específicamente para dispositivos móviles.

## 7. Arcade del Amor (Minijuegos Cooperativos)

Ecosistema modular de minijuegos independientes aislados en `public/arcade/` y coordinados desde `src/views/GamesView.jsx`:

1. **🧩 Rompecabezas de Recuerdos (`puzzle.html`)**:
   - **Modal de piezas**: Selector directo de dificultad (**30 piezas / Muy fácil**, **60 piezas / Fácil**, **120 piezas / Media**, **240 piezas / Difícil**, **500 piezas / ¡Imposible!**).
   - **Foto propia aleatoria**: Selecciona automáticamente una imagen al azar de la galería de la pareja y permite cambiar a otra con el botón *🎲 Otra foto de nosotros*.
   - **100% Pantalla panorámica**: Tablero central y distribución de piezas aprovechando al 100% los bordes laterales izquierdo y derecho en pantallas de PC y laptops.
2. **🔢 Sudoku de a Dos (`sudoku.html`)**:
   - **Modal de dificultad**: Selección directa de **Fácil** (6×6), **Normal** (9×9) y **Difícil** (12×12) sin mostrar números de cuadrícula en la UI.
   - **Modo cooperativo**: Dos jugadores por turnos con sistema de pistas y puntuación en pareja.
3. **🧱 Tetris Pareja (`tetris.html`)**:
   - Tetris cooperativo adaptado para pantalla completa y optimizado con controles táctiles y de teclado.
4. **🍬 Gominola Match-3 (`gomi.html`)**:
   - Juego de combinación de caramelos y corazones con efectos en Canvas.
5. **🎱 Pool 3D (`pool.html`)**:
   - Billar 3D con física realista y partidas por turnos.

---

## 8. Políticas de Acceso y Seguridad: Protección de Rutas y Anti-Bot

- **Autenticación Obligatoria (Plan Free como mínimo)**:
  - Los minijuegos de la Zona Arcade están protegidos: **solo pueden ser jugados por usuarios registrados y autenticados** (con al menos el Plan Free/Gratis o planes superiores de pago).
  - Usuarios no autenticados o visitantes anónimos **no pueden acceder ni jugar** ningún minijuego.
- **Protección Anti-Bypass y Filtro Anti-Bot (Cloudflare Turnstile)**:
  - Todo intento de acceder a los juegos (`/arcade/*.html` o navegación no logueada) es interceptado de forma inmediata por guardias de seguridad en `<head>` (`window.self === window.top` check y token de sesión).
  - Los accesos no autorizados son redirigidos automáticamente a `/?auth_required=arcade`, desplegando el modal de autenticación (`PricingModal`).
  - El usuario debe completar satisfactoriamente el widget **Cloudflare Turnstile Anti-Bot** y autenticarse con su cuenta de Google antes de obtener acceso al Arcade.
- **Personalización para el Usuario Registrado**:
  - En el **Rompecabezas**: Al estar autenticado con al menos Plan Free, el sistema carga de forma segura y automática las **fotos propias** de la pareja para armar desafíos aleatorios.

