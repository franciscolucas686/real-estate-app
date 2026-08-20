import { useEffect } from 'react';

// Android/Chrome ties native pull-to-refresh to the document scroller
// (the <html> element), not <body> — setting overscroll-behavior on body
// alone has no effect on the gesture. Both are set here for safety since
// some WebViews treat body as the root scroller instead.
export function useDisablePullToRefresh() {
  useEffect(() => {
    const root = document.documentElement;
    const { body } = document;
    const previousRoot = root.style.overscrollBehaviorY;
    const previousBody = body.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';
    return () => {
      root.style.overscrollBehaviorY = previousRoot;
      body.style.overscrollBehaviorY = previousBody;
    };
  }, []);
}
