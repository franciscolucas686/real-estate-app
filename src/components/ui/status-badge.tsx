import { twMerge } from 'tailwind-merge';
import { PropertyStatusLabel, getStatusColors } from '../../utils/format';
import type { PropertyStatus } from '../../types/api';

export function StatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  const { bg, text } = getStatusColors(status);
  return (
    <span
      className={twMerge('rounded-full px-2 py-0.5 text-[10px] font-semibold', bg, text, className)}
    >
      {PropertyStatusLabel[status]}
    </span>
  );
}
