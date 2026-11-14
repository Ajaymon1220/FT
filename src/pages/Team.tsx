import { useMemo, useState } from "react";
import { BarChart3, Check, KeyRound, Lock, MailPlus, MoreHorizontal, Plus, Search, Trash2, UserMinus, Users, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Avatar, AvatarStack } from "@/components/org/Avatar";
import { TopBar } from "@/components/TopBar";
import { Modal, usePopover } from "@/components/ui";
import { go } from "@/lib/route";
import type { Member, Role, Team as TeamT, Title } from "@/mocks/org";
import { useEngagement } from "@/store/engagement";
import { isAdminRole, useCan, useCurrentUser } from "@/store/auth";
import { MemberAccessPanel } from "@/components/org/AccessEditor";
import { MemberProgress } from "@/components/org/MemberProgress";
import { ME, WS_COLORS, CAPABILITIES, roleAllows, typeLabel, useCurrentWorkspace, useMembers, useOrg, userType, type UserType } from "@/store/org";

/** Owners and Admins change user types and access; "manageTeam" covers inviting, removing and teams. */
const useIsAdmin = () => isAdminRole(useCurrentUser());

function ReadOnlyNote({ children }: { children: string }) {
  return <p className="flex items-center gap-1.5 text-xs text-muted"><Lock size={12} /> {children}</p>;
}

/** The three user types in the return workflow. */
const USER_TYPES: UserType[] = ["Admin", "Preparer", "Reviewer"];
const TYPE_HELP: Record<UserType, string> = {
  Admin: "Monitors the team, manages people and settings, and pushes approved returns to tax software.",
  Preparer: "Sets up customer checklists, approves documents and prepares the worksheet for review.",
  Reviewer: "Reviews prepared worksheets, then approves them or sends them back with changes.",
};
const INVITE_AS: Record<UserType, [Role, Title]> = { Admin: ["Admin", "Admin staff"], Preparer: ["Member", "Preparer"], Reviewer: ["Member", "Reviewer"] };

function useClientCounts() {
  const assignments = useOrg((s) => s.assignments);
  const wsId = useOrg((s) => s.currentId);
  const clients = useEngagement((s) => s.clients);
  return useMemo(() => {
    const byMember: Record<string, number> = {};
    const byTeam: Record<string, number> = {};
    const inWs = new Set(clients.filter((c) => !c.archived && (c.workspaceId ?? "ws1") === wsId).map((c) => c.id));
    for (const [clientId, a] of Object.entries(assignments)) {
      if (!inWs.has(clientId)) continue;
      a.memberIds.forEach((m) => (byMember[m] = (byMember[m] ?? 0) + 1));
      if (a.teamId) byTeam[a.teamId] = (byTeam[a.teamId] ?? 0) + 1;
    }
    return { byMember, byTeam };
  }, [assignments, clients, wsId]);
}

