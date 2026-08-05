import { useRef, useState, useCallback } from 'react';
import { cn } from '@/shared/cn';

interface RangeFilterProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  /**
   * `source` tells the caller whether the change came from dragging/keying the slider
   * (always bounded to `min`/`max`) or from typing in a text field (unbounded — see the
   * text `onChange` handlers below). Callers that clear a field once the slider reaches
   * its ceiling ("dragged to the end" = "no upper bound") must only do that for
   * `'slider'`, or a literally typed ceiling value gets silently discarded too.
   */
  onChange: (value: [number, number], source: 'slider' | 'text') => void;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatBR(value: number): string {
  return value.toLocaleString('pt-BR');
}

function parseBR(value: string): number {
  return Number(value.replace(/\./g, '').replace(/[^\d]/g, ''));
}

export function RangeFilter({
  min,
  max,
  step = 1,
  value,
  onChange,
  prefix,
  suffix,
  className,
}: RangeFilterProps) {
  const [minVal, maxVal] = value;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const range = max - min || 1;
  // Clamped for rendering only — a typed value past the slider's ceiling/floor is kept
  // in full for the actual filter, but the thumb has nowhere to go past the track ends.
  const minPercent = Math.min(100, Math.max(0, ((minVal - min) / range) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((maxVal - min) / range) * 100));

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round((min + percent * range) / step) * step;
    },
    [min, range, step],
  );

  const handlePointerDown = (thumb: 'min' | 'max') => (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(thumb);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const val = getValueFromPosition(e.clientX);
    if (dragging === 'min') {
      onChange([Math.min(val, maxVal - step), maxVal], 'slider');
    } else {
      onChange([minVal, Math.max(val, minVal + step)], 'slider');
    }
  };

  const handlePointerUp = () => setDragging(null);

  return (
    <div data-slot="range-filter" className={cn('flex flex-col gap-3', className)}>
      {/* Input fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3.5">
          {prefix && <span className="shrink-0 text-sm text-foreground-subtle">{prefix}</span>}
          <input
            type="text"
            inputMode="numeric"
            value={formatBR(minVal)}
            onChange={(e) => {
              const num = parseBR(e.target.value);
              if (isNaN(num)) return;
              // Only floored at 0, never capped at `max`: the slider ceiling exists so
              // dragging has an endpoint, not to cap what someone can type. If the typed
              // minimum overtakes the current maximum, the maximum rises with it instead
              // of silently discarding the keystroke.
              const newMin = Math.max(0, num);
              onChange([newMin, Math.max(newMin, maxVal)], 'text');
            }}
            className="w-full min-w-0 bg-transparent text-base font-medium text-foreground outline-none"
          />
          {suffix && <span className="shrink-0 text-sm text-foreground-subtle">{suffix}</span>}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3.5">
          {prefix && <span className="shrink-0 text-sm text-foreground-subtle">{prefix}</span>}
          <input
            type="text"
            inputMode="numeric"
            value={formatBR(maxVal)}
            onChange={(e) => {
              const num = parseBR(e.target.value);
              if (isNaN(num)) return;
              const newMax = Math.max(0, num);
              onChange([Math.min(minVal, newMax), newMax], 'text');
            }}
            className="w-full min-w-0 bg-transparent text-base font-medium text-foreground outline-none"
          />
          {suffix && <span className="shrink-0 text-sm text-foreground-subtle">{suffix}</span>}
        </div>
      </div>

      {/* Dual range slider */}
      <div
        className="flex h-12 touch-none select-none items-center"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragging(null)}
      >
        {/* Inner track reference — thumbs + active track position relative to this */}
        <div ref={trackRef} className="relative mx-5.5 h-full w-full">
          {/* Background track */}
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-border" />
          {/* Active track */}
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary"
            style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
          />
          {/* Min thumb */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Valor mínimo"
            aria-valuemin={min}
            aria-valuemax={maxVal}
            aria-valuenow={minVal}
            className={cn(
              'absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-[#e5e7eb] shadow-md active:cursor-grabbing',
              dragging === 'min' ? 'z-30' : 'z-9',
            )}
            style={{ left: `${minPercent}%` }}
            onPointerDown={handlePointerDown('min')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                onChange([Math.min(minVal + step, maxVal - step), maxVal], 'slider');
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                onChange([Math.max(minVal - step, min), maxVal], 'slider');
              }
            }}
          >
            <div className="flex gap-1">
              <div className="h-3 w-0.5 rounded-full bg-gray-400" />
              <div className="h-3 w-0.5 rounded-full bg-gray-400" />
            </div>
          </div>
          {/* Max thumb */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Valor máximo"
            aria-valuemin={minVal}
            aria-valuemax={max}
            aria-valuenow={maxVal}
            className={cn(
              'absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-[#e5e7eb] shadow-md active:cursor-grabbing',
              dragging === 'max' ? 'z-30' : 'z-9',
            )}
            style={{ left: `${maxPercent}%` }}
            onPointerDown={handlePointerDown('max')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                onChange([minVal, Math.min(maxVal + step, max)], 'slider');
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                onChange([minVal, Math.max(maxVal - step, minVal + step)], 'slider');
              }
            }}
          >
            <div className="flex gap-1">
              <div className="h-3 w-0.5 rounded-full bg-gray-400" />
              <div className="h-3 w-0.5 rounded-full bg-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
