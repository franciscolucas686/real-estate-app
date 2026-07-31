import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const SIBLINGS = 1;

/** Builds the "1 2 3 ... 18" sequence, always keeping first, last, and a
 * window of `SIBLINGS` pages around the current one; gaps become `'ellipsis'`. */
function buildPageList(page: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const start = Math.max(2, page - SIBLINGS);
  const end = Math.min(totalPages - 1, page + SIBLINGS);

  pages.push(1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav aria-label="Paginação" className={cn('flex items-center justify-center gap-2', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-foreground-subtle/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex size-9 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors',
              p === page
                ? 'border-action bg-action text-white'
                : 'border-border bg-surface-raised text-foreground hover:border-foreground-subtle/40',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-foreground-subtle/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
