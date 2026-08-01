import { Modal } from '@/ui/modal';

interface ConfirmContentProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * The body of a destructive confirmation, without a surface of its own.
 *
 * Exported separately because `PropertyAdminCard` swaps this in as the content of
 * an already-open "Mais opções" modal rather than stacking a second one — nested
 * modals fight over focus and leave the user unsure which Escape does what.
 */
export function ConfirmModalContent({
  message,
  confirmLabel = 'Sim, excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: ConfirmContentProps) {
  return (
    <div className="flex flex-col gap-4 px-6 md:px-0">
      <p className="text-sm text-foreground-subtle">{message}</p>
      <button
        type="button"
        onClick={onConfirm}
        className="h-14 rounded-full bg-danger text-sm font-semibold text-primary-foreground transition-colors active:bg-danger-hover md:hover:bg-danger-hover"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="h-14 rounded-full border border-danger text-sm text-danger transition-colors md:hover:bg-danger/10"
      >
        {cancelLabel}
      </button>
    </div>
  );
}

interface ConfirmModalProps extends ConfirmContentProps {
  open: boolean;
  /**
   * Names the surface for assistive tech. The visible copy is the `message`
   * itself, so the title stays hidden — a visible heading on top of a one-line
   * question is redundant.
   */
  title?: string;
}

export function ConfirmModal({
  open,
  onClose,
  title = 'Confirmar ação',
  ...contentProps
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} hideTitle>
      <ConfirmModalContent onClose={onClose} {...contentProps} />
    </Modal>
  );
}
