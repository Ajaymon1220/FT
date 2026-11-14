import { useMemo, useState } from "react";
import { Bell, ChevronDown, CornerDownRight, FileText, Link2, MessageCircle, MoreHorizontal, Plus, Save, Send, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Label, Modal, StatusPill, inputCls, usePopover } from "@/components/ui";
import { RemindersFields } from "@/components/Reminders";
import { go } from "@/lib/route";
import { checklistCategories, type ChecklistItem, type ItemStatus } from "@/mocks/checklists";
import { useMembers, useOrg } from "@/store/org";
import { useCan } from "@/store/auth";
import { hasDocument, outstandingItems, useEngagement, waitingItems, type Reminders } from "@/store/engagement";
import checklistIcon from "@/assets/ws/checklist-item.svg";
import chevronRight from "@/assets/ws/chevron-right.svg";
import searchIcon from "@/assets/v2/search.svg";
import statusIcon from "@/assets/v2/status.svg";
import notebookPen from "@/assets/v2/notebook-pen.svg";
import downloadIcon from "@/assets/v2/download.svg";
import copyIcon from "@/assets/v2/copy.svg";
import userIcon from "@/assets/v2/user.svg";
import eyeIcon from "@/assets/v2/eye.svg";
import shareIcon from "@/assets/v2/share.svg";
import closeIcon from "@/assets/v2/close.svg";

const statusFilters: (ItemStatus | "All")[] = ["All", "Pending", "Needs Review", "Validated", "Rejected"];
const colsFull = "minmax(240px,1.1fr) minmax(220px,1.2fr) 100px 120px 120px 80px";
const colsSplit = "minmax(200px,1fr) minmax(180px,1fr)";

