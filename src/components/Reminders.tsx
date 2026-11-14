import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Switch, usePopover } from "@/components/ui";

export interface Reminders {
  enabled: boolean;
  /** ISO date (yyyy-mm-dd); empty until chosen. */
  dueDate: string;
  everyDays: 2 | 5 | 7;
}

export const DEFAULT_REMINDERS: Reminders = { enabled: false, dueDate: "", everyDays: 7 };
const FREQUENCIES: Reminders["everyDays"][] = [2, 5, 7];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/** Display as in the Workspace column, e.g. 26/1/2026. */
export const formatDue = (s: string) => {
  if (!s) return "";
  const d = parse(s);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
const formatInput = (s: string) => {
  if (!s) return "";
  const d = parse(s);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

/* ---------------- Calendar date picker ---------------- */
export function DatePicker({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = value ? parse(value) : today;
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const days: Date[] = [];
  const lead = first.getDay();
  for (let i = -lead; days.length < 42; i++) days.push(new Date(view.y, view.m, 1 + i));
  const weeks = days.slice(0, days[35].getMonth() === view.m ? 42 : 35);
  const shift = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div ref={ref} className="relative">
      <button id={id} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-line bg-surface px-3 text-sm focus:border-brand">
        <span className={value ? "text-fg" : "text-muted"}>{value ? formatInput(value) : "MM/DD/YYYY"}</span>
        <CalendarDays size={16} className="text-muted" />
      </button>
      {open && (
        <div role="dialog" aria-label="Choose due date" className="absolute bottom-12 left-0 z-50 w-[252px] rounded-lg border border-line bg-surface p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] sm:bottom-auto sm:top-12">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex size-7 items-center justify-center rounded-md border border-line hover:bg-surface-grey"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium text-fg">{MONTHS[view.m]} {view.y}</span>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex size-7 items-center justify-center rounded-md border border-line hover:bg-surface-grey"><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-muted">{DOW.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {weeks.map((d) => {
              const out = d.getMonth() !== view.m;
              const past = d < today;
              const sel = value && iso(d) === value;
              const isToday = iso(d) === iso(today);
              return (
                <button key={iso(d)} type="button" disabled={past} onClick={() => { onChange(iso(d)); setOpen(false); }}
                  aria-label={`${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`} aria-pressed={!!sel}
                  className={`tnum mx-auto flex size-8 items-center justify-center rounded-md text-sm disabled:cursor-not-allowed disabled:text-muted/40 ${
                    sel ? "bg-brand text-on-brand" : isToday ? "bg-brand-soft text-fg" : out ? "text-muted/60 hover:bg-surface-grey" : "text-fg hover:bg-surface-grey"}`}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Auto-reminders block (invitation, request, workspace popover) ---------------- */
export function RemindersFields({ value, onChange, idPrefix }: { value: Reminders; onChange: (r: Reminders) => void; idPrefix: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor={`${idPrefix}-on`} className="text-sm font-medium text-fg">Enable Auto-Reminders</label>
          <p className="text-sm text-muted">Let Flowtax automatically send reminder emails for pending documents</p>
        </div>
        <Switch id={`${idPrefix}-on`} checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
      </div>
      {value.enabled && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${idPrefix}-due`} className="text-sm font-medium text-fg">Due Date</label>
              <DatePicker id={`${idPrefix}-due`} value={value.dueDate} onChange={(dueDate) => onChange({ ...value, dueDate })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span id={`${idPrefix}-freq`} className="text-sm font-medium text-fg">Frequency</span>
              <div role="radiogroup" aria-labelledby={`${idPrefix}-freq`} className="grid h-10 grid-cols-3 rounded-md bg-section p-1">
                {FREQUENCIES.map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={value.everyDays === f} onClick={() => onChange({ ...value, everyDays: f })}
                    className={`rounded text-sm ${value.everyDays === f ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-fg"}`}>
                    {f} days
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-xs leading-5 text-muted italic">
            <p>*Reminders stop automatically once all required documents are uploaded or marked.</p>
            <p>*Emails are sent during business hours.</p>
          </div>
        </>
      )}
    </div>
  );
}

/** One-line summary used in toasts and tooltips. */
export function describeReminders(r: Reminders) {
  if (!r.enabled) return "Auto-reminders off";
  return `Reminders every ${r.everyDays} days${r.dueDate ? ` until ${formatDue(r.dueDate)}` : ""}`;
}
