import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock, Download, Sparkles, UploadCloud, UserPlus } from "lucide-react";

import { FocusHeader } from "@/components/addClient/FocusHeader";
import { go } from "@/lib/route";
import { IMPORT_ACCEPT, TAX_SOFTWARE, softwareById, type SoftwareId } from "@/lib/taxSoftware";
import { useEngagement } from "@/store/engagement";
import { useOrg } from "@/store/org";
import { useCan } from "@/store/auth";
import { inputCls } from "@/components/ui";
import { useUi } from "@/store/ui";

const PREVIEW_ROWS = ["Daniel Okafor · 1040", "Priya & Arjun Nair · 1040", "Northwind Bakery · 1065"];
const kbd = "rounded border border-line bg-surface px-1.5 text-[11px] leading-5 font-medium text-muted";

function ManualPreview() {
  return (
    <div aria-hidden className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
      <span className="text-[11px] text-muted">Client name</span>
      <div className="flex h-8 items-center rounded-md border border-brand px-3 text-sm text-fg">Jordan Lee<span className="ml-0.5 h-4 w-px bg-fg motion-safe:animate-pulse" /></div>
      <div className="flex gap-1.5">
        {["1040", "MFJ", "2025"].map((t, i) => <span key={t} className={`rounded px-2 text-[11px] leading-5 ${i === 0 ? "bg-brand text-on-brand" : "bg-section text-muted"}`}>{t}</span>)}
      </div>
      <div className="mt-1 flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1.5 text-xs text-brand"><Sparkles size={12} /> Checklist drafted from your notes · 9 items</div>
    </div>
  );
}

