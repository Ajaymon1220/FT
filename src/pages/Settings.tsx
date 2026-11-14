import { Lock } from "lucide-react";

import { SoftwarePicker } from "@/components/SoftwarePicker";
import { TopBar } from "@/components/TopBar";
import { softwareById } from "@/lib/taxSoftware";
import { isAdminRole, useCan, useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import { STAGES } from "@/lib/workflow";
import { RoleAccessMatrix } from "@/components/org/AccessEditor";
import { useCurrentWorkspace, useMembers, useOrg, userType, type UserType } from "@/store/org";

const TYPES: UserType[] = ["Admin", "Preparer", "Reviewer"];

const card = "flex flex-col gap-4 rounded-xl border border-line bg-surface p-5";

export function Settings() {
  const ws = useCurrentWorkspace();
  const me = useCurrentUser();
  const isAdmin = isAdminRole(me);
  const canSettings = useCan("manageSettings");
  const current = useOrg((s) => s.taxSoftware[s.currentId]);
  const setTaxSoftware = useOrg((s) => s.setTaxSoftware);
  const showToast = useEngagement((s) => s.showToast);
  const members = useMembers();

  return (
    <>
      <TopBar title="Settings" />
      <div className="flex max-w-4xl flex-col gap-6 px-6 py-6">
        <section aria-labelledby="sw-h" className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h2 id="sw-h" className="text-base leading-[22px] font-medium text-fg">Tax filing software</h2>
              <p className="text-sm text-muted">Where {ws.name} files returns. Admins push approved returns here. To bring clients over from it, use <b className="font-medium text-fg">Add client → Import</b> in the Workspace.</p>
            </div>
            {!canSettings && <span className="flex items-center gap-1 text-xs text-muted"><Lock size={12} /> Only admins can change this</span>}
          </div>
          <SoftwarePicker value={current} disabled={!canSettings} onChange={(id) => { setTaxSoftware(id); showToast(`${ws.name} now files with ${softwareById(id)?.name}.`); }} />
        </section>

        <section aria-labelledby="flow-h" className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h2 id="flow-h" className="text-base leading-[22px] font-medium text-fg">Workflow &amp; access</h2>
              <p className="text-sm text-muted">Every return in {ws.name} moves through these stages. The Workspace board, Dashboard and Team view all follow them.</p>
            </div>
            {me && <span className="rounded bg-brand-soft px-2 py-0.5 text-xs text-brand">You're {userType(me) === "Admin" ? "an Admin" : `a ${userType(me)}`}</span>}
          </div>
          <ol className="flex flex-wrap gap-2">
            {STAGES.map((st, i) => (
              <li key={st.status} className="flex min-w-[150px] flex-1 flex-col gap-1 rounded-md border border-line p-2.5">
                <span className="flex items-center gap-1.5 text-xs text-muted"><span className={`size-2 rounded-full ${st.dot}`} />Step {i + 1} · {st.owner === "Done" ? "Done" : st.owner}</span>
                <span className="text-sm font-medium text-fg">{st.status}</span>
                <span className="text-xs text-muted">{st.caption}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-fg">Who can do what</h3>
              <p className="text-xs text-muted">Recommended defaults come from how firms split the work: preparers handle all client work, reviewers check and approve. {isAdmin ? "Switch a permission to change it for everyone with that user type." : ""}</p>
            </div>
            <span className="flex gap-2 text-xs text-muted">{TYPES.map((t) => <span key={t} className="rounded bg-surface-grey px-2 py-0.5">{t} <span className="tnum text-fg">{members.filter((m) => m.role !== "Guest" && userType(m) === t).length}</span></span>)}</span>
          </div>
          <RoleAccessMatrix />
          <p className="text-xs text-muted">{isAdmin ? <>To give one person extra access, or take some away, open <a href="#people" className="text-brand underline">Team → People</a> and choose <b className="font-medium text-fg">Access</b> on their row.</> : "Ask an admin if you need more access."}</p>
        </section>
      </div>
    </>
  );
}
