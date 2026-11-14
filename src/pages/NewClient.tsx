import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CheckCircle2, ChevronDown, Eye, FileText, Loader2, Trash2, X } from "lucide-react";

import { FocusHeader } from "@/components/addClient/FocusHeader";
import { Button } from "@/components/Button";
import { Modal } from "@/components/ui";
import { go, href } from "@/lib/route";
import { extractFromPriorYear, generateChecklist, type FilingStatus, type ReturnType } from "@/mocks/generateChecklist";
import { useEngagement } from "@/store/engagement";
import { ME, useOrg } from "@/store/org";
import dragDrop from "@/assets/v2/drag-drop.svg";
import checklistWhite from "@/assets/v2/checklist-white.svg";
import form1040 from "@/assets/ws/form-1040.png";

type Form = {
  returnType: ReturnType | "";
  filingStatus: FilingStatus | "";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssn: string;
  entityName: string;
  entityEmail: string;
  ein: string;
  transcript: string;
  lifeEvents: string;
};
type Key = keyof Form;

const empty: Form = { returnType: "", filingStatus: "", firstName: "", lastName: "", email: "", phone: "", ssn: "", entityName: "", entityEmail: "", ein: "", transcript: "", lifeEvents: "" };
const RETURN_TYPES: { value: ReturnType; label: string; entity?: string }[] = [
  { value: "1040", label: "1040 · Individual" },
  { value: "1065", label: "1065 · Partnership", entity: "Partnership" },
  { value: "1120", label: "1120 · C Corporation", entity: "Corporation" },
  { value: "1120s", label: "1120-S · S Corporation", entity: "S Corporation" },
];
const FILING: { value: FilingStatus; label: string }[] = [
  { value: "Single", label: "Single" },
  { value: "MFJ", label: "MFJ · Married filing jointly" },
  { value: "MFS", label: "MFS · Married filing separately" },
  { value: "HOH", label: "HOH · Head of household" },
  { value: "QSS", label: "QSS · Qualifying surviving spouse" },
];
const digits = (s: string) => s.replace(/\D/g, "");
const fieldCls = (err?: string) =>
  `h-9 w-full rounded-md border bg-surface px-3 text-sm text-fg outline-none placeholder:text-muted focus:border-brand disabled:bg-surface-grey disabled:text-muted ${err ? "border-destructive" : "border-line"}`;

