import type { ComponentProps } from 'react';
import { cn } from '@/shared/cn';

/**
 * The generic loading placeholder. Knows nothing about what it stands in for —
 * domain-shaped skeletons compose this and live next to the feature they mirror
 * (`features/properties/components/property-skeletons.tsx`,
 * `features/settings/settings-skeleton.tsx`).
 *
 * `role="status"` plus a visually-hidden label means a screen reader announces that
 * something is loading instead of encountering silence. Previously this rendered as
 * a bare `<div>`, so the entire loading state was invisible to assistive tech.
 * Nested skeletons pass `aria-hidden` via `...props` to avoid announcing "carregando"
 * once per placeholder block.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-xl bg-border', className)}
      {...props}
    />
  );
}

/**
 * Wraps a group of `Skeleton`s so the whole block is announced once.
 * Use at the top of a page- or section-level loading state.
 */
export function SkeletonGroup({
  label = 'Carregando…',
  className,
  children,
  ...props
}: ComponentProps<'div'> & { label?: string }) {
  return (
    <div data-slot="skeleton-group" role="status" aria-busy="true" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
