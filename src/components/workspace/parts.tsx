import { CalendarClock, Flag } from "lucide-react";

import { formatDue } from "@/components/Reminders";
import { isOverdue, pct, priorityColor, stageOf } from "@/lib/workflow";
import type { ClientStatus, Priority } from "@/mocks/clients";

export function StatusPill({ status, className = "" }: { status: ClientStatus; className?: string }) {
  return (
    <span className={`inline-flex h-[23px] items-center rounded-md px-2 text-xs leading-4 tracking-[-0.12px] whitespace-nowrap ${stageOf(status).pill} ${className}`}>
      {status}
    </span>
  );
}

export function PriorityFlag({ priority, withLabel = false }: { priority?: Priority; withLabel?: boolean }) {
  if (!priority) return null;
  return (
    <span title={`${priority} priority`} className={`inline-flex items-center gap-1 text-xs leading-4 ${priorityColor[priority]}`}>
      <Flag size={12} className="fill-current" aria-hidden />
      {withLabel ? priority : <span className="sr-only">{priority} priority</span>}
    </span>
  );
}

export function Progress({ done, total, className = "" }: { done: number; total: number; className?: string }) {
  const p = pct(done, total);
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-grid" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`Checklist ${done} of ${total}`}>
        <span className={`block h-full rounded-full ${p === 100 ? "bg-status-prep-fg" : "bg-brand"}`} style={{ width: `${p}%` }} />
      </span>
      <span className="tnum shrink-0 text-xs leading-4 text-muted">{done}/{total}</span>
    </span>
  );
}

export function DueDate({ dueDate, status }: { dueDate?: string; status: ClientStatus }) {
  if (!dueDate) return null;
  const late = isOverdue(dueDate, status);
  return (
    <span title={late ? "Overdue" : "Due date"} className={`inline-flex items-center gap-1 text-xs leading-4 ${late ? "font-medium text-destructive" : "text-muted"}`}>
      <CalendarClock size={12} aria-hidden />
      <span className="tnum">{formatDue(dueDate)}</span>
      {late && <span className="sr-only">(overdue)</span>}
    </span>
  );
}
