import { cn } from '@/shared/cn';

// ─── Step indicator (desktop) ─────────────────────────────────────────────────
export function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-start">
      {labels.map((label, i) => {
        const s = i + 1;
        const active = s <= step;
        return (
          <div key={label} className="flex items-start">
            <div className="flex w-24 flex-col items-center gap-2">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-action bg-action text-white'
                    : 'border-border text-foreground-subtle',
                )}
              >
                {s}
              </div>
              <span
                className={cn(
                  'text-center text-xs font-medium',
                  active ? 'text-action' : 'text-foreground-subtle',
                )}
              >
                {label}
              </span>
            </div>
            {s < labels.length && (
              <div
                className={cn(
                  'mx-1 mt-5 h-0.5 w-10 shrink-0',
                  s <= step ? 'bg-action' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
