import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PropertyTypeLabel } from '@/shared/format';
import type { PropertyType } from '@/shared/api/types';

/**
 * Hidden below `md`: on a phone the overlaid back button is the way out, and a trail
 * competing with it just costs vertical space above the photo.
 */
export function DetailBreadcrumb({ type }: { type: PropertyType }) {
  return (
    <nav
      aria-label="Trilha"
      className="hidden items-center gap-1.5 text-sm text-foreground-subtle md:flex"
    >
      <Link to="/" className="transition-colors md:hover:text-foreground">
        Início
      </Link>
      <ChevronRight size={14} aria-hidden="true" />
      <Link to="/imoveis" className="transition-colors md:hover:text-foreground">
        Imóveis
      </Link>
      <ChevronRight size={14} aria-hidden="true" />
      <span className="font-medium text-foreground">{PropertyTypeLabel[type]}</span>
    </nav>
  );
}
