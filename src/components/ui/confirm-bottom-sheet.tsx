import { BottomSheet } from './bottom-sheet';

interface ConfirmBottomSheetContentProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmBottomSheetContent({
  message,
  confirmLabel = 'Sim, excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: ConfirmBottomSheetContentProps) {
  return (
    <div className="flex flex-col gap-4 px-6">
      <p className="text-sm text-foreground-subtle">{message}</p>
      <button
        type="button"
        onClick={onConfirm}
        className="h-14 rounded-full bg-danger text-sm font-semibold text-white"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="h-14 rounded-full border border-bs-danger text-sm text-danger"
      >
        {cancelLabel}
      </button>
    </div>
  );
}

interface ConfirmBottomSheetProps extends ConfirmBottomSheetContentProps {
  open: boolean;
}

export function ConfirmBottomSheet({ open, onClose, ...contentProps }: ConfirmBottomSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <ConfirmBottomSheetContent onClose={onClose} {...contentProps} />
    </BottomSheet>
  );
}
