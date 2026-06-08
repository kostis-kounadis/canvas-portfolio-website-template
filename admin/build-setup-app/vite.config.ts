import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

const REPO = 'canvas-portfolio-website-template';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? `/${REPO}/admin/` : '/admin/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : '../app',
    emptyOutDir: true,
  }
}))
