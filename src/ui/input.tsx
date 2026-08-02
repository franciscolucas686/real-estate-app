import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/shared/cn';

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      // text-base is deliberate and must not drop back to text-sm: Safari on iOS
      // auto-zooms the viewport when focusing a field smaller than 16px, and the app no
      // longer suppresses that with `user-scalable=no` (WCAG 1.4.4). The token is fluid
      // now, but its floor is exactly 1rem, so the 16px guarantee holds on every phone.
      //
      // `md:h-11` trims the touch-sized box for a pointer without going below the 44px
      // that keeps it comfortable to click.
      className={cn(
        'h-12 rounded-xl border border-border bg-surface-raised px-4 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-action focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:hover:border-foreground-subtle/40',
        className,
      )}
      {...props}
    />
  );
});
