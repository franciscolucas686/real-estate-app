import { useEffect } from 'react';

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);
}
