import { motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

export type PageWrapperProps = ComponentProps<'main'>;

export function PageWrapper({ className, children, ...props }: PageWrapperProps) {
  return (
    <motion.main
      data-slot="page-wrapper"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={twMerge('min-h-dvh pb-32', className)}
      {...props}
    >
      {children}
    </motion.main>
  );
}
