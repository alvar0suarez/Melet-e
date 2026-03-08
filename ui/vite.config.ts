import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:7749',
      '/vault-files': 'http://localhost:7749',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          pdf: ['pdfjs-dist'],
          d3: ['d3'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
})
