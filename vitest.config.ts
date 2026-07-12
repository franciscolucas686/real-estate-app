import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Separate from vite.config.ts on purpose: tests don't need the PWA plugin
// or the dev-server /api proxy (network calls are intercepted by MSW
// instead), and keeping this file mode-agnostic avoids coupling the test
// runner to VITE_API_URL / .env.* at all.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
