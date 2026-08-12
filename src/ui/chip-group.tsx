import { cn } from '@/shared/cn';

interface ChipOption {
  label: string;
  value: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function ChipGroup({ options, value, onChange, className }: ChipGroupProps) {
  return (
    <div data-slot="chip-group" className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(selected ? null : opt.value)}
            className={cn(
              'min-h-11 border rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
              selected
                ? 'border-action bg-action/10 text-action'
                : 'border-border bg-surface-raised text-foreground md:hover:border-foreground-subtle/40',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
