import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/shared/cn';

export const Select = forwardRef<HTMLSelectElement, ComponentProps<'select'>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      // text-base for the same iOS auto-zoom reason as ui/input.tsx, and `md:h-11` to
      // match its desktop height — the two sit side by side in the property wizard.
      className={cn(
        'h-12 cursor-pointer rounded-xl border border-border bg-surface-raised px-4 text-base text-foreground outline-none transition-colors focus:border-action focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:hover:border-foreground-subtle/40',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
