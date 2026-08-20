import os from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Separate from vite.config.ts on purpose: tests don't need the PWA plugin
// or the dev-server /api proxy (network calls are intercepted by MSW
// instead), and keeping this file mode-agnostic avoids coupling the test
// runner to VITE_API_URL / .env.* at all.
export default defineConfig({
  // Mirrors vite.config.ts / tsconfig.app.json — see the note there.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // O default do Vitest é 5s, e a suíte não tinha margem para ele. Medido com
    // `--reporter=verbose` nesta máquina (16 núcleos, ocioso), os mais lentos são
    // ~1,5–2,2s: "mostra 12 imóveis por página" (2177ms) renderiza doze cards com
    // carrossel, e os três do `property-form` percorrem um wizard inteiro digitando com
    // `user-event`. Isso é fator 2,3 de folga — qualquer coisa que deixe a máquina 2,5×
    // mais lenta derruba um teste, e o runner do GitHub Actions é bem mais lento que este.
    //
    // Foi exatamente assim que apareceu: uma execução falhou um único teste com
    // `environment` em 129s no lugar dos 35s habituais, porque um `eslint --fix` disputava
    // CPU ao lado. Confirmado depois estreitando o teto de propósito — com
    // `--testTimeout=2000` caem seis testes, todos por timeout e nenhum por asserção.
    //
    // A lentidão é legítima e não vale "otimizar": `test/render.tsx` já desliga o retry do
    // React Query (`retry: false`), então não há backoff escondido aqui — o custo é o de
    // dirigir formulários reais através do DOM real, que é justamente o que estes testes
    // existem para fazer. O que estava errado era o teto, não os testes.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Vitest's default is one worker process per spec file, up to the CPU
    // count — with 32-ish spec files that's effectively unbounded
    // oversubscription on anything but a very wide machine, and it's the
    // other half of the timeout story above: a `property-form.spec.tsx` test
    // that measured ~1.5–2.2s standalone started timing out under `npm test`
    // (never the same test twice — a resource-contention lottery, not a
    // logic bug), reproduced here with `Failed to start forks worker` errors
    // when the host was already under heavy load. Capping at half the CPUs
    // still runs several files in parallel while leaving headroom so one
    // slow file doesn't starve the next one's process spawn. Trades total
    // suite wall-clock time for not needing testTimeout to absorb full
    // oversubscription on top of its own margin.
    maxWorkers: Math.max(1, Math.floor(os.cpus().length / 2)),
  },
});
