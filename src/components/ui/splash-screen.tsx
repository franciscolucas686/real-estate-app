import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const SPLASH_DURATION = 2000;
const SESSION_KEY = '__splash_shown__';

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(() => {
    // Only show on cold start — sessionStorage persists while the tab/app is alive
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-background"
          >
            <motion.img
              src="/logo.png"
              alt="Logo"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="size-72 object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
