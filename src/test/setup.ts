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

// jsdom doesn't implement ResizeObserver, and `useCarouselSwipe` constructs one on mount to
// track the slide width. It went unnoticed until a spec first rendered a property *with*
// photos: the throw happens in a passive effect, which React treats as fatal, so the whole
// tree unmounted and the page under test rendered as an empty `<div />` — the failure read
// as "element not found", pointing nowhere near the cause.
//
// A no-op is the honest stub rather than a fake observer: jsdom reports every element as
// zero-sized, so a callback would only ever report a width of 0, which is what `offsetWidth`
// already returns on the initial `updateWidth()` call. Nothing in a spec depends on the
// carousel measuring itself — the swipe threshold that width feeds is deliberately not what
// the drag-suppression logic uses, precisely so it stays observable here.
window.ResizeObserver =
  window.ResizeObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

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

// jsdom implements no pointer capture at all, and three drag surfaces call it on every
// `pointerdown`: `useCarouselSwipe`, `useSwipeToSelect` and `ui/range-filter`. It keeps
// `pointermove` flowing when the pointer leaves the element mid-drag, so it is genuinely
// needed at runtime — guarding the call with `?.` would bend production code around a test
// environment, in three places instead of one.
//
// Same failure shape as `elementFromPoint` above, and it bit the same way: `user.click`
// dispatches the whole pointer sequence, the TypeError landed inside a React event handler
// where nothing catches it, and the run reported 25 files and 214 tests passing while
// exiting 1. `grep`ping vitest's output for "FAIL" shows green on a run like that — the
// honest check is the exit code.
//
// All three at once because stubbing one is choosing which test breaks next.
// `hasPointerCapture` answers `false`, which is what "never captured" means.
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);

// jsdom doesn't implement matchMedia. Nothing in the app reads viewport width in JS at all
// any more — `useIsDesktop` is gone, layout is CSS, and the gallery's one click-time
// exception went with "Ver mais". The only remaining caller in `src/` asks about
// `display-mode: standalone` (app.tsx), which is not a width. Radix and the motion library
// query it too, so the polyfill stays. Reports "no match", which is also what jsdom's
// zero-width viewport would imply.
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
