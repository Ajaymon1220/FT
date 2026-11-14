import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsRight as Collapse, Circle, Copy, Download,
  FileText, MessageCircle, MousePointer2, Plus, ScrollText, Search, Send, Shrink, Sparkles, Square, Stamp, Trash2, Upload, ZoomIn, ZoomOut,
} from "lucide-react";

import { Button } from "@/components/Button";
import { Label, Modal, StatusPill, inputCls } from "@/components/ui";
import { go } from "@/lib/route";
import type { ChecklistItem } from "@/mocks/checklists";
import { hasDocument, useEngagement, type Mark } from "@/store/engagement";
import { useCan } from "@/store/auth";
import w2Old from "@/assets/ws/w2-preview.png";
import w2Optum from "@/assets/ws/w2-2023.png";

const REJECT_REASONS = ["Wrong tax year", "Unreadable or incomplete", "Wrong document for this item", "Duplicate upload", "Other"];
const COLORS = ["#e11d48", "#0065e4", "#f59e0b", "#14b8a6", "#6d5bd0"];
const STAMPS = ["Verified", "Reviewed", "Needs info", "Not applicable"];
type Tool = "select" | Mark["kind"];
const NO_MARKS: Mark[] = [];
const NO_ITEMS: ChecklistItem[] = [];

/** Every requested document in checklist order (uploaded or not) — drives the tree, the stepper and "next". */
function docQueue(items: ChecklistItem[]) {
  const out: ChecklistItem[] = [];
  for (const it of items.filter((i) => !i.parentId)) {
    const kids = items.filter((k) => k.parentId === it.id);
    if (kids.length) out.push(...kids);
    else if (it.kind !== "group") out.push(it);
  }
  return out;
}
const docName = (i: ChecklistItem) => i.fileName ?? (i.kind === "slot" ? `${i.name}_${i.note}` : i.name);

/* ---------------- Document tree ---------------- */
function DocTree({ clientId, items, current }: { clientId: string; items: ChecklistItem[]; current: string }) {
  const [q, setQ] = useState("");
  const groups = items.filter((i) => !i.parentId && items.some((k) => k.parentId === i.id));
  const loose = items.filter((i) => !i.parentId && i.kind !== "group" && !items.some((k) => k.parentId === i.id));
  const total = docQueue(items).length;
  const [open, setOpen] = useState<Set<string>>(() => new Set(["root", ...groups.map((g) => g.id)]));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const match = (i: ChecklistItem) => !q || docName(i).toLowerCase().includes(q.toLowerCase());

  const Leaf = ({ d }: { d: ChecklistItem }) => {
    const sel = d.id === current;
    const uploaded = hasDocument(d);
    return (
      <li>
        <button type="button" onClick={() => go({ name: "review", clientId, itemId: d.id })} title={docName(d)}
          className={`flex w-full items-center gap-1.5 rounded-md border py-1 pr-2 pl-2 text-left text-sm ${sel ? "border-brand bg-brand-soft/50 text-brand" : "border-transparent text-muted hover:text-fg"}`}>
          {d.status === "Validated" && <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-status-prep-fg text-surface"><Check size={10} strokeWidth={3} /></span>}
          <FileText size={14} className={`shrink-0 ${uploaded ? "text-destructive" : "text-line"}`} strokeWidth={uploaded ? 2 : 1.6} />
          <span className={`truncate ${uploaded ? "" : "italic"}`}>{docName(d)}</span>
        </button>
      </li>
    );
  };

  return (
    <aside className="hidden w-[234px] shrink-0 flex-col gap-3 overflow-auto border-r border-line bg-surface p-4 lg:flex">
      <label className="flex h-8 items-center gap-2 rounded-3xl border border-line px-3">
        <Search size={16} className="text-muted" />
        <input id="doc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full min-w-0 text-sm outline-none placeholder:text-muted" />
      </label>
      <div>
        <button type="button" onClick={() => toggle("root")} className="flex w-full items-center gap-1.5 py-1 text-sm text-fg">
          <ChevronDown size={14} className={`text-muted transition-transform ${open.has("root") ? "" : "-rotate-90"}`} />
          <ScrollText size={14} className="text-brand" /> Income Documents <span className="text-muted">{total}</span>
        </button>
        {open.has("root") && (
          <ul className="ml-4 flex flex-col gap-0.5">
            {groups.map((g) => {
              const kids = items.filter((k) => k.parentId === g.id).filter(match);
              if (!kids.length && q) return null;
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => toggle(g.id)} className={`flex w-full items-center gap-1.5 py-1 text-sm ${open.has(g.id) ? "text-fg" : "text-muted"}`}>
                    <ChevronDown size={14} className={`text-muted transition-transform ${open.has(g.id) ? "" : "-rotate-90"}`} />
                    <FileText size={14} className="text-muted" /> <span className="truncate">{g.name}</span> <span className="text-muted">{items.filter((k) => k.parentId === g.id).length}</span>
                  </button>
                  {open.has(g.id) && <ul className="ml-4 flex flex-col gap-0.5">{kids.map((d) => <Leaf key={d.id} d={d} />)}</ul>}
                </li>
              );
            })}
            {loose.filter(match).map((d) => <Leaf key={d.id} d={d} />)}
          </ul>
        )}
      </div>
    </aside>
  );
}

