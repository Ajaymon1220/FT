import { useMemo, useState } from "react";
import { Check, Rocket, UserPlus, X } from "lucide-react";

import { icons } from "@/components/icons";
import { WorkspaceSwitcher } from "@/components/org/WorkspaceSwitcher";
import { usePopover } from "@/components/ui";
import { UserMenu } from "@/components/UserMenu";
import { go } from "@/lib/route";
import { useCan, useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import { useMembers, useOrg, userType } from "@/store/org";
import { useUi } from "@/store/ui";
import type { View } from "@/App";

const nav: { view: View; label: string; icon: string; match?: View[] }[] = [
  { view: "dashboard", label: "Dashboard", icon: icons.navDashboard },
  { view: "workspace", label: "Workspace", icon: icons.navWorkspace },
  { view: "people", label: "Team", icon: icons.navClients, match: ["people", "teams"] },
  { view: "preferences", label: "Settings", icon: icons.navSettings },
];

/** ClickUp-style onboarding for a new workspace: invite, create a team, add and assign a client. */
function GettingStarted() {
  const wsId = useOrg((s) => s.currentId);
  const dismissed = useOrg((s) => s.onboardingDismissed[s.currentId]);
  const dismiss = useOrg((s) => s.dismissOnboarding);
  const members = useMembers();
  const allTeams = useOrg((s) => s.teams);
  const assignments = useOrg((s) => s.assignments);
  const clients = useEngagement((s) => s.clients);
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));

  const steps = useMemo(() => {
    const wsClients = clients.filter((c) => (c.workspaceId ?? "ws1") === wsId);
    return [
      { label: "Create a Workspace", done: true, to: undefined },
      { label: "Invite your team", done: members.length > 1, to: "people" as const },
      { label: "Create a team", done: allTeams.some((t) => t.workspaceId === wsId), to: "teams" as const },
      { label: "Add your first client", done: wsClients.length > 0, to: "new-client" as const },
      { label: "Assign a client", done: wsClients.some((c) => (assignments[c.id]?.memberIds.length ?? 0) > 0), to: "workspace" as const },
    ];
  }, [members, allTeams, assignments, clients, wsId]);

  if (dismissed) return null;
  const done = steps.filter((s) => s.done).length;

  return (
    <div ref={ref} className="relative px-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-md bg-brand-soft px-2 py-2 text-left text-sm text-fg hover:bg-brand-soft/80">
        <Rocket size={14} className="text-brand" />
        <span className="flex-1">Getting started</span>
        <span className="tnum rounded bg-surface px-1.5 text-xs text-brand">{done}/{steps.length}</span>
      </button>
      {open && (
        <div className="absolute bottom-11 left-2 z-40 w-64 rounded-lg border border-line bg-surface p-3 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-fg">Getting started</p>
            <button type="button" aria-label="Hide getting started" onClick={dismiss} className="text-muted hover:text-fg"><X size={14} /></button>
          </div>
          <p className="mt-1 text-xs text-muted">{Math.round((done / steps.length) * 100)}% complete</p>
          <div className="mt-2 h-1.5 rounded-full bg-section"><div className="h-full rounded-full bg-brand" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
          <ul className="mt-3 flex flex-col gap-1">
            {steps.map((s) => (
              <li key={s.label}>
                <button type="button" disabled={s.done || !s.to} onClick={() => { setOpen(false); if (s.to === "new-client") useUi.getState().openAddClient(); else if (s.to) go({ name: s.to }); }}
                  className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm ${s.done ? "text-status-prep-fg" : "text-fg hover:bg-surface-grey"}`}>
                  <span className={`flex size-4 items-center justify-center rounded-full ${s.done ? "bg-status-prep-fg text-surface" : "border border-line"}`}>{s.done && <Check size={10} strokeWidth={3} />}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ current }: { current: View }) {
  const me = useCurrentUser();
  const isAdmin = useCan("manageTeam");
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-surface-grey md:h-full md:w-[220px] md:border-r md:border-b-0">
      <div className="px-2 py-3 md:py-4">
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 overflow-x-auto md:overflow-y-auto" aria-label="Main">
        <ul className="flex gap-2 px-2 pb-2 md:flex-col md:pb-0">
          {nav.map((item) => {
            const active = item.view === current || item.match?.includes(current);
            return (
              <li key={item.view} className="shrink-0 md:w-full">
                <a href={`#${item.view}`} aria-current={active ? "page" : undefined}
                  className={`flex min-w-[128px] items-center gap-2 rounded px-2 py-1.5 text-sm leading-5 transition-colors ${active ? "bg-brand-soft text-sidebar-accent" : "text-muted hover:bg-brand-soft/60"}`}>
                  <img alt="" src={item.icon} className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden flex-col gap-2 pb-2 md:flex">
        {/* Setting up the workspace and inviting people are admin jobs. */}
        {isAdmin && <GettingStarted />}
        {isAdmin && <div className="px-2">
          <a href="#people" className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface py-1.5 text-sm text-fg hover:bg-brand-soft/60"><UserPlus size={14} /> Invite</a>
        </div>}
        <UserMenu className="px-2" buttonClassName="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left hover:bg-brand-soft/60">
          <span className="flex rounded-lg bg-brand-soft p-2"><img alt="" src={icons.user} className="size-4" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm leading-5 font-medium text-sidebar-fg">{me?.name ?? "Signed in"}</span>
            <span className="truncate text-xs leading-4 text-muted">{me ? (me.role === "Owner" ? "Admin · Owner" : userType(me)) : "Not in this workspace"}</span>
          </span>
          <img alt="" src={icons.chevronsUpDown} className="size-4 shrink-0" />
        </UserMenu>
      </div>
    </aside>
  );
}
