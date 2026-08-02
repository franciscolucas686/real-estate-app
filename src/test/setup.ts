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

// `useSwipeToSelect` calls this on every pointerdown, and jsdom has no layout to answer it
// with. Without the stub the gallery spec's `user.click` — which dispatches the whole
// pointer sequence, not just a click — threw a TypeError inside a React event handler.
// Nothing caught it (event-handler throws bypass error boundaries), so it surfaced as an
// uncaught exception: every assertion still passed, Vitest still exited 1, and CI failed a
// suite that was entirely green. It only started happening when gallery photos became real
// `role="checkbox"` buttons and the spec began clicking them.
//
// `null` is the honest answer rather than a fake hit: the swipe accelerator needs real
// coordinates, and jsdom reports every rect as zero. `findItemId` optional-chains the
// result, so the gesture stays inert and the path the spec actually covers — click and
// keyboard on the checkbox — is untouched.
document.elementFromPoint = document.elementFromPoint ?? (() => null);

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
