import { useMemo, useState } from "react";
import { AlarmClock, ChevronDown, ChevronLeft, ChevronRight, FileText, Flag, List, SquareKanban, UserRound, Users } from "lucide-react";

import { Button } from "@/components/Button";
import { icons } from "@/components/icons";
import { RemindersFields, describeReminders, formatDue, type Reminders } from "@/components/Reminders";
import { TopBar } from "@/components/TopBar";
import { usePopover } from "@/components/ui";
import { go } from "@/lib/route";
import type { Client } from "@/mocks/clients";
import { useEngagement, waitingItems } from "@/store/engagement";
import statusIcon from "@/assets/v2/status.svg";
import { AssigneePicker } from "@/components/org/AssigneePicker";
import { useMembers, useOrg } from "@/store/org";
import { useUi } from "@/store/ui";
import { useCan, useCurrentUser } from "@/store/auth";
import { Board } from "@/components/workspace/Board";
import { TeamView } from "@/components/workspace/TeamView";
import { RowActions } from "@/components/workspace/RowActions";
import { PriorityFlag, StatusPill } from "@/components/workspace/parts";
import { PRIORITIES, STATUSES } from "@/lib/workflow";

type View = "List" | "Board" | "Team";
const VIEW_KEY = "flowtax-workspace-view";
const readView = (): View => { try { const v = localStorage.getItem(VIEW_KEY); return v === "Board" || v === "Team" ? v : "List"; } catch { return "List"; } };
const saveView = (v: View) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ } };
const viewIcon: Record<View, React.ReactNode> = { List: <List size={14} />, Board: <SquareKanban size={14} />, Team: <Users size={14} /> };

const RETURN_TYPES = ["1040", "1065", "1120", "1120s"];

// Column widths from the Figma "Workspace / Auto-Reminders" table.
const cols = "28px minmax(200px,230fr) minmax(70px,80fr) minmax(104px,120fr) minmax(70px,84fr) minmax(120px,120fr) minmax(130px,120fr) minmax(120px,110fr) minmax(100px,104fr) 56px";

function Checkbox({ checked, onChange, label, className = "" }: { checked: boolean; onChange: () => void; label: string; className?: string }) {
  return <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} className={`size-4 cursor-pointer rounded accent-brand ${className}`} />;
}