/* ---------------- Comments popover ---------------- */
function Comments({ clientId, item }: { clientId: string; item: ChecklistItem }) {
  const addComment = useEngagement((s) => s.addComment);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = usePopover(open, () => setOpen(false));
  const n = item.comments.length;
  const send = () => {
    if (!text.trim()) return;
    addComment(clientId, item.id, text.trim());
    setText("");
  };
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`${n} comments on ${item.name}`} className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-sm hover:bg-surface-grey ${n > 2 ? "text-brand" : "text-fg"}`}>
        <MessageCircle size={16} strokeWidth={1.6} className={n > 2 ? "text-brand" : "text-muted"} />
        {n > 0 && <span className="tnum">{n}</span>}
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-30 w-[320px] rounded-lg bg-surface p-2 shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
          <div className="flex max-h-60 flex-col gap-2 overflow-auto">
            {n === 0 && <p className="px-2 py-3 text-sm text-muted">No comments yet. Start the thread with your customer.</p>}
            {item.comments.map((c) => (
              <div key={c.id} className="rounded-md px-2 py-1.5">
                <p className="text-xs text-muted"><span className="font-medium text-fg">{c.author}{c.fromClient && " (Customer)"}</span> {c.at}</p>
                <p className="mt-1 text-sm text-fg">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-end gap-2 rounded-md border border-line p-2">
            <textarea id={`comment-${item.id}`} rows={2} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type...." className="flex-1 resize-none text-sm outline-none placeholder:text-muted" />
            <button type="button" onClick={send} aria-label="Send comment" className="text-muted hover:text-brand"><Send size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Row actions menu ---------------- */
function RowMenu({ onRequest, onDelete, canRequest }: { onRequest: () => void; onDelete: () => void; canRequest: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const item = "flex w-full items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-grey";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Row actions" onClick={() => setOpen((o) => !o)} className="flex size-7 items-center justify-center rounded-md hover:bg-surface-grey">
        <MoreHorizontal size={16} className="text-fg" />
      </button>
      {open && (
        <div className="absolute top-8 right-0 z-30 w-48 rounded-md border border-line bg-surface py-1 shadow-lg">
          {canRequest && <button type="button" className={item} onClick={() => { setOpen(false); onRequest(); }}><Bell size={16} /> Request document</button>}
          <button type="button" className={`${item} text-destructive`} onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={16} /> Delete</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Request document modal ---------------- */
function RequestModal({ clientId, items, initialId, onClose }: { clientId: string; items: ChecklistItem[]; initialId?: string; onClose: () => void }) {
  const requestDocument = useEngagement((s) => s.requestDocument);
  const saved = useEngagement((s) => s.engagements[clientId].reminders);
  const requestable = items.filter((i) => i.status === "Pending" || i.status === "Rejected");
  const label = (i: ChecklistItem) => (i.kind === "slot" ? `${i.name} · ${i.note}` : i.name);
  const [itemId, setItemId] = useState(initialId ?? "");
  const [note, setNote] = useState(() => items.find((i) => i.id === initialId)?.note ?? "");
  const [rem, setRem] = useState<Reminders>(saved);
  const [error, setError] = useState("");

  const submit = () => {
    if (!itemId) return setError("Choose the document you want to request.");
    if (!note.trim()) return setError("Add a note so the customer knows exactly what to upload.");
    requestDocument(clientId, itemId, note.trim(), rem);
    onClose();
  };

  return (
    <Modal title="Request Document" onClose={onClose} width={540} footer={<Button onClick={submit}><span className="flex items-center gap-2">Request Documents <Send size={14} /></span></Button>}>
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="req-doc" required>Select document which you want to request</Label>
          <select id="req-doc" value={itemId} onChange={(e) => { setItemId(e.target.value); setNote(items.find((i) => i.id === e.target.value)?.note ?? ""); setError(""); }} className={inputCls}>
            <option value="">Select Document</option>
            {requestable.map((i) => <option key={i.id} value={i.id}>{label(i)} — {i.status}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="req-note" required>Notes</Label>
          <textarea id="req-note" rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError(""); }} placeholder="eg. add a note for the request" className={`${inputCls} h-auto py-2`} />
        </div>
        <RemindersFields value={rem} onChange={setRem} idPrefix="req" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

/* ---------------- Send invitation modal — "This is what your client will see" ---------------- */
function InviteModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const saved = useEngagement((s) => s.engagements[clientId].reminders);
  const sendInvitation = useEngagement((s) => s.sendInvitation);
  const firstName = client?.name.split(" ")[0] ?? "";
  const [email, setEmail] = useState(client?.email ?? `${firstName.toLowerCase()}@example.com`);
  const [subject, setSubject] = useState(`Ready to begin: Your [${client?.taxYear ?? 2025}] Tax Checklist`);
  const [rem, setRem] = useState<Reminders>(saved);
  const [error, setError] = useState("");

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address for the customer.");
    if (rem.enabled && !rem.dueDate) return setError("Choose a due date so reminders know when to stop.");
    sendInvitation(clientId, email, rem);
    onClose();
  };
  const row = "grid grid-cols-[96px_1fr] items-center border-b border-line text-sm";

  return (
    <Modal title="This is what your customer will see" onClose={onClose} width={692}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send</Button></>}>
      <div className="flex flex-col gap-5">
        <div className="overflow-hidden rounded-md border border-line">
          <div className={row}>
            <label htmlFor="inv-to" className="bg-surface-muted px-3 py-2.5 text-muted">To</label>
            <input id="inv-to" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} className="h-10 px-3 text-fg outline-none" />
          </div>
          <div className={row}>
            <label htmlFor="inv-subject" className="bg-surface-muted px-3 py-2.5 text-muted">Subject</label>
            <input id="inv-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 px-3 text-fg outline-none" />
          </div>
          <div className="flex flex-col gap-3 bg-surface-muted px-4 py-4 text-sm leading-5 text-fg">
            <p>Hi {firstName},</p>
            <p>We are ready to start your [{(client?.taxYear ?? 2025) - 1}/{client?.taxYear ?? 2025}] tax return.</p>
            <p>We have set up a tailored, secure workspace for you to upload documents and answer a short questionnaire. This helps us confirm the details we have on file and catch any updates for this year. To get started, click the link below. You will be asked to verify your email with a one-time code.</p>
            <span className="w-fit rounded-md bg-brand px-3 py-1.5 text-on-brand">Open Secure Dashboard</span>
            <p>You can pause and resume at any time; your progress saves automatically.</p>
            <p>Best,<br />Ajay Mon · Flowtax</p>
          </div>
        </div>
        <RemindersFields value={rem} onChange={(r) => { setRem(r); setError(""); }} idPrefix="inv" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

/* ---------------- Questionnaire preview panel ---------------- */
type QTab = "Basic Details" | "Income" | "Deductions" | "Others";
const defaultQ: Record<QTab, Record<string, boolean>> = {
  "Basic Details": { "Personal Info": true, "Marital Status & Spouse": false, "Driver's License Details": true, Dependents: true },
  Income: { "W-2 Employment": true, "Interest Income": true, "Dividends & Brokerage": true, "Self-Employment": false, "Rental Income": false, "Retirement Distributions": false },
  Deductions: { "Mortgage Interest": false, "Charitable Donations": true, "Childcare Expenses": true, "Education Expenses": false, "HSA Contributions": false },
  Others: { "Estimated Tax Payments": false, "Foreign Accounts": false, "Energy Credits": false },
};

function MiniSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-4 w-[26px] shrink-0 rounded-full transition-colors ${checked ? "bg-brand" : "bg-muted"}`}>
      <span className={`absolute top-0.5 size-3 rounded-full bg-surface transition-[left] ${checked ? "left-[12px]" : "left-0.5"}`} />
    </button>
  );
}

