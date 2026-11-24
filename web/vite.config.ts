import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api/* → API Fastify sin el prefijo: el navegador ve un solo origen, sin CORS (design D5).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
    },
    // Permite servir design-system/tokens.css, que vive fuera de web/.
    fs: { allow: ['..'] },
  },
})
