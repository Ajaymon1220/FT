import { useEffect, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

import { Button } from "@/components/Button";
import { Modal } from "@/components/ui";
import { softwareById } from "@/lib/taxSoftware";
import { useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import { useOrg } from "@/store/org";

const STEPS = ["Connecting to", "Writing worksheet values", "Attaching source documents", "Verifying the return"];

/** Admin pushes an approved return to the firm's tax filing software (Lacerte, Drake, …). */
export function PushModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const items = useEngagement((s) => s.checklists[clientId] ?? []);
  const approvedBy = useEngagement((s) => s.engagements[clientId]?.handoff?.approvedBy);
  const pushToSoftware = useEngagement((s) => s.pushToSoftware);
  const software = softwareById(useOrg((s) => s.taxSoftware[s.currentId]));
  const me = useCurrentUser();
  const [phase, setPhase] = useState<"confirm" | "running" | "done">("confirm");
  const [step, setStep] = useState(0);

  const values = items.reduce((n, i) => n + (i.status === "Validated" ? i.fields?.length ?? 0 : 0), 0);
  const docs = items.filter((i) => i.kind !== "group" && i.status === "Validated").length;

  // Simulated push: walk through the steps, then record the outcome once.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setTimeout(() => {
      if (step + 1 < STEPS.length) return setStep(step + 1);
      pushToSoftware(clientId, me?.name ?? "Admin", software!.name);
      setPhase("done");
    }, 650);
    return () => clearTimeout(t);
  }, [phase, step, clientId, me, software, pushToSoftware]);

  if (!client) return null;

  if (!software) {
    return (
      <Modal title="Choose your tax software first" description="Pick the software your firm files with, then come back to push this return." onClose={onClose}
        footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { onClose(); window.location.hash = "preferences"; }}>Open settings</Button></>}>
        <p className="text-sm text-muted">Settings → Tax software</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={phase === "done" ? `Pushed to ${software.name}` : `Push to ${software.name}?`}
      description={phase === "confirm" ? `This creates or updates ${client.name}'s ${client.taxYear} return in ${software.name}. Review it there before e-filing.` : undefined}
      onClose={phase === "running" ? () => {} : onClose}
      footer={
        phase === "confirm" ? <><Button variant="outline" onClick={onClose}>Cancel</Button><Button icon={undefined} onClick={() => setPhase("running")}>Push to {software.name}</Button></>
        : phase === "done" ? <Button onClick={onClose}>Done</Button>
        : undefined
      }
    >
      {phase === "confirm" && (
        <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Destination</dt><dd className="text-fg">{software.name} <span className="text-muted">· {software.vendor}</span></dd>
          <dt className="text-muted">Return</dt><dd className="text-fg">{client.returnType}{client.filingStatus && ` · ${client.filingStatus}`} · {client.taxYear}</dd>
          <dt className="text-muted">Worksheet values</dt><dd className="tnum text-fg">{values}</dd>
          <dt className="text-muted">Source documents</dt><dd className="tnum text-fg">{docs}</dd>
          <dt className="text-muted">Approved by</dt><dd className="text-fg">{approvedBy ?? "—"}</dd>
        </dl>
      )}
      {phase !== "confirm" && (
        <ol className="flex flex-col gap-2 text-sm" aria-live="polite">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-2 ${i < step || phase === "done" ? "text-fg" : i === step ? "text-fg" : "text-muted"}`}>
              {i < step || phase === "done" ? <Check size={16} className="text-status-prep-fg" /> : i === step ? <Loader2 size={16} className="animate-spin text-brand" /> : <span className="size-4 rounded-full border border-line" />}
              {i === 0 ? `${label} ${software.name}` : label}
            </li>
          ))}
          {phase === "done" && (
            <li className="mt-2 flex items-start gap-2 rounded-md bg-status-prep-bg px-3 py-2 text-status-prep-fg">
              <Send size={16} className="mt-0.5 shrink-0" />
              {client.name} is in {software.name}. Open it there to finish and e-file.
            </li>
          )}
        </ol>
      )}
    </Modal>
  );
}
