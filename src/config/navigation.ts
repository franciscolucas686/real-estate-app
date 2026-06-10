import { matchPath, useLocation } from 'react-router-dom';

export const ROUTES_WITHOUT_BOTTOM_NAV = [
  '/properties/:id',
  '/properties/new',
  '/properties/:id/edit',
  '/properties/:id/gallery',
  '/login',
  '/search/filters',
  '/settings',
] as const;

export function useShowBottomNav(): boolean {
  const { pathname } = useLocation();
  return !ROUTES_WITHOUT_BOTTOM_NAV.some((route) => matchPath(route, pathname));
}
