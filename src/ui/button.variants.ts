import { tv } from 'tailwind-variants';

/**
 * The button's public API is `variant`/`size`/`shape` — never a `className` carrying
 * `bg-*`. The options added here are not speculative: each was derived from a shape
 * already hand-rolled somewhere in the app (bordered icon buttons in the dashboard
 * header, pill-shaped primary actions on the filters and property pages, the circular
 * FAB). The app has ~90 raw `<button>`s with inline classes; the variants have to cover
 * the shapes that actually exist or those buttons can never be migrated.
 *
 * `hover` is scoped to `md:` throughout, with `active:` covering touch — otherwise
 * `:hover` sticks after a tap on touch devices.
 */
export const buttonVariants = tv({
  base: [
    'inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  variants: {
    variant: {
      primary: 'bg-action text-primary-foreground md:hover:bg-action-hover active:bg-action-hover',
      secondary:
        'border border-border bg-surface-raised text-foreground md:hover:bg-border/60 active:bg-border',
      /** Bordered but transparent — secondary icon actions sitting on the page background. */
      outline:
        'border border-border bg-transparent text-foreground-subtle md:hover:bg-border/60 md:hover:text-foreground active:bg-border',
      ghost: 'bg-transparent text-muted-foreground md:hover:text-foreground active:text-foreground',
      destructive:
        'bg-danger text-primary-foreground md:hover:bg-danger-hover active:bg-danger-hover',
    },
    size: {
      sm: 'h-10 px-4 text-sm [&_svg]:size-3.5',
      md: 'h-12 px-5 text-base [&_svg]:size-4',
      lg: 'h-14 px-6 text-lg [&_svg]:size-5',
      'icon-sm': 'size-10 [&_svg]:size-4',
      icon: 'size-12 [&_svg]:size-5',
      'icon-lg': 'size-16 [&_svg]:size-7',
    },
    shape: {
      control: 'rounded-xl',
      pill: 'rounded-full',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md', shape: 'control' },
});
