import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { icons } from "@/components/icons";
import { Tabs } from "@/components/Tabs";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/workspace/parts";
import { href } from "@/lib/route";
import { STAGES, isOverdue, lastOwnedStage, stageIndex, waitingOn } from "@/lib/workflow";
import { useCan, useCurrentUser } from "@/store/auth";
import { MemberProgress } from "@/components/org/MemberProgress";
import type { Member } from "@/mocks/org";
import { Avatar } from "@/components/org/Avatar";
import { typeLabel, useCurrentWorkspace, useMembers, useOrg, userType } from "@/store/org";
import { useEngagement } from "@/store/engagement";

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function CardTitle({ children, info }: { children: string; info?: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <h2 className="font-heading text-sm leading-[22px] font-semibold whitespace-nowrap text-muted">{children}</h2>
      {info && <img alt={info} src={icons.info} className="size-4" title={info} />}
    </div>
  );
}

const card = "rounded-md border border-line bg-surface p-4";

/* ---------- Client status bar chart: one bar per workflow stage, axis scales to the data ---------- */
const PLOT_H = 172; // px between the top and 0 gridlines (4 rows)

/** Smallest 1/2/5 × 10ⁿ step so four steps cover the largest bar. */
function niceStep(max: number) {
  const raw = Math.max(1, Math.ceil(max / 4));
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
}

