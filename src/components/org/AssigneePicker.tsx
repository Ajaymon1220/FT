import { useMemo, useState } from "react";
import { Check, Search, UserPlus, Users } from "lucide-react";

import { usePopover } from "@/components/ui";
import { useEngagement } from "@/store/engagement";
import { useCan } from "@/store/auth";
import { ME, typeLabel, useMembers, useOrg } from "@/store/org";
import { Avatar, AvatarStack } from "./Avatar";

/** Assignee cell: avatar stack + add-person button; popover lists teams and people of the current workspace. */
export function AssigneePicker({ clientId, align = "left" }: { clientId: string; align?: "left" | "right" }) {
  const members = useMembers();
  const isAdmin = useCan("manageTeam");
  const canAssign = useCan("assignWork");
  const allTeams = useOrg((s) => s.teams);
  const wsId = useOrg((s) => s.currentId);
  const teams = useMemo(() => allTeams.filter((t) => t.workspaceId === wsId), [allTeams, wsId]);
  const current = useOrg((s) => s.assignments[clientId]);
  const assign = useOrg((s) => s.assign);
  const showToast = useEngagement((s) => s.showToast);
  const clientName = useEngagement((s) => s.clients.find((c) => c.id === clientId)?.name);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = usePopover(open, () => setOpen(false));

  const ids = current?.memberIds ?? [];
  const assigned = members.filter((m) => ids.includes(m.id));
  const team = teams.find((t) => t.id === current?.teamId);
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    assign(clientId, next, current?.teamId);
  };
  const pickTeam = (teamId: string) => {
    if (current?.teamId === teamId) return assign(clientId, ids, undefined);
    const t = teams.find((x) => x.id === teamId)!;
    assign(clientId, [...new Set([...ids, ...t.memberIds])], teamId);
    showToast(`${clientName} assigned to ${t.name} (${t.memberIds.length} people)`);
  };

  // Without "assignWork" the cell just shows who's on the client.
  if (!canAssign) {
    return (
      <span className="flex h-8 items-center px-1" aria-label={`Assignees for ${clientName}: ${assigned.map((a) => a.name).join(", ") || "none"}`}>
        {assigned.length > 0 ? <AvatarStack names={assigned.map((a) => a.name)} /> : <span className="text-xs text-muted">—</span>}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Assignees for ${clientName}: ${assigned.map((a) => a.name).join(", ") || "none"}`}
        className="flex h-8 items-center gap-1.5 rounded-md px-1 hover:bg-surface-grey">
        {assigned.length > 0 && <AvatarStack names={assigned.map((a) => a.name)} />}
        <UserPlus size={16} className="text-muted" />
      </button>
      {open && (
        <div role="dialog" aria-label="Assign people" className={`absolute top-9 z-40 w-72 rounded-lg border border-line bg-surface p-2 shadow-[0_10px_30px_rgba(0,0,0,0.14)] ${align === "right" ? "right-0" : "left-0"}`}>
          <label className="mb-2 flex h-8 items-center gap-2 rounded-md border border-line px-2">
            <Search size={14} className="text-muted" />
            <input id={`assign-search-${clientId}`} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people or teams" className="w-full min-w-0 text-sm outline-none placeholder:text-muted" />
          </label>
          {teams.some((t) => match(t.name)) && <p className="px-2 pt-1 pb-1 text-xs text-muted">Teams</p>}
          {teams.filter((t) => match(t.name)).map((t) => (
            <button key={t.id} type="button" onClick={() => pickTeam(t.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-grey">
              <span className="flex size-6 items-center justify-center rounded text-white" style={{ background: t.color }}><Users size={12} /></span>
              <span className="flex-1 truncate">{t.name} <span className="text-xs text-muted">· {t.memberIds.length}</span></span>
              {team?.id === t.id && <Check size={14} className="text-brand" />}
            </button>
          ))}
          <p className="px-2 pt-2 pb-1 text-xs text-muted">People</p>
          <div className="max-h-56 overflow-auto">
            {members.filter((m) => match(m.name) || match(m.email)).map((m) => (
              <button key={m.id} type="button" onClick={() => toggle(m.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-grey">
                <Avatar name={m.name} pending={m.status === "Pending"} />
                <span className="min-w-0 flex-1 truncate">{m.name}{m.id === ME && <span className="text-muted"> (you)</span>} <span className="text-xs text-muted">· {typeLabel(m)}</span></span>
                {ids.includes(m.id) && <Check size={14} className="text-brand" />}
              </button>
            ))}
          </div>
          {isAdmin && <a href="#people" className="mt-1 block border-t border-line px-2 pt-2 text-xs text-brand hover:underline">Invite someone new</a>}
        </div>
      )}
    </div>
  );
}
