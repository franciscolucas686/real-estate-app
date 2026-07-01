import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const BACKEND_URL = 'https://api-real-estate-in76.onrender.com';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gestão Imobiliária',
        short_name: 'Imob Francine',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#00072D',
        lang: 'pt-br',
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['exuvial-transfusable-nidia.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