function ImportPreview({ software }: { software: string }) {
  return (
    <div aria-hidden className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex flex-col gap-1.5 rounded-md border border-line bg-surface p-3">
        <span className="text-[11px] font-medium text-muted">{software} · 2024</span>
        {PREVIEW_ROWS.map((r) => <span key={r} className="truncate rounded bg-section px-2 text-[11px] leading-5 text-fg">{r}</span>)}
      </div>
      <ArrowRight size={16} className="text-brand" />
      <div className="flex flex-col gap-1.5 rounded-md border border-brand-border bg-surface p-3">
        <span className="text-[11px] font-medium text-brand">Flowtax · 2025</span>
        {PREVIEW_ROWS.map((r, i) => (
          <span key={r} style={{ animationDelay: `${300 + i * 260}ms` }} className="flex items-center gap-1 truncate rounded bg-status-prep-bg px-2 text-[11px] leading-5 text-status-prep-fg motion-safe:animate-[row-in_600ms_ease-out_both]">
            <Check size={10} className="shrink-0" />{r.split(" · ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Full-screen first step of Add client: pick a path. Drop a backup anywhere to jump straight into import. */
export function AddClientStart() {
  const canSettings = useCan("manageSettings");
  const wsId = useOrg((s) => s.currentId);
  const softwareId = useOrg((s) => s.taxSoftware[s.currentId]);
  const setTaxSoftware = useOrg((s) => s.setTaxSoftware);
  const close = useUi((s) => s.closeAddClient);
  const setPendingImport = useUi((s) => s.setPendingImport);
  const clients = useEngagement((s) => s.clients);
  const imported = useMemo(() => clients.filter((c) => (c.workspaceId ?? "ws1") === wsId && c.importedFrom).length, [clients, wsId]);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const software = softwareById(softwareId);
  const canImport = useCan("addClients");
  const importReady = canImport && !!software;

  const startManual = () => go({ name: "new-client" });
  const startImport = (fileName?: string) => {
    if (!importReady) return;
    setPendingImport(fileName ?? null);
    go({ name: "import" });
  };
  const takeFile = (f: File | undefined) => {
    if (!f) return;
    if (!IMPORT_ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext))) return setError(`That file type won't work. Use a ${IMPORT_ACCEPT.join(", ")} file from ${software?.name}.`);
    startImport(f.name);
  };

  // N = new client, I = import, Esc = close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); startManual(); }
      else if (k === "i" && importReady) { e.preventDefault(); startImport(); }
      else if (k === "escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // DESIGN_SYSTEM.md card: rounded-md, 1px line border, surface; minimal motion (colors only).
  const card = "group relative flex flex-col gap-4 rounded-md border p-5 text-left transition-colors";

  return (
    <div
      className="relative flex min-h-full flex-col bg-surface"
      onDragOver={(e) => { if (!importReady) return; e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files[0]); }}
    >
      <FocusHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-xl leading-6 font-medium text-fg">How would you like to add clients?</h1>
          <p className="text-sm leading-5 text-muted">Start one from scratch, or bring last year's clients over{software ? ` from ${software.name}` : ""}. You can switch any time.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* ---- New client ---- */}
          <button type="button" onClick={startManual} className={`${card} border-line bg-surface hover:border-brand hover:bg-surface-grey`}>
            <span className="flex items-center justify-between">
              <span className="flex rounded-lg bg-brand-soft p-2 text-brand"><UserPlus size={16} /></span>
              <span className="flex items-center gap-1.5 text-xs text-muted">Press <span className={kbd}>N</span></span>
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="text-base leading-[22px] font-medium tracking-[-0.18px] text-fg">Add a new client</span>
              <span className="text-sm leading-5 text-muted">One client, entered by hand. We draft the checklist from the return type, last year's PDF and your meeting notes.</span>
            </span>
            <ManualPreview />
            <span className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="flex items-center gap-1.5 text-muted"><Clock size={16} /> About 3 minutes</span>
              <span className="flex items-center gap-1 font-semibold text-brand">Start <ArrowRight size={16} /></span>
            </span>
          </button>

          {/* ---- Import ---- */}
          <div className={`${card} ${drag ? "border-brand bg-brand-soft" : importReady ? "border-line bg-surface hover:border-brand hover:bg-surface-grey" : "border-line bg-surface"}`}>
            {/* Whole card is clickable when import is ready; inner controls sit above the overlay. */}
            {importReady && <button type="button" onClick={() => startImport()} aria-label={`Import clients from ${software!.name}`} className="absolute inset-0 rounded-md" />}
            <span className="pointer-events-none relative flex items-center justify-between">
              <span className="flex rounded-lg bg-brand p-2 text-on-brand"><Download size={16} /></span>
              {importReady && (
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-[23px] items-center rounded-md bg-status-prep-bg px-2 text-xs leading-4 tracking-[-0.12px] text-status-prep-fg">Best for returning clients</span>
                  <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">Press <span className={kbd}>I</span></span>
                </span>
              )}
            </span>
            <span className="pointer-events-none relative flex flex-col gap-1.5">
              <span className="text-base leading-[22px] font-medium tracking-[-0.18px] text-fg">Import from {software?.name ?? "your tax software"}</span>
              <span className="text-sm leading-5 text-muted">Many clients at once, with their prior-year forms. Each gets a checklist built from last year's return.</span>
            </span>

            {importReady && software ? (
              <>
                <div className="pointer-events-none relative"><ImportPreview software={software.name} /></div>
                <div onClick={() => fileRef.current?.click()} className="relative flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-brand bg-surface px-3 py-2.5 text-xs text-muted">
                  <UploadCloud size={16} className="shrink-0 text-brand" />
                  <span>Have the backup ready? Drop it anywhere on this page or <button type="button" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} className="relative z-10 font-semibold text-brand underline">browse</button>.</span>
                  <input ref={fileRef} id="add-client-import-file" type="file" accept={IMPORT_ACCEPT.join(",")} className="hidden" onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ""; }} />
                </div>
                {error && <p role="alert" className="relative text-xs text-destructive">{error}</p>}
                <span className="pointer-events-none relative mt-auto flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="flex items-center gap-1.5 text-muted"><Clock size={16} /> About 2 minutes for any number</span>
                  <span className="flex items-center gap-1 font-semibold text-brand">Start <ArrowRight size={16} /></span>
                </span>
              </>
            ) : !canImport ? (
              <p className="mt-auto rounded-md bg-section px-3 py-2 text-sm text-muted">You don't have access to import clients. Ask an admin.</p>
            ) : canSettings ? (
              <label className="mt-auto flex flex-col gap-1.5 text-sm">
                <span className="text-fg">First, which tax software does your firm use?</span>
                <select id="add-client-software" defaultValue="" onChange={(e) => setTaxSoftware(e.target.value as SoftwareId)} className={inputCls}>
                  <option value="" disabled>Choose software</option>
                  {TAX_SOFTWARE.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            ) : (
              <p className="mt-auto rounded-md bg-section px-3 py-2 text-sm text-muted">Ask an admin to choose the firm's tax software in Settings first.</p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted">
          {imported > 0 ? `${imported} client${imported === 1 ? "" : "s"} imported so far. ` : ""}Nothing is sent to clients until you invite them.
        </p>
      </main>

      {drag && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-fg/20 p-6">
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-brand bg-surface px-10 py-8 text-center shadow-lg">
            <UploadCloud size={24} className="text-brand" />
            <p className="text-sm font-medium text-fg">Drop to import from {software?.name}</p>
            <p className="text-sm text-muted">{IMPORT_ACCEPT.join(", ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
