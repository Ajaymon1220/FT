import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Star } from "lucide-react";

import { Avatar } from "@/components/org/Avatar";
import { DueDate, PriorityFlag, Progress, StatusPill } from "@/components/workspace/parts";
import { go, href } from "@/lib/route";
import { PRIORITIES, STAGES, clientTeam, isImportant, isOverdue, pct, stageIndex, stageOf, waitingOn } from "@/lib/workflow";
import type { Client } from "@/mocks/clients";
import type { Member } from "@/mocks/org";
import { useEngagement } from "@/store/engagement";
import { useMembers, useOrg } from "@/store/org";

const card = "rounded-xl border border-line bg-surface";
const sectionTitle = "text-base leading-[22px] font-medium tracking-[-0.18px] text-fg";

/** Six-step tracker: preparer setup → shared → uploading → preparer approval → review → approved. */
function StageTrack({ client }: { client: Client }) {
  const at = stageIndex(client.status);
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Step ${at + 1} of ${STAGES.length}: ${client.status}`}>
      {STAGES.map((s, i) => (
        <span key={s.status} title={s.status} className={`h-1.5 w-5 rounded-full ${i < at ? "bg-brand/60" : i === at ? stageOf(client.status).dot : "bg-grid"}`} />
      ))}
    </span>
  );
}

function Names({ people, empty }: { people: Member[]; empty: string }) {
  if (!people.length) return <span className="text-xs text-muted italic">{empty}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Avatar name={people[0].name} size={20} />
      <span className="truncate text-sm text-fg">{people.map((p) => p.name).join(", ")}</span>
    </span>
  );
}

export function TeamView({ clients }: { clients: Client[] }) {
  const members = useMembers();
  const assignments = useOrg((s) => s.assignments);
  const engagements = useEngagement((s) => s.engagements);
  const [open, setOpen] = useState<string | null>(null);

  const due = (c: Client) => engagements[c.id]?.reminders?.enabled ? engagements[c.id]?.reminders?.dueDate : undefined;
  const late = (c: Client) => isOverdue(due(c), c.status);

  const important = useMemo(
    () => clients.filter(isImportant).sort((a, b) => PRIORITIES.indexOf(a.priority ?? "Low") - PRIORITIES.indexOf(b.priority ?? "Low") || stageIndex(a.status) - stageIndex(b.status)),
    [clients],
  );

  const team = members.filter((m) => m.status === "Active").map((m) => {
    const theirs = clients.filter((c) => assignments[c.id]?.memberIds.includes(m.id));
    const active = theirs.filter((c) => c.status !== "Pushed");
    const done = theirs.reduce((n, c) => n + c.checklistDone, 0);
    const total = theirs.reduce((n, c) => n + c.checklistTotal, 0);
    return {
      member: m,
      clients: theirs,
      active: active.length,
      pushed: theirs.length - active.length,
      needsThem: theirs.filter((c) => waitingOn(m, c.status)).length,
      overdue: active.filter(late).length,
      done, total,
    };
  }).sort((a, b) => b.active - a.active);

  const activeCount = clients.filter((c) => c.status !== "Pushed").length;
  const overdueCount = clients.filter(late).length;
  const onClient = clients.filter((c) => stageOf(c.status).owner === "Client").length;
  const unassigned = clients.filter((c) => !(assignments[c.id]?.memberIds.length)).length;

  return (
    <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
      {/* ---- Pipeline ---- */}
      <section aria-labelledby="pipeline-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pipeline-h" className={sectionTitle}>Pipeline</h2>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span><span className="tnum font-medium text-fg">{activeCount}</span> active</span>
            <span className={overdueCount ? "text-destructive" : ""}><span className="tnum font-medium">{overdueCount}</span> overdue</span>
            <span><span className="tnum font-medium text-fg">{onClient}</span> waiting on clients</span>
            {unassigned > 0 && <span className="text-status-pending-fg"><span className="tnum font-medium">{unassigned}</span> unassigned</span>}
          </p>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((s, i) => {
            const n = clients.filter((c) => c.status === s.status).length;
            return (
              <li key={s.status} className={`${card} flex flex-col gap-1 p-3`}>
                <span className="flex items-center gap-1.5 text-xs leading-4 text-muted">
                  <span className="tnum text-[10px]">{i + 1}</span>
                  <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
                  <span className="truncate font-medium text-fg">{s.status}</span>
                </span>
                <span className="tnum text-2xl leading-8 font-medium text-fg">{n}</span>
                <span className="text-xs leading-4 text-muted">{s.owner === "Done" ? "Complete" : `With ${s.owner.toLowerCase()}`}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---- Important clients ---- */}
      <section aria-labelledby="important-h" className="flex flex-col gap-3">
        <h2 id="important-h" className={`${sectionTitle} flex items-center gap-2`}>
          <Star size={16} className="fill-status-invited-fg text-status-invited-fg" aria-hidden /> Important clients
          <span className="tnum text-sm font-normal text-muted">{important.length}</span>
        </h2>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                <th>Client</th><th>Stage</th><th>Preparer</th><th>Reviewer</th><th className="w-40">Checklist</th><th>Due</th>
              </tr>
            </thead>
            <tbody>
              {important.map((c) => {
                const t = clientTeam(assignments[c.id]?.memberIds, members);
                return (
                  <tr key={c.id} onClick={() => go({ name: "client", clientId: c.id, section: "overview" })}
                    className={`cursor-pointer border-t border-line hover:bg-surface-grey [&>td]:px-3 [&>td]:py-2.5 ${late(c) ? "bg-status-rejected-bg/40" : ""}`}>
                    <td>
                      <span className="flex items-center gap-2">
                        <a href={href({ name: "client", clientId: c.id, section: "overview" })} className="font-medium text-fg hover:text-brand">{c.name}</a>
                        <PriorityFlag priority={c.priority} />
                      </span>
                      <span className="text-xs text-muted">{c.returnType} · {c.taxYear}</span>
                    </td>
                    <td><span className="flex flex-col gap-1.5"><StatusPill status={c.status} className="self-start" /><StageTrack client={c} /></span></td>
                    <td className="max-w-44"><Names people={t.preparers} empty="No preparer" /></td>
                    <td className="max-w-44"><Names people={t.reviewers} empty="No reviewer" /></td>
                    <td><Progress done={c.checklistDone} total={c.checklistTotal} /></td>
                    <td>{due(c) ? <DueDate dueDate={due(c)} status={c.status} /> : <span className="text-xs text-muted">—</span>}</td>
                  </tr>
                );
              })}
              {important.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No urgent or high-priority clients match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Team performance ---- */}
      <section aria-labelledby="team-h" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="team-h" className={sectionTitle}>Team</h2>
          <p className="text-sm text-muted">Who is working on which client. “Needs them” counts clients currently waiting on that person’s step.</p>
        </div>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                <th>Member</th><th className="text-right">Active</th><th className="text-right">Needs them</th><th className="text-right">Pushed</th><th className="text-right">Overdue</th><th className="w-48">Checklist progress</th>
              </tr>
            </thead>
            <tbody>
              {team.map((r) => {
                const expanded = open === r.member.id;
                return (
                  <Fragment key={r.member.id}>
                    <tr className="border-t border-line [&>td]:px-3 [&>td]:py-2.5">
                      <td>
                        <button type="button" aria-expanded={expanded} disabled={!r.clients.length} onClick={() => setOpen(expanded ? null : r.member.id)}
                          className="flex items-center gap-2 text-left disabled:cursor-default">
                          {r.clients.length ? (expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />) : <span className="w-3.5" />}
                          <Avatar name={r.member.name} size={26} />
                          <span className="flex flex-col">
                            <span className="font-medium text-fg">{r.member.name}</span>
                            <span className="text-xs text-muted">{r.member.title} · {r.member.role}</span>
                          </span>
                        </button>
                      </td>
                      <td className="tnum text-right text-fg">{r.active}</td>
                      <td className="text-right">
                        {r.needsThem ? <span className="tnum inline-flex items-center gap-1 rounded-full bg-status-pending-bg px-2 text-status-pending-fg"><Clock size={12} aria-hidden />{r.needsThem}</span> : <span className="tnum text-muted">0</span>}
                      </td>
                      <td className="tnum text-right text-fg">{r.pushed}</td>
                      <td className="text-right">
                        {r.overdue ? <span className="tnum inline-flex items-center gap-1 text-destructive"><AlertTriangle size={12} aria-hidden />{r.overdue}</span> : <span className="tnum text-muted">0</span>}
                      </td>
                      <td>{r.total ? <span title={`${pct(r.done, r.total)}% of requested documents approved`}><Progress done={r.done} total={r.total} /></span> : <span className="text-xs text-muted">No clients yet</span>}</td>
                    </tr>
                    {expanded && r.clients.map((c) => (
                      <tr key={c.id} className="bg-surface-grey text-sm [&>td]:px-3 [&>td]:py-2">
                        <td className="pl-14">
                          <a href={href({ name: "client", clientId: c.id, section: "overview" })} className="text-fg hover:text-brand">{c.name}</a>
                          {waitingOn(r.member, c.status) && <span className="ml-2 rounded bg-status-pending-bg px-1.5 text-[10px] leading-4 text-status-pending-fg">Their turn</span>}
                        </td>
                        <td colSpan={2}><StatusPill status={c.status} /></td>
                        <td colSpan={2} className="text-right">{due(c) ? <DueDate dueDate={due(c)} status={c.status} /> : <span className="text-xs text-muted">No due date</span>}</td>
                        <td><Progress done={c.checklistDone} total={c.checklistTotal} /></td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
