import { motion, type HTMLMotionProps } from 'motion/react';
import { twMerge } from 'tailwind-merge';

export type PageWrapperProps = HTMLMotionProps<'main'>;

export function PageWrapper({ className, children, ...props }: PageWrapperProps) {
  return (
    <motion.main
      data-slot="page-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.45, 0, 0.15, 1] }}
      className={twMerge('min-h-dvh pb-32', className)}
      {...props}
    >
      {children}
    </motion.main>
  );
}
