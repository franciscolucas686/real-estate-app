import { Star } from 'lucide-react';
import { Modal } from '@/ui/modal';

// ─── PhotoActionsSheet Component ─────────────────────────────────────────────
// As ações de uma foto, abertas pelo toque longo sobre ela. `presentation="sheet"` em vez do
// `responsive` que o `MoveDialog` usa: quem chega aqui chegou por um gesto de toque, e no
// desktop a mesma ação já está no overlay de hover da própria foto.
interface PhotoActionsSheetProps {
  open: boolean;
  /** Se a foto em questão já é a principal do imóvel — decide o rótulo e o efeito da ação. */
  isMain: boolean;
  onToggleMain: () => void;
  onClose: () => void;
}

export function PhotoActionsSheet({ open, isMain, onToggleMain, onClose }: PhotoActionsSheetProps) {
  return (
    <Modal open={open} onClose={onClose} title="Foto" hideTitle presentation="sheet">
      <div className="flex flex-col gap-2 px-6 pb-4">
        <button
          type="button"
          onClick={onToggleMain}
          className="flex h-14 items-center gap-3 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors active:bg-border"
        >
          <Star
            size={20}
            fill={isMain ? 'currentColor' : 'none'}
            className="shrink-0 text-action"
            aria-hidden="true"
          />
          {isMain ? 'Remover como foto principal' : 'Definir como foto principal'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-border text-sm font-semibold text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
