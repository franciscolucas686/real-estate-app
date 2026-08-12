import { useState } from 'react';
import { Dropdown } from '@/ui/dropdown';
import { RangeFilter } from '@/ui/range-filter';
import { Button } from '@/ui/button';

/** Which control produced the last edit — see `RangeFilter`'s `onChange`. */
type RangeSource = 'slider' | 'text';

interface RangeFilterDropdownProps {
  label: string;
  active: boolean;
  min: number;
  max: number;
  step: number;
  /** The applied value. Seeds the draft every time the panel opens. */
  value: [number, number];
  /** Called once, on "Aplicar filtro". `source` is the last edit's, not each event's. */
  onApply: (value: [number, number], source: RangeSource) => void;
  prefix?: string;
  suffix?: string;
  triggerClassName?: string;
}

/**
 * A range filter that only commits when the visitor says so.
 *
 * `RangeFilter` is fully controlled and fires `onChange` on every `pointermove`, so wiring
 * it straight to `useFilters` turned one drag into dozens of URL writes — dozens of React
 * Query keys, and dozens of requests. It also filled the history: the range handlers write
 * two keys at once so they go through `setFilters`, which *pushes* rather than replaces,
 * and `useFilters` splits those two on the explicit premise that "a slider drag shouldn't
 * require twenty presses of Back". A single commit fixes both and makes the push correct
 * again — one deliberate apply is exactly what Back should undo.
 *
 * This is the same draft-then-commit shape `FiltersModal` uses. `QuickFilters` documents
 * the opposite rule for inline controls — "an inline control's change *is* the intent" —
 * and that holds for a chip or a select, where one interaction is one decision. A slider is
 * where it stops holding: one interaction is a hundred events.
 */
export function RangeFilterDropdown({
  label,
  active,
  min,
  max,
  step,
  value,
  onApply,
  prefix,
  suffix,
  triggerClassName,
}: RangeFilterDropdownProps) {
  return (
    <Dropdown
      label={label}
      active={active}
      triggerClassName={triggerClassName}
      panelClassName="w-80"
    >
      {/* `Dropdown` unmounts the panel on close, so `RangeDraft` remounts on every open and
          its `useState` re-seeds from the applied value. Closing without applying therefore
          discards the draft structurally — no effect, nothing to keep in sync. */}
      {(close) => (
        <RangeDraft
          min={min}
          max={max}
          step={step}
          applied={value}
          prefix={prefix}
          suffix={suffix}
          onApply={(next, source) => {
            onApply(next, source);
            close();
          }}
        />
      )}
    </Dropdown>
  );
}

function RangeDraft({
  min,
  max,
  step,
  applied,
  onApply,
  prefix,
  suffix,
}: {
  min: number;
  max: number;
  step: number;
  applied: [number, number];
  onApply: (value: [number, number], source: RangeSource) => void;
  prefix?: string;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<[number, number]>(applied);
  // The ceiling rule ("dragged to the end" means "no upper bound") only applies to slider
  // edits, and a deferred commit has no event left to ask. Carrying the last edit's source
  // reproduces the immediate behaviour at apply time instead of inventing a new rule.
  const [source, setSource] = useState<RangeSource>('slider');

  return (
    <div className="flex flex-col gap-4">
      <RangeFilter
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(next, changeSource) => {
          setDraft(next);
          setSource(changeSource);
        }}
        prefix={prefix}
        suffix={suffix}
      />
      <Button size="sm" className="w-full" onClick={() => onApply(draft, source)}>
        Aplicar filtro
      </Button>
    </div>
  );
}
