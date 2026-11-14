import { useState } from "react";
import { Check, ChevronsRight, Plus, Send } from "lucide-react";

import { PushModal } from "@/components/client/PushModal";
import { softwareById } from "@/lib/taxSoftware";

import { AvatarStack } from "@/components/org/Avatar";
import { usePopover } from "@/components/ui";
import { DueDate, PriorityFlag, Progress } from "@/components/workspace/parts";
import { go, href } from "@/lib/route";
import { STAGES, canMoveTo, clientTeam, stageOf, type StageDef } from "@/lib/workflow";
import type { Client, ClientStatus } from "@/mocks/clients";
import { useCan, useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import { useMembers, useOrg } from "@/store/org";
import { useUi } from "@/store/ui";

/* ---------- Move menu: keyboard / touch alternative to dragging ---------- */
function MoveMenu({ client, onMove }: { client: Client; onMove: (to: ClientStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Move ${client.name} to another stage`} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex rounded p-1 text-muted opacity-0 group-hover:opacity-100 hover:bg-line/60 hover:text-fg focus-visible:opacity-100 aria-expanded:opacity-100">
        <ChevronsRight size={14} />
      </button>
      {open && (
        <ul role="menu" className="absolute top-7 right-0 z-40 w-52 rounded-lg border border-line bg-surface p-1 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <li className="px-2 pt-1 pb-1 text-xs text-muted">Move to</li>
          {STAGES.map((s) => (
            <li key={s.status}>
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onMove(s.status); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-grey">
                <span className={`size-2 shrink-0 rounded-full ${s.dot}`} />
                <span className="flex-1">{s.status}</span>
                {s.status === client.status && <Check size={14} className="text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Card ---------- */
function Card({ client, onMove, onPush, dragging, onDragStart, onDragEnd }: {
  client: Client; onMove: (to: ClientStatus) => void; onPush?: () => void; dragging: boolean; onDragStart: () => void; onDragEnd: () => void;
}) {
  const software = softwareById(useOrg((s) => s.taxSoftware[s.currentId]))?.name ?? "tax software";
  const members = useMembers();
  const ids = useOrg((s) => s.assignments[client.id]?.memberIds);
  const dueDate = useEngagement((s) => s.engagements[client.id]?.reminders?.dueDate);
  const team = clientTeam(ids, members);
  const owner = stageOf(client.status).owner;
  const first = (list: { name: string }[], fallback: string) => list.map((m) => m.name.split(" ")[0]).join(", ") || fallback;
  const waiting = owner === "Customer" ? "Customer" : owner === "Preparer" ? first(team.preparers, "Preparer") : owner === "Reviewer" ? first(team.reviewers, "Reviewer") : owner === "Admin" ? first(team.admins, "Admin") : null;

  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", client.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={(e) => { if ((e.target as HTMLElement).closest("button, a, [role=menu]")) return; go({ name: "client", clientId: client.id, section: "overview" }); }}
      className={`group flex cursor-grab flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(16,38,30,0.06)] transition hover:border-brand-border active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2">
        <a href={href({ name: "client", clientId: client.id, section: "overview" })} className="min-w-0 flex-1 text-sm leading-5 font-medium text-fg hover:text-brand">
          {client.name}
        </a>
        <MoveMenu client={client} onMove={onMove} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
        <span>{client.returnType}{client.filingStatus && ` · ${client.filingStatus}`} · {client.taxYear}</span>
        <PriorityFlag priority={client.priority} withLabel />
        {client.tag && <span className="rounded bg-tag px-1.5 text-[10px] leading-4 text-fg">{client.tag}</span>}
      </div>
      <Progress done={client.checklistDone} total={client.checklistTotal} />
      <div className="flex items-center justify-between gap-2">
        {team.assigned.length > 0 ? <AvatarStack names={team.assigned.map((m) => m.name)} size={22} /> : <span className="text-xs text-muted">Unassigned</span>}
        <DueDate dueDate={dueDate} status={client.status} />
      </div>
      {waiting && (
        <p className="border-t border-line pt-2 text-xs leading-4 text-muted">
          Waiting on <span className="font-medium text-fg">{waiting}</span>
        </p>
      )}
      {onPush && (
        <button type="button" onClick={onPush} className="flex items-center justify-center gap-1.5 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-on-brand hover:bg-brand/90">
          <Send size={12} /> Push to {software}
        </button>
      )}
      {client.importedFrom && client.status === "Draft" && <p className="text-[10px] leading-3 text-muted">Imported from {client.importedFrom}</p>}
    </article>
  );
}

/* ---------- Column ---------- */
function Column({ stage, clients, draggingId, setDraggingId, move, onPush }: {
  stage: StageDef; clients: Client[]; draggingId: string | null; setDraggingId: (id: string | null) => void; move: (id: string, to: ClientStatus) => void; onPush?: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <section aria-label={`${stage.status}, ${clients.length} customers`}
      onDragOver={(e) => { if (!draggingId) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, stage.status); }}
      className={`flex w-[272px] shrink-0 flex-col rounded-xl border bg-surface-grey transition-colors ${over ? "border-brand bg-brand-soft" : "border-line"}`}
    >
      <header className="flex flex-col gap-1 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${stage.dot}`} aria-hidden />
          <h3 className="text-sm leading-5 font-semibold text-fg">{stage.status}</h3>
          <span className="tnum rounded-full bg-surface px-1.5 text-xs leading-4 text-muted">{clients.length}</span>
        </div>
        <p className="text-xs leading-4 text-muted">
          {stage.caption}
          {stage.owner !== "Done" && <> · <span className="font-medium text-slate">{stage.owner}</span></>}
        </p>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {clients.map((c) => (
          <Card key={c.id} client={c} dragging={draggingId === c.id} onMove={(to) => move(c.id, to)} onPush={onPush && stage.status === "Approved" ? () => onPush(c.id) : undefined}
            onDragStart={() => setDraggingId(c.id)} onDragEnd={() => setDraggingId(null)} />
        ))}
        {clients.length === 0 && <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-muted">Drop a customer here</p>}
        {stage.status === "Draft" && (
          <button type="button" onClick={() => useUi.getState().openAddClient()} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface hover:text-fg">
            <Plus size={14} /> Add customer
          </button>
        )}
      </div>
    </section>
  );
}

/** ClickUp-style board: one column per workflow stage; drag a card (or use its move menu) to hand it off. */
export function Board({ clients }: { clients: Client[] }) {
  const me = useCurrentUser();
  const setClientStatus = useEngagement((s) => s.setClientStatus);
  const showToast = useEngagement((s) => s.showToast);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);
  const isAdmin = useCan("pushReturns");

  const move = (id: string, to: ClientStatus) => {
    setDraggingId(null);
    if (!canMoveTo(me, to)) return showToast(to === "Pushed" ? "You don't have access to push returns to tax software." : "You don't have access to approve returns.");
    // Pushing is a real action (it writes to the tax software), so it always goes through the push dialog.
    if (to === "Pushed") {
      if (clients.find((c) => c.id === id)?.status !== "Approved") return showToast("A reviewer has to approve it before it can be pushed.");
      return setPushing(id);
    }
    setClientStatus(id, to);
  };

  return (
    <div className="flex flex-1 gap-3 overflow-x-auto px-6 pt-1 pb-6" role="region" aria-label="Customers board">
      {STAGES.map((stage) => (
        <Column key={stage.status} stage={stage} clients={clients.filter((c) => c.status === stage.status)}
          draggingId={draggingId} setDraggingId={setDraggingId} move={move} onPush={isAdmin ? setPushing : undefined} />
      ))}
      {pushing && <PushModal clientId={pushing} onClose={() => setPushing(null)} />}
    </div>
  );
}
