import { Modal } from '@/ui/modal';
import type { GallerySection } from '@/features/gallery/gallery-section';

// ─── MoveDialog Component ────────────────────────────────────────────────────
// A single Modal: sheet on mobile, centered dialog on desktop, decided by CSS.
interface MoveDialogProps {
  open: boolean;
  sections: GallerySection[];
  onMove: (roomId: string | null) => void;
  onClose: () => void;
}

export function MoveDialog({ open, sections, onMove, onClose }: MoveDialogProps) {
  const content = (
    <div className="flex flex-col gap-2 px-6 pb-4 md:px-0 md:pb-0">
      {sections.map((section) => {
        const key = section.roomId ?? 'unassigned';
        return (
          <button
            key={key}
            type="button"
            onClick={() => onMove(section.roomId)}
            className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors active:bg-border md:hover:bg-border/60"
          >
            <span>{section.name}</span>
            <span className="text-xs text-foreground-subtle">({section.images.length})</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-border text-sm font-semibold text-foreground transition-colors md:hover:bg-border/70"
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Mover para">
      {content}
    </Modal>
  );
}
