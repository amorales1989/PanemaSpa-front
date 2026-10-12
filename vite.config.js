import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo /api va al back local (en producción lo hace vercel.json)
    proxy: {
      '/api': {
        target: process.env.API_LOCAL ?? 'http://localhost:3001',
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
    },
  },
})
