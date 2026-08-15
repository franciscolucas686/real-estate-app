import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// This proxy target only affects `vite dev` (and `vite preview` of a build
// made in that mode). It has no effect on the real production deployment, which
// has no proxy at all: the client talks straight to the API via
// VITE_API_BASE_URL, and vercel.json is down to the SPA fallback. The proxy
// survives in dev because it keeps local requests same-origin, so a developer
// never needs CORS or a second cookie configuration to log in.
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
      // The port is a contract, not a preference: the ngrok tunnel below dials a
      // fixed localhost:5173, so it cannot follow the server elsewhere. Without
      // strictPort, Vite silently walks to the next free port when a stale
      // `npm run dev` still holds 5173 — it prints the new URL and everything
      // looks fine locally, while the tunnel keeps answering ERR_NGROK_8012
      // ("connection refused") to whoever was sent the link. Failing to boot is
      // the cheaper error. Same reason `allowedHosts` names the domain outright:
      // the port and the host are one pair, and changing either means changing both.
      port: 5173,
      strictPort: true,
      allowedHosts: ['exuvial-transfusable-nidia.ngrok-free.dev'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: true,
          // O backend não tem prefixo global: as rotas vivem na raiz do host
          // (`/properties`, não `/api/properties`). O `/api` é um caminho local do
          // frontend, que existe só para dar ao proxy — e ao rewrite do vercel.json,
          // que faz o mesmo recorte na produção — um prefixo pelo qual casar.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
