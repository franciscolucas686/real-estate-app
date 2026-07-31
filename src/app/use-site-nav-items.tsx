import { Phone, Search as SearchIcon, User, LayoutDashboard } from 'lucide-react';
import { useMe } from '@/features/auth/use-auth';
import type { NavItemDescriptor } from '@/layout/app-nav';

/**
 * The storefront's nav entries.
 *
 * Lives in `app/` rather than inside `SiteShell` because reading the session is a domain
 * concern, and `layout/` is not allowed to know about domains — the lint zone caught this
 * exact import when it was in the shell. Composing features into shells is what the app
 * layer is for.
 *
 * The third entry is the only session-dependent one, and only its label changes: "Entrar"
 * and "Dashboard" both lead somewhere the visitor may go.
 */
export function useSiteNavItems(): NavItemDescriptor[] {
  const { data: user } = useMe();
  const isAuth = Boolean(user);

  return [
    {
      key: 'explorar',
      icon: <SearchIcon size={24} aria-hidden="true" />,
      label: 'Imóveis',
      to: '/imoveis',
    },
    {
      key: 'contato',
      icon: <Phone size={24} aria-hidden="true" />,
      label: 'Contato',
      to: '/contact',
    },
    isAuth
      ? {
          key: 'dashboard',
          icon: <LayoutDashboard size={24} aria-hidden="true" />,
          label: 'Dashboard',
          to: '/dashboard',
        }
      : {
          key: 'entrar',
          icon: <User size={24} aria-hidden="true" />,
          label: 'Entrar',
          to: '/login',
        },
  ];
}