function Field({ label, required, error, htmlFor, children }: { label: string; required?: boolean; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={htmlFor} className={`text-sm leading-5 font-medium ${error ? "text-destructive" : "text-fg"}`}>
        {label}
        {required && !error && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Select({ id, value, onChange, disabled, error, children }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${fieldCls(error)} appearance-none pr-9 ${value ? "" : "text-muted"}`}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line pb-6 last:border-b-0">
      <h2 className="text-base leading-6 text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Dropzone({ id, onFile, compact, accept = ".pdf,.jpeg,.jpg,.png" }: { id: string; onFile: (f: File) => void; compact?: boolean; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-brand px-6 py-3 text-center ${drag ? "bg-brand-soft" : "bg-surface"} ${compact ? "w-full sm:w-[184px]" : "w-full py-5"}`}
    >
      <img alt="" src={dragDrop} className="size-6" />
      <p className="text-xs leading-4 text-muted">
        Drag and drop file here or{" "}
        <button type="button" onClick={() => ref.current?.click()} className="font-medium text-brand underline">browse</button>
      </p>
      <p className="text-[10px] leading-3 text-muted">Supported Formats: pdf, jpeg, png</p>
      <input ref={ref} id={id} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

/* ---------- AI build modal: three visible steps, then the workspace opens ---------- */
function BuildingModal({ name, fileName, onDone }: { name: string; fileName?: string; onDone: () => void }) {
  const steps = [fileName ? "Analyzing uploaded documents (1040, W-2)…" : "Reading the details and notes you entered…", "Identifying income sources & deductions…", "Drafting personalized checklist items…"];
  const [step, setStep] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (step >= steps.length) {
      const t = setTimeout(() => done.current(), reduce ? 100 : 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), reduce ? 350 : 1100);
    return () => clearTimeout(t);
  }, [step, steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/20 p-4">
      <div role="dialog" aria-modal="true" aria-label={`Building workspace for ${name}`} className="relative w-full max-w-[460px] overflow-hidden rounded-xl bg-surface px-6 pt-6 pb-7 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundImage: "var(--ai-bar)" }} />
        <h2 className="text-lg font-medium text-fg">Building Workspace for {name}</h2>
        <p className="mt-1 text-sm text-muted">{fileName ? `Reading ${fileName}` : "Using the details and notes you entered"}</p>
        <ol className="mt-5 flex flex-col gap-4" aria-live="polite">
          {steps.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li key={s} className={`flex items-center gap-3 text-sm ${state === "done" ? "text-status-prep-fg" : state === "active" ? "text-fg" : "text-muted/60"}`}>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${state === "done" ? "bg-status-prep-bg" : state === "active" ? "bg-brand-soft" : "bg-section"}`}>
                  {state === "done" ? <Check size={14} /> : state === "active" ? <Loader2 size={14} className="animate-spin text-brand" /> : <span className="size-2 rounded-full bg-line" />}
                </span>
                {s}
              </li>
            );
          })}
        </ol>
        <span aria-hidden className="absolute inset-x-[30%] bottom-0 h-[3px] rounded-full" style={{ backgroundImage: "var(--ai-bar)" }} />
      </div>
    </div>
  );
}

export function NewClient() {
  const clients = useEngagement((s) => s.clients);
  const createClient = useEngagement((s) => s.createClient);
  const [form, setForm] = useState<Form>(empty);
  const [autoFilled, setAutoFilled] = useState<Set<Key>>(new Set());
  const [priorFile, setPriorFile] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | null>(null); // waiting on overwrite decision
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [preview, setPreview] = useState(false);
  const [transcriptMode, setTranscriptMode] = useState<"Text" | "Upload File">("Text");
  const [transcriptFile, setTranscriptFile] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [building, setBuilding] = useState(false);

  const isPerson = form.returnType === "1040";
  const entity = RETURN_TYPES.find((r) => r.value === form.returnType)?.entity;

  const set = (k: Key, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setAutoFilled((a) => { if (!a.has(k)) return a; const n = new Set(a); n.delete(k); return n; });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const manualKeys = (Object.keys(empty) as Key[]).filter((k) => form[k] && !autoFilled.has(k));

  /* ----- prior-year upload ----- */
  const applyExtraction = (fileName: string, overwrite: boolean) => {
    setReading(true);
    setTimeout(() => {
      const x = extractFromPriorYear(fileName);
      const values: Partial<Form> = { returnType: x.returnType, filingStatus: x.filingStatus, firstName: x.firstName, lastName: x.lastName, email: x.email, phone: x.phone, ssn: x.ssn, lifeEvents: x.lifeEvents };
      const filled = new Set<Key>();
      setForm((f) => {
        const next = { ...f };
        for (const [k, v] of Object.entries(values) as [Key, string][]) {
          if (overwrite || !f[k]) { next[k] = v as never; filled.add(k); }
        }
        return next;
      });
      setAutoFilled(filled);
      setPriorFile(fileName);
      setReading(false);
      setErrors({});
    }, 900);
  };
  const onPriorFile = (f: File) => (manualKeys.length ? setPendingFile(f.name) : applyExtraction(f.name, true));

  const removePrior = () => {
    setForm((f) => { const next = { ...f }; autoFilled.forEach((k) => { next[k] = "" as never; }); return next; });
    setAutoFilled(new Set());
    setPriorFile(null);
    setConfirmRemove(false);
  };

  /* ----- validation ----- */
  const required: Key[] = isPerson ? ["returnType", "filingStatus", "firstName", "lastName", "email", "phone"] : form.returnType ? ["returnType", "entityName", "entityEmail"] : ["returnType"];
  const ready = required.every((k) => form[k].trim());
  const nameForDupe = isPerson ? `${form.firstName} ${form.lastName}`.trim() : form.entityName.trim();
  const dupeName = useMemo(() => nameForDupe.length > 2 ? clients.find((c) => c.name.toLowerCase() === nameForDupe.toLowerCase()) : undefined, [clients, nameForDupe]);

  const validate = () => {
    const e: Partial<Record<Key, string>> = {};
    const emailKey: Key = isPerson ? "email" : "entityEmail";
    for (const k of required) if (!form[k].trim()) e[k] = `${k === "firstName" ? "First name" : k === "lastName" ? "Last name" : k === "entityName" ? `${entity} name` : k === "filingStatus" ? "Filing status" : k === "returnType" ? "Return type" : k === "phone" ? "Phone number" : "Email"} is required`;
    const email = form[emailKey].trim().toLowerCase();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e[emailKey] = "Enter a valid email address.";
    else if (email && clients.some((c) => c.email?.toLowerCase() === email)) e[emailKey] = "This email is already used by another client.";
    if (isPerson && form.phone && digits(form.phone).length !== 10) e.phone = "Phone number must have 10 digits.";
    if (isPerson && form.ssn && digits(form.ssn).length !== 9) e.ssn = "SSN must be exactly 9 digits.";
    if (!isPerson && form.ein && digits(form.ein).length !== 9) e.ein = "EIN must be exactly 9 digits.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generate = () => validate() && setBuilding(true);

  const finish = () => {
    const name = isPerson ? `${form.firstName.trim()} ${form.lastName.trim()}` : form.entityName.trim();
    const checklist = generateChecklist({
      returnType: form.returnType as ReturnType,
      filingStatus: isPerson ? (form.filingStatus as FilingStatus) : undefined,
      hasPriorYear: !!priorFile,
      notes: `${form.transcript} ${form.lifeEvents}`,
    });
    const id = createClient(
      {
        name,
        returnType: form.returnType === "1120s" ? "1120s" : form.returnType,
        filingStatus: isPerson ? (form.filingStatus as FilingStatus) : undefined,
        email: (isPerson ? form.email : form.entityEmail).trim(),
        phone: form.phone.trim() || undefined,
        workspaceId: useOrg.getState().currentId,
      },
      checklist,
    );
    useOrg.getState().assign(id, [ME]);
    go({ name: "client", clientId: id, section: "checklist" });
  };

  return (
    <div className="flex min-h-full flex-col">
      <FocusHeader current="new" />

      {/* Page header */}
      <div className="sticky top-12 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl leading-6 font-medium text-fg">New client</h1>
          <p className="mt-1 text-sm text-muted">Enter basic details and generate a checklist when ready.</p>
        </div>
        <Button onClick={generate} disabled={!ready || building || reading} icon={checklistWhite} title={ready ? undefined : "Fill in the required fields first"} className="py-1.5">
          {building ? "Generating…" : "Generate Checklist"}
        </Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="mx-auto flex w-full max-w-[630px] flex-col gap-6 px-4 py-6">
        {/* Prior-year return */}
        {priorFile ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-grey px-4 py-3">
            <CheckCircle2 size={18} className="shrink-0 fill-status-prep-fg text-surface" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg" title={priorFile}>{priorFile}</span>
            <button type="button" onClick={() => setPreview(true)} className="flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted hover:text-fg"><Eye size={14} /> Preview</button>
            <button type="button" aria-label="Remove prior-year return" onClick={() => setConfirmRemove(true)} className="rounded-md border border-line bg-surface p-1.5 text-destructive hover:bg-status-rejected-bg"><Trash2 size={14} /></button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-grey p-3 sm:flex-row sm:items-stretch sm:justify-between">
            <div className="flex flex-col justify-between gap-3 p-1">
              <div>
                <h2 className="text-xl leading-6 font-medium text-fg">Use prior-year return (recommended)</h2>
                <p className="mt-1 text-sm text-muted">Upload last year's return to auto-fill client details and build the intake checklist.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Auto-fill client data", "Build checklist automatically"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded bg-section px-2 py-1 text-sm text-fg"><CheckCircle2 size={16} className="fill-status-prep-fg text-surface" /> {t}</span>
                ))}
              </div>
            </div>
            {reading ? (
              <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-brand bg-surface px-6 py-3 text-xs text-muted sm:w-[184px]" aria-live="polite">
                <Loader2 size={20} className="animate-spin text-brand" /> Reading return…
              </div>
            ) : (
              <Dropzone id="prior-year" compact onFile={onPriorFile} />
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-fg"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>

        <Section title="Tax Information">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field label="Tax Year" required htmlFor="nc-year">
              <Select id="nc-year" value="2025" onChange={() => {}} disabled><option>2025</option></Select>
            </Field>
            <Field label={`Return Type`} required htmlFor="nc-type" error={errors.returnType}>
              <Select id="nc-type" value={form.returnType} onChange={(v) => set("returnType", v)} error={errors.returnType}>
                <option value="">Select return type</option>
                {RETURN_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
          </div>
          {(isPerson || !form.returnType) && (
            <Field label="1040 Filing Status" required={isPerson} htmlFor="nc-filing" error={errors.filingStatus}>
              <Select id="nc-filing" value={form.filingStatus} onChange={(v) => set("filingStatus", v)} disabled={!isPerson && !!form.returnType} error={errors.filingStatus}>
                <option value="">Select filing status</option>
                {FILING.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
            </Field>
          )}
        </Section>

        <Section title="Client Information">
          {isPerson || !form.returnType ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Field label="First Name" required htmlFor="nc-first" error={errors.firstName}>
                  <input id="nc-first" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" autoComplete="off" className={fieldCls(errors.firstName)} />
                </Field>
                <Field label="Last Name" required htmlFor="nc-last" error={errors.lastName}>
                  <input id="nc-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" autoComplete="off" className={fieldCls(errors.lastName)} />
                </Field>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Field label="Email" required htmlFor="nc-email" error={errors.email}>
                  <input id="nc-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter email" autoComplete="off" className={fieldCls(errors.email)} />
                </Field>
                <Field label="Phone Number" required htmlFor="nc-phone" error={errors.phone}>
                  <input id="nc-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(202) 555-0160" className={fieldCls(errors.phone)} />
                </Field>
              </div>
              <Field label="SSN" htmlFor="nc-ssn" error={errors.ssn}>
                <input id="nc-ssn" value={form.ssn} onChange={(e) => set("ssn", e.target.value)} placeholder="12-3456789" inputMode="numeric" className={`${fieldCls(errors.ssn)} tnum`} />
              </Field>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Field label={`${entity} Name`} required htmlFor="nc-entity" error={errors.entityName}>
                  <input id="nc-entity" value={form.entityName} onChange={(e) => set("entityName", e.target.value)} placeholder={`${entity} name`} className={fieldCls(errors.entityName)} />
                </Field>
                <Field label={`${entity} Email`} required htmlFor="nc-entity-email" error={errors.entityEmail}>
                  <input id="nc-entity-email" type="email" value={form.entityEmail} onChange={(e) => set("entityEmail", e.target.value)} placeholder="Enter email" className={fieldCls(errors.entityEmail)} />
                </Field>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Field label="Phone Number" htmlFor="nc-phone" error={errors.phone}>
                  <input id="nc-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(202) 555-0160" className={fieldCls(errors.phone)} />
                </Field>
                <Field label="EIN" htmlFor="nc-ein" error={errors.ein}>
                  <input id="nc-ein" value={form.ein} onChange={(e) => set("ein", e.target.value)} placeholder="12-3456789" inputMode="numeric" className={`${fieldCls(errors.ein)} tnum`} />
                </Field>
              </div>
            </>
          )}
          {autoFilled.size > 0 && <p className="text-xs text-status-prep-fg">{autoFilled.size} fields filled from {priorFile}. Check them before generating.</p>}
          {dupeName && (
            <p className="rounded-md bg-status-invited-bg px-3 py-2 text-sm text-status-invited-fg">
              A client named {dupeName.name} already exists. Make sure this isn't a duplicate.{" "}
              <a href={href({ name: "client", clientId: dupeName.id, section: "checklist" })} className="font-medium underline">Open {dupeName.name}</a>
            </p>
          )}
        </Section>

        <Section title="Additional Information">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg">Client Meeting Transcript</span>
            <div role="tablist" className="flex w-fit rounded-md bg-section p-1">
              {(["Text", "Upload File"] as const).map((t) => (
                <button key={t} role="tab" type="button" aria-selected={transcriptMode === t} onClick={() => setTranscriptMode(t)} className={`w-28 rounded px-3 py-1 text-sm ${transcriptMode === t ? "bg-surface text-brand shadow-sm" : "text-muted"}`}>{t}</button>
              ))}
            </div>
            {transcriptMode === "Text" ? (
              <textarea id="nc-transcript" rows={3} value={form.transcript} onChange={(e) => set("transcript", e.target.value)} placeholder="Paste the transcript of your client meeting" className={`${fieldCls()} h-auto resize-y py-2`} />
            ) : transcriptFile ? (
              <div className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5 text-sm">
                <FileText size={16} className="text-muted" /> <span className="flex-1 truncate">{transcriptFile}</span>
                <button type="button" aria-label="Remove transcript" onClick={() => setTranscriptFile(null)} className="text-muted hover:text-fg"><X size={16} /></button>
              </div>
            ) : (
              <Dropzone id="nc-transcript-file" onFile={(f) => setTranscriptFile(f.name)} accept=".pdf,.jpeg,.jpg,.png,.txt,.docx" />
            )}
          </div>
          <Field label={`Key Life Events, Pain Points, or Notes for this Tax Year`} htmlFor="nc-events">
            <textarea id="nc-events" rows={4} value={form.lifeEvents} onChange={(e) => set("lifeEvents", e.target.value)} placeholder="Example:  Client got married in June, purchased first home in August, started freelance work..." className={`${fieldCls()} h-auto resize-y py-2`} />
          </Field>
          <p className="text-xs text-muted">Mentions like a new home, freelance work, a new baby or stock sales add matching checklist items.</p>
        </Section>
      </form>

      {pendingFile && (
        <Modal title="Overwrite manual entries?" description="You have already entered data. Uploading this file will replace your manual entries with extracted data." onClose={() => setPendingFile(null)} width={400}
          footer={<>
            <Button variant="outline" onClick={() => { applyExtraction(pendingFile, false); setPendingFile(null); }}>Keep</Button>
            <Button onClick={() => { applyExtraction(pendingFile, true); setPendingFile(null); }}>Overwrite</Button>
          </>}>
          <p className="text-xs text-muted">Keep fills only the empty fields and leaves what you typed.</p>
        </Modal>
      )}

      {confirmRemove && priorFile && (
        <Modal title="Remove document and clear fields" description={`Removing [${priorFile}] will delete the file and clear all auto-filled information.`} onClose={() => setConfirmRemove(false)} width={420}
          footer={<>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>Cancel</Button>
            <button type="button" onClick={removePrior} className="rounded-md bg-destructive px-3 py-1 text-sm text-on-brand hover:bg-destructive/90">Remove &amp; Clear Data</button>
          </>}>
          <span className="sr-only">Confirm removal</span>
        </Modal>
      )}

      {preview && priorFile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-fg/30" onMouseDown={(e) => e.target === e.currentTarget && setPreview(false)}>
          <aside role="dialog" aria-label={priorFile} className="flex h-full w-full max-w-[783px] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="truncate text-xl font-medium text-fg">{priorFile}</h2>
              <button type="button" aria-label="Close" onClick={() => setPreview(false)} className="rounded p-1 text-muted hover:bg-surface-grey"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-6"><img alt="Prior-year Form 1040" src={form1040} className="w-full border border-line" /></div>
          </aside>
        </div>
      )}

      {building && <BuildingModal name={isPerson ? `${form.firstName} ${form.lastName}`.trim() : form.entityName} fileName={priorFile ?? undefined} onDone={finish} />}
    </div>
  );
}
