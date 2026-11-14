import { useState } from "react";
import { CheckCircle2, CornerUpLeft, MessageSquareWarning, Send } from "lucide-react";

import { Button } from "@/components/Button";
import { PushModal } from "@/components/client/PushModal";
import { Label, Modal } from "@/components/ui";
import { href } from "@/lib/route";
import { softwareById } from "@/lib/taxSoftware";
import type { ChecklistItem } from "@/mocks/checklists";
import { useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import { can, userType, useMembers, useOrg } from "@/store/org";

const select = "h-9 w-full rounded-md border border-line bg-surface px-2 text-sm text-fg outline-none focus:border-brand";
const textarea = "w-full resize-none rounded-md border border-line p-2 text-sm leading-5 outline-none placeholder:text-muted focus:border-brand";

/**
 * Worksheet action for whoever owns the current step:
 * Preparer → "Send to reviewer"; Reviewer → "Request changes" / "Approve"; Admin → "Push to <software>".
 */
export function HandoffBar({ clientId, unreviewed }: { clientId: string; unreviewed: ChecklistItem[] }) {
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const handoff = useEngagement((s) => s.engagements[clientId]?.handoff);
  const { sendToReviewer, requestChanges, approveReturn } = useEngagement.getState();
  const me = useCurrentUser();
  const members = useMembers().filter((m) => m.status === "Active");
  const assignedIds = useOrg((s) => s.assignments[clientId]?.memberIds ?? []);
  const software = softwareById(useOrg((s) => s.taxSoftware[s.currentId]));
  // Re-render when an admin changes access.
  useOrg((s) => s.roleAccess);
  useOrg((s) => s.memberAccess);
  const [modal, setModal] = useState<"send" | "changes" | "approve" | "push" | null>(null);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  if (!client || !me) return null;

  // Actions follow permissions (Preparer prepares, Reviewer approves, Admin pushes by default; admins can change this).
  const mayPrepare = can(me, "editWorksheet");
  const mayApprove = can(me, "approveReturns");
  const mayPush = can(me, "pushReturns");
  const reviewers = members.filter((m) => userType(m) === "Reviewer");
  const admins = members.filter((m) => userType(m) === "Admin");
  const nameOf = (id?: string) => members.find((m) => m.id === id)?.name;
  const open = (m: typeof modal, defaultPick = "") => { setNote(""); setError(""); setPick(defaultPick); setModal(m); };
  const close = () => setModal(null);
  const softwareName = software?.name ?? "tax software";

  let actions: React.ReactNode;
  switch (client.status) {
    case "Prep Started":
      actions = !mayPrepare
        ? <Button disabled>Preparer is working</Button>
        : <Button onClick={() => open("send", reviewers.find((r) => assignedIds.includes(r.id))?.id ?? handoff?.reviewerId ?? reviewers[0]?.id ?? "")}>Send to reviewer</Button>;
      break;
    case "Ready for Review":
      actions = !mayApprove
        ? <Button disabled>With {nameOf(handoff?.reviewerId) ?? "reviewer"}</Button>
        : <>
            <Button variant="outline" onClick={() => open("changes")}>Request changes</Button>
            <Button onClick={() => open("approve", admins.find((a) => assignedIds.includes(a.id))?.id ?? admins[0]?.id ?? "")}>Approve</Button>
          </>;
      break;
    case "Approved":
      actions = mayPush
        ? <Button onClick={() => setModal("push")}>Push to {softwareName}</Button>
        : <Button disabled>Approved · with {nameOf(handoff?.adminId) ?? "admin"}</Button>;
      break;
    case "Pushed":
      actions = <Button disabled>Pushed to {handoff?.pushedTo ?? softwareName}{handoff?.pushedAt && ` · ${handoff.pushedAt}`}</Button>;
      break;
    default:
      actions = <Button disabled title="Finish intake on the checklist first">Send to reviewer</Button>;
  }

  return (
    <>
      {actions}

      {modal === "send" && (
        <Modal title="Send to reviewer" description="They’ll check the worksheet against the source documents and approve it or send it back." onClose={close}
          footer={<><Button variant="outline" onClick={close}>Keep preparing</Button><Button onClick={() => { if (!pick) return setError("Choose a reviewer."); sendToReviewer(clientId, me.name, pick, note.trim()); close(); }}>Send to reviewer</Button></>}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="handoff-reviewer" required>Reviewer</Label>
              <select id="handoff-reviewer" value={pick} onChange={(e) => { setPick(e.target.value); setError(""); }} className={select}>
                <option value="" disabled>Choose a reviewer</option>
                {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}{assignedIds.includes(r.id) ? " (assigned)" : ""}</option>)}
              </select>
              {reviewers.length === 0 && <p className="text-xs text-status-pending-fg">No reviewers in this workspace yet. Make someone a Reviewer in Team.</p>}
              {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="handoff-note">Note for the reviewer</Label>
              <textarea id="handoff-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should look at first" className={textarea} />
            </div>
            {unreviewed.length > 0 && (
              <div className="rounded-md bg-banner px-3 py-2 text-sm">
                <p className="text-fg">{unreviewed.length} uploaded document{unreviewed.length > 1 ? "s haven’t" : " hasn’t"} been approved, so {unreviewed.length > 1 ? "their" : "its"} values aren’t in the worksheet.</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {unreviewed.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 text-muted">
                      • {u.name}
                      <a href={href({ name: "review", clientId, itemId: u.id })} className="text-xs text-brand underline">Review now</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === "changes" && (
        <Modal title="Request changes" description="The worksheet goes back to the preparer with your notes. Approval is cleared until you review it again." onClose={close}
          footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => { if (!note.trim()) return setError("Say what needs to change."); requestChanges(clientId, me.name, note.trim()); close(); }}>Send back</Button></>}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handoff-changes" required>What needs to change</Label>
            <textarea id="handoff-changes" rows={4} value={note} onChange={(e) => { setNote(e.target.value); setError(""); }} placeholder="e.g. Box 12 code D on the W-2 isn't in the retirement section" className={textarea} />
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          </div>
        </Modal>
      )}

      {modal === "approve" && (
        <Modal title="Approve worksheet" description={`Approves this version and assigns it to an admin to push to ${softwareName}.`} onClose={close}
          footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => { if (!pick) return setError("Choose an admin."); approveReturn(clientId, me.name, pick); close(); }}>Approve</Button></>}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handoff-admin" required>Assign to admin</Label>
            <select id="handoff-admin" value={pick} onChange={(e) => { setPick(e.target.value); setError(""); }} className={select}>
              <option value="" disabled>Choose an admin</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted">Any later change to documents or values sends it back for review.</p>
          </div>
        </Modal>
      )}

      {modal === "push" && <PushModal clientId={clientId} onClose={close} />}
    </>
  );
}

