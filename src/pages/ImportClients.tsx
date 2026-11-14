import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, FileArchive, Loader2, Mail, SquareKanban, UploadCloud } from "lucide-react";

import { Button } from "@/components/Button";
import { FocusHeader } from "@/components/addClient/FocusHeader";
import { Label, inputCls } from "@/components/ui";
import { go, href } from "@/lib/route";
import { IMPORT_ACCEPT, TAX_SOFTWARE, softwareById, type SoftwareId } from "@/lib/taxSoftware";
import { useCan } from "@/store/auth";
import { useEngagement, type ImportRow } from "@/store/engagement";
import { useMembers, useOrg, userType } from "@/store/org";
import { useUi } from "@/store/ui";

type Step = "upload" | "review" | "done";
const STEP_LABEL: Record<Step, string> = { upload: "Upload", review: "Review", done: "Done" };
const ORDER: Step[] = ["upload", "review", "done"];

/** What a prior-year backup yields. The prototype reads every upload as this sample firm. */
const SAMPLE: (ImportRow & { prior: string })[] = [
  { name: "Marci Fumons", returnType: "1040", filingStatus: "MFJ", email: "marci@example.com", prior: "2 W-2s · 1099-INT · Schedule A" },
  { name: "Daniel Okafor", returnType: "1040", filingStatus: "Single", email: "daniel.okafor@gmail.com", prior: "W-2 · 1099-B · HSA (8889)" },
  { name: "Priya & Arjun Nair", returnType: "1040", filingStatus: "MFJ", email: "priya.nair@outlook.com", prior: "2 W-2s · 1098 mortgage · 2 dependents" },
  { name: "Hannah Lee", returnType: "1040", filingStatus: "HOH", prior: "W-2 · 1098-T · Child care credit" },
  { name: "Tomás Alvarez", returnType: "1040", filingStatus: "MFS", email: "tomas.alvarez@gmail.com", prior: "Schedule C · 1099-NEC" },
  { name: "Northwind Bakery LLC", returnType: "1065", email: "books@northwindbakery.com", prior: "3 partners · K-1s · Form 4562" },
  { name: "Cedar Ridge Dental, PC", returnType: "1120s", email: "office@cedarridgedental.com", prior: "2 shareholders · Payroll · 1125-E" },
  { name: "Blue Harbor Logistics Inc.", returnType: "1120", email: "finance@blueharbor.co", prior: "Fixed assets · 1125-A" },
];

interface Row extends ImportRow { key: string; prior: string; selected: boolean; hadEmail: boolean; duplicateOf?: string }
type Filter = "all" | "new" | "dup" | "email";

// Design-system classes (DESIGN_SYSTEM.md): cards, chips, status pills, page titles.
const card = "rounded-md border border-line bg-surface p-4";
const chip = (on: boolean) => `flex h-7 items-center gap-2 rounded-3xl border px-3 text-sm whitespace-nowrap ${on ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-fg"}`;
const pill = "inline-flex h-[23px] items-center rounded-md px-2 text-xs leading-4 tracking-[-0.12px] whitespace-nowrap";
const title = "text-xl leading-6 font-medium text-fg";

function StepDots({ step }: { step: Step }) {
  const at = ORDER.indexOf(step);
  return (
    <ol className="flex items-center gap-1.5 text-xs text-muted" aria-label={`Step ${at + 1} of 3: ${STEP_LABEL[step]}`}>
      {ORDER.map((s, i) => (
        <li key={s}><span className={`block h-1.5 rounded-full transition-all ${i < at ? "w-4 bg-brand/60" : i === at ? "w-6 bg-brand" : "w-4 bg-line"}`} /></li>
      ))}
      <li className="ml-1 hidden whitespace-nowrap sm:block">{at + 1}/3 · {STEP_LABEL[step]}</li>
    </ol>
  );
}

