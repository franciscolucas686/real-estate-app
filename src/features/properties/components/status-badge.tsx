import { cn } from '@/shared/cn';
import { PropertyStatusLabel, getStatusColors } from '@/shared/format';
import type { PropertyStatus } from '@/shared/api/types';

export function StatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  const { bg, text } = getStatusColors(status);
  return (
    <span className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', bg, text, className)}>
      {PropertyStatusLabel[status]}
    </span>
  );
}
