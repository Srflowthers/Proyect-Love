import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // Rutas relativas: imprescindible para que funcione en GitHub Pages
  // sin importar si el repo se sirve desde la raíz o desde un subdirectorio.
  base: './',
  build: {
    outDir: 'docs'
  }
})
