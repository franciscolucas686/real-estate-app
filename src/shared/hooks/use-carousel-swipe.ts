import React, { useState, useRef, useEffect } from 'react';

const SWIPE_THRESHOLD_RATIO = 0.25;
const VELOCITY_THRESHOLD = 0.5;

/**
 * How far a gesture has to travel before the `click` it ends with is treated as the tail of
 * a drag rather than a tap.
 *
 * Fixed pixels, deliberately not derived from `slideWidth` like `SWIPE_THRESHOLD_RATIO`:
 * `slideWidth` comes from `offsetWidth`, which is 0 in jsdom, so a proportional threshold
 * would make the suppression untestable — and it answers a different question anyway
 * ("did the user mean to change slides" vs "did the pointer move at all").
 */
const DRAG_CLICK_THRESHOLD = 5;

export interface CarouselTrackHandlers {
  onTouchStart: React.TouchEventHandler<HTMLDivElement>;
  onTouchMove: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd: React.TouchEventHandler<HTMLDivElement>;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onClickCapture: React.MouseEventHandler<HTMLDivElement>;
}

export interface UseCarouselSwipeOptions {
  totalSlides: number;
  gap?: number;
  initialIndex?: number;
  onSlideChange?: (index: number) => void;
}

export function useCarouselSwipe({
  totalSlides,
  gap = 0,
  initialIndex = 0,
  onSlideChange,
}: UseCarouselSwipeOptions) {
  const [current, setCurrent] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startTime = useRef(0);
  // A mouse drag ends with `mousedown` and `mouseup` on the same element, so the browser
  // fires a `click` on top of it. Anything clickable inside the track therefore fires on
  // every drag — on a property detail that meant dragging the main photo opened an overlay.
  const moved = useRef(false);

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) setSlideWidth(containerRef.current.offsetWidth);
    }
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const translateX = -(current * (slideWidth + gap)) + dragOffset;

  function snapTo(index: number) {
    const clamped = Math.max(0, Math.min(index, totalSlides - 1));
    setCurrent(clamped);
    setDragOffset(0);
    setIsDragging(false);
    onSlideChange?.(clamped);
  }

  function resolve() {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const velocity = Math.abs(dragOffset) / elapsed;
    const threshold = slideWidth * SWIPE_THRESHOLD_RATIO;
    let next = current;
    if (Math.abs(dragOffset) > threshold || velocity > VELOCITY_THRESHOLD * slideWidth) {
      next = dragOffset < 0 ? current + 1 : current - 1;
    }
    snapTo(next);
  }

  const trackHandlers: CarouselTrackHandlers = {
    onTouchStart(e) {
      setIsDragging(true);
      moved.current = false;
      startX.current = e.touches[0].clientX;
      startTime.current = Date.now();
    },
    onTouchMove(e) {
      if (!isDragging) return;
      const delta = e.touches[0].clientX - startX.current;
      if (Math.abs(delta) > DRAG_CLICK_THRESHOLD) moved.current = true;
      setDragOffset(delta);
    },
    onTouchEnd() {
      if (!isDragging) return;
      resolve();
    },
    onPointerDown(e) {
      if (e.pointerType === 'touch') return;
      setIsDragging(true);
      moved.current = false;
      startX.current = e.clientX;
      startTime.current = Date.now();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove(e) {
      if (!isDragging || e.pointerType === 'touch') return;
      const delta = e.clientX - startX.current;
      if (Math.abs(delta) > DRAG_CLICK_THRESHOLD) moved.current = true;
      setDragOffset(delta);
    },
    onPointerUp(e) {
      if (e.pointerType === 'touch' || !isDragging) return;
      resolve();
    },
    // Capture phase on the track, which is an ancestor of whatever the slide renders, so a
    // clickable surface inside never gets the event at all. The flag is reset at the start
    // of every gesture rather than here: a drag that ends without a click (touch) would
    // otherwise leave it raised and swallow the next legitimate tap.
    onClickCapture(e) {
      if (moved.current) e.stopPropagation();
    },
  };

  return { current, isDragging, containerRef, translateX, snapTo, trackHandlers };
}
