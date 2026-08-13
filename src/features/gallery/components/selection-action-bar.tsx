import { MoveRight, Trash2 } from 'lucide-react';
import { PageContainer } from '@/layout/page-container';

// ─── SelectionActionBar Component ────────────────────────────────────────────
// Excluir/Mover, at the bottom of the room manager. A plain flex child rather than a `fixed`
// bar: `RoomFullscreen` is already a flex column, and a `fixed` element positions against the
// viewport, so on a desktop it would have spilled across the console sidebar the overlay
// deliberately leaves visible.
export function SelectionActionBar({
  selectedCount,
  onDelete,
  onMove,
}: {
  selectedCount: number;
  onDelete: () => void;
  onMove: () => void;
}) {
  return (
    <PageContainer
      maxWidth="wide"
      className="shrink-0 border-t border-border bg-background/95 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur-md"
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-danger text-danger font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-danger/10 md:h-12 md:hover:bg-danger/10"
        >
          <Trash2 size={24} />
          Excluir ({selectedCount})
        </button>
        <button
          type="button"
          onClick={onMove}
          disabled={selectedCount === 0}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-action text-white font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-action-hover md:hover:bg-action-hover"
        >
          <MoveRight size={24} />
          Mover
        </button>
      </div>
    </PageContainer>
  );
}
