import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/mocks/server';
import { resetMockData } from '@/mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockData();
});

afterAll(() => server.close());

// jsdom doesn't implement these; the app calls them (scroll-to-error in
// property-form.tsx, object URL previews in gallery-management.tsx).
window.HTMLElement.prototype.scrollIntoView = () => {};
URL.createObjectURL = URL.createObjectURL ?? (() => 'blob:mock');
URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});

// jsdom doesn't implement matchMedia. Nothing in the app forks its component tree on
// viewport width any more — `useIsDesktop` is gone and layout is CSS — but Radix and the
// motion library both query it, so the polyfill stays. Reports "no match", which is also
// what jsdom's zero-width viewport would imply.
window.matchMedia =
  window.matchMedia ??
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
