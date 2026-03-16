import { InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT:          { label: 'Draft',          className: 'bg-gray-100 text-gray-600' },
  SENT:           { label: 'Sent',           className: 'bg-blue-100 text-blue-600' },
  VIEWED:         { label: 'Viewed',         className: 'bg-purple-100 text-purple-600' },
  PARTIALLY_PAID: { label: 'Partial',        className: 'bg-amber-100 text-amber-600' },
  PAID:           { label: 'Paid',           className: 'bg-green-100 text-green-600' },
  OVERDUE:        { label: 'Overdue',        className: 'bg-red-100 text-red-600' },
  CANCELLED:      { label: 'Cancelled',      className: 'bg-gray-100 text-gray-400' },
};

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}