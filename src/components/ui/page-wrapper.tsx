import { motion, type HTMLMotionProps } from 'motion/react';
import { twMerge } from 'tailwind-merge';

export interface PageWrapperProps extends HTMLMotionProps<'main'> {
  /**
   * When true, prevents scroll by using fixed viewport height.
   * Use for pages where content should not scroll (login, contact, etc).
   * @default false
   */
  noScroll?: boolean;
}

export function PageWrapper({ className, children, noScroll = false, ...props }: PageWrapperProps) {
  return (
    <motion.main
      data-slot="page-wrapper"
      className={twMerge(noScroll ? 'h-dvh overflow-hidden' : 'min-h-dvh', className)}
      {...props}
    >
      {children}
    </motion.main>
  );
}
