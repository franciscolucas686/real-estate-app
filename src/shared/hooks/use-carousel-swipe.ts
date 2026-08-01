import React, { useState, useRef, useEffect } from 'react';

const SWIPE_THRESHOLD_RATIO = 0.25;
const VELOCITY_THRESHOLD = 0.5;

export interface CarouselTrackHandlers {
  onTouchStart: React.TouchEventHandler<HTMLDivElement>;
  onTouchMove: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd: React.TouchEventHandler<HTMLDivElement>;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
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
      startX.current = e.touches[0].clientX;
      startTime.current = Date.now();
    },
    onTouchMove(e) {
      if (!isDragging) return;
      setDragOffset(e.touches[0].clientX - startX.current);
    },
    onTouchEnd() {
      if (!isDragging) return;
      resolve();
    },
    onPointerDown(e) {
      if (e.pointerType === 'touch') return;
      setIsDragging(true);
      startX.current = e.clientX;
      startTime.current = Date.now();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove(e) {
      if (!isDragging || e.pointerType === 'touch') return;
      setDragOffset(e.clientX - startX.current);
    },
    onPointerUp(e) {
      if (e.pointerType === 'touch' || !isDragging) return;
      resolve();
    },
  };

  return { current, isDragging, containerRef, translateX, snapTo, trackHandlers };
}
