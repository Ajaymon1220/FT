import { useState } from "react";
import { ArrowLeft, Check, ChevronsUpDown, Plus, Settings, Users, X } from "lucide-react";

import { Button } from "@/components/Button";
import { usePopover } from "@/components/ui";
import { go } from "@/lib/route";
import { useEngagement } from "@/store/engagement";
import { WS_COLORS, useOrg } from "@/store/org";
import type { Role } from "@/mocks/org";
import { WorkspaceMark } from "./Avatar";

/* ---------------- Create workspace (ClickUp-style 3-step onboarding) ---------------- */
export function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const createWorkspace = useOrg((s) => s.createWorkspace);
  const showToast = useEngagement((s) => s.showToast);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [color, setColor] = useState(WS_COLORS[2]);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<Role>("Member");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");

  const parsed = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const bad = parsed.filter((e) => !/^\S+@\S+\.\S+$/.test(e));
  const steps = ["Name your firm", "Invite your team", "Create your first team"];

  const next = (skip = false) => {
    if (step === 0 && !name.trim()) return setError("Give your workspace a name, like your firm's name.");
    if (step === 1 && !skip && bad.length) return setError(`Check these emails: ${bad.join(", ")}`);
    setError("");
    if (step === 1 && skip) setEmails("");
    if (step < 2) return setStep(step + 1);
    const invites = emails.trim() ? parsed.filter((e) => !bad.includes(e)) : [];
    createWorkspace({ name, color, invites: invites.map((email) => ({ email, role })), teamName: skip ? "" : teamName });
    showToast(`${name.trim()} created${invites.length ? ` · ${invites.length} invite${invites.length > 1 ? "s" : ""} sent` : ""}`);
    onClose();
    go({ name: "workspace" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/30 p-4">
      <div role="dialog" aria-modal="true" aria-label="Create workspace" className="relative w-full max-w-[560px] overflow-hidden rounded-xl bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: "var(--ai-bar)" }} />
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-4 right-4 rounded p-1 text-muted hover:bg-surface-grey"><X size={16} /></button>
        <div className="px-8 pt-8 pb-6">
          <p className="text-xs tracking-wide text-muted uppercase">Step {step + 1} of 3 · {steps[step]}</p>

          {step === 0 && (
            <div className="mt-4 flex flex-col gap-5">
              <h2 className="text-2xl font-medium text-fg">Name your Workspace</h2>
              <p className="-mt-3 text-sm text-muted">A workspace holds one firm's clients, people and teams. You can switch between workspaces at any time.</p>
              <div className="flex items-center gap-3">
                <WorkspaceMark name={name || "W"} color={color} size={44} />
                <input id="ws-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="e.g. Pacific Coast Tax Group" className="h-11 flex-1 rounded-md border border-line px-3 text-base outline-none focus:border-brand" />
              </div>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Workspace colour">
                <span className="mr-1 text-sm text-muted">Colour</span>
                {WS_COLORS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className="flex size-6 items-center justify-center rounded-full" style={{ background: c }}>
                    {color === c && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-4 flex flex-col gap-4">
              <h2 className="text-2xl font-medium text-fg">Invite people to your Workspace</h2>
              <textarea id="ws-invites" autoFocus rows={3} value={emails} onChange={(e) => { setEmails(e.target.value); setError(""); }}
                placeholder="Enter email addresses (or paste multiple)" className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
              <label className="flex items-center gap-3 text-sm text-fg">
                Invite as
                <select id="ws-invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-9 rounded-md border border-line px-2">
                  <option>Member</option><option>Admin</option><option>Guest</option>
                </select>
              </label>
              <p className="w-fit rounded bg-status-prep-bg px-2 py-1 text-xs text-status-prep-fg">Preparers and reviewers can be assigned to clients once they accept.</p>
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 flex flex-col gap-4">
              <h2 className="text-2xl font-medium text-fg">Create your first team</h2>
              <p className="-mt-2 text-sm text-muted">Teams group people so you can assign a whole team to a client, like “Individual Returns” or “Review Desk”.</p>
              <input id="ws-team" autoFocus value={teamName} onChange={(e) => setTeamName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="Team name (optional)" className="h-11 rounded-md border border-line px-3 text-base outline-none focus:border-brand" />
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
        <div className="h-1 bg-section"><div className="h-full bg-brand transition-[width]" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
        <div className="flex items-center justify-between px-8 py-4">
          {step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)}><span className="flex items-center gap-1"><ArrowLeft size={14} /> Back</span></Button> : <span />}
          <div className="flex items-center gap-2">
            {step > 0 && <button type="button" onClick={() => next(true)} className="text-sm text-muted hover:text-fg">Skip</button>}
            <Button onClick={() => next()}>{step === 2 ? "Create Workspace" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Switcher (sidebar header, replaces the logo) ---------------- */
export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const workspaces = useOrg((s) => s.workspaces);
  const currentId = useOrg((s) => s.currentId);
  const members = useOrg((s) => s.members);
  const switchWorkspace = useOrg((s) => s.switchWorkspace);
  const showToast = useEngagement((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const ws = workspaces.find((w) => w.id === currentId)!;
  const count = (id: string) => (members[id] ?? []).filter((m) => m.status === "Active").length;

  const switchTo = (id: string) => {
    switchWorkspace(id);
    setOpen(false);
    showToast(`Switched to ${workspaces.find((w) => w.id === id)?.name}`);
    go({ name: "workspace" });
  };

  return (
    <div ref={ref} className="relative">
      {compact ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Workspace: ${ws.name}. Switch workspace`} title={ws.name} className="rounded-md p-0.5 hover:bg-nav-active">
          <WorkspaceMark name={ws.name} color={ws.color} size={28} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Workspace: ${ws.name}. Switch workspace`}
          className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-brand-soft/60">
          <WorkspaceMark name={ws.name} color={ws.color} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{ws.name}</span>
          <ChevronsUpDown size={14} className="shrink-0 text-muted" />
        </button>
      )}

      {open && (
        <div role="menu" className={`absolute z-50 w-72 rounded-lg border border-line bg-surface p-2 shadow-[0_10px_30px_rgba(0,0,0,0.16)] ${compact ? "top-0 left-11" : "top-12 left-0"}`}>
          <div className="flex items-center gap-3 px-2 py-2">
            <WorkspaceMark name={ws.name} color={ws.color} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{ws.name}</p>
              <p className="text-xs text-muted">{ws.plan} · {count(ws.id)} member{count(ws.id) === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 px-1 pb-2">
            <button type="button" role="menuitem" onClick={() => { setOpen(false); go({ name: "preferences" }); }} className="flex items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-sm text-fg hover:bg-surface-grey"><Settings size={14} /> Settings</button>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); go({ name: "people" }); }} className="flex items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-sm text-fg hover:bg-surface-grey"><Users size={14} /> People</button>
          </div>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); go({ name: "teams" }); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-fg hover:bg-surface-grey">Teams</button>
          <div className="mt-1 border-t border-line pt-2">
            <p className="px-2 pb-1 text-xs text-muted">Switch Workspaces</p>
            {workspaces.map((w) => (
              <button key={w.id} type="button" role="menuitemradio" aria-checked={w.id === currentId} onClick={() => (w.id === currentId ? setOpen(false) : switchTo(w.id))}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-grey">
                <WorkspaceMark name={w.name} color={w.color} size={22} />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                {w.id === currentId && <Check size={14} className="text-brand" />}
              </button>
            ))}
          </div>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setCreating(true); }} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-line py-2 text-sm text-fg hover:bg-surface-grey">
            <Plus size={14} /> Create Workspace
          </button>
        </div>
      )}
      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  );
}
