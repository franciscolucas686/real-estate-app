import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/cn';

interface DropdownProps {
  label: string;
  /** Styles the trigger as "has a value selected" (border/text in the action color). */
  active?: boolean;
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
}

/**
 * Small anchored dropdown: a pill trigger that opens a floating panel below
 * it. Not a portal — the panel is small and positioned relative to the
 * trigger, so there's no need for Dialog's viewport-centering/focus-trap
 * machinery here, just close-on-outside-click and close-on-Escape.
 */
export function Dropdown({ label, active, panelClassName, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-sm border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground-subtle/40',
          active && 'border-action text-action hover:border-action',
        )}
      >
        {label}
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-surface-raised p-4 shadow-lg',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
