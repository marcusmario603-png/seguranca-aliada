import { STATUS_CLASS, STATUS_LABEL, type ProcessStatus } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ProcessStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
