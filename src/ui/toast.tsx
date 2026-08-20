import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/shared/cn';
import { ToastContext, type ToastApi } from '@/ui/toast-context';

type ToastTone = 'error' | 'success';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const SUCCESS_TIMEOUT = 4000;

/**
 * Minimal toast layer for mutation feedback.
 *
 * It exists because mutations fire from places with nowhere to put an inline message —
 * an icon button inside a property card, a swipe-selection action bar. Before this,
 * those handlers ended in `catch {}` (`dashboard.tsx:137,149,161`): deleting a
 * property and failing produced no feedback at all, which is Nielsen's most basic
 * heuristic — visibility of system status — violated outright.
 *
 * Errors persist until dismissed and are announced assertively; successes fade on
 * their own. Deliberately not a general notification system: no queueing policy, no
 * actions, no positioning options. Those can be added when something needs them.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => {
      // Repeating the same message adds noise without adding information — a failing
      // bulk action would otherwise stack five identical toasts.
      if (prev.some((t) => t.message === message && t.tone === tone)) return prev;
      return [...prev, { id, tone, message }];
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      error: (message: string) => push('error', message),
      success: (message: string) => push('success', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        data-slot="toast-viewport"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-splash) flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] md:pb-6"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const isError = toast.tone === 'error';

  useEffect(() => {
    if (isError) return; // errors stay until acknowledged
    const timer = setTimeout(() => onDismiss(toast.id), SUCCESS_TIMEOUT);
    return () => clearTimeout(timer);
  }, [isError, toast.id, onDismiss]);

  return (
    <div
      // role/aria-live pair chosen per tone: a failure interrupts, a confirmation waits
      // for a pause in speech.
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 shadow-lg',
        'data-[state=open]:animate-panel-in',
        isError ? 'bg-danger text-primary-foreground' : 'bg-foreground text-background',
      )}
      data-state="open"
    >
      {isError ? (
        <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar aviso"
        className="-mr-1 shrink-0 rounded-full p-1 opacity-80 transition-opacity md:hover:opacity-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
