import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={twMerge('animate-pulse rounded-xl bg-border', className)}
      {...props}
    />
  );
}

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="property-card-skeleton"
      className={twMerge(
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

export function PropertyDetailSkeleton() {
  return (
    <div data-slot="property-detail-skeleton" className="flex flex-col">
      <Skeleton className="aspect-16/10 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function PropertyAdminCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="property-admin-card-skeleton"
      className={twMerge(
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

export function SettingsSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,16px)] pb-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-6 px-6 pt-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="mb-1 h-3 w-48" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="mb-1 h-3 w-36" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised p-3">
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-2.5 w-full" />
        </div>
      ))}
    </div>
  );
}
