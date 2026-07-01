import { useRef, useState } from 'react';
import { useScrollLock } from './use-scroll-lock';

const INTENT_THRESHOLD_PX = 8;

type GestureIntent = 'unknown' | 'select' | 'scroll';

export interface UseSwipeToSelectOptions {
  enabled: boolean;
  onToggle: (id: string) => void;
  itemAttribute?: string;
  intentThresholdPx?: number;
}

export interface SwipeToSelectContainerProps {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
  style?: React.CSSProperties;
}

/**
 * Selects items as the pointer is dragged across them. A pointerdown alone
 * never commits to anything: the gesture's intent (horizontal drag-to-select
 * vs. vertical scroll) is only decided once the pointer has moved past
 * `intentThresholdPx` in a clearly dominant direction. Until that decision is
 * made, page scroll is left completely alone; only once the gesture is
 * classified as `select` do we block scroll and start toggling items.
 */
export function useSwipeToSelect({
  enabled,
  onToggle,
  itemAttribute = 'data-swipe-select-id',
  intentThresholdPx = INTENT_THRESHOLD_PX,
}: UseSwipeToSelectOptions): { containerProps: SwipeToSelectContainerProps } {
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const intent = useRef<GestureIntent>('unknown');
  const startPos = useRef({ x: 0, y: 0 });
  const startId = useRef<string | null>(null);
  const lastId = useRef<string | null>(null);
  const pointerId = useRef<number | null>(null);

  useScrollLock(isDragSelecting);

  function findItemId(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const match = el?.closest(`[${itemAttribute}]`);
    return match?.getAttribute(itemAttribute) ?? null;
  }

  function reset() {
    intent.current = 'unknown';
    startId.current = null;
    lastId.current = null;
    pointerId.current = null;
    setIsDragSelecting(false);
  }

  function activateSelect(e: React.PointerEvent<HTMLElement>) {
    intent.current = 'select';
    lastId.current = startId.current;
    pointerId.current = e.pointerId;
    setIsDragSelecting(true);
    onToggle(startId.current!);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture isn't critical — gesture still works without it.
    }
  }

  const containerProps: SwipeToSelectContainerProps = {
    onPointerDown(e) {
      if (!enabled) return;
      const id = findItemId(e.clientX, e.clientY);
      if (!id) return;

      // Just record where the gesture started — intent is still unknown.
      startId.current = id;
      startPos.current = { x: e.clientX, y: e.clientY };
      intent.current = 'unknown';
    },
    onPointerMove(e) {
      if (!enabled || !startId.current) return;

      if (intent.current === 'scroll') return; // let the browser scroll, untouched

      if (intent.current === 'unknown') {
        const dx = Math.abs(e.clientX - startPos.current.x);
        const dy = Math.abs(e.clientY - startPos.current.y);

        if (dx > dy + intentThresholdPx) {
          e.preventDefault();
          activateSelect(e);
        } else if (dy > dx + intentThresholdPx) {
          intent.current = 'scroll';
        }
        return; // still ambiguous, or just decided — nothing more to do this event
      }

      // intent.current === 'select'
      if (e.pointerId !== pointerId.current) return;
      e.preventDefault();
      const id = findItemId(e.clientX, e.clientY);
      if (id && id !== lastId.current) {
        lastId.current = id;
        onToggle(id);
      }
    },
    onPointerUp() {
      // Gesture ended without ever resolving into a drag (select or scroll)
      // — that's a tap, so toggle the item the same way a click would.
      if (intent.current === 'unknown' && startId.current) {
        onToggle(startId.current);
      }
      reset();
    },
    onPointerCancel() {
      reset();
    },
    style: isDragSelecting ? { touchAction: 'none', overscrollBehavior: 'contain' } : undefined,
  };

  return { containerProps };
}
