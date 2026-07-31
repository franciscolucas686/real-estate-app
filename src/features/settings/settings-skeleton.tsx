import { cn } from '@/shared/cn';
import { MAX_WIDTH_VARIANTS } from '@/layout/page-container';
import { Skeleton, SkeletonGroup } from '@/ui/skeleton';

/** Mirrors the settings page: header, WhatsApp numbers section, contact form, logout. */
export function SettingsSkeleton() {
  return (
    <SkeletonGroup
      label="Carregando configurações…"
      className="flex min-h-dvh flex-col bg-background pb-10 md:min-h-full"
    >
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,16px)] pb-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className={cn('flex flex-col gap-6 px-6 pt-4', MAX_WIDTH_VARIANTS.reading)}>
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
    </SkeletonGroup>
  );
}
