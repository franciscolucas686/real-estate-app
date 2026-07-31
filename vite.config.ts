import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// This proxy target only affects `vite dev` (and `vite preview` of a build
// made in that mode). It has no effect on the real production deployment —
// Vercel serves the built static files and routes /api/* via the rewrite in
// vercel.json instead, since it doesn't run Vite's dev server. Both files
// read from VITE_API_URL (.env.development / .env.production) so there's a
// single source of truth per environment, even though two config formats
// (JS here, static JSON there) both need to know it.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL;

  return {
    // Must stay in sync with the `paths` entry in tsconfig.app.json and the alias
    // in vitest.config.ts — TypeScript resolves types, Vite resolves the build, and
    // Vitest resolves the tests, so all three need to be told separately.
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
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
          target: backendUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