function Questionnaire({ clientName, value, onSave, onClose }: { clientName: string; value: typeof defaultQ; onSave: (v: typeof defaultQ) => void; onClose: () => void }) {
  const [tab, setTab] = useState<QTab>("Basic Details");
  const [draft, setDraft] = useState(value);
  const [info, setInfo] = useState({ "Legal Name": clientName, "SSN / ITIN": "123-45-6789", "Date of Birth": "12/04/2002", Occupation: "Product Designer" });
  const toggle = (k: string) => setDraft((d) => ({ ...d, [tab]: { ...d[tab], [k]: !d[tab][k] } }));

  return (
    <aside aria-label="Questionnaire Preview" className="flex w-full shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-line bg-surface pb-4 shadow-[0_1px_6px_2px_rgba(113,113,122,0.15),0_2px_4px_-2px_rgba(113,113,122,0.2)] lg:w-[510px]">
      <div className="flex min-h-0 flex-col gap-2 pt-4">
        <div className="flex items-start justify-between px-4">
          <h2 className="text-sm text-fg">Questionnaire Preview</h2>
          <button type="button" onClick={onClose} aria-label="Close questionnaire"><img alt="" src={closeIcon} className="size-4" /></button>
        </div>
        <div role="tablist" className="flex overflow-x-auto border-b border-line">
          {(Object.keys(defaultQ) as QTab[]).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`min-w-14 shrink-0 px-4 pt-2 pb-3.5 text-sm font-medium tracking-[-0.16px] ${tab === t ? "-mb-px border-b-2 border-brand text-brand" : "text-muted hover:text-fg"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex max-h-[380px] flex-col gap-3 overflow-auto px-4 py-3">
          {Object.entries(draft[tab]).map(([k, on]) => (
            <div key={k} className="flex flex-col gap-3">
              <div className="flex h-[38px] items-center gap-2 rounded-xl bg-accent-90 px-4">
                <span className="flex-1 text-sm text-fg">{k}</span>
                <MiniSwitch checked={on} onChange={() => toggle(k)} label={k} />
              </div>
              {tab === "Basic Details" && k === "Personal Info" && on && (
                (Object.keys(info) as (keyof typeof info)[]).map((f) => (
                  <label key={f} className="ml-4 flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-2">
                    <span className="text-sm whitespace-nowrap text-muted">{f}</span>
                    <input id={`q-${f}`} value={info[f]} onChange={(e) => setInfo({ ...info, [f]: e.target.value })} className="min-w-0 flex-1 bg-transparent text-right text-sm text-fg outline-none" />
                  </label>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 pt-2">
        <Button variant="outline" onClick={() => { setDraft(defaultQ); setInfo({ "Legal Name": clientName, "SSN / ITIN": "123-45-6789", "Date of Birth": "12/04/2002", Occupation: "Product Designer" }); }}>Reset</Button>
        <Button onClick={() => onSave(draft)}>Save</Button>
      </div>
    </aside>
  );
}

const countSections = (q: typeof defaultQ) => Object.values(q).reduce((n, g) => n + Object.values(g).filter(Boolean).length, 0);

/* ---------------- Page ---------------- */
export function Checklist({ clientId }: { clientId: string }) {
  const items = useEngagement((s) => s.checklists[clientId] ?? []);
  const engagement = useEngagement((s) => s.engagements[clientId]);
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const { addItem, deleteItems, dismissBanner, startPrep, showToast } = useEngagement.getState();
  // Reviewers (by default) see the checklist read-only; preparers and admins manage it.
  const canEdit = useCan("editChecklist");
  const canAssign = useCan("assignWork");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = usePopover(filterOpen, () => setFilterOpen(false));
  const [assignOpen, setAssignOpen] = useState(false);
  const members = useMembers();
  const wsName = useOrg((s) => s.workspaces.find((w) => w.id === s.currentId)?.name);
  const assignment = useOrg((s) => s.assignments[clientId]);
  const assign = useOrg((s) => s.assign);
  const assignedIds = assignment?.memberIds ?? [];
  const assignRef = usePopover(assignOpen, () => setAssignOpen(false));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.filter((i) => i.kind === "group").map((i) => i.id)));
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState(checklistCategories[0]);
  const [newNote, setNewNote] = useState("");
  const [request, setRequest] = useState<{ itemId?: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [confirmPrep, setConfirmPrep] = useState(false);
  const [preview, setPreview] = useState<ChecklistItem | null>(null);
  const [qOpen, setQOpen] = useState(false);
  const [questionnaire, setQuestionnaire] = useState(defaultQ);

  const waiting = waitingItems(items);
  const outstanding = outstandingItems(items);
  const invited = engagement.invited;
  const inIntake = engagement.stage === "Intake";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (i: ChecklistItem) =>
      (!q || [i.name, i.note, i.fileName].some((v) => v?.toLowerCase().includes(q))) && (statusFilter === "All" || i.status === statusFilter);
    return items.filter((i) => {
      if (i.parentId) return expanded.has(i.parentId) && (match(i) || match(items.find((p) => p.id === i.parentId)!));
      return match(i) || items.some((k) => k.parentId === i.id && match(k));
    });
  }, [items, query, statusFilter, expanded]);

  const toggleExpand = (id: string) => setExpanded((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /** Validation always opens Review Doc: the row's own document, or a group's first document needing review. */
  const reviewTarget = (it: ChecklistItem) => {
    const kids = items.filter((k) => k.parentId === it.id);
    if (!kids.length) return it.kind === "group" ? undefined : it.id;
    const withDoc = kids.filter(hasDocument);
    return (withDoc.find((k) => k.status === "Needs Review") ?? withDoc[0] ?? kids[0]).id;
  };

  const doStartPrep = () => {
    startPrep(clientId);
    setConfirmPrep(false);
    go({ name: "client", clientId, section: "worksheet" });
  };

  const copyLink = async () => {
    const url = `${window.location.href.split("#")[0]}#client-${clientId}-checklist`;
    try { await navigator.clipboard.writeText(url); showToast("Customer checklist link copied"); } catch { showToast(url); }
  };

  const prepLabel = client?.status === "Approved" || client?.status === "Pushed" ? client.status : !invited ? "Not invited" : inIntake ? (waiting.length ? "Pending Docs" : "Ready for prep") : engagement.stage === "Preparation" ? "Prep Started" : "Ready for Review";
  const head = "flex items-center bg-surface-muted p-3 text-sm leading-5 font-medium tracking-[-0.16px] text-muted whitespace-nowrap";
  const iconBtn = "flex items-center justify-center border-r border-line bg-surface p-1.5 hover:bg-surface-grey";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {invited && inIntake && waiting.length > 0 && !engagement.bannerDismissed && (
        <div className="flex items-center justify-between gap-3 bg-banner px-6 py-2.5 text-sm text-fg">
          <span className="flex items-center gap-2.5"><Bell size={16} /><span><span className="font-medium">Prep status:</span> Waiting on {waiting.length} required item{waiting.length > 1 ? "s" : ""}</span></span>
          <button type="button" aria-label="Dismiss" onClick={() => dismissBanner(clientId)} className="rounded p-1 hover:bg-fg/5"><X size={16} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-2">
          <label className="flex h-7 w-[181px] items-center gap-2 rounded-[48px] border border-line px-3 focus-within:border-brand">
            <img alt="" src={searchIcon} className="size-4" />
            <input id="checklist-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted" />
          </label>
          <div ref={filterRef} className="relative">
            <button type="button" onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}
              className={`flex h-7 items-center gap-2 rounded-[48px] border px-3 text-sm ${statusFilter !== "All" ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>
              <img alt="" src={statusIcon} className="size-4" /> {statusFilter === "All" ? "Status" : statusFilter}
            </button>
            {filterOpen && (
              <div className="absolute top-9 left-0 z-30 w-44 rounded-md border border-line bg-surface py-1 shadow-lg">
                {statusFilters.map((f) => (
                  <button key={f} type="button" onClick={() => { setStatusFilter(f); setFilterOpen(false); }} className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-grey ${f === statusFilter ? "text-brand" : "text-fg"}`}>{f}</button>
                ))}
              </div>
            )}
          </div>
          {invited && <span className="hidden items-center gap-2 text-sm text-muted xl:flex">Prep status: <span className={`rounded-md px-1.5 py-0.5 text-xs ${waiting.length && inIntake ? "bg-status-pending-bg text-status-pending-fg" : "bg-status-prep-bg text-status-prep-fg"}`}>{prepLabel}</span></span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border border-line">
            {canEdit && <button type="button" title="Add checklist item" aria-label="Add checklist item" onClick={() => setAdding(true)} className={iconBtn}><img alt="" src={notebookPen} className="size-4" /></button>}
            <button type="button" title="Download checklist" aria-label="Download checklist" onClick={() => showToast("Checklist PDF prepared for download")} className={iconBtn}><img alt="" src={downloadIcon} className="size-4" /></button>
            <button type="button" title="Copy sharable link" aria-label="Copy sharable link" onClick={copyLink} className={iconBtn}><img alt="" src={copyIcon} className="size-4" /></button>
            {canAssign && <div ref={assignRef} className="relative">
              <button type="button" title="Assign staff" aria-label="Assign staff" onClick={() => setAssignOpen((o) => !o)} className={iconBtn}><img alt="" src={userIcon} className="size-4" /></button>
              {assignOpen && (
                <div className="absolute top-9 right-0 z-30 w-56 rounded-md border border-line bg-surface py-1 shadow-lg">
                  <p className="px-3 py-1.5 text-xs text-muted">Assign people in {wsName}</p>
                  {members.map((m) => {
                    const on = assignedIds.includes(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => { assign(clientId, on ? assignedIds.filter((x) => x !== m.id) : [...assignedIds, m.id], assignment?.teamId); showToast(on ? `${m.name} unassigned` : `${m.name} assigned as ${m.title.toLowerCase()}`); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-grey">
                        <span className="flex items-center gap-2">{on ? <span className="text-brand">✓</span> : <span className="w-[9px]" />}{m.name}</span> <span className="text-xs text-muted">{m.title}</span>
                      </button>
                    );
                  })}
                  <a href="#people" className="block border-t border-line px-3 pt-2 pb-1 text-xs text-brand hover:underline">Invite someone new</a>
                </div>
              )}
            </div>}
            <button type="button" onClick={() => setQOpen((o) => !o)} aria-pressed={qOpen} className={`flex min-w-16 items-center justify-center gap-0 bg-surface px-2 py-1 text-sm ${qOpen ? "text-brand" : "text-muted"}`}>
              <img alt="" src={eyeIcon} className="size-4" />
              <span className="px-1">Questionnaire</span>
            </button>
          </div>

          {!canEdit && (!invited || inIntake) ? (
            <span className="rounded-md bg-surface-grey px-2.5 py-1 text-xs text-muted" title="Ask an admin for checklist access">View only · the preparer manages intake</span>
          ) : !invited ? (
            <Button icon={shareIcon} onClick={() => setInviting(true)}>Send Invitation</Button>
          ) : inIntake ? (
            <>
              <Button variant="outline" onClick={() => setRequest({})}>Send Request</Button>
              <Button onClick={() => (outstanding.length ? setConfirmPrep(true) : doStartPrep())}>Mark Intake Complete</Button>
            </>
          ) : (
            <Button onClick={() => go({ name: "client", clientId, section: "worksheet" })}>Open Worksheet</Button>
          )}
        </div>
      </div>

      {!invited && (
        <p className="mx-6 mb-3 flex items-center gap-2 rounded-md bg-brand-soft px-3 py-2 text-sm text-fg">
          <Sparkles size={14} className="shrink-0 text-ai-border" />
          {items.filter((i) => i.aiSuggested).length} items were suggested from {client?.name.split(" ")[0]}'s 2024 return. Edit the list, then send the invitation.
        </p>
      )}

      {/* Table + questionnaire */}
      <div className={`flex min-h-0 flex-1 gap-4 ${qOpen ? "flex-col px-0 lg:flex-row lg:pr-4" : ""}`}>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div role="table" aria-label="Checklist" className={qOpen ? "min-w-[400px]" : "min-w-[820px]"}>
            <div role="row" className="grid border-b border-line" style={{ gridTemplateColumns: qOpen ? colsSplit : colsFull }}>
              {(qOpen ? ["Name", "Notes"] : ["Name", "Notes", "Comments", "Status", "Validation", "Actions"]).map((h) => (
                <div key={h} role="columnheader" className={`${head} ${h === "Actions" ? "justify-center border-l border-line" : ""}`}>{h}</div>
              ))}
            </div>

            {visible.map((it) => {
              const kids = items.filter((k) => k.parentId === it.id);
              const target = reviewTarget(it);
              const canReview = !!target;
              return (
                <div key={it.id} role="row" className="group grid border-b border-line bg-surface hover:bg-surface-grey" style={{ gridTemplateColumns: qOpen ? colsSplit : colsFull }}>
                  <div className={`flex h-11 min-w-0 items-center gap-2 py-3 pr-2 ${it.parentId ? "pl-10" : "pl-3"}`}>
                    {it.parentId ? (
                      <CornerDownRight size={16} className="shrink-0 text-muted" />
                    ) : kids.length ? (
                      <button type="button" onClick={() => toggleExpand(it.id)} aria-label={expanded.has(it.id) ? "Collapse" : "Expand"} aria-expanded={expanded.has(it.id)} className="shrink-0">
                        {expanded.has(it.id) ? <ChevronDown size={16} className="text-muted" /> : <img alt="" src={chevronRight} className="size-4" />}
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    {!it.parentId && (it.kind === "group" ? <img alt="" src={checklistIcon} className="size-4 shrink-0" /> : <FileText size={16} className="shrink-0 text-muted" strokeWidth={1.6} />)}
                    <span className="truncate text-sm text-fg" title={it.name}>{it.name}</span>
                    {it.aiSuggested && <span title="Suggested from last year's return" className="-mt-2 shrink-0"><Sparkles size={14} className="text-ai-border" fill="currentColor" fillOpacity={0.15} /></span>}
                    {kids.length > 0 && <span className="flex shrink-0 items-center gap-1 rounded bg-brand-soft px-1.5 text-xs text-brand"><Link2 size={12} /> {kids.length}</span>}
                    {it.isNew && <span className="shrink-0 rounded bg-brand-soft px-1 text-[10px] text-brand">New</span>}
                  </div>
                  <div className="flex min-w-0 items-center px-2 text-sm text-fg">
                    <span className="truncate" title={it.note}>
                      {it.parentId || it.kind !== "group" ? it.note : ""}
                    </span>
                    {it.fileName && it.kind === "slot" && <span className="ml-2 shrink-0 truncate rounded bg-section px-1.5 text-xs text-muted" title={it.fileName}>{it.fileName}</span>}
                  </div>
                  {!qOpen && (
                    <>
                      <div className="flex items-center px-2"><Comments clientId={clientId} item={it} /></div>
                      <div className="flex items-center px-3" title={it.rejectReason}><StatusPill status={it.status} /></div>
                      <div className="flex items-center px-2">
                        <button type="button" disabled={!canReview} onClick={() => target && go({ name: "review", clientId, itemId: target })}
                          title={canReview ? undefined : invited ? "Nothing uploaded yet" : "Available once the customer uploads"}
                          className="rounded-md border border-line px-3 py-1 text-xs text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50">
                          {it.status === "Validated" ? "View Data" : "Review Data"}
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1 border-l border-line">
                        <button type="button" aria-label={`Preview ${it.name}`} onClick={() => (target ? go({ name: "review", clientId, itemId: target }) : setPreview(it))} className="flex size-7 items-center justify-center rounded-md hover:bg-surface">
                          <img alt="" src={eyeIcon} className="size-4" />
                        </button>
                        {canEdit && <RowMenu canRequest={invited && (it.status === "Pending" || it.status === "Rejected")} onRequest={() => setRequest({ itemId: it.id })} onDelete={() => deleteItems(clientId, [it.id])} />}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {visible.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted">No checklist items match. Clear the search or status filter.</p>}

            {!canEdit ? null : adding ? (
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-2">
                <select id="new-item-cat" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-9 rounded-3xl border border-line bg-brand-soft/40 px-3 text-sm text-brand outline-none">
                  {checklistCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input id="new-item-note" autoFocus value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note for the customer, e.g. You mentioned selling stock." className={`${inputCls} h-9 min-w-[200px] flex-1`} />
                <Button onClick={() => { addItem(clientId, newCat, newNote.trim()); setAdding(false); setNewNote(""); showToast(`${newCat} added to the checklist`); }}>
                  <span className="flex items-center gap-1.5"><Save size={14} /> Save</span>
                </Button>
                <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 px-10 py-3 text-sm text-brand hover:underline"><Plus size={16} /> Add Item</button>
            )}
          </div>
        </div>

        {qOpen && (
          <div className="px-4 pb-4 lg:px-0">
            <Questionnaire
              clientName={client?.name ?? ""}
              value={questionnaire}
              onClose={() => setQOpen(false)}
              onSave={(v) => { setQuestionnaire(v); showToast(`Questionnaire saved · ${countSections(v)} sections will be asked`); }}
            />
          </div>
        )}
      </div>

      {inviting && <InviteModal clientId={clientId} onClose={() => setInviting(false)} />}
      {request && <RequestModal clientId={clientId} items={items} initialId={request.itemId} onClose={() => setRequest(null)} />}

      {confirmPrep && (
        <Modal title="Start prep for this return?" description="You're starting prep even though some required items are still pending." onClose={() => setConfirmPrep(false)}
          footer={<><Button variant="outline" onClick={() => setConfirmPrep(false)}>Cancel</Button><Button onClick={doStartPrep}>Start prep</Button></>}>
          <h3 className="text-base font-medium text-fg">Outstanding items</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {outstanding.map((o) => <li key={o.id} className="flex items-center gap-2 text-sm text-muted"><span>•</span> {o.name} <StatusPill status={o.status} /></li>)}
          </ul>
          <p className="mt-4 text-sm text-muted italic">*You can continue requesting documents and reviewing uploads after prep has started.</p>
        </Modal>
      )}

      {preview && (
        <Modal title={preview.parentId ? `${preview.name} · ${preview.note}` : preview.name} description={invited ? "Nothing has been uploaded for this item yet." : "The customer sees this item after you send the invitation."} onClose={() => setPreview(null)}
          footer={invited ? <Button onClick={() => { setPreview(null); setRequest({ itemId: preview.id }); }}>Request document</Button> : <Button onClick={() => { setPreview(null); setInviting(true); }}>Send Invitation</Button>}>
          <p className="text-sm text-muted">{preview.aiSuggested ? "Suggested because it appeared on last year's return." : "Added by your firm."}</p>
        </Modal>
      )}
    </div>
  );
}
