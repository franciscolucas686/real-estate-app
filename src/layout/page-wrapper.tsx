import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/shared/cn';

export interface PageWrapperProps extends HTMLMotionProps<'main'> {
  /**
   * Pin the page to the viewport so it cannot scroll (login, contact).
   *
   * **Mobile only, deliberately.** The reason the flag exists is the on-screen keyboard:
   * when it opens it shrinks the visual viewport, and a scrollable centred form jumps
   * around under the user's thumb. A desktop has no such keyboard, and there `h-dvh` was
   * actively harmful — inside `SiteShell` it stacked a full 100dvh underneath an ~80px top
   * nav, so the document became 100dvh + 80px and grew a strip of dead scroll at the
   * bottom. `/contact` shipped with that; `/login` would have inherited it on moving into
   * the site shell. From `md` up the page just fills its slot in the shell instead.
   * @default false
   */
  noScroll?: boolean;
}

export function PageWrapper({ className, children, noScroll = false, ...props }: PageWrapperProps) {
  return (
    <motion.main
      data-slot="page-wrapper"
      className={cn(
        noScroll
          ? 'h-dvh overflow-hidden md:h-auto md:flex md:flex-1 md:flex-col md:overflow-visible'
          : 'min-h-dvh md:h-full',
        className,
      )}
      {...props}
    >
      {children}
    </motion.main>
  );
}
