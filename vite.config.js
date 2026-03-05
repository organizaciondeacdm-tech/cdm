import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: './client',
  plugins: [react()],
  
  // Configuración de variables de entorno
  // En producción, Vite cargará .env.production si existe
  // En desarrollo, cargará .env.development
  // En Vercel, cargará .env (vacío para forzar auto-detección)
  envPrefix: 'VITE_',
  
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    // En Vercel, NODE_ENV se configura automáticamente a 'production'
  },
})
