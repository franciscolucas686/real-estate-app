import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/shared/cn';

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
      className={cn(noScroll ? 'h-dvh overflow-hidden' : 'min-h-dvh md:h-full', className)}
      {...props}
    >
      {children}
    </motion.main>
  );
}
