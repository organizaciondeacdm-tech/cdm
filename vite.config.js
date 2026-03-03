import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // root: './client', ← ELIMINÁ ESTA LÍNEA O CAMBIALA A root: '.'
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
    outDir: 'dist', // Cambiá a 'dist' (relativo a la raíz)
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
  },
})
