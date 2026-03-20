import { tv } from 'tailwind-variants';

export const buttonVariants = tv({
  base: [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  ],
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground active:bg-primary/80',
      secondary: 'bg-surface-raised text-foreground active:bg-surface-raised/80',
      ghost: 'bg-transparent text-muted-foreground active:text-foreground',
      destructive: 'bg-accent text-accent-foreground active:bg-accent/80',
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