/* ================= People ================= */
/** "Preparer defaults" or "Custom · 2" — how this person's access compares to their user type. */
function AccessChip({ m, onClick }: { m: Member; onClick?: () => void }) {
  const overrides = useOrg((s) => s.memberAccess[s.currentId]?.[m.id]);
  useOrg((s) => s.roleAccess);
  const type = userType(m);
  const n = Object.entries(overrides ?? {}).filter(([cap, on]) => on !== roleAllows(type, cap as (typeof CAPABILITIES)[number]["id"])).length;
  const label = m.role === "Guest" ? "View only" : type === "Admin" ? "Full access" : n ? `Custom · ${n}` : `${type} defaults`;
  const cls = `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${n && type !== "Admin" ? "bg-status-pending-bg text-status-pending-fg" : "bg-surface-grey text-muted"}`;
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:ring-1 hover:ring-brand-border`} aria-label={`Edit ${m.name}'s access: ${label}`}><KeyRound size={11} />{label}</button>
    : <span className={cls}><KeyRound size={11} />{label}</span>;
}
function MemberMenu({ m, onRemove, onAccess, onProgress, canRemove }: { m: Member; onRemove: () => void; onAccess?: () => void; onProgress?: () => void; canRemove: boolean }) {
  const acceptInvite = useOrg((s) => s.acceptInvite);
  const showToast = useEngagement((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-grey";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Actions for ${m.name}`} onClick={() => setOpen((o) => !o)} className="flex size-7 items-center justify-center rounded hover:bg-surface-grey"><MoreHorizontal size={16} /></button>
      {open && (
        <div className="absolute top-8 right-0 z-30 w-52 rounded-md border border-line bg-surface py-1 shadow-lg">
          {m.status === "Pending" && (
            <>
              <button type="button" className={item} onClick={() => { setOpen(false); showToast(`Invitation resent to ${m.email}`); }}><MailPlus size={14} /> Resend invite</button>
              <button type="button" className={item} onClick={() => { setOpen(false); acceptInvite(m.id); showToast(`${m.name} joined the workspace`); }}><Check size={14} /> Mark as joined (demo)</button>
            </>
          )}
          {onProgress && <button type="button" className={item} onClick={() => { setOpen(false); onProgress(); }}><BarChart3 size={14} /> View progress</button>}
          {onAccess && <button type="button" className={item} onClick={() => { setOpen(false); onAccess(); }}><KeyRound size={14} /> Edit access</button>}
          {canRemove && <button type="button" className={`${item} text-destructive disabled:cursor-not-allowed disabled:opacity-40`} disabled={m.role === "Owner" || m.id === ME}
            title={m.role === "Owner" ? "The owner can't be removed" : m.id === ME ? "You can't remove yourself" : undefined}
            onClick={() => { setOpen(false); onRemove(); }}>
            <UserMinus size={14} /> Remove from workspace
          </button>}
        </div>
      )}
    </div>
  );
}

function People() {
  const members = useMembers();
  const { byMember } = useClientCounts();
  const { inviteMembers, setUserType, removeMember } = useOrg.getState();
  const showToast = useEngagement((s) => s.showToast);
  const ws = useCurrentWorkspace();
  const isAdmin = useIsAdmin();
  const canManage = useCan("manageTeam");
  const canProgress = useCan("viewTeamProgress");
  const me = useCurrentUser();
  const [accessFor, setAccessFor] = useState<Member | null>(null);
  const [progressFor, setProgressFor] = useState<Member | null>(null);
  // Only admins can invite someone as an admin.
  const inviteTypes = isAdmin ? USER_TYPES : USER_TYPES.filter((t) => t !== "Admin");
  const [tab, setTab] = useState<"members" | "guests">("members");
  const [q, setQ] = useState("");
  const [emails, setEmails] = useState("");
  const [inviteType, setInviteType] = useState<UserType>("Preparer");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);

  const guests = members.filter((m) => m.role === "Guest");
  const full = members.filter((m) => m.role !== "Guest");
  const list = (tab === "members" ? full : guests).filter((m) => !q || `${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase()));

  const invite = () => {
    const parsed = emails.split(/[\s,;]+/).filter(Boolean);
    if (!parsed.length) return setError("Enter at least one email address.");
    const bad = parsed.filter((e) => !/^\S+@\S+\.\S+$/.test(e));
    if (bad.length) return setError(`Check these emails: ${bad.join(", ")}`);
    const n = inviteMembers(parsed, ...INVITE_AS[inviteType]);
    setEmails(""); setError("");
    showToast(n ? `Invitation sent to ${n} ${n === 1 ? "person" : "people"} as ${inviteType}` : "Everyone you entered is already in this workspace");
  };

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-fg">Manage people</h1>
          <p className="mt-1 text-sm text-muted">Everyone in {ws.name}. Assign them to customers from the Workspace list.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-line px-3">
          <Search size={16} className="text-muted" />
          <input id="people-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="w-full min-w-0 text-sm outline-none placeholder:text-muted" />
        </label>
        {canManage ? <div className="flex min-w-[320px] flex-1 flex-col gap-1">
          <div className="flex overflow-hidden rounded-md border border-line focus-within:border-brand">
            <input id="invite-emails" value={emails} onChange={(e) => { setEmails(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && invite()}
              placeholder="Invite by email (comma or space separated)" className="h-9 min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-muted" />
            <select id="invite-role" aria-label="Invite as" value={inviteType} onChange={(e) => setInviteType(e.target.value as UserType)} className="border-l border-line bg-surface px-2 text-sm">
              {inviteTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button type="button" onClick={invite} className="bg-brand px-4 text-sm text-on-brand hover:bg-brand/90">Invite</button>
          </div>
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : <p className="text-xs text-muted">{TYPE_HELP[inviteType]}</p>}
        </div> : <div className="flex min-w-[320px] flex-1 items-center"><ReadOnlyNote>Only admins can invite people or change user types and access.</ReadOnlyNote></div>}
      </div>

      <div role="tablist" className="flex gap-6 border-b border-line text-sm">
        {(["members", "guests"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px pb-2 ${tab === t ? "border-b-2 border-brand font-medium text-fg" : "text-muted hover:text-fg"}`}>
            {t === "members" ? `Full members (${full.length})` : `Guests (${guests.length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-surface-muted text-left text-xs text-muted uppercase">
            <tr>{["Name", "Email", "User type", "Access", "Customers", "Progress", "Last active", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <Avatar name={m.name} size={28} pending={m.status === "Pending"} />
                    <span className="text-fg">{m.name}{m.id === ME && <span className="text-muted"> (you)</span>}</span>
                    {m.status === "Pending" && <span className="rounded border border-status-invited-fg/40 px-1.5 text-[10px] tracking-wide text-status-invited-fg uppercase">Pending</span>}
                    {m.role === "Owner" && <span className="rounded border border-brand/40 px-1.5 text-[10px] tracking-wide text-brand uppercase">Owner</span>}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted">{m.email}</td>
                <td className="px-3 py-2.5">
                  {m.role === "Owner" || !isAdmin ? <span className="text-fg" title={m.role === "Guest" ? undefined : TYPE_HELP[userType(m)]}>{m.role === "Guest" ? "Guest (view only)" : typeLabel(m)}</span>
                    : m.role === "Guest" ? <span className="text-muted">Guest (view only)</span>
                    : (
                      <select aria-label={`User type for ${m.name}`} title={TYPE_HELP[userType(m)]} value={userType(m)} onChange={(e) => { setUserType(m.id, e.target.value as UserType); showToast(`${m.name} is now ${e.target.value === "Admin" ? "an Admin" : `a ${e.target.value}`}`); }} className="rounded border border-transparent bg-transparent py-1 hover:border-line">
                        {USER_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    )}
                </td>
                <td className="px-3 py-2.5"><AccessChip m={m} onClick={isAdmin ? () => setAccessFor(m) : undefined} /></td>
                <td className="tnum px-3 py-2.5 text-fg">{byMember[m.id] ?? 0}</td>
                <td className="px-3 py-2.5">
                  {(canProgress || m.id === me?.id) && m.role !== "Guest"
                    ? <button type="button" onClick={() => setProgressFor(m)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-brand hover:bg-brand-soft"><BarChart3 size={12} /> View</button>
                    : <span className="text-xs text-muted">—</span>}
                </td>
                <td className="px-3 py-2.5 text-muted">{m.lastActive}</td>
                <td className="px-3 py-2.5">{(canManage || isAdmin) && <MemberMenu m={m} canRemove={canManage} onRemove={() => setRemoving(m)} onAccess={isAdmin ? () => setAccessFor(m) : undefined} onProgress={canProgress && m.role !== "Guest" ? () => setProgressFor(m) : undefined} />}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-muted">{tab === "guests" ? "No guests yet. Invite someone as Guest to give view-only access." : "No one matches that search."}</td></tr>}
          </tbody>
        </table>
      </div>

      {accessFor && <MemberAccessPanel member={accessFor} onClose={() => setAccessFor(null)} />}
      {progressFor && <MemberProgress member={progressFor} onClose={() => setProgressFor(null)} />}
      {removing && (
        <Modal title={`Remove ${removing.name}?`} description={`They lose access to ${ws.name} and are unassigned from ${byMember[removing.id] ?? 0} customer${byMember[removing.id] === 1 ? "" : "s"} and their teams. Their past activity stays in each customer's history.`}
          onClose={() => setRemoving(null)} width={460}
          footer={<><Button variant="outline" onClick={() => setRemoving(null)}>Cancel</Button>
            <button type="button" onClick={() => { removeMember(removing.id); showToast(`${removing.name} removed from ${ws.name}`); setRemoving(null); }} className="rounded-md bg-destructive px-3 py-1 text-sm text-white hover:bg-destructive/90">Remove</button></>}>
          <span className="sr-only">Confirm removal</span>
        </Modal>
      )}
    </div>
  );
}