/* ---------------- Comments panel ---------------- */
function CommentsPanel({ clientId, doc, onClose }: { clientId: string; doc: ChecklistItem; onClose: () => void }) {
  const addComment = useEngagement((s) => s.addComment);
  const [text, setText] = useState("");
  const send = () => { if (text.trim()) { addComment(clientId, doc.id, text.trim()); setText(""); } };
  const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-line bg-surface-grey lg:w-[300px]">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <h2 className="text-base text-fg">Comments</h2>
        <button type="button" aria-label="Close comments" onClick={onClose} className="text-muted hover:text-fg"><Collapse size={16} /></button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
        {doc.comments.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-1 text-center">
            <MessageCircle size={20} className="text-muted" />
            <p className="mt-1 text-base text-fg">No comments on this page</p>
            <p className="text-sm text-muted">Add a note or question about this document</p>
          </div>
        ) : (
          doc.comments.map((c) => (
            <div key={c.id} className={`rounded-lg p-2 ${c.fromClient ? "bg-surface" : ""}`}>
              <p className={`flex items-center gap-2 text-sm text-fg ${c.fromClient ? "" : "justify-end"}`}>
                <span className="flex size-6 items-center justify-center rounded-full bg-status-prep-bg text-[10px] text-status-prep-fg">{initials(c.author)}</span>
                {c.author}{c.fromClient && " (Client)"} <span className="text-xs text-muted">{c.at}</span>
              </p>
              <p className="mt-2 text-sm text-fg">{c.text}</p>
            </div>
          ))
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2">
          <textarea id="review-comment" rows={2} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Enter your comment or question" className="flex-1 resize-none text-sm outline-none placeholder:text-muted" />
          <button type="button" onClick={send} aria-label="Send comment" className="mt-6 text-muted hover:text-brand"><Send size={16} /></button>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Page ---------------- */
export function ReviewDoc({ clientId, itemId }: { clientId: string; itemId: string }) {
  const items = useEngagement((s) => s.checklists[clientId] ?? NO_ITEMS);
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const engagement = useEngagement((s) => s.engagements[clientId]);
  const marks = useEngagement((s) => s.marks[itemId] ?? NO_MARKS);
  const { setStatus, updateField, fetchField, showToast, addMark, removeMark, attachDocument, requestDocument } = useEngagement.getState();

  const doc = items.find((i) => i.id === itemId);
  const queue = useMemo(() => docQueue(items), [items]);
  const pos = queue.findIndex((q) => q.id === itemId);
  const [zoom, setZoom] = useState(100);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [stamp, setStamp] = useState(STAMPS[0]);
  const [selectedMark, setSelectedMark] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(false);
  const [panel, setPanel] = useState<"fields" | "comments">("fields");
  const [fieldQuery, setFieldQuery] = useState("");
  const [extraBox, setExtraBox] = useState("");
  const [fetching, setFetching] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  // Approving uploads and correcting extracted values is preparer work; others can look and copy.
  const canReview = useCan("reviewDocuments");
  const canRequest = useCan("editChecklist");
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { setEdited(new Set()); setExtraBox(""); setSelectedMark(null); }, [itemId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedMark && !(e.target as HTMLElement).closest("input, textarea, select")) {
        removeMark(itemId, selectedMark);
        setSelectedMark(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMark, itemId, removeMark]);

  if (!doc) {
    return <div className="p-10 text-sm text-muted">This document no longer exists. <a className="text-brand underline" href={`#client-${clientId}-checklist`}>Back to checklist</a></div>;
  }

  const uploaded = hasDocument(doc);
  const image = doc.preview === "w2-2023" ? w2Optum : doc.preview === "w2" ? w2Old : null;
  const goTo = (i: number) => queue[i] && go({ name: "review", clientId, itemId: queue[i].id });

  const goNext = (verb: string) => {
    const next = [...queue.slice(pos + 1), ...queue.slice(0, pos)].find((q) => q.status === "Needs Review" && q.id !== doc.id);
    if (next) { showToast(`${docName(doc)} ${verb}. Next: ${docName(next)}`); go({ name: "review", clientId, itemId: next.id }); }
    else { showToast(`${docName(doc)} ${verb}. Nothing else is waiting for review.`); go({ name: "client", clientId, section: "checklist" }); }
  };
  const approve = () => { setStatus(clientId, doc.id, "Validated"); goNext("approved"); };
  const reject = () => { setStatus(clientId, doc.id, "Rejected", reason); setRejecting(false); goNext("rejected"); };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); showToast(`${what} copied`); } catch { showToast(text); }
  };
  const doFetch = () => {
    if (!extraBox) return;
    setFetching(true);
    setTimeout(() => {
      const f = fetchField(clientId, doc.id, extraBox);
      setFetching(false); setExtraBox("");
      if (f) showToast(`${f.box} found on page 1: ${f.value}`);
    }, 700);
  };

  const placeMark = (e: MouseEvent<HTMLDivElement>) => {
    if (tool === "select") { setSelectedMark(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    addMark(doc.id, { kind: tool, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, color, label: tool === "stamp" ? stamp : undefined });
  };

  const fields = (doc.fields ?? []).filter((f) => !fieldQuery || `${f.box} ${f.label}`.toLowerCase().includes(fieldQuery.toLowerCase()));
  const toolBtn = (t: Tool, icon: React.ReactNode, label: string) => (
    <button type="button" aria-label={label} title={label} aria-pressed={tool === t} onClick={() => setTool(t)}
      className={`flex size-7 items-center justify-center rounded-md border ${tool === t ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-muted hover:text-fg"}`}>
      {icon}
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Navigation bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" aria-label="Back to checklist" onClick={() => go({ name: "client", clientId, section: "checklist" })} className="rounded-md p-1.5 hover:bg-surface-grey"><ArrowLeft size={16} /></button>
          <span className="shrink-0 text-base leading-[22px] font-medium tracking-[-0.18px] text-fg">{client?.name}</span>
          <span className="max-w-[260px] truncate text-xs text-muted" title={docName(doc)}>{docName(doc)}</span>
          <StatusPill status={doc.status} />
          <span className="ml-1 flex items-center gap-1 text-xs text-muted">
            <button type="button" aria-label="Previous document" disabled={pos <= 0} onClick={() => goTo(pos - 1)} className="rounded border border-line p-0.5 disabled:opacity-40"><ChevronLeft size={14} /></button>
            <span className="tnum">{pos + 1} / {queue.length}</span>
            <button type="button" aria-label="Next document" disabled={pos >= queue.length - 1} onClick={() => goTo(pos + 1)} className="rounded border border-line p-0.5 disabled:opacity-40"><ChevronRight size={14} /></button>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canReview ? <>
            <Button variant="outline" onClick={() => setRejecting(true)} disabled={!uploaded || doc.status === "Rejected"}>Mark as Rejected</Button>
            <Button onClick={approve} disabled={!uploaded}>{doc.status === "Validated" ? "Next" : "Approve & Next"}</Button>
          </> : <span className="rounded-md bg-surface-grey px-2.5 py-1 text-xs text-muted">View only · the preparer approves documents</span>}
        </div>
      </header>

      {/* Tool bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => go({ name: "client", clientId, section: "worksheet" })}>
            <span className="flex items-center gap-1.5"><ScrollText size={14} /> Worksheet</span>
          </Button>
          <span className="h-6 w-px bg-line" />
          <div className="flex items-center gap-1">
            {toolBtn("select", <MousePointer2 size={14} />, "Select")}
            {toolBtn("stamp", <Stamp size={14} />, "Stamp")}
            {toolBtn("check", <Check size={14} />, "Check mark")}
            {toolBtn("rect", <Square size={14} />, "Rectangle")}
            {toolBtn("circle", <Circle size={14} />, "Circle")}
          </div>
          {tool === "stamp" && (
            <select id="stamp-kind" value={stamp} onChange={(e) => setStamp(e.target.value)} className="h-7 rounded-md border border-line px-2 text-sm">
              {STAMPS.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          {(tool === "check" || tool === "rect" || tool === "circle" || tool === "stamp") && (
            <div className="flex items-center gap-1.5 border-l border-line pl-2" role="radiogroup" aria-label="Mark colour">
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Colour ${c}`} onClick={() => setColor(c)}
                  className={`size-3.5 rounded-full ${color === c ? "ring-2 ring-offset-1" : ""}`} style={{ background: c, ["--tw-ring-color" as string]: c }} />
              ))}
            </div>
          )}
          {selectedMark && (
            <button type="button" onClick={() => { removeMark(doc.id, selectedMark); setSelectedMark(null); }} className="flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs text-destructive"><Trash2 size={12} /> Remove mark</button>
          )}
          <button type="button" aria-pressed={watermark} onClick={() => setWatermark((w) => !w)}
            className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-sm ${watermark ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>
            <Sparkles size={14} /> Watermark
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Download document" disabled={!uploaded} onClick={() => showToast(`${docName(doc)} prepared for download`)} className="flex size-7 items-center justify-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-40"><Download size={14} /></button>
          <button type="button" aria-label="Comments" aria-pressed={panel === "comments"} onClick={() => setPanel((p) => (p === "comments" ? "fields" : "comments"))}
            className={`relative flex size-7 items-center justify-center rounded-md border ${panel === "comments" ? "border-brand text-brand" : "border-line text-muted hover:text-fg"}`}>
            <MessageCircle size={14} />
            {doc.comments.length > 0 && <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-brand text-[8px] text-on-brand">{doc.comments.length}</span>}
          </button>
          <button type="button" aria-label="Add a field" disabled={!uploaded || !doc.extraFields?.length} onClick={() => { setPanel("fields"); setTimeout(() => extraRef.current?.focus(), 0); }} className="flex size-7 items-center justify-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-40"><Plus size={14} /></button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <DocTree clientId={clientId} items={items} current={doc.id} />

        {/* Document */}
        <section className="relative flex min-h-[420px] min-w-0 flex-1 flex-col overflow-auto bg-section">
          <div className="sticky top-3 z-10 mx-auto mt-3 flex items-center gap-1 rounded-[32px] border border-line bg-surface px-3 py-1 text-sm text-muted shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
            <button type="button" aria-label="First document" onClick={() => goTo(0)} disabled={pos <= 0} className="p-1.5 disabled:opacity-40"><ChevronsLeft size={16} /></button>
            <button type="button" aria-label="Previous document" onClick={() => goTo(pos - 1)} disabled={pos <= 0} className="p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="tnum px-1">{pos + 1} / {queue.length}</span>
            <button type="button" aria-label="Next document" onClick={() => goTo(pos + 1)} disabled={pos >= queue.length - 1} className="p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
            <button type="button" aria-label="Last document" onClick={() => goTo(queue.length - 1)} disabled={pos >= queue.length - 1} className="p-1.5 disabled:opacity-40"><ChevronsRight size={16} /></button>
            <span className="mx-1 h-5 w-px bg-line" />
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 25))} className="p-1.5"><ZoomOut size={16} /></button>
            <span className="tnum w-11 text-center">{zoom}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 25))} className="p-1.5"><ZoomIn size={16} /></button>
            <button type="button" aria-label="Fit to width" onClick={() => setZoom(100)} className="p-1.5"><Shrink size={16} /></button>
          </div>

          <div className="flex-1 p-4">
            {!uploaded ? (
              <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-xl bg-surface p-8 text-center shadow-sm">
                <FileText size={32} strokeWidth={1.2} className="text-muted" />
                <h2 className="text-base font-medium text-fg">Waiting for {client?.name.split(" ")[0]} to upload this</h2>
                <p className="text-sm text-muted">{doc.kind === "slot" ? `${doc.name} · ${doc.note}` : doc.note}</p>
                {canRequest && <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" disabled={!engagement.invited} title={engagement.invited ? undefined : "Send the invitation first"}
                    onClick={() => requestDocument(clientId, doc.id, doc.note ?? `Please upload ${doc.name}`, engagement.reminders)}>
                    Request from client
                  </Button>
                  <Button onClick={() => fileRef.current?.click()}><span className="flex items-center gap-1.5"><Upload size={14} /> Upload on their behalf</span></Button>
                </div>}
                {!engagement.invited && <p className="text-xs text-muted">The client hasn't been invited yet. You can still add documents you already have.</p>}
                <input ref={fileRef} id="review-upload" type="file" accept=".pdf,.jpeg,.jpg,.png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) attachDocument(clientId, doc.id, f.name); e.target.value = ""; }} />
              </div>
            ) : (
              <div className="mx-auto" style={{ width: `${zoom}%`, maxWidth: zoom > 100 ? "none" : 1132 }}>
                <div className={`relative bg-surface shadow-[0_1.4px_8.4px_2.8px_rgba(113,113,122,0.15),0_2.8px_5.6px_-2.8px_rgba(113,113,122,0.2)] ${tool === "select" ? "" : "cursor-crosshair"}`} onClick={placeMark}>
                  {image ? (
                    <img alt={`${docName(doc)} page 1`} src={image} className="block w-full select-none" draggable={false} />
                  ) : (
                    <div className="flex aspect-[1346/1740] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted">
                      <FileText size={40} strokeWidth={1.1} />
                      <p className="text-fg">{docName(doc)}</p>
                      <p className="max-w-xs text-xs">The page preview isn't included in this prototype. The fields on the right were extracted from page 1.</p>
                    </div>
                  )}
                  {watermark && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                      <span className="-rotate-30 text-5xl font-semibold tracking-widest whitespace-nowrap text-brand/15 uppercase">Reviewed · Flowtax</span>
                    </div>
                  )}
                  {marks.map((m) => (
                    <button key={m.id} type="button" aria-label={`${m.kind} mark`}
                      onClick={(e) => { e.stopPropagation(); if (tool === "select") setSelectedMark(m.id); }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 ${selectedMark === m.id ? "outline-2 outline-offset-2 outline-dashed" : ""}`}
                      style={{ left: `${m.x}%`, top: `${m.y}%`, color: m.color, outlineColor: m.color }}>
                      {m.kind === "check" && <Check size={22} strokeWidth={3} />}
                      {m.kind === "rect" && <span className="block h-7 w-24 rounded-sm border-2" style={{ borderColor: m.color }} />}
                      {m.kind === "circle" && <span className="block size-9 rounded-full border-2" style={{ borderColor: m.color }} />}
                      {m.kind === "stamp" && <span className="block -rotate-6 rounded border-2 px-2 py-0.5 text-xs font-bold tracking-wide uppercase" style={{ borderColor: m.color }}>{m.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {doc.status === "Rejected" && doc.rejectReason && (
              <p className="mx-auto mt-3 max-w-[1132px] rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">Rejected: {doc.rejectReason}. The client has been asked to replace this file.</p>
            )}
          </div>
        </section>

        {/* Fields or comments */}
        {panel === "comments" ? (
          <CommentsPanel clientId={clientId} doc={doc} onClose={() => setPanel("fields")} />
        ) : (
          <aside className="flex w-full shrink-0 flex-col gap-4 overflow-auto border-l border-line bg-surface p-3 lg:w-[338px]">
            <div className="flex items-center gap-2">
              <label className="flex h-8 flex-1 items-center gap-2 rounded-3xl border border-line px-3">
                <Search size={16} className="text-muted" />
                <input id="field-search" value={fieldQuery} onChange={(e) => setFieldQuery(e.target.value)} placeholder="Search" className="w-full min-w-0 text-sm outline-none placeholder:text-muted" />
              </label>
              <Button variant="outline" disabled={!uploaded} onClick={() => copy((doc.fields ?? []).map((f) => `${f.box} ${f.label}: ${f.value}`).join("\n"), "All fields")}>
                <span className="flex items-center gap-1.5"><Copy size={14} /> Copy All</span>
              </Button>
            </div>

            {!uploaded ? (
              <p className="rounded-md bg-section px-3 py-6 text-center text-sm text-muted">Fields appear here once a document is uploaded.</p>
            ) : (
              <>
                {fields.map((f) => (
                  <div key={f.box}>
                    <label htmlFor={`field-${f.box}`} className="mb-2 flex items-center gap-1.5 text-sm text-fg">
                      <span className="rounded bg-brand-soft px-1.5 text-xs text-brand">{f.box}</span> <span className="truncate">{f.label}</span>
                      {edited.has(f.box) && <span className="ml-auto shrink-0 text-xs text-status-pending-fg">Edited</span>}
                    </label>
                    <div className="flex h-10 overflow-hidden rounded-md border border-line focus-within:border-brand">
                      <span className="flex items-center pl-3 text-sm text-fg">$</span>
                      <input id={`field-${f.box}`} value={f.value} readOnly={!canReview}
                        onChange={(e) => { updateField(clientId, doc.id, f.box, e.target.value); setEdited((s) => new Set(s).add(f.box)); }}
                        className="tnum min-w-0 flex-1 bg-transparent px-1.5 text-sm text-fg outline-none" />
                      <button type="button" aria-label={`Copy ${f.box}`} onClick={() => copy(f.value, f.box)} className="flex w-10 items-center justify-center border-l border-line text-muted hover:text-fg"><Copy size={14} /></button>
                    </div>
                  </div>
                ))}
                {fields.length === 0 && <p className="text-sm text-muted">No fields match “{fieldQuery}”.</p>}

                <div className="mt-2 border-t border-line pt-5">
                  <Label htmlFor="extra-box">Add Additional Fields</Label>
                  <div className="flex overflow-hidden rounded-md border border-line">
                    <select ref={extraRef} id="extra-box" value={extraBox} onChange={(e) => setExtraBox(e.target.value)} disabled={!canReview || !doc.extraFields?.length}
                      className="h-10 min-w-0 flex-1 bg-surface px-3 text-sm text-fg outline-none disabled:text-muted">
                      <option value="">{doc.extraFields?.length ? "Select Box" : "No more boxes found"}</option>
                      {doc.extraFields?.map((f) => <option key={f.box} value={f.box}>{f.box} · {f.label}</option>)}
                    </select>
                    <button type="button" onClick={doFetch} disabled={!canReview || !extraBox || fetching} className="flex items-center gap-1.5 border-l border-line px-3 text-sm text-fg hover:bg-surface-grey disabled:text-muted">
                      <Sparkles size={14} /> {fetching ? "Fetching…" : "Fetch"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {rejecting && (
        <Modal title="Mark as rejected?" description="The client sees this reason and is asked to upload a replacement." onClose={() => setRejecting(false)}
          footer={<><Button variant="outline" onClick={() => setRejecting(false)}>Cancel</Button><Button onClick={reject}>Reject document</Button></>}>
          <Label htmlFor="reject-reason">Reason</Label>
          <select id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Modal>
      )}
    </div>
  );
}
