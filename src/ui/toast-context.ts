import { createContext, useContext } from 'react';

export interface ToastApi {
  /** Announced assertively and kept until dismissed — the user has to know it failed. */
  error: (message: string) => void;
  /** Announced politely and auto-dismissed; confirmation should not block. */
  success: (message: string) => void;
}

/**
 * Split from `toast.tsx` for the same reason `filter-context-value.ts` is split from
 * `filter-context.tsx`: a module that exports both a component and a non-component
 * breaks Fast Refresh, so the context and its hook live apart from the provider.
 */
export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>. Monte-o em app/app.tsx.');
  }
  return api;
}