/* ================= Teams ================= */
function TeamModal({ team, onClose }: { team?: TeamT; onClose: () => void }) {
  const members = useMembers();
  const { createTeam, setTeamMembers } = useOrg.getState();
  const showToast = useEngagement((s) => s.showToast);
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [color, setColor] = useState(team?.color ?? WS_COLORS[0]);
  const [ids, setIds] = useState<string[]>(team?.memberIds ?? [ME]);
  const [error, setError] = useState("");
  const toggle = (id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = () => {
    if (!team && !name.trim()) return setError("Give the team a name.");
    if (team) { setTeamMembers(team.id, ids); showToast(`${team.name} now has ${ids.length} member${ids.length === 1 ? "" : "s"}`); }
    else { createTeam({ name, description, color, memberIds: ids }); showToast(`${name.trim()} created with ${ids.length} member${ids.length === 1 ? "" : "s"}`); }
    onClose();
  };

  return (
    <Modal title={team ? `${team.name} members` : "Create Team"} description={team ? undefined : "Use Teams to group people you assign to customers together, like a preparer and their reviewer."}
      onClose={onClose} width={500} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{team ? "Save" : "Create Team"}</Button></>}>
      <div className="flex flex-col gap-4">
        {!team && (
          <>
            <div>
              <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium text-fg">Icon &amp; name</label>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-md text-white" style={{ background: color }}><Users size={16} /></span>
                <input id="team-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Individual Returns" className="h-9 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-brand" />
              </div>
              <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Team colour">
                {WS_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className={`size-5 rounded-full ${color === c ? "ring-2 ring-fg/30 ring-offset-1" : ""}`} style={{ background: c }} />)}
              </div>
            </div>
            <div>
              <label htmlFor="team-desc" className="mb-1.5 block text-sm font-medium text-fg">Description (optional)</label>
              <textarea id="team-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
          </>
        )}
        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Members <span className="font-normal text-muted">· {ids.length} selected</span></p>
          <div className="max-h-56 overflow-auto rounded-md border border-line">
            {members.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-sm last:border-b-0 hover:bg-surface-grey">
                <input type="checkbox" checked={ids.includes(m.id)} onChange={() => toggle(m.id)} className="size-4 accent-brand" />
                <Avatar name={m.name} pending={m.status === "Pending"} />
                <span className="flex-1">{m.name}{m.id === ME && <span className="text-muted"> (you)</span>}</span>
                <span className="text-xs text-muted">{typeLabel(m)}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

function TeamDrawer({ team, onClose, onEdit }: { team: TeamT; onClose: () => void; onEdit?: () => void }) {
  const members = useMembers();
  const assignments = useOrg((s) => s.assignments);
  const clients = useEngagement((s) => s.clients);
  const setTeamMembers = useOrg((s) => s.setTeamMembers);
  const people = members.filter((m) => team.memberIds.includes(m.id));
  const owned = clients.filter((c) => !c.archived && assignments[c.id]?.teamId === team.id);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-fg/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-label={team.name} className="flex h-full w-full max-w-[420px] flex-col gap-5 overflow-auto bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md text-white" style={{ background: team.color }}><Users size={18} /></span>
            <div>
              <h2 className="text-lg font-medium text-fg">{team.name}</h2>
              <p className="text-xs text-muted">{team.alias}</p>
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-grey"><X size={16} /></button>
        </div>
        {team.description && <p className="text-sm text-muted">{team.description}</p>}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-fg">Members · {people.length}</h3>
            {onEdit && <button type="button" onClick={onEdit} className="flex items-center gap-1 text-sm text-brand hover:underline"><Plus size={14} /> Add member</button>}
          </div>
          <ul className="flex flex-col">
            {people.map((m) => (
              <li key={m.id} className="flex items-center gap-2 border-b border-line py-2 text-sm">
                <Avatar name={m.name} pending={m.status === "Pending"} />
                <span className="flex-1">{m.name}</span>
                <span className="text-xs text-muted">{typeLabel(m)}</span>
                {onEdit && <button type="button" aria-label={`Remove ${m.name} from ${team.name}`} onClick={() => setTeamMembers(team.id, team.memberIds.filter((x) => x !== m.id))} className="rounded p-1 text-muted hover:text-destructive"><X size={14} /></button>}
              </li>
            ))}
            {people.length === 0 && <li className="py-3 text-sm text-muted">No members yet.</li>}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-medium text-fg">Customers · {owned.length}</h3>
          <ul className="flex flex-col">
            {owned.map((c) => (
              <li key={c.id}><a href={`#client-${c.id}-checklist`} className="flex items-center justify-between border-b border-line py-2 text-sm hover:text-brand">{c.name}<span className="text-xs text-muted">{c.returnType} · {c.status}</span></a></li>
            ))}
            {owned.length === 0 && <li className="py-3 text-sm text-muted">Assign this team to a customer from the Assignee column in Workspace.</li>}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function Teams() {
  const allTeams = useOrg((s) => s.teams);
  const wsId = useOrg((s) => s.currentId);
  const members = useMembers();
  const deleteTeam = useOrg((s) => s.deleteTeam);
  const showToast = useEngagement((s) => s.showToast);
  const { byTeam } = useClientCounts();
  const isAdmin = useCan("manageTeam");
  const ws = useCurrentWorkspace();
  const [deleting, setDeleting] = useState<TeamT | null>(null);
  const teams = useMemo(() => allTeams.filter((t) => t.workspaceId === wsId), [allTeams, wsId]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamT | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const viewTeam = teams.find((t) => t.id === viewing);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name;

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-fg">Teams</h1>
          <p className="mt-1 text-sm text-muted">Group people so you can assign a whole team to a customer.</p>
        </div>
        {!isAdmin && <ReadOnlyNote>Only admins can create or change teams.</ReadOnlyNote>}
        {isAdmin && teams.length > 0 && <Button icon={undefined} onClick={() => setCreating(true)}><span className="flex items-center gap-1.5"><Plus size={14} /> Create Team</span></Button>}
      </div>

      {teams.length === 0 ? (
        <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-xl border border-line"><Users size={22} className="text-muted" /></span>
          <h2 className="text-base font-medium text-fg">No teams yet</h2>
          <p className="text-sm text-muted">{isAdmin ? "Create a team to group preparers and reviewers, then assign it to customers in one click." : `${ws.name} has no teams yet. Ask an admin to create one.`}</p>
          {isAdmin && <Button onClick={() => setCreating(true)}>Create a Team</Button>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-muted text-left text-xs text-muted uppercase">
              <tr>{["Name", "Alias", "Members", "Customers", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const names = t.memberIds.map(nameOf).filter(Boolean) as string[];
                return (
                  <tr key={t.id} className="cursor-pointer border-t border-line hover:bg-surface-grey" onClick={(e) => !(e.target as HTMLElement).closest("button") && setViewing(t.id)}>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-md text-white" style={{ background: t.color }}><Users size={14} /></span>
                        <span><span className="block text-fg">{t.name}</span><span className="text-xs text-muted">{names.length} member{names.length === 1 ? "" : "s"}</span></span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{t.alias}</td>
                    <td className="px-3 py-2.5">{names.length ? <AvatarStack names={names} max={4} /> : <span className="text-muted">—</span>}</td>
                    <td className="tnum px-3 py-2.5 text-fg">{byTeam[t.id] ?? 0}</td>
                    <td className="px-3 py-2.5">
                      {isAdmin && <span className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(t)} className="rounded px-2 py-1 text-xs text-brand hover:bg-brand-soft">Edit members</button>
                        <button type="button" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)} className="rounded p-1 text-muted hover:text-destructive"><Trash2 size={14} /></button>
                      </span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isAdmin && <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-sm text-muted hover:text-fg"><Plus size={14} /> Create Team</button>}
        </div>
      )}

      {creating && <TeamModal onClose={() => setCreating(false)} />}
      {editing && <TeamModal team={editing} onClose={() => setEditing(null)} />}
      {viewTeam && <TeamDrawer team={viewTeam} onClose={() => setViewing(null)} onEdit={isAdmin ? () => setEditing(viewTeam) : undefined} />}
      {deleting && (
        <Modal title={`Delete ${deleting.name}?`} description={`It's removed from ${byTeam[deleting.id] ?? 0} customer${byTeam[deleting.id] === 1 ? "" : "s"}. Its people stay in ${ws.name} and keep their customer assignments.`}
          onClose={() => setDeleting(null)} width={460}
          footer={<><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <button type="button" onClick={() => { deleteTeam(deleting.id); showToast(`${deleting.name} deleted. Its people stay in the workspace.`); if (viewing === deleting.id) setViewing(null); setDeleting(null); }} className="rounded-md bg-destructive px-3 py-1 text-sm text-white hover:bg-destructive/90">Delete team</button></>}>
          <span className="sr-only">Confirm delete</span>
        </Modal>
      )}
    </div>
  );
}

export function TeamPage({ tab }: { tab: "people" | "teams" }) {
  return (
    <>
      <TopBar title="Team" />
      <div role="tablist" aria-label="Team" className="flex gap-1 border-b border-line px-6">
        {(["people", "teams"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => go({ name: t })}
            className={`-mb-px px-3 pt-3 pb-2 text-sm ${tab === t ? "border-b-2 border-brand font-semibold text-brand" : "font-medium text-muted hover:text-fg"}`}>
            {t === "people" ? "People" : "Teams"}
          </button>
        ))}
      </div>
      {tab === "people" ? <People /> : <Teams />}
    </>
  );
}
