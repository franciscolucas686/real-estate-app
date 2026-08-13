import { cn } from '@/shared/cn';
import { Input as SharedInput } from '@/ui/input';
import { Select as SharedSelect } from '@/ui/select';

/**
 * The wizard's controls: thin adapters over the shared primitives that keep this form's
 * `value`/`onChange(v: string)` convention instead of raw DOM events, plus a `Toggle` the
 * design system has no equivalent for.
 *
 * `Field` is a straight re-export, not a wrapper. It used to be a local component that
 * forwarded all three of its props to `ui/field` and added nothing — an indirection that
 * cost a component in the tree and read as if the wizard had its own field.
 */
export { Field } from '@/ui/field';

export function Input({
  value,
  onChange,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return <SharedInput value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | '';
  onChange: (v: T) => void;
  placeholder?: string;
  options: { label: string; value: T }[];
}) {
  return (
    <SharedSelect value={value} onChange={(e) => onChange(e.target.value as T)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SharedSelect>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface-raised px-4 transition-colors md:hover:border-foreground-subtle/40"
    >
      <span className="text-sm text-foreground">{label}</span>
      <div
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          value ? 'bg-action' : 'bg-border',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-surface-raised shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </div>
    </button>
  );
}

// ─── Step 1: Basic info ───────────────────────────────────────────────────────
