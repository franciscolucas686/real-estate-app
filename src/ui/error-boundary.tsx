import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Last-resort boundary around the whole app.
 *
 * Without one, a throw during render unmounts the entire React root and leaves an empty
 * `<div id="root">`. Since `body` is painted with `--color-background`, that reads as an
 * ordinary blank page — indistinguishable from a stuck overlay or a failed load, and
 * completely silent. On a phone there is no console to check either, which is what made
 * the "dashboard em branco no mobile" report impossible to act on.
 *
 * So this deliberately renders the **actual message and stack** rather than a friendly
 * "algo deu errado": the audience for a crash screen is whoever has to fix it, and the
 * only place the failure is reproducible is a device with no developer tools attached.
 * The detail is collapsed so it does not read as hostile, and selectable so it can be
 * pasted into a report.
 *
 * Class component because `getDerivedStateFromError`/`componentDidCatch` have no hooks
 * equivalent — this is the one place a class is still required.
 *
 * Note this catches render, lifecycle and constructor errors only. Rejected promises and
 * event-handler throws never reach it; those surface through `ToastProvider` instead.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept so a device attached to remote debugging still gets the grouped React trace,
    // which is richer than what we render.
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    const { error, componentStack } = this.state;

    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-gutter py-10"
      >
        <div className="flex w-full max-w-2xl flex-col gap-3">
          <h1 className="text-2xl font-bold text-foreground">Algo quebrou nesta tela</h1>
          <p className="text-sm text-muted-foreground">
            O erro abaixo é o que impediu a página de renderizar.
          </p>

          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error.message || String(error)}
          </p>

          <details className="rounded-xl border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Detalhes técnicos
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-2xs leading-relaxed text-muted-foreground">
              {error.stack ?? error.message}
              {componentStack}
            </pre>
          </details>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-colors active:bg-action-hover md:hover:bg-action-hover"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
