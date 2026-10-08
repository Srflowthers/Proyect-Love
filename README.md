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
