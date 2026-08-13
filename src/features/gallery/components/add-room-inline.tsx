import type { Ref } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/shared/cn';

// The inline "new room name" form, at the end of the stacked sections list.
interface AddRoomInlineProps {
  name: string;
  error: string;
  onNameChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function AddRoomInline({
  name,
  error,
  onNameChange,
  onConfirm,
  onCancel,
  onFocus,
  onBlur,
  className,
  ref,
}: AddRoomInlineProps) {
  return (
    <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Nome do ambiente"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          className="flex-1 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-action placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={onConfirm}
          aria-label="Confirmar novo ambiente"
          className="flex size-10 items-center justify-center rounded-full bg-action text-white"
        >
          <Check size={24} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar novo ambiente"
          className="flex size-10 items-center justify-center rounded-full bg-border text-foreground"
        >
          <X size={24} />
        </button>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
