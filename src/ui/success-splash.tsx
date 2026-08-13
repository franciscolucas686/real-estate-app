import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

export function SuccessSplash({ visible, children }: { visible: boolean; children: ReactNode }) {
  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="success-splash"
          data-slot="success-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-(--z-splash) flex flex-col items-center justify-center gap-4 bg-background"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
