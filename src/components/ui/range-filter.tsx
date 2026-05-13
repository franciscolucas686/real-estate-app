import { useRef, useState, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';

interface RangeFilterProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
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
  const minPercent = ((minVal - min) / range) * 100;
  const maxPercent = ((maxVal - min) / range) * 100;

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
      onChange([Math.min(val, maxVal - step), maxVal]);
    } else {
      onChange([minVal, Math.max(val, minVal + step)]);
    }
  };

  const handlePointerUp = () => setDragging(null);

  return (
    <div data-slot="range-filter" className={twMerge('flex flex-col gap-3', className)}>
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
              if (!isNaN(num)) onChange([Math.max(min, Math.min(num, maxVal)), maxVal]);
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
              if (!isNaN(num)) onChange([minVal, Math.min(max, Math.max(num, minVal))]);
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
            className={twMerge(
              'absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-[#e5e7eb] shadow-md active:cursor-grabbing',
              dragging === 'min' ? 'z-30' : 'z-10',
            )}
            style={{ left: `${minPercent}%` }}
            onPointerDown={handlePointerDown('min')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                onChange([Math.min(minVal + step, maxVal - step), maxVal]);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                onChange([Math.max(minVal - step, min), maxVal]);
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
            className={twMerge(
              'absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-[#e5e7eb] shadow-md active:cursor-grabbing',
              dragging === 'max' ? 'z-30' : 'z-20',
            )}
            style={{ left: `${maxPercent}%` }}
            onPointerDown={handlePointerDown('max')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                onChange([minVal, Math.min(maxVal + step, max)]);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                onChange([minVal, Math.max(maxVal - step, minVal + step)]);
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
