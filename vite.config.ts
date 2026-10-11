/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Permite abrir el servidor de desarrollo desde un túnel (cloudflared) para probar en el móvil.
    allowedHosts: ['.trycloudflare.com'],
    // Con VITE_SUPABASE_URL=/supabase, el Supabase local se sirve por el mismo origen.
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },
  },
  build: {
    // el chunk del PDF (react-pdf) es grande pero solo se carga al descargar un informe
    chunkSizeWarningLimit: 1400,
  },
  test: {
    environment: 'node',
  },
})
