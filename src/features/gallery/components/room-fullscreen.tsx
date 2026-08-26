import { useEffect, useId, useRef, type AnimationEvent } from 'react';
import { ChevronLeft, Image as ImageIcon, ImagePlus, X } from 'lucide-react';
import { cn } from '@/shared/cn';
import { PageContainer } from '@/layout/page-container';
import { CONSOLE_SIDEBAR_INSET } from '@/layout/console-shell';
import type { SwipeToSelectContainerProps } from '@/shared/hooks/use-swipe-to-select';
import { ActionTile } from '@/features/gallery/components/action-tile';
import { GalleryImage } from '@/features/gallery/components/gallery-image';
import { SelectionActionBar } from '@/features/gallery/components/selection-action-bar';
import type { GallerySection } from '@/features/gallery/gallery-section';

// ─── RoomFullscreen Component ────────────────────────────────────────────────
interface RoomFullscreenProps {
  section: GallerySection;
  /** `closed` runs the exit animation; the page keeps this mounted until `onExited`. */
  state: 'open' | 'closed';
  onExited: () => void;
  selecting: boolean;
  /** Already intersected with this room by the page — the count on "Excluir (N)" and the
   *  action behind it read the same array. */
  selectedIds: string[];
  /** A Radix modal is open on top. Escape belongs to it then, not to this surface. */
  modalOpen: boolean;
  onTogglePhoto: (imageId: string) => void;
  /** Alterna a foto principal do imóvel — o overlay de hover de cada foto. */
  onToggleMain: (imageId: string) => void;
  /** Abre a folha de ações de uma foto; é o toque longo que chama. */
  onRequestPhotoActions: (imageId: string) => void;
  onClose: () => void;
  onEnterSelect: () => void;
  onExitSelect: () => void;
  onUpload: (roomId: string | null) => void;
  onRequestDeleteSelected: () => void;
  onRequestMoveSelected: () => void;
  swipeProps: SwipeToSelectContainerProps;
}

/**
 * One ambiente, full screen, at every width — the only place photos can be selected, deleted or
 * moved. Both of a section's action tiles lead here and a finished upload opens it on its own,
 * so the flow is identical whichever way you arrived.
 *
 * **It isn't a route.** The unsaved draft lives in `GalleryManagement`'s own state and a real
 * route would unmount it, so this is an overlay and `openRoomFullscreen`/`closeRoomFullscreen`
 * push and consume a `history` entry by hand — that is what makes the hardware/gesture back
 * button close the room instead of the whole gallery.
 *
 * It used to be `md:hidden`, opened only by the mobile branch of a "Ver mais" that read
 * `matchMedia` at click time. That branch is gone, and with it the last viewport check in JS
 * anywhere in `src/`.
 *
 * **It moves like the filters modal**, on purpose: the same `--animate-sheet-*` /
 * `--animate-panel-*` tokens `ui/modal.tsx` uses, driven by the same `data-state` attribute, so
 * a room slides up on a phone and fades in on a desktop exactly as `/imoveis`' filters do.
 * Mounting straight into place read as a hard cut — nothing said a new layer had arrived.
 */
