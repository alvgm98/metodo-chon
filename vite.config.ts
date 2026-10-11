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
  build: {
    // el chunk del PDF (react-pdf) es grande pero solo se carga al descargar un informe
    chunkSizeWarningLimit: 1400,
  },
  test: {
    environment: 'node',
  },
})
