import { motion, type HTMLMotionProps } from 'motion/react';
import { twMerge } from 'tailwind-merge';

export type PageWrapperProps = HTMLMotionProps<'main'>;

export function PageWrapper({ className, children, ...props }: PageWrapperProps) {
  return (
    <motion.main data-slot="page-wrapper" className={twMerge('min-h-dvh', className)} {...props}>
      {children}
    </motion.main>
  );
}
