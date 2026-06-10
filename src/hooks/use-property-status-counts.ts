import { useEffect, useState } from 'react';
import type { PropertyStatus } from '../types/api';

type StatusCounts = Record<PropertyStatus, number>;

const DEFAULT: StatusCounts = { DRAFT: 0, PENDING: 0, ACTIVE: 0, INACTIVE: 0 };

export function usePropertyStatusCounts(enabled: boolean) {
  const [counts, setCounts] = useState<StatusCounts>(DEFAULT);

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource('/api/properties/status-counts/stream', {
      withCredentials: true,
    });

    es.onmessage = (e: MessageEvent) => {
      try {
        setCounts(JSON.parse(e.data as string) as StatusCounts);
      } catch {
        /* ignore parse errors */
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [enabled]);

  return counts;
}
