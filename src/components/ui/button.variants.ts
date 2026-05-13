import { tv } from 'tailwind-variants';

export const buttonVariants = tv({
  base: [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  ],
  variants: {
    variant: {
      primary: 'bg-action text-white active:bg-action-hover',
      secondary: 'bg-surface-raised text-foreground border border-border active:bg-border',
      ghost: 'bg-transparent text-muted-foreground active:text-foreground',
      destructive: 'bg-danger text-white active:bg-danger-hover',
    },
    size: {
      sm: 'h-10 px-4 text-sm [&_svg]:size-3.5',
      md: 'h-12 px-5 text-base [&_svg]:size-4',
      lg: 'h-14 px-6 text-lg [&_svg]:size-5',
      icon: 'size-12 [&_svg]:size-5',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
