import type { ApiErrorResponse } from '@/shared/api/types';

const API_BASE = '/api';

let isRefreshing = false;
let pendingRefresh: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && pendingRefresh) return pendingRefresh;

  isRefreshing = true;
  pendingRefresh = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      isRefreshing = false;
      pendingRefresh = null;
    });

  return pendingRefresh;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options);
    }
  }

  if (!response.ok) {
    let errorPayload: ApiErrorResponse | null = null;
    try {
      errorPayload = (await response.json()) as ApiErrorResponse;
    } catch {
      errorPayload = {
        statusCode: response.status,
        error: 'RequestError',
        message: 'Falha na requisição',
      };
    }
    throw errorPayload;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
