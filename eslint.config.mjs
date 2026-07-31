import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Intra-src imports go through the `@/` alias so the layering zones below can
      // actually match. Relative imports would let a violation slip past as `../../ui`.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', './*/*'],
              message:
                'Use o alias absoluto `@/...` para imports entre pastas. Caminhos relativos escapam das zonas de camada definidas no eslint.config.mjs.',
            },
          ],
        },
      ],
    },
  },

  /* ─────────────────────────────────────────────────────────────────────────────
     LAYERING

     Dependency direction: ui → layout → features → pages → app.
     A layer may only import from the layers above it, plus `shared`.

     This is enforced rather than documented because the previous structure had the
     same intent in a README and drifted anyway: `components/ui/` ended up holding
     `status-badge.tsx` (imports PropertyStatus from the API), `property-map.tsx`
     and `protected-route.tsx` (calls useMe()). A design system that knows about
     properties and auth is not reusable, and nothing was stopping it.
     ───────────────────────────────────────────────────────────────────────────── */

  {
    // The design system: no domain, no network, no routing. Everything by props.
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/pages/*', '@/app/*', '@/layout/*', '@/shared/api/*'],
              message:
                'ui/ é o design system: não pode conhecer domínio, rede, rota nem layout de página. Receba tudo por props — se o componente precisa de um tipo da API, ele pertence a features/.',
            },
            {
              group: ['react-router-dom', '@tanstack/react-query'],
              message:
                'ui/ não pode depender de router nem de data fetching. Um primitivo acoplado a rota ou query não é reutilizável fora deste app.',
            },
          ],
        },
      ],
    },
  },

  {
    // Layout composition: knows about viewport and page structure, not about domain.
    files: ['src/layout/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/pages/*', '@/app/*'],
              message:
                'layout/ define a estrutura da página, não o conteúdo dela. Conteúdo de domínio entra por children/props.',
            },
          ],
        },
      ],
    },
  },

  {
    // Features own their domain. They must not reach into a page, nor into a sibling
    // feature's internals — only through that feature's public entry file.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/*', '@/app/*'],
              message:
                'Uma feature não pode importar de pages/ nem de app/ — a dependência é no sentido oposto.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/*'],
              message:
                'Uma página não importa de outra página. O que for compartilhado pertence a features/ ou ui/.',
            },
          ],
        },
      ],
    },
  },

  {
    // Tests and mocks compose across every layer by design.
    files: ['src/**/*.spec.{ts,tsx}', 'src/test/**', 'src/mocks/**'],
    rules: { 'no-restricted-imports': 'off' },
  },

  prettierPlugin,
);
