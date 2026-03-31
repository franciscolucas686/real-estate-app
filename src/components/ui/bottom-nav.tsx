import { tv, type VariantProps } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import type { ComponentProps, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const bottomNavVariants = tv({
  base: 'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-surface-raised px-2 pb-4',
  variants: {
    size: {
      sm: 'h-24',
      md: 'h-26',
      lg: 'h-28',
    },
  },
  defaultVariants: { size: 'md' },
});

const bottomNavItemVariants = tv({
  base: 'flex flex-col items-center justify-center rounded-full transition-colors active:scale-90 transition-transform',
  variants: {
    state: {
      active: 'size-12 bg-primary/15 text-primary',
      inactive: 'size-12 text-foreground-subtle',
    },
  },
  defaultVariants: { state: 'inactive' },
});

export interface BottomNavProps
  extends ComponentProps<'nav'>, VariantProps<typeof bottomNavVariants> {}

export function BottomNav({ className, size, ...props }: BottomNavProps) {
  return (
    <nav
      data-slot="bottom-nav"
      className={twMerge(bottomNavVariants({ size }), className)}
      {...props}
    />
  );
}

export interface BottomNavItemProps extends Omit<ComponentProps<'button'>, 'children'> {
  icon: ReactNode;
  to: string;
}

export function BottomNavItem({ className, icon, to, ...props }: BottomNavItemProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <button
      type="button"
      data-slot="bottom-nav-item"
      data-state={active ? 'active' : 'inactive'}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(to)}
      className={twMerge(
        bottomNavItemVariants({ state: active ? 'active' : 'inactive' }),
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
