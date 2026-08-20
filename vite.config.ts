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
  // O default existe para que `npm install && npm run dev` funcione num clone recém-feito,
  // sem criar `.env.development` antes. Sem ele o proxy abaixo recebe `target: undefined` e
  // o dev-server morre num erro do http-proxy que não menciona variável de ambiente nenhuma —
  // o passo esquecido e o sintoma ficam a uma distância que ninguém percorre na primeira vez.
  // É o mesmo endereço que o `.env.example` traz, então não há segunda fonte de verdade: a
  // variável continua sendo quem manda quando está definida.
  const backendUrl = env.VITE_API_URL || 'http://localhost:3000';

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
      // Este é o **único** manifest. Antes havia dois: um `public/manifest.json` escrito à
      // mão, com ícones, linkado pelo `index.html`, e este, sem ícone nenhum, que o plugin
      // injeta sozinho no fim do `<head>`. A spec manda o navegador usar o primeiro
      // `rel="manifest"` e ignorar o resto, então o do `public/` vencia — por ordem das
      // tags, não por decisão. Bastava o plugin passar a injetar antes, ou alguém reordenar
      // o `<head>`, para o manifest vencedor virar um sem ícones: o app deixaria de ser
      // instalável, silenciosamente. O do `public/` foi apagado e o `<link>` manual saiu do
      // `index.html`.
      VitePWA({
        registerType: 'autoUpdate',
        // Sem `runtimeCaching` aqui a logo do boot não sobrevivia offline. O `sw.js` serve o
        // `index.html` do precache, então um boot a frio sem rede renderiza `<SplashScreen>` — e
        // `/icons/logo-576.webp` não estava nem no precache (o `globPatterns` padrão do workbox é
        // só `js,css,html`) nem em regra de runtime alguma, porque não havia nenhuma. A primeira
        // coisa pintada no boot era uma imagem quebrada, pelos 2s inteiros da splash.
        //
        // `CacheFirst` em vez de jogar `webp` no `globPatterns`: não existe boot de PWA sem uma
        // primeira visita online, então o cache de runtime dá a **mesma** garantia a partir do
        // segundo boot sem somar 268KB (os três degraus do `srcSet`) ao custo de instalação de
        // todo mundo — dos quais cada aparelho usaria um só.
        workbox: {
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/icons/'),
              handler: 'CacheFirst',
              options: { cacheName: 'brand-icons', expiration: { maxEntries: 12 } },
            },
          ],
        },
        manifest: {
          // Os dois nomes que o app já usa na tela, e não uma terceira variação: `name` é a
          // forma longa do `<title>` e da topbar, usada no diálogo de instalação, onde há
          // espaço; `short_name` é a forma curta que a sidebar do console mostra, e é o que vai
          // parar sob o ícone na tela inicial. Precisa acompanhar `apple-mobile-web-app-title`
          // em `index.html`, que é quem cumpre este papel no iOS anterior ao 17.4.
          name: 'Francine Gestora Imobiliária',
          short_name: 'Francine Gestora',
          description:
            'Plataforma de gestão e divulgação de imóveis da Francine Gestora Imobiliária.',
          // `id` fixa a identidade da instalação. Sem ele o Chrome deriva a identidade do
          // `start_url`, então mudar o `start_url` um dia não atualizaria o app instalado: criaria
          // um segundo, deixando o primeiro órfão na tela inicial de quem já tinha instalado.
          id: '/',
          // Absolutos, não `'.'`. O relativo resolvia certo só por acidente de posição — o
          // manifest é emitido na raiz. Ele passar a ser emitido em outro lugar, ou o projeto
          // ganhar um `base`, e o `start_url` seguiria junto silenciosamente.
          start_url: '/',
          scope: '/',
          display: 'standalone',
          // Precisa acompanhar `--color-background` em `index.css`. É esta cor que o
          // Android e o iOS 15.4+ pintam na tela de abertura que eles geram sozinhos,
          // antes de o JS rodar; quando estava `#ffffff` todo boot a frio piscava branco
          // e só então virava cinza.
          background_color: '#f0f1f5',
          theme_color: '#00072D',
          lang: 'pt-br',
          // Dois propósitos, e a diferença é visível na tela inicial do Android. `any` é a
          // arte cheia, usada pelo navegador, pelo desktop e pela splash que o SO gera.
          // `maskable` é a mesma arte reduzida a 80% sobre fundo opaco, porque o Android
          // recorta o ícone na máscara dele (círculo, squircle, gota) e pode comer até 20%
          // de cada borda. Sem uma variante `maskable`, o sistema não arrisca cortar: ele
          // encolhe o ícone e o assenta numa plaquinha branca — que era o que acontecia.
          // 512 basta para desktop: o Windows usa no máximo 256px na barra de tarefas e o
          // dock do macOS 256px @2x, ambos downscale nítido daqui.
          //
          // **O `any` é transparente e o `maskable` não**, e a assimetria é o ponto: o `any` é a
          // arte que o SO centraliza sobre o `background_color` acima na splash que ele gera, e
          // que o Windows e o macOS desenham na barra de tarefas e na dock. Achatado sobre branco
          // — como estava — ele aparecia como um quadrado branco em cima do `#f0f1f5`. O
          // `maskable` precisa da chapa porque o recorte mostraria o que estivesse atrás.
          //
          // **Esta lista é também a lista de precache.** `includeManifestIcons` (default `true`)
          // precacheia exatamente os ícones declarados aqui, então cada entrada nova custa peso
          // na instalação de todo mundo. Quatro é o conjunto mínimo completo; não adicione
          // tamanhos por completude.
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      // The port is a contract, not a preference: a tunnel (ngrok and friends)
      // dials a fixed localhost:5173, so it cannot follow the server elsewhere.
      // Without strictPort, Vite silently walks to the next free port when a
      // stale `npm run dev` still holds 5173 — it prints the new URL and
      // everything looks fine locally, while the tunnel keeps answering
      // ERR_NGROK_8012 ("connection refused") to whoever was sent the link.
      // Failing to boot is the cheaper error.
      port: 5173,
      strictPort: true,
      // The tunnel's public hostname, when there is one. It used to be a personal
      // ngrok domain hardcoded here, which meant the repository carried one
      // machine's setup and nobody else's value could work without editing a
      // tracked file. Vite rejects an unknown Host header outright, so a tunnel
      // without this set answers "Blocked request" and looks like a tunnel fault.
      ...(env.VITE_DEV_ALLOWED_HOST ? { allowedHosts: [env.VITE_DEV_ALLOWED_HOST] } : {}),
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: true,
          // O backend não tem prefixo global: as rotas vivem na raiz do host
          // (`/properties`, não `/api/properties`). O `/api` é um caminho local do
          // frontend, que existe só para dar a este proxy um prefixo pelo qual casar.
          // O rewrite equivalente no `vercel.json` não existe mais — em produção o
          // cliente chama `VITE_API_BASE_URL` direto, sem `/api` nenhum no caminho.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
