import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import type { ItemStatus } from "@/mocks/checklists";
import { useEngagement } from "@/store/engagement";

/* ---------- Status pill (checklist statuses) ---------- */
const itemStatus: Record<ItemStatus, string> = {
  Pending: "bg-status-invited-bg text-status-invited-fg",
  "Needs Review": "bg-status-review-bg text-status-review-fg",
  Validated: "bg-status-prep-bg text-status-prep-fg",
  Rejected: "bg-status-rejected-bg text-status-rejected-fg",
};

export function StatusPill({ status }: { status: ItemStatus }) {
  return (
    <span className={`inline-flex h-[23px] items-center rounded-md px-1 text-xs leading-4 tracking-[-0.12px] whitespace-nowrap ${itemStatus[status]}`}>
      {status}
    </span>
  );
}

/* ---------- Modal (Figma dialogs: 6px radius, 16px padding, footer divider) ---------- */
export function Modal({
  title, description, onClose, children, footer, width = 520,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/20 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="w-full rounded-md bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.12)]" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-4 px-4 pt-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl leading-6 font-medium text-fg">{title}</h2>
            {description && <p className="text-sm leading-5 text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-surface-grey">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
export function Toast() {
  const toast = useEngagement((s) => s.toast);
  const clear = useEngagement((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 3600);
    return () => clearTimeout(t);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-6 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg bg-sidebar-accent px-4 py-2.5 text-sm text-on-brand shadow-lg">
      {toast}
    </div>
  );
}

/* ---------- Click-outside popover ---------- */
export function usePopover(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

/* ---------- Form bits ---------- */
export const inputCls =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg outline-none placeholder:text-muted focus:border-brand";

export function Label({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm leading-5 font-medium text-fg">
      {children}
      {required && <span className="text-destructive">*</span>}
    </label>
  );
}

export function Switch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-brand" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-surface transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}
