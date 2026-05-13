import { twMerge } from 'tailwind-merge';
import type { ComponentProps, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function BottomNav({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="bottom-nav"
      className={twMerge(
        'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-primary px-2 pb-[env(safe-area-inset-bottom,0px)]',
        'h-16',
        className,
      )}
      {...props}
    />
  );
}

export interface BottomNavItemProps extends Omit<ComponentProps<'button'>, 'children'> {
  icon: ReactNode;
  label: string;
  to: string;
}

export function BottomNavItem({ className, icon, label, to, ...props }: BottomNavItemProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));

  return (
    <button
      type="button"
      data-slot="bottom-nav-item"
      data-state={active ? 'active' : 'inactive'}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(to)}
      className={twMerge(
        'flex flex-col items-center justify-center gap-1 px-4 py-2 text-white/60 transition-colors active:scale-90',
        active && 'text-white',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