/* ---------- Filter chip (Return Type / Status) ---------- */
function FilterChip({ label, icon, options, value, onChange }: { label: string; icon: React.ReactNode; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const active = value.length > 0;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`flex h-7 items-center gap-2 rounded-3xl border px-3 text-sm ${active ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>
        {icon} {label}{active && ` · ${value.length}`}
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-30 w-48 rounded-md border border-line bg-surface py-1 shadow-lg">
          {options.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-grey">
              <input type="checkbox" checked={value.includes(o)} onChange={() => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])} className="size-4 accent-brand" />
              {o}
            </label>
          ))}
          {active && <button type="button" onClick={() => onChange([])} className="w-full border-t border-line px-3 py-2 text-left text-xs text-muted hover:text-fg">Clear</button>}
        </div>
      )}
    </div>
  );
}

/* ---------- Due date cell + auto-reminders popover ---------- */
function DueDateCell({ client }: { client: Client }) {
  const saved = useEngagement((s) => s.engagements[client.id]?.reminders);
  const items = useEngagement((s) => s.checklists[client.id]);
  const setReminders = useEngagement((s) => s.setReminders);
  const canEdit = useCan("editChecklist");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Reminders>(saved);
  const [error, setError] = useState("");
  const ref = usePopover(open, () => setOpen(false));
  if (!saved) return null;

  // Research rule: reminders stop as soon as nothing required is outstanding.
  const nothingPending = !!items && waitingItems(items).length === 0;
  const running = saved.enabled && !nothingPending;
  const tip = saved.enabled && nothingPending ? "Reminders stopped — all required documents are in" : describeReminders(saved);

  const openPopover = () => { setDraft(saved); setError(""); setOpen(true); };
  const save = () => {
    if (draft.enabled && !draft.dueDate) return setError("Pick a due date so reminders know when to stop.");
    setReminders(client.id, draft);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={!canEdit} onClick={() => (open ? setOpen(false) : openPopover())} aria-expanded={open} title={tip} aria-label={`Auto-reminders for ${client.name}: ${tip}`}
        className={`flex h-8 items-center gap-2 rounded-md border px-2 text-sm disabled:cursor-default ${open ? "border-brand" : "border-transparent enabled:hover:border-line"}`}>
        <AlarmClock size={16} className={running ? "fill-brand/15 text-brand" : "text-muted"} strokeWidth={running ? 2.2 : 1.6} />
        {saved.enabled && saved.dueDate && <span className={`tnum truncate ${running ? "text-fg" : "text-muted line-through decoration-muted/50"}`}>{formatDue(saved.dueDate)}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label={`Auto-reminders for ${client.name}`} className="absolute top-10 right-0 z-40 w-[440px] max-w-[90vw] rounded-lg border border-line bg-surface p-3 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <RemindersFields value={draft} onChange={(r) => { setDraft(r); setError(""); }} idPrefix={`ws-${client.id}`} />
          {saved.enabled && nothingPending && <p className="mt-2 rounded bg-status-prep-bg px-2 py-1 text-xs text-status-prep-fg">Nothing required is outstanding, so no reminders are going out.</p>}
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Workspace() {
  const allClients = useEngagement((s) => s.clients);
  const wsId = useOrg((s) => s.currentId);
  const wsName = useOrg((s) => s.workspaces.find((w) => w.id === s.currentId)?.name);
  const clients = useMemo(() => allClients.filter((c) => !c.archived && (c.workspaceId ?? "ws1") === wsId), [allClients, wsId]);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const me = useCurrentUser();
  const canAll = useCan("viewAllClients");
  const canAdd = useCan("addClients");
  const canProgress = useCan("viewTeamProgress");
  const openAddClient = useUi((s) => s.openAddClient);
  const members = useMembers();
  const assignments = useOrg((s) => s.assignments);
  // People who can see the whole firm can still narrow to their own clients; everyone else only sees theirs.
  const [mineToggle, setMine] = useState(() => !canAll);
  const mine = mineToggle || !canAll;
  const [view, setViewState] = useState<View>(readView);
  const views: View[] = canProgress ? ["List", "Board", "Team"] : ["List", "Board"];
  const activeView: View = views.includes(view) ? view : "List";
  const setView = (v: View) => { setViewState(v); saveView(v); };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) =>
      (!q || [c.name, c.returnType, c.filingStatus, c.status].some((v) => v?.toLowerCase().includes(q))) &&
      (!types.length || types.includes(c.returnType)) &&
      (!statuses.length || statuses.includes(c.status)) &&
      (!priorities.length || (c.priority && priorities.includes(c.priority))) &&
      (!assignees.length || members.some((m) => assignees.includes(m.name) && assignments[c.id]?.memberIds.includes(m.id))) &&
      (!mine || (!!me && !!assignments[c.id]?.memberIds.includes(me.id))));
  }, [query, clients, types, statuses, priorities, assignees, mine, me, members, assignments]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * perPage, current * perPage + perPage);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const head = "flex items-center bg-surface-muted px-2 py-3 text-sm leading-5 font-medium text-muted whitespace-nowrap";
  const cell = "flex h-11 items-center px-2 text-sm leading-5 text-fg";

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Workspace" />

      <div role="tablist" aria-label="Workspace view" className="flex items-end gap-1 border-b border-line px-6 pt-2">
        {views.map((v) => (
          <button key={v} role="tab" type="button" aria-selected={activeView === v} onClick={() => setView(v)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm leading-5 ${activeView === v ? "border-brand font-semibold text-brand" : "border-transparent font-medium text-muted hover:text-fg"}`}>
            {viewIcon[v]} {v}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-7 w-[181px] items-center gap-2 rounded-3xl border border-line bg-surface px-3 focus-within:border-brand">
            <img alt="" src={icons.search} className="size-4" />
            <input id="client-search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search"
              className="w-full min-w-0 bg-transparent text-sm leading-5 text-fg outline-none placeholder:text-muted" />
          </label>
          <FilterChip label="Return Type" icon={<FileText size={16} />} options={RETURN_TYPES} value={types} onChange={(v) => { setTypes(v); setPage(0); }} />
          <FilterChip label="Status" icon={<img alt="" src={statusIcon} className="size-4" />} options={STATUSES} value={statuses} onChange={(v) => { setStatuses(v); setPage(0); }} />
          <FilterChip label="Priority" icon={<Flag size={16} />} options={PRIORITIES} value={priorities} onChange={(v) => { setPriorities(v); setPage(0); }} />
          {canAll && <FilterChip label="Assignee" icon={<Users size={16} />} options={members.filter((m) => m.status === "Active").map((m) => m.name)} value={assignees} onChange={(v) => { setAssignees(v); setPage(0); }} />}
          {canAll
            ? <button type="button" aria-pressed={mine} onClick={() => { setMine((m) => !m); setPage(0); }}
                className={`flex h-7 items-center gap-2 rounded-3xl border px-3 text-sm ${mine ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>
                <UserRound size={16} /> Assigned to me
              </button>
            : <span title="You see the customers assigned to you" className="flex h-7 items-center gap-2 rounded-3xl bg-surface-grey px-3 text-sm text-muted"><UserRound size={16} /> Your customers</span>}
        </div>
        <div className="flex items-center gap-1">
          {selected.size > 0 && <span className="mr-2 text-xs text-muted">{selected.size} selected</span>}
          <button type="button" aria-label="Export customers" className="flex rounded-md border border-line bg-surface p-1.5 hover:bg-surface-grey"><img alt="" src={icons.download} className="size-4" /></button>
          {canAdd && <Button icon={icons.add} onClick={openAddClient}>Add customer</Button>}
        </div>
      </div>

      {activeView === "Board" && <Board clients={filtered} />}
      {activeView === "Team" && <TeamView clients={filtered} />}

      {activeView === "List" && <>
      <div className="flex-1 overflow-x-auto">
        <div role="table" aria-label="Customers" className="min-w-[1100px]">
          <div role="row" className="grid border-b border-line" style={{ gridTemplateColumns: cols }}>
            <div role="columnheader" className="flex items-center justify-center bg-surface-muted"><Checkbox label="Select all customers" checked={allSelected} onChange={toggleAll} /></div>
            {["Customer Name", "Tax Year", "Return Type", "Checklist", "Assignee", "Status", "Due Date", "Last Activity"].map((h) => <div key={h} role="columnheader" className={head}>{h}</div>)}
            <div role="columnheader" className={`${head} justify-center border-l border-line`}>Actions</div>
          </div>

          {rows.map((c) => {
            const isSel = selected.has(c.id);
            return (
              <div key={c.id} role="row" style={{ gridTemplateColumns: cols }}
                className={`group grid cursor-pointer border-b border-line transition-colors hover:bg-surface-grey ${isSel ? "bg-brand-soft/40" : "bg-surface"}`}
                onClick={(e) => { if ((e.target as HTMLElement).closest("button, input, a, [role=dialog]")) return; go({ name: "client", clientId: c.id, section: "checklist" }); }}>
                <div role="cell" className="flex items-center justify-center">
                  <Checkbox label={`Select ${c.name}`} checked={isSel} onChange={() => toggle(c.id)} className={isSel ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"} />
                </div>
                <div role="cell" className={`${cell} gap-2 pr-4`}>
                  <a href={`#client-${c.id}-checklist`} className="truncate hover:text-brand">{c.name}</a>
                  <PriorityFlag priority={c.priority} />
                  {c.tag && <span title={c.tag} className="flex h-5 max-w-10 shrink-0 items-center rounded bg-tag px-2 text-[10px] leading-3"><span className="truncate">{c.tag}</span></span>}
                  <button type="button" aria-label={`Tag ${c.name}`} className="ml-auto flex rounded-md border border-line bg-surface p-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><img alt="" src={icons.tag} className="size-3" /></button>
                </div>
                <div role="cell" className={`${cell} tnum`}>{c.taxYear}</div>
                <div role="cell" className={`${cell} gap-2 whitespace-nowrap`}>
                  <span>{c.returnType}</span>
                  {c.filingStatus && <span className="text-muted">• {c.filingStatus}</span>}
                </div>
                <div role="cell" className={`${cell} tnum`}>{c.checklistDone}/{c.checklistTotal}</div>
                <div role="cell" className="flex items-center px-1"><AssigneePicker clientId={c.id} /></div>
                <div role="cell" className={cell}>
                  <StatusPill status={c.status} />
                </div>
                <div role="cell" className="flex items-center px-1"><DueDateCell client={c} /></div>
                <div role="cell" className={`${cell} tnum`}>{c.lastActivity}</div>
                <div role="cell" className={`${cell} justify-center border-l border-line`}>
                  <RowActions client={c} />
                </div>
              </div>
            );
          })}

          {rows.length === 0 && clients.length === 0 && (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-16 text-center">
              <h2 className="text-base font-medium text-fg">No customers in {wsName} yet</h2>
              <p className="text-sm text-muted">{canAdd ? "Add your first customer or import last year's, then assign them to your team." : "Customers will show up here once they're added and assigned to you."}</p>
              {canAdd && <Button icon={icons.add} onClick={openAddClient}>Add customer</Button>}
            </div>
          )}
          {rows.length === 0 && clients.length > 0 && <p className="px-6 py-10 text-center text-sm text-muted">No customers match these filters. Clear the search or filters above.</p>}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3 text-sm text-fg">
        <label className="flex items-center gap-3">
          Rows per page:
          <span className="relative">
            <select id="rows-per-page" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }} className="h-9 appearance-none rounded-md border border-line bg-surface pr-8 pl-3 outline-none">
              {[5, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className="text-muted hover:text-fg disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="tnum">{filtered.length ? current * perPage + 1 : 0} - {Math.min(filtered.length, (current + 1) * perPage)} of {filtered.length}</span>
          <button type="button" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="text-brand hover:text-fg disabled:text-muted disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      </div>
      </>}

      {activeView !== "List" && filtered.length === 0 && clients.length > 0 && (
        <p className="px-6 pb-6 text-center text-sm text-muted">No customers match these filters. Clear the search or filters above.</p>
      )}
    </div>
  );
}