export function RoomFullscreen({
  section,
  state,
  onExited,
  selecting,
  selectedIds,
  modalOpen,
  onTogglePhoto,
  onToggleMain,
  onRequestPhotoActions,
  onClose,
  onEnterSelect,
  onExitSelect,
  onUpload,
  onRequestDeleteSelected,
  onRequestMoveSelected,
  swipeProps,
}: RoomFullscreenProps) {
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // `aria-modal` is a claim about focus, so it has to be true: the surface takes focus on open,
  // the page behind is `inert`, and Escape gets out. The page restores focus to the tile that
  // opened this once it unmounts.
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // A confirmation or the move sheet is on top; Radix will close it, and acting here too
      // would dismiss both with one press. Already on the way out, there is nothing to close.
      if (modalOpen || state === 'closed') return;
      if (selecting) onExitSelect();
      else onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, state, selecting, onClose, onExitSelect]);

  /**
   * With no animation to wait on there is no `animationend` either, and the panel would stay
   * mounted forever. That is the case in jsdom (no animations, and Tailwind isn't even loaded)
   * and anywhere the classes resolve to `animation: none`; unmounting at once is right in both.
   *
   * `prefers-reduced-motion` is *not* one of those cases — `index.css` collapses durations to
   * `0.01ms` rather than `0` precisely so `animationend` still fires for state machines like
   * this one.
   */
  useEffect(() => {
    if (state !== 'closed') return;
    const name = containerRef.current && getComputedStyle(containerRef.current).animationName;
    if (!name || name === 'none') onExited();
  }, [state, onExited]);

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    // The panel's own animation only: the *enter* one lands here too, and animations on
    // descendants bubble.
    if (e.target !== e.currentTarget || state !== 'closed') return;
    onExited();
  }

  return (
    <>
      {/*
        Both the backdrop the filters modal has and a guard the room view was missing: `inert`
        sits on the page root, but `ConsoleShell`'s sidebar is outside it, so until now a click
        on "Configurações" navigated away and took the unsaved draft with it.
      */}
      <div
        aria-hidden="true"
        data-slot="room-scrim"
        data-state={state}
        onClick={onClose}
        className="fixed inset-0 z-(--z-fixed) bg-black/50 data-[state=closed]:pointer-events-none data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in"
      />
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-slot="room-fullscreen"
        data-state={state}
        onAnimationEnd={handleAnimationEnd}
        className={cn(
          // After the scrim in DOM order and at the same layer, so it paints on top of it while
          // the Radix modals opened from in here (60/70) still paint on top of both.
          'fixed inset-0 z-(--z-fixed) flex flex-col bg-background outline-none',
          // The filters modal's own two presentations, verbatim: a sheet on a phone, a fading
          // panel on a desktop. On the way out the surface stops taking clicks — a control
          // pressed during the slide would act on a room that is already gone.
          'data-[state=closed]:pointer-events-none',
          'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
          'md:data-[state=open]:animate-panel-in md:data-[state=closed]:animate-panel-out',
          // Stops short of the console's sidebar instead of covering it. A `fixed` element with a
          // z-index paints over the `sticky`, `z-auto` aside regardless of DOM order, so this is
          // what preserves the persistent navigation the console shell exists for.
          CONSOLE_SIDEBAR_INSET,
        )}
      >
        <PageContainer
          withSafeAreaTop
          maxWidth="wide"
          className="flex shrink-0 items-center gap-3 border-b border-border bg-background py-4"
        >
          <button
            type="button"
            onClick={selecting ? onExitSelect : onClose}
            aria-label={selecting ? 'Cancelar seleção' : 'Voltar'}
            className="flex size-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 md:hover:bg-border/60"
          >
            {selecting ? <X size={24} /> : <ChevronLeft size={24} />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 id={headingId} className="truncate text-lg font-bold text-foreground md:text-2xl">
              {selecting ? 'Selecionar fotos' : section.name}
            </h1>
            <p className="truncate text-xs text-foreground-subtle">
              {selecting
                ? `${selectedIds.length} selecionada${selectedIds.length !== 1 ? 's' : ''}`
                : `${section.images.length} foto${section.images.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {!selecting && section.images.length > 0 && (
            <button
              type="button"
              onClick={onEnterSelect}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors md:hover:border-foreground-subtle/40 md:hover:bg-surface"
            >
              <ImageIcon size={18} aria-hidden="true" />
              Selecionar fotos
            </button>
          )}
        </PageContainer>

        <PageContainer
          maxWidth="wide"
          // `overscroll-contain` stops a wheel past the end of this list from chaining to the
          // document and scrolling the page underneath. A `useScrollLock` here would fight
          // `useSwipeToSelect`'s own — the hook is not ref-counted, so the drag's cleanup would
          // unlock the body while this is still open.
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain pt-4',
            selecting ? 'pb-6' : 'pb-[calc(env(safe-area-inset-bottom,0px)+24px)]',
          )}
          {...swipeProps}
        >
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3 xl:grid-cols-6">
            {section.images.map((img, index) => (
              <GalleryImage
                key={img.id}
                image={img}
                position={index + 1}
                selecting={selecting}
                isSelected={selectedIds.includes(img.id)}
                onToggle={onTogglePhoto}
                onToggleMain={onToggleMain}
                onRequestActions={onRequestPhotoActions}
              />
            ))}
            {/* No room suffix on the name here: there is exactly one ambiente in scope, and it
              must not collide with the page's per-room tiles. */}
            {!selecting && (
              <ActionTile
                icon={<ImagePlus size={24} aria-hidden="true" />}
                label="Adicionar fotos"
                onClick={() => onUpload(section.roomId)}
              />
            )}
          </div>
        </PageContainer>

        {selecting && (
          <SelectionActionBar
            selectedCount={selectedIds.length}
            onDelete={onRequestDeleteSelected}
            onMove={onRequestMoveSelected}
          />
        )}
      </div>
    </>
  );
}
