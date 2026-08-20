import type { ApiErrorResponse } from '@/shared/api/types';
import { ERROR_CODE_MESSAGES } from '@/shared/api/error-code-map';

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
//
// Resolution order: stable `code` mapped to a friendly message (new backends) →
// passthrough of `message` (old behavior, also covers unmapped codes) → generic
// fallback. `code` is optional on ApiErrorResponse so this stays safe against
// backends that haven't deployed it yet.
export function getErrorMessage(err: unknown): string {
  if (isApiErrorResponse(err)) {
    if (err.code && err.code in ERROR_CODE_MESSAGES) {
      return ERROR_CODE_MESSAGES[err.code];
    }
    return Array.isArray(err.message) ? err.message.join(' ') : err.message;
  }
  if (err instanceof Error) return err.message || FALLBACK_MESSAGE;
  return FALLBACK_MESSAGE;
}
