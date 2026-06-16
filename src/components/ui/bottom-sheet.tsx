import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-70 flex flex-col rounded-t-2xl bg-background pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
          >
            <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-border" />
            {title && <p className="px-6 pb-4 text-base font-semibold text-foreground">{title}</p>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
