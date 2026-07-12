import type { ApiErrorResponse } from '../types/api';

const FALLBACK_MESSAGE = 'Algo deu errado. Tente novamente.';

function isApiErrorResponse(err: unknown): err is ApiErrorResponse {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    (typeof (err as ApiErrorResponse).message === 'string' ||
      Array.isArray((err as ApiErrorResponse).message))
  );
}

// apiFetch() rejects with the parsed ApiErrorResponse body (see api-client.ts),
// whose `message` can be a single string or an array (Nest's ValidationPipe
// returns one message per invalid field). Every form should go through this
// so error display is consistent instead of each page handling it ad hoc.
export function getErrorMessage(err: unknown): string {
  if (isApiErrorResponse(err)) {
    return Array.isArray(err.message) ? err.message.join(' ') : err.message;
  }
  if (err instanceof Error) return err.message || FALLBACK_MESSAGE;
  return FALLBACK_MESSAGE;
}
