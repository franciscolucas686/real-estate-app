import { cn } from '@/shared/cn';
import { LAYOUT_PADDING_X, MAX_WIDTH_VARIANTS } from '@/layout/page-container';
import { Skeleton, SkeletonGroup } from '@/ui/skeleton';

/**
 * Property-shaped loading states. These live in the feature, not in `ui/`, because
 * their whole job is to mirror a specific layout — `PropertyAdminCardSkeleton` is
 * only correct as long as `PropertyAdminCard` has a 36px-tall thumbnail and three
 * round action buttons. Keeping them beside the components they imitate is what
 * makes drift visible in review.
 */

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="property-card-skeleton"
      aria-hidden="true"
      className={cn(
        'w-full overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm',
        className,
      )}
    >
      <Skeleton className="aspect-16/10 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

/**
 * Mirrors the detail page's single responsive composition — full-bleed media stacked on
 * mobile, media plus a contact rail from `md` up. There used to be a second,
 * desktop-only skeleton; it existed only because the page itself had a second tree.
 */
export function PropertyDetailSkeleton() {
  return (
    <SkeletonGroup
      data-slot="property-detail-skeleton"
      label="Carregando imóvel…"
      className={cn('flex flex-col gap-5 pb-10 md:py-8', LAYOUT_PADDING_X, MAX_WIDTH_VARIANTS.wide)}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start md:gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3 md:col-start-1 md:row-start-1">
          <Skeleton className="-mx-gutter aspect-16/10 w-auto rounded-none md:mx-0 md:rounded-2xl" />
          <div className="hidden grid-cols-6 gap-2 md:grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:col-start-2 md:row-span-2 md:row-start-1 md:rounded-2xl md:border md:border-border md:p-6">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 hidden h-14 w-full rounded-full md:block" />
        </div>

        <div className="flex flex-col gap-4 md:col-start-1 md:row-start-2">
          <Skeleton className="h-14 w-full rounded-full md:hidden" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

export function PropertyAdminCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="property-admin-card-skeleton"
      aria-hidden="true"
      className={cn(
        'w-full overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm',
        className,
      )}
    >
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <SkeletonGroup label="Carregando contagens…" className="grid grid-cols-4 gap-2 md:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col-reverse items-center gap-2 rounded-2xl border border-border bg-surface-raised p-3 md:flex-col md:items-start md:p-5"
        >
          <Skeleton className="h-3 w-12 md:h-4" />
          <Skeleton className="h-7 w-10 md:h-9 md:w-16" />
          <Skeleton className="hidden h-3 w-20 md:block" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
