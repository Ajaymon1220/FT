import { useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, Hourglass, X } from "lucide-react";

import { Avatar } from "@/components/org/Avatar";
import { DueDate, Progress, StatusPill } from "@/components/workspace/parts";
import { href } from "@/lib/route";
import { STAGES, isOverdue, lastOwnedStage, pct, stageIndex, waitingOn } from "@/lib/workflow";
import type { Member } from "@/mocks/org";
import { useEngagement } from "@/store/engagement";
import { typeLabel, useOrg, userType } from "@/store/org";

/** Side panel: one team member's clients, what's waiting on them, what's done and what's late. */
export function MemberProgress({ member, onClose }: { member: Member; onClose: () => void }) {
  const wsId = useOrg((s) => s.currentId);
  const assignments = useOrg((s) => s.assignments);
  const allClients = useEngagement((s) => s.clients);
  const engagements = useEngagement((s) => s.engagements);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const data = useMemo(() => {
    const type = userType(member);
    const theirs = allClients.filter((c) => !c.archived && (c.workspaceId ?? "ws1") === wsId && assignments[c.id]?.memberIds.includes(member.id));
    const due = (id: string) => (engagements[id]?.reminders?.enabled ? engagements[id]?.reminders?.dueDate : undefined);
    const late = theirs.filter((c) => isOverdue(due(c.id), c.status));
    const yourTurn = theirs.filter((c) => waitingOn(member, c.status));
    const done = theirs.filter((c) => stageIndex(c.status) > lastOwnedStage(type));
    const docs = theirs.reduce((n, c) => [n[0] + c.checklistDone, n[1] + c.checklistTotal], [0, 0]);
    const byStage = STAGES.map((s) => ({ ...s, n: theirs.filter((c) => c.status === s.status).length }));
    // Their turn first, then overdue, then by stage.
    const order = (c: (typeof theirs)[number]) => (waitingOn(member, c.status) ? 0 : isOverdue(due(c.id), c.status) ? 1 : 2) * 10 + stageIndex(c.status);
    return { type, theirs: [...theirs].sort((a, b) => order(a) - order(b)), late, yourTurn, done, docs, byStage, due };
  }, [member, allClients, wsId, assignments, engagements]);

  const finished = pct(data.done.length, data.theirs.length);
  const stats = [
    { label: "Their turn", value: data.yourTurn.length, icon: <Hourglass size={14} />, tone: "text-status-pending-fg" },
    { label: "Overdue", value: data.late.length, icon: <AlertTriangle size={14} />, tone: data.late.length ? "text-destructive" : "text-muted" },
    { label: "Done their part", value: data.done.length, icon: <CheckCircle2 size={14} />, tone: "text-status-prep-fg" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-fg/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`${member.name}'s progress`} className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-surface shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} size={40} pending={member.status === "Pending"} />
            <div>
              <h2 className="text-lg leading-6 font-medium text-fg">{member.name}</h2>
              <p className="text-xs text-muted">{typeLabel(member)} · {member.status === "Pending" ? "Invite pending" : `Last active ${member.lastActive}`}</p>
            </div>
          </div>
          <button type="button" aria-label="Close" autoFocus onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-grey"><X size={16} /></button>
        </header>

        <div className="flex flex-col gap-5 p-5">
          {/* Completion ring + headline */}
          <section className="flex items-center gap-4 rounded-xl border border-line p-4">
            <div className="relative size-16 shrink-0">
              <svg viewBox="0 0 36 36" className="size-16 -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-grid" />
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-brand transition-[stroke-dasharray] duration-500"
                  strokeDasharray={`${(finished / 100) * 97.4} 97.4`} />
              </svg>
              <span className="tnum absolute inset-0 flex items-center justify-center text-sm font-medium text-fg">{finished}%</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium text-fg">{data.done.length} of {data.theirs.length} customer{data.theirs.length === 1 ? "" : "s"} past their step</p>
              <p className="text-xs text-muted">
                {data.type === "Admin" ? "Admins finish when a return is pushed to tax software." : data.type === "Reviewer" ? "Reviewers finish when a return is approved." : "Preparers finish when the worksheet goes to review."}
              </p>
              <Progress done={data.docs[0]} total={data.docs[1]} className="mt-1" />
              <span className="text-[11px] text-muted">Documents in across their customers</span>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-line p-3">
                <span className={`flex items-center gap-1.5 text-xs ${s.tone}`}>{s.icon}{s.label}</span>
                <span className="tnum text-xl font-medium text-fg">{s.value}</span>
              </div>
            ))}
          </section>

          {/* Stage distribution */}
          {data.theirs.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-fg">Where their customers are</h3>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-grid" role="img" aria-label={data.byStage.filter((s) => s.n).map((s) => `${s.status}: ${s.n}`).join(", ")}>
                {data.byStage.filter((s) => s.n).map((s) => <span key={s.status} className={`${s.dot} h-full border-r border-surface last:border-r-0`} style={{ width: `${(s.n / data.theirs.length) * 100}%` }} title={`${s.status}: ${s.n}`} />)}
              </div>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {data.byStage.filter((s) => s.n).map((s) => (
                  <li key={s.status} className="flex items-center gap-1.5 text-xs text-muted"><span className={`size-2 rounded-full ${s.dot}`} />{s.status} <span className="tnum text-fg">{s.n}</span></li>
                ))}
              </ul>
            </section>
          )}

          {/* Client list */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-fg">Customers · {data.theirs.length}</h3>
            {data.theirs.length === 0 && <p className="rounded-lg bg-surface-grey px-3 py-4 text-sm text-muted">No customers assigned yet. Assign them from the Assignee column in Workspace.</p>}
            <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
              {data.theirs.map((c) => {
                const turn = waitingOn(member, c.status);
                return (
                  <li key={c.id}>
                    <a href={href({ name: "client", clientId: c.id, section: "checklist" })} onClick={onClose} className="flex flex-col gap-2 px-3 py-2.5 hover:bg-surface-grey">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-fg">{c.name} <span className="text-muted">· {c.returnType}</span></span>
                        <StatusPill status={c.status} />
                      </span>
                      <span className="flex items-center gap-3">
                        <Progress done={c.checklistDone} total={c.checklistTotal} className="flex-1" />
                        <DueDate dueDate={data.due(c.id)} status={c.status} />
                        {turn && <span className="flex items-center gap-1 rounded bg-status-pending-bg px-1.5 text-[10px] leading-4 text-status-pending-fg"><Clock size={10} />Their turn</span>}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