export function ImportClients() {
  const canAdd = useCan("addClients");
  const wsId = useOrg((s) => s.currentId);
  const firmSoftware = useOrg((s) => s.taxSoftware[s.currentId]);
  const members = useMembers().filter((m) => m.status === "Active");
  const existing = useEngagement((s) => s.clients);
  const importClients = useEngagement((s) => s.importClients);
  const showToast = useEngagement((s) => s.showToast);

  // A backup dropped on the Add client screen skips straight to reading it.
  const [dropped] = useState(() => useUi.getState().pendingImport);
  useEffect(() => { useUi.getState().setPendingImport(null); }, []);

  const [step, setStep] = useState<Step>("upload");
  const [softwareId, setSoftwareId] = useState<SoftwareId | undefined>(firmSoftware);
  const [otherOpen, setOtherOpen] = useState(!firmSoftware);
  const [file, setFile] = useState<string | null>(dropped);
  const [phase, setPhase] = useState(dropped ? 0 : -1); // -1 idle, 0..3 reading steps
  const [fileError, setFileError] = useState("");
  const [drag, setDrag] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [preparerId, setPreparerId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [result, setResult] = useState<{ ids: string[]; skipped: number; noEmail: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const software = softwareById(softwareId);
  const preparers = members.filter((m) => userType(m) === "Preparer");
  const reviewers = members.filter((m) => userType(m) === "Reviewer");
  const reading = phase >= 0;
  const readSteps = [`Opening ${file ?? "backup"}`, `Found ${SAMPLE.length} returns from 2024`, "Matching with customers already in Flowtax", "Reading prior-year forms"];

  // Simulated read: tick through the steps, then build the review list.
  useEffect(() => {
    if (phase < 0) return;
    const t = setTimeout(() => {
      if (phase + 1 < 4) return setPhase(phase + 1);
      const inWs = existing.filter((c) => (c.workspaceId ?? "ws1") === wsId);
      setRows(SAMPLE.map((r, i) => {
        const dup = inWs.find((c) => c.name.trim().toLowerCase() === r.name.toLowerCase());
        return { ...r, key: `r${i}`, selected: !dup, hadEmail: !!r.email, duplicateOf: dup?.id };
      }));
      setPhase(-1);
      setFilter("all");
      setStep("review");
    }, 520);
    return () => clearTimeout(t);
  }, [phase, existing, wsId]);

  const selected = rows.filter((r) => r.selected);
  const counts = useMemo(() => ({
    all: rows.length,
    new: rows.filter((r) => !r.duplicateOf).length,
    dup: rows.filter((r) => r.duplicateOf).length,
    email: rows.filter((r) => !r.email?.trim()).length,
  }), [rows]);
  const visible = rows.filter((r) => filter === "all" || (filter === "new" && !r.duplicateOf) || (filter === "dup" && r.duplicateOf) || (filter === "email" && !r.email?.trim()));
  const allOn = visible.length > 0 && visible.every((r) => r.selected);
  const missingEmail = selected.filter((r) => !r.email?.trim()).length;

  const pickFile = (f: File | undefined) => {
    if (!f || !software) return;
    if (!IMPORT_ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext))) return setFileError(`That file type won't work. Upload a ${IMPORT_ACCEPT.join(", ")} file exported from ${software.name}.`);
    setFileError(""); setFile(f.name); setPhase(0);
  };
  const setRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const runImport = () => {
    const ids = importClients(selected.map(({ name, returnType, filingStatus, email }) => ({ name, returnType, filingStatus, email: email?.trim() || undefined })), software!.name, wsId, [preparerId, reviewerId].filter(Boolean));
    setResult({ ids, skipped: rows.length - selected.length, noEmail: missingEmail });
    setStep("done");
    showToast(`${ids.length} customers imported from ${software!.name}.`);
  };

  if (!canAdd) {
    return (
      <div className="flex min-h-full flex-col bg-surface">
        <FocusHeader current="new" />
        <p className="px-6 py-10 text-center text-sm text-muted">You don't have access to add or import customers. Ask an admin if you need it. <a href="#workspace" className="text-brand underline">Back to Workspace</a></p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <FocusHeader current="import" right={<StepDots step={step} />} />

      {/* ================= 1. Upload ================= */}
      {step === "upload" && (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-col gap-3">
            {software && (
              <span className={`${pill} w-fit gap-1.5 bg-status-prep-bg text-status-prep-fg`}>
                <Check size={12} />{softwareId === firmSoftware ? "Your firm files with" : "Importing from"} {software.name}
              </span>
            )}
            <h1 className={title}>
              {software ? `Bring last year's customers over from ${software.name}` : "Which program are your customers in?"}
            </h1>
            <p className="max-w-2xl text-sm leading-5 text-muted">Upload one backup. We create every customer with a checklist built from their prior-year return. Nothing is sent to customers until you invite them.</p>

            <div className="flex flex-col gap-2">
              <button type="button" aria-expanded={otherOpen} onClick={() => setOtherOpen((o) => !o)} className="flex w-fit items-center gap-1 text-sm font-semibold text-brand hover:underline">
                {software ? "Using a different program?" : "Choose your program"} <ChevronDown size={14} className={`transition-transform ${otherOpen ? "rotate-180" : ""}`} />
              </button>
              {otherOpen && (
                <div role="radiogroup" aria-label="Import from" className="flex flex-wrap gap-2">
                  {TAX_SOFTWARE.map((s) => (
                    <button key={s.id} type="button" role="radio" aria-checked={s.id === softwareId} onClick={() => { setSoftwareId(s.id); setOtherOpen(false); setFileError(""); }}
                      className={chip(s.id === softwareId)}>
                      {s.name}{s.id === firmSoftware && <span className="text-xs text-muted">· firm</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {software && (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              {/* How to export */}
              <section aria-labelledby="export-h" className={`${card} flex flex-col gap-4`}>
                <div className="flex items-center justify-between">
                  <h2 id="export-h" className="text-sm font-medium text-fg">Get the file from {software.name}</h2>
                  <span className="text-xs text-muted">~2 min</span>
                </div>
                <ol className="flex flex-col">
                  {software.exportSteps.map((s, i) => (
                    <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < software.exportSteps.length - 1 && <span className="absolute top-7 left-[13px] h-[calc(100%-28px)] w-px bg-line" aria-hidden />}
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-medium text-brand">{i + 1}</span>
                      <span className="pt-1 text-sm leading-5 text-fg">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-auto rounded-md bg-section px-3 py-2 text-xs text-muted">You'll upload: <span className="font-medium text-fg">{software.exportFile}</span></p>
              </section>

              {/* Drop zone / reading */}
              <section aria-label="Upload backup"
                onDragOver={(e) => { if (reading) return; e.preventDefault(); setDrag(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
                onDrop={(e) => { e.preventDefault(); setDrag(false); if (!reading) pickFile(e.dataTransfer.files[0]); }}
                className={`flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-brand p-6 text-center transition-colors ${drag ? "bg-brand-soft" : "bg-surface"}`}>
                {reading ? (
                  <div className="flex w-full max-w-xs flex-col gap-3 text-left" aria-live="polite">
                    <span className="flex items-center gap-2 text-sm font-medium text-fg"><FileArchive size={16} className="shrink-0 text-brand" /> <span className="truncate">{file}</span></span>
                    <ol className="flex flex-col gap-2">
                      {readSteps.map((label, i) => (
                        <li key={label} className={`flex items-center gap-2 text-sm ${i <= phase ? "text-fg" : "text-muted"}`}>
                          {i < phase ? <Check size={16} className="text-status-prep-fg" /> : i === phase ? <Loader2 size={16} className="animate-spin text-brand" /> : <span className="size-4 rounded-full border border-line" />}
                          {label}
                        </li>
                      ))}
                    </ol>
                    <div className="h-1 overflow-hidden rounded-full bg-grid"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${((phase + 1) / readSteps.length) * 100}%`, backgroundImage: "var(--ai-bar)" }} /></div>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={24} className="text-brand" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-fg">Drop your {software.name} backup here</p>
                      <p className="text-sm text-muted">or <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-brand underline">browse</button> · {IMPORT_ACCEPT.join(", ")}</p>
                    </div>
                    <input ref={fileRef} id="import-file" type="file" accept={IMPORT_ACCEPT.join(",")} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                    {fileError && <p role="alert" className="max-w-sm text-sm text-destructive">{fileError}</p>}
                    <div className="flex w-full max-w-xs items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
                    <Button variant="outline" onClick={() => { setFile(`${software.name.replace(/\s+/g, "")}_2024_backup.zip`); setPhase(0); }}>
                      <span className="flex items-center gap-1.5"><FileArchive size={16} /> Try it with a sample backup</span>
                    </Button>
                    <p className="text-[10px] leading-3 text-muted">Prototype: any file is read as the sample backup.</p>
                  </>
                )}
              </section>
            </div>
          )}

          {software && (
            <ul className="flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="What comes over">
              <li className="font-medium text-fg">What comes over:</li>
              {["Names & contact details", "Return type & filing status", "Prior-year forms (W-2, 1099, K-1)", "A draft checklist per customer"].map((t) => (
                <li key={t} className={`${pill} gap-1 bg-section text-fg`}><Check size={12} className="text-status-prep-fg" />{t}</li>
              ))}
            </ul>
          )}
        </main>
      )}

      {/* ================= 2. Review ================= */}
      {step === "review" && software && (
        <>
          <main className="flex w-full flex-1 flex-col gap-4 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className={title}>We found {rows.length} customers</h1>
                <p className="mt-1 text-sm text-muted">From <span className="text-fg">{file}</span>. Untick anyone you don't want to bring over.</p>
              </div>
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setRows([]); }}>Use a different file</Button>
            </div>

            <div role="tablist" aria-label="Filter customers" className="flex flex-wrap items-center gap-2">
              {([["all", "All"], ["new", "New"], ["dup", "Already in Flowtax"], ["email", "Needs email"]] as [Filter, string][]).map(([f, label]) => (
                <button key={f} role="tab" type="button" aria-selected={filter === f} onClick={() => setFilter(f)} disabled={f !== "all" && counts[f] === 0} className={`${chip(filter === f)} disabled:opacity-40`}>
                  {label} <span className="tnum text-xs">{counts[f]}</span>
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-surface-muted text-left text-muted">
                  <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:font-medium [&>th]:whitespace-nowrap">
                    <th className="w-10"><input type="checkbox" aria-label="Select all shown" checked={allOn} onChange={() => setRows((rs) => rs.map((r) => (visible.includes(r) ? { ...r, selected: !allOn } : r)))} className="size-4 cursor-pointer rounded accent-brand" /></th>
                    <th>Customer name</th><th>Return type</th><th>From {software.name} (2024)</th><th>Email</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.key} className={`h-11 border-t border-line [&>td]:px-3 ${r.selected ? "bg-surface" : "bg-surface-grey text-muted"}`}>
                      <td><input type="checkbox" aria-label={`Import ${r.name}`} checked={r.selected} onChange={() => setRow(r.key, { selected: !r.selected })} className="size-4 cursor-pointer rounded accent-brand" /></td>
                      <td className={r.selected ? "text-fg" : "text-muted"}>{r.name}</td>
                      <td className="whitespace-nowrap">{r.returnType}{r.filingStatus && <span className="text-muted"> • {r.filingStatus}</span>}</td>
                      <td className="text-muted">{r.prior}</td>
                      <td>
                        {r.hadEmail ? <span className="text-muted">{r.email}</span> : (
                          <input id={`import-email-${r.key}`} type="email" aria-label={`Email for ${r.name}`} value={r.email ?? ""} onChange={(e) => setRow(r.key, { email: e.target.value })} placeholder="Add email to invite later"
                            className="h-8 w-56 rounded-md border border-line bg-surface px-3 text-sm text-fg outline-none placeholder:text-muted focus:border-brand" />
                        )}
                      </td>
                      <td>
                        {r.duplicateOf
                          ? <span className={`${pill} gap-1 bg-status-invited-bg text-status-invited-fg`}>Already in Flowtax · <a href={href({ name: "client", clientId: r.duplicateOf, section: "overview" })} className="font-semibold underline">View</a></span>
                          : !r.email?.trim()
                            ? <span className={`${pill} bg-status-pending-bg text-status-pending-fg`}>Needs email</span>
                            : <span className={`${pill} bg-status-prep-bg text-status-prep-fg`}>New</span>}
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted">No customers match this filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </main>

          {/* Sticky footer: assignment + primary action (one primary button per view) */}
          <div className="sticky bottom-0 z-20 flex flex-wrap items-end justify-between gap-4 border-t border-line bg-surface px-6 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex w-52 flex-col gap-1.5">
                <Label htmlFor="import-preparer">Preparer</Label>
                <select id="import-preparer" value={preparerId} onChange={(e) => setPreparerId(e.target.value)} className={inputCls}>
                  <option value="">Assign later</option>
                  {preparers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex w-52 flex-col gap-1.5">
                <Label htmlFor="import-reviewer">Reviewer</Label>
                <select id="import-reviewer" value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className={inputCls}>
                  <option value="">Assign later</option>
                  {reviewers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pb-1.5">
              <span className="text-sm text-muted"><span className="tnum font-medium text-fg">{selected.length}</span> selected{missingEmail > 0 && <> · <span className="text-status-pending-fg">{missingEmail} without email</span></>}</span>
              <Button onClick={runImport} disabled={!selected.length}>Import {selected.length} customer{selected.length === 1 ? "" : "s"}</Button>
            </div>
          </div>
        </>
      )}

      {/* ================= 3. Done ================= */}
      {step === "done" && result && software && (
        <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-status-prep-bg"><CheckCircle2 size={24} className="text-status-prep-fg" /></span>
            <h1 className={title}>{result.ids.length} customers are in Flowtax</h1>
            <p className="max-w-xl text-sm leading-5 text-muted">Imported from {software.name}, each with a draft checklist built from last year's return.{result.skipped > 0 && ` ${result.skipped} skipped.`}</p>
          </div>

          <ol className="grid w-full gap-3 text-left sm:grid-cols-3">
            {[
              { n: 1, title: "Check the checklists", body: "Open each customer and adjust what we drafted.", action: <a href={href({ name: "client", clientId: result.ids[0], section: "checklist" })} className="flex items-center gap-1 text-sm font-semibold text-brand">Open first customer <ArrowRight size={14} /></a> },
              { n: 2, title: "Invite customers", body: result.noEmail ? `Add an email for ${result.noEmail} customer${result.noEmail > 1 ? "s" : ""} first.` : "Send each customer their checklist link.", action: <span className="flex items-center gap-1 text-sm text-muted"><Mail size={14} /> From each checklist</span> },
              { n: 3, title: "Track progress", body: "They start in Draft on the board.", action: <button type="button" onClick={() => { try { localStorage.setItem("flowtax-workspace-view", "Board"); } catch { /* storage unavailable */ } go({ name: "workspace" }); }} className="flex items-center gap-1 text-sm font-semibold text-brand"><SquareKanban size={16} /> Open board</button> },
            ].map((s) => (
              <li key={s.n} className={`${card} flex flex-col gap-2`}>
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-xs font-medium text-brand">{s.n}</span>
                <span className="text-sm font-medium text-fg">{s.title}</span>
                <span className="text-sm text-muted">{s.body}</span>
                <span className="mt-auto pt-1">{s.action}</span>
              </li>
            ))}
          </ol>

          <details className="w-full rounded-md border border-line bg-surface text-left">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-fg">See the {result.ids.length} imported customers</summary>
            <ul className="flex flex-col border-t border-line">
              {result.ids.map((id) => {
                const c = existing.find((x) => x.id === id);
                return c && <li key={id} className="flex items-center justify-between border-b border-line px-4 py-2 text-sm last:border-0"><a href={href({ name: "client", clientId: id, section: "checklist" })} className="text-fg hover:text-brand">{c.name}</a><span className="text-xs text-muted">{c.returnType} · {c.checklistTotal} items</span></li>;
              })}
            </ul>
          </details>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); setFile(null); setResult(null); }}>Import more</Button>
            <Button onClick={() => go({ name: "workspace" })}>Go to workspace</Button>
          </div>
        </main>
      )}
    </div>
  );
}
