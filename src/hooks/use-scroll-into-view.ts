import { useEffect, useRef } from 'react';

const KEYBOARD_FALLBACK_DELAY_MS = 350;

export function useScrollIntoView<T extends HTMLElement>(trigger: unknown) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!trigger) return;

    function scroll() {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // If the on-screen keyboard opens, wait for it to finish resizing the
    // viewport before scrolling — otherwise the keyboard covers the target
    // right after we scroll it into the (still keyboard-less) viewport.
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', scroll, { once: true });

    // Fallback for triggers with no keyboard involved (or no visualViewport
    // support), and as a safety net if the keyboard never fires a resize.
    const fallback = window.setTimeout(scroll, KEYBOARD_FALLBACK_DELAY_MS);

    return () => {
      viewport?.removeEventListener('resize', scroll);
      window.clearTimeout(fallback);
    };
  }, [trigger]);

  return ref;
}
