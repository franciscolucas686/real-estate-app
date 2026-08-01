import { useRef, type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/shared/cn';

/**
 * How the surface is presented.
 *
 * - `responsive` (default) — a bottom sheet below `md`, a centered dialog from
 *   `md` up. This is a **CSS** switch, not a component swap: one element, two sets
 *   of positioning classes. It replaces the `isDesktop ? <Dialog> : <BottomSheet>`
 *   branches that used to fork the tree in JS, which meant re-mounting the surface
 *   (and losing its state) whenever the viewport crossed 768px.
 * - `sheet` / `dialog` — pin one presentation regardless of width, for the rare
 *   case where the interaction really is tied to one form factor.
 */
export type ModalPresentation = 'responsive' | 'sheet' | 'dialog';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Accessible name for the surface. Always rendered into the DOM — visually when
   * `hideTitle` is false, and inside a visually-hidden element otherwise, because
   * a dialog without an accessible name is unusable with a screen reader.
   */
  title?: string;
  /** Renders `title` for assistive tech only. Use when the content carries its own heading. */
  hideTitle?: boolean;
  presentation?: ModalPresentation;
  /** Width override for the dialog presentation (default `max-w-md md:max-w-lg`). */
  panelClassName?: string;
  /** Sheets are dismissed by tapping the backdrop; the ✕ is mostly a dialog affordance. */
  showCloseButton?: boolean;
  children: ReactNode;
}

const PRESENTATION_CLASSES: Record<ModalPresentation, string> = {
  // Sheet geometry is the mobile default; everything from `md:` up is overridden
  // back to a centered panel. Written sheet-first to match the app's mobile-first
  // baseline and to keep the `md:` overrides in one readable block.
  responsive: [
    'fixed inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl',
    'pb-[calc(env(safe-area-inset-bottom,0px)+16px)]',
    'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
    'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md',
    'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:p-6 md:pb-6 md:shadow-xl',
    'md:data-[state=open]:animate-panel-in md:data-[state=closed]:animate-panel-out',
    'lg:max-w-lg',
  ].join(' '),
  sheet: [
    'fixed inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl',
    'pb-[calc(env(safe-area-inset-bottom,0px)+16px)]',
    'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
  ].join(' '),
  dialog: [
    'fixed left-1/2 top-1/2 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2',
    '-translate-y-1/2 flex-col rounded-2xl p-6 shadow-xl md:max-w-lg',
    'data-[state=open]:animate-panel-in data-[state=closed]:animate-panel-out',
  ].join(' '),
};

/**
 * The app's single modal surface, built on `@radix-ui/react-dialog`.
 *
 * Radix supplies what the two hand-rolled predecessors did not have between them:
 * `BottomSheet` had no focus trap, no Escape handler and no `role="dialog"` (it
 * assumed a tap on the backdrop was enough), while `Dialog` re-implemented a focus
 * trap by querying a hardcoded list of focusable selectors — which misses anything
 * with `contenteditable`, disabled-then-enabled controls, or shadow DOM. Both are
 * now handled by the primitive, along with portalling, scroll lock, inert-ing the
 * background and returning focus to the trigger.
 */
export function Modal({
  open,
  onClose,
  title,
  hideTitle = false,
  presentation = 'responsive',
  panelClassName,
  showCloseButton = presentation !== 'sheet',
  children,
}: ModalProps) {
  /**
   * Radix restores focus on close by pointing at its own `Dialog.Trigger`. This
   * modal is opened from ordinary buttons driving `open` in state — there is no
   * `Trigger` in the tree — so Radix's `triggerRef` is null and focus would land on
   * `<body>`, stranding keyboard users at the top of the document. Verified: with a
   * plain button focus is not restored, with `Dialog.Trigger` it is.
   *
   * `onOpenAutoFocus` fires while `document.activeElement` is still the element
   * that opened the modal, so that is where the reference is captured.
   */
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-black/50 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />

        <RadixDialog.Content
          className={cn(
            'z-(--z-modal) overflow-y-auto bg-background focus:outline-none',
            PRESENTATION_CLASSES[presentation],
            panelClassName,
          )}
          // Radix warns when a dialog has no description. These surfaces are short
          // and self-describing (a list of actions, a legend), so opting out is
          // honest — a redundant description would just add noise to a screen reader.
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            triggerRef.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            const trigger = triggerRef.current;
            // `isConnected` matters: the opener is often inside a list row that the
            // action itself removed (deleting a property closes the modal *and*
            // unmounts the card). Focusing a detached node silently drops focus to
            // <body>, so in that case Radix's own fallback is the better outcome.
            if (!trigger?.isConnected) return;
            event.preventDefault();
            trigger.focus({ preventScroll: true });
          }}
        >
          {/* Grab handle: an affordance only meaningful for the sheet presentation. */}
          {presentation !== 'dialog' && (
            <div
              aria-hidden="true"
              className={cn(
                'mx-auto mt-3 mb-2 h-1 w-10 shrink-0 rounded-full bg-border',
                presentation === 'responsive' && 'md:hidden',
              )}
            />
          )}

          <div
            className={cn(
              'flex shrink-0 items-start justify-between gap-4',
              !hideTitle && title && 'px-6 pb-4 md:px-0',
              presentation === 'dialog' && 'px-0',
            )}
          >
            {hideTitle || !title ? (
              <RadixDialog.Title asChild>
                <span className="sr-only">{title ?? 'Janela de diálogo'}</span>
              </RadixDialog.Title>
            ) : (
              <RadixDialog.Title className="text-base font-semibold text-foreground">
                {title}
              </RadixDialog.Title>
            )}

            {showCloseButton && (
              <RadixDialog.Close
                aria-label="Fechar"
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors md:hover:bg-border/60 md:hover:text-foreground',
                  (hideTitle || !title) && 'absolute right-4 top-4 md:right-6 md:top-6',
                )}
              >
                <X size={18} />
              </RadixDialog.Close>
            )}
          </div>

          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
