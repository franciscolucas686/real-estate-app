import { cn } from '@/shared/cn';

/**
 * A neutral pill with a colour role. Kept in `features/properties/` rather than promoted to
 * `ui/`: the `color` prop is a string looked up in a map, which is a weaker contract than the
 * rest of the design system offers, and the property detail is its only consumer. Promoting it
 * would mean designing that API first.
 */
export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    action: 'bg-action/10 text-action',
    accent: 'bg-accent/10 text-accent',
    border: 'bg-border text-foreground-subtle',
  };
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-semibold',
        colorMap[color] ?? colorMap.border,
      )}
    >
      {children}
    </span>
  );
}
