import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Minha Imobiliária',
        short_name: 'Imobiliária',
        display: 'standalone',
        start_url: '/',
        theme_color: '#2563EB',
        background_color: '#ffffff',
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['exuvial-transfusable-nidia.ngrok-free.dev'],
  },
});
