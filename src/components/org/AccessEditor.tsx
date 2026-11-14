import { Check, Lock, Minus, RotateCcw } from "lucide-react";

import { Button } from "@/components/Button";
import { Modal, Switch } from "@/components/ui";
import type { Member } from "@/mocks/org";
import { isAdminRole, useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import { CAPABILITIES, ROLE_DEFAULTS, can, roleAllows, typeLabel, useOrg, userType, type Capability } from "@/store/org";

/** Select each slice separately (a fresh object from one selector would re-render forever). */
function useAccessState() {
  const currentId = useOrg((s) => s.currentId);
  const roleAccess = useOrg((s) => s.roleAccess);
  const memberAccess = useOrg((s) => s.memberAccess);
  return { currentId, roleAccess, memberAccess };
}

const GROUPS = ["Customers", "Preparation", "Review & filing", "Firm"] as const;
const EDITABLE = ["Preparer", "Reviewer"] as const;

function Tick({ on }: { on: boolean }) {
  return on
    ? <span className="inline-flex size-5 items-center justify-center rounded-full bg-status-prep-bg text-status-prep-fg"><Check size={12} strokeWidth={3} /><span className="sr-only">Allowed</span></span>
    : <span className="inline-flex size-5 items-center justify-center rounded-full bg-grid text-muted"><Minus size={12} /><span className="sr-only">Not allowed</span></span>;
}

/** What each user type can do in this workspace. Admins edit Preparer and Reviewer; Admin is always everything. */
export function RoleAccessMatrix() {
  const me = useCurrentUser();
  const editable = isAdminRole(me);
  const state = useAccessState();
  const { setRoleAccess, resetRoleAccess } = useOrg.getState();
  const showToast = useEngagement((s) => s.showToast);
  const changed = (t: (typeof EDITABLE)[number]) => CAPABILITIES.some((c) => roleAllows(t, c.id, state) !== ROLE_DEFAULTS[t][c.id]);

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-surface-muted text-left text-xs text-muted">
          <tr>
            <th className="px-3 py-2.5 font-medium">Permission</th>
            <th className="w-24 px-3 py-2.5 text-center font-medium">Admin</th>
            {EDITABLE.map((t) => (
              <th key={t} className="w-28 px-3 py-2.5 text-center font-medium">
                <span className="flex flex-col items-center gap-0.5">
                  {t}
                  {editable && changed(t) && (
                    <button type="button" onClick={() => { resetRoleAccess(t); showToast(`${t} access reset to recommended.`); }} className="flex items-center gap-1 text-[10px] font-normal text-brand hover:underline">
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {GROUPS.map((g) => (
          <tbody key={g}>
            <tr><td colSpan={4} className="bg-section px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">{g}</td></tr>
            {CAPABILITIES.filter((c) => c.group === g).map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-3 py-2.5">
                  <span className="block text-fg">{c.label}</span>
                  <span className="text-xs text-muted">{c.help}</span>
                </td>
                <td className="px-3 py-2.5 text-center"><Tick on /></td>
                {EDITABLE.map((t) => {
                  const on = roleAllows(t, c.id, state);
                  const custom = on !== ROLE_DEFAULTS[t][c.id];
                  return (
                    <td key={t} className="px-3 py-2.5">
                      <span className="flex items-center justify-center gap-1.5">
                        {editable
                          ? <span title={custom ? "Changed from the recommended default" : undefined} className="relative">
                              <Switch checked={on} onChange={(v) => setRoleAccess(t, c.id, v)} id={`role-${t}-${c.id}`} />
                              {custom && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-status-pending-fg ring-2 ring-surface" />}
                            </span>
                          : <Tick on={on} />}
                        <label htmlFor={`role-${t}-${c.id}`} className="sr-only">{t}: {c.label}</label>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      {!editable && <p className="flex items-center gap-1.5 border-t border-line px-3 py-2 text-xs text-muted"><Lock size={12} /> Only admins can change access.</p>}
    </div>
  );
}

/** Grant or remove individual permissions for one person, on top of their user type. */
export function MemberAccessPanel({ member, onClose }: { member: Member; onClose: () => void }) {
  const state = useAccessState();
  const overrides = useOrg((s) => s.memberAccess[s.currentId]?.[member.id]);
  const { setMemberAccess, resetMemberAccess } = useOrg.getState();
  const showToast = useEngagement((s) => s.showToast);
  const type = userType(member);
  const fixed = type === "Admin" || member.role === "Guest";
  const customCount = Object.keys(overrides ?? {}).length;

  const toggle = (cap: Capability, on: boolean) => {
    // Matching the role default clears the override instead of storing a redundant one.
    setMemberAccess(member.id, cap, on === roleAllows(type, cap, state) ? undefined : on);
  };

  return (
    <Modal title={`${member.name}'s access`} width={580} onClose={onClose}
      description={fixed ? (type === "Admin" ? "Admins can do everything in this workspace." : "Guests have view-only access.") : `Starts from what a ${type} can do. Turn individual permissions on or off for ${member.name.split(" ")[0]} only.`}
      footer={<>
        {!fixed && customCount > 0 && <Button variant="outline" onClick={() => { resetMemberAccess(member.id); showToast(`${member.name} now follows the ${type} defaults.`); }}>Reset to {type} defaults</Button>}
        <Button onClick={onClose}>Done</Button>
      </>}>
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {GROUPS.map((g) => (
          <section key={g} className="flex flex-col">
            <h3 className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">{g}</h3>
            {CAPABILITIES.filter((c) => c.group === g).map((c) => {
              const on = can(member, c.id, state);
              const custom = overrides?.[c.id] !== undefined;
              return (
                <div key={c.id} className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
                  <label htmlFor={`ma-${c.id}`} className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 text-sm text-fg">
                      {c.label}
                      {custom && <span className="rounded bg-status-pending-bg px-1.5 text-[10px] leading-4 text-status-pending-fg">{on ? "Granted" : "Removed"}</span>}
                    </span>
                    <span className="text-xs text-muted">{custom ? `${typeLabel(member)} default: ${roleAllows(type, c.id, state) ? "allowed" : "not allowed"}` : c.help}</span>
                  </label>
                  {fixed ? <Tick on={on} /> : <Switch id={`ma-${c.id}`} checked={on} onChange={(v) => toggle(c.id, v)} />}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </Modal>
  );
}