function ClientStatusChart({ data }: { data: { label: string; value: number }[] }) {
  const step = niceStep(Math.max(...data.map((d) => d.value)));
  const axisMax = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((n) => n * step);
  const y = (v: number) => (1 - v / axisMax) * PLOT_H;
  return (
    <div className="relative h-[250px] w-full pt-[26px]" role="img" aria-label={data.map((s) => `${s.label}: ${s.value}`).join(", ")}>
      <div className="relative" style={{ height: PLOT_H }}>
        {ticks.map((t) => (
          <div key={t} className="absolute right-0 left-0 flex items-center gap-3" style={{ top: y(t) - 8 }}>
            <span className="tnum w-[25px] text-right text-xs leading-4 tracking-[-0.12px] text-axis">{t}</span>
            <span className="h-px flex-1 bg-grid" />
          </div>
        ))}
        <div className="absolute top-0 right-0 bottom-0 left-[37px] flex items-end justify-around gap-1.5">
          {data.map((s) => (
            <div key={s.label} className="relative flex h-full max-w-[56px] flex-1 flex-col items-center justify-end">
              <span className="tnum mb-1 text-sm leading-5 font-medium tracking-[-0.16px] text-fg">{s.value}</span>
              <div className="w-full rounded-t-[2px] bg-brand-bar" style={{ height: (s.value / axisMax) * PLOT_H }} />
              <span className="absolute inset-x-[-2px] top-full mt-2 text-center break-words text-[11px] leading-[13px] text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const roleTabs = ["All", "Admin", "Preparer", "Reviewer"] as const;
const workTabs = ["Todo", "Done"] as const;


export function Dashboard({ onNewClient }: { onNewClient: () => void }) {
  const me = useCurrentUser();
  const ws = useCurrentWorkspace();
  const [workTab, setWorkTab] = useState<(typeof workTabs)[number]>("Todo");
  const [roleTab, setRoleTab] = useState<(typeof roleTabs)[number]>("All");
  const [progressFor, setProgressFor] = useState<Member | null>(null);
  const canAdd = useCan("addClients");
  const canAll = useCan("viewAllClients");
  const canProgress = useCan("viewTeamProgress");
  const people = useMembers();
  const assignments = useOrg((s) => s.assignments);
  const allClients = useEngagement((s) => s.clients);
  const engagements = useEngagement((s) => s.engagements);

  // People limited to their own clients get a dashboard of just those.
  const clients = useMemo(() => allClients.filter((c) => !c.archived && (c.workspaceId ?? "ws1") === ws.id && (canAll || (!!me && !!assignments[c.id]?.memberIds.includes(me.id)))), [allClients, ws.id, canAll, me, assignments]);
  const isMine = (id: string) => !!me && !!assignments[id]?.memberIds.includes(me.id);
  const clientCount = (memberId: string) => allClients.filter((c) => !c.archived && (c.workspaceId ?? "ws1") === ws.id && assignments[c.id]?.memberIds.includes(memberId)).length;
  const members = roleTab === "All" ? people : people.filter((m) => m.role !== "Guest" && userType(m) === roleTab);

  const { stats, chart, work } = useMemo(() => {
    const active = clients.filter((c) => c.status !== "Pushed");
    const pushed = clients.length - active.length;
    const overdue = clients.filter((c) => {
      const r = engagements[c.id]?.reminders;
      return r?.enabled && isOverdue(r.dueDate, c.status);
    }).length;
    const inReview = clients.filter((c) => c.status === "Ready for Review").length;
    const onClient = active.filter((c) => STAGES[stageIndex(c.status)].owner === "Client").length;
    const mine = clients.filter((c) => !!me && !!assignments[c.id]?.memberIds.includes(me.id));
    const todo = me ? mine.filter((c) => waitingOn(me, c.status)) : [];
    const done = me ? mine.filter((c) => stageIndex(c.status) > lastOwnedStage(userType(me))) : [];

    return {
      stats: [
        { id: "returns", label: "Total Returns", value: clients.length, note: `${pushed} pushed to tax software`, info: "Every client return in this workspace", critical: false },
        { id: "active", label: "Active Clients", value: active.length, note: `${onClient} waiting on the client`, info: "Returns not yet pushed to tax software", critical: false },
        { id: "bottlenecks", label: "Bottlenecks", value: overdue, note: overdue ? "Past their due date" : `${inReview} waiting on review`, info: "Active returns past the due date set in auto-reminders", critical: overdue > 0 },
        { id: "yours", label: "Waiting on You", value: todo.length, note: me ? `Your ${userType(me).toLowerCase()} steps` : "Not in this workspace", info: "Your assigned clients at a stage you own", critical: false },
      ],
      chart: STAGES.map((s) => ({ label: s.status, value: clients.filter((c) => c.status === s.status).length })),
      work: { Todo: todo, Done: done },
    };
  }, [clients, engagements, assignments, me]);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex flex-col gap-6 px-4 pb-6 sm:px-8 lg:px-20">
        <section className="sticky top-[47px] z-10 flex flex-wrap items-center justify-between gap-3 bg-surface pt-6 pb-3">
          <div className="flex flex-col gap-1">
            <p className="text-xl leading-6 font-medium text-fg">
              {greeting()}, {me?.name.split(" ")[0] ?? "there"}.
            </p>
            <p className="text-sm leading-5 tracking-[-0.16px] text-slate">{canAll ? `Here is a summary of active clients in ${ws.name}.` : "Here is a summary of the clients assigned to you."}</p>
          </div>
          {canAdd && <Button icon={icons.add} onClick={onNewClient}>Add client</Button>}
        </section>

        <div className="flex flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.id} className={`${card} flex h-[118px] flex-col justify-between`}>
                <CardTitle info={s.info}>{s.label}</CardTitle>
                <div className="flex flex-col gap-1">
                  <p className={`tnum text-2xl leading-[30px] font-medium tracking-[-0.15px] ${s.critical ? "text-destructive" : "text-fg"}`}>{s.value}</p>
                  <p className="text-xs leading-4 tracking-[-0.12px] text-slate">{s.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + agenda */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`${card} flex flex-col gap-4 overflow-hidden`}>
              <CardTitle info="Clients at each workflow stage">Client Status</CardTitle>
              {clients.length ? <ClientStatusChart data={chart} /> : <p className="py-16 text-center text-sm text-muted">No clients in {ws.name} yet.</p>}
            </div>
            <div className={`${card} flex flex-col items-center gap-6 lg:h-[304px]`}>
              <CardTitle>Agenda</CardTitle>
              <img alt="" src={icons.calendarPlus} className="size-6" />
              <p className="max-w-[302px] text-center text-sm leading-5 font-medium tracking-[-0.16px] text-muted-80">
                Connect your calendar to view upcoming events and join your next call
              </p>
              <Button variant="outline">Add Calendar</Button>
            </div>
          </div>

          {/* My work + team */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`${card} flex flex-col gap-3 lg:min-h-[310px]`}>
              <CardTitle>My Work</CardTitle>
              <div className="flex flex-col gap-2">
                <Tabs label="My work" tabs={workTabs} value={workTab} onChange={setWorkTab} />
                <ul>
                  {work[workTab].map((c) => (
                    <li key={c.id} className="border-b border-line">
                      <a href={href({ name: "client", clientId: c.id, section: "checklist" })} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm leading-5 text-fg hover:text-brand">
                        <span className="truncate">{c.name} <span className="text-muted">• {c.returnType}</span></span>
                        <StatusPill status={c.status} />
                      </a>
                    </li>
                  ))}
                  {work[workTab].length === 0 && (
                    <li className="px-4 py-3 text-sm text-muted">
                      {workTab === "Todo" ? "Nothing is waiting on you right now." : "None of your clients have moved past your step yet."}{" "}
                      {clients.some((c) => isMine(c.id)) ? null : <a href="#workspace" className="text-brand underline">See all clients</a>}
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className={`${card} flex flex-col gap-3 lg:min-h-[310px]`}>
              <CardTitle>Team</CardTitle>
              <div className="flex flex-col gap-2">
                <Tabs label="Team role" tabs={roleTabs} value={roleTab} onChange={setRoleTab} />
                <ul>
                  {members.map((m) => {
                    const viewable = (canProgress || m.id === me?.id) && m.role !== "Guest";
                    return (
                    <li key={m.id} className={`flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 ${viewable ? "cursor-pointer hover:bg-surface-grey" : ""}`}
                      onClick={viewable ? () => setProgressFor(m) : undefined}>
                      <span className="flex items-center gap-2 text-sm leading-5 whitespace-nowrap">
                        <Avatar name={m.name} pending={m.status === "Pending"} />
                        {viewable
                          ? <button type="button" onClick={(e) => { e.stopPropagation(); setProgressFor(m); }} className="text-fg hover:text-brand" aria-label={`View ${m.name}'s progress`}>{m.name}</button>
                          : <span className="text-fg">{m.name}</span>}
                        <span className="text-muted">• {typeLabel(m)}</span>
                      </span>
                      <span className="flex h-5 items-center rounded bg-brand-soft px-2 text-[10px] leading-3 text-fg">
                        {m.status === "Pending" ? "Invite pending" : `${clientCount(m.id)} client${clientCount(m.id) === 1 ? "" : "s"}`}
                      </span>
                    </li>
                    );
                  })}
                  {members.length === 0 && <li className="px-4 py-3 text-sm text-muted">No {roleTab.toLowerCase()}s yet. <a href="#people" className="text-brand underline">Invite one</a></li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {progressFor && <MemberProgress member={progressFor} onClose={() => setProgressFor(null)} />}
    </>
  );
}