/** One-line status under the worksheet toolbar: who has it and why. */
export function HandoffBanner({ clientId }: { clientId: string }) {
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const h = useEngagement((s) => s.engagements[clientId]?.handoff);
  const members = useMembers();
  const software = softwareById(useOrg((s) => s.taxSoftware[s.currentId]))?.name ?? "tax software";
  const nameOf = (id?: string) => members.find((m) => m.id === id)?.name;
  if (!client) return null;
  const row = "flex items-start gap-2 px-6 py-2 text-sm";

  if (client.status === "Prep Started" && h?.changesRequested) {
    return <p className={`${row} bg-status-pending-bg text-status-pending-fg`}><MessageSquareWarning size={16} className="mt-0.5 shrink-0" /><span><b className="font-medium">{h.changesRequested.by} requested changes</b> · {h.changesRequested.at}: {h.changesRequested.note}</span></p>;
  }
  if (client.status === "Ready for Review") {
    return <p className={`${row} bg-status-review-bg text-status-review-fg`}><CornerUpLeft size={16} className="mt-0.5 shrink-0 rotate-180" /><span>With <b className="font-medium">{nameOf(h?.reviewerId) ?? "the reviewer"}</b> for review{h?.preparedBy && ` · sent by ${h.preparedBy}`}{h?.prepNote && ` — “${h.prepNote}”`}. Any change to documents or values needs their approval again.</span></p>;
  }
  if (client.status === "Approved") {
    return <p className={`${row} bg-sage text-brand`}><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><span>Approved{h?.approvedBy && ` by ${h.approvedBy}`}{h?.approvedAt && ` on ${h.approvedAt}`}. <b className="font-medium">{nameOf(h?.adminId) ?? "An admin"}</b> will push it to {software}.</span></p>;
  }
  if (client.status === "Pushed") {
    return <p className={`${row} bg-brand text-on-brand`}><Send size={16} className="mt-0.5 shrink-0" /><span>Pushed to {h?.pushedTo ?? software}{h?.pushedBy && ` by ${h.pushedBy}`}{h?.pushedAt && ` on ${h.pushedAt}`}. Finish and e-file it there.</span></p>;
  }
  return null;
}
