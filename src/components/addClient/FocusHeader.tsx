import type { ReactNode } from "react";
import { Download, UserPlus, X } from "lucide-react";

import { softwareById } from "@/lib/taxSoftware";
import { useCurrentUser } from "@/store/auth";
import { useCurrentWorkspace, useOrg, userType } from "@/store/org";
import { useUi } from "@/store/ui";

/** Slim top bar for the full-screen Add client flow: close · title · path switch · step. No sidebar. */
export function FocusHeader({ current, right }: { current?: "new" | "import"; right?: ReactNode }) {
  const ws = useCurrentWorkspace();
  const close = useUi((s) => s.closeAddClient);
  return (
    <header className="sticky top-0 z-20 grid min-h-12 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-surface px-6 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={close} aria-label="Close and go back" title="Close (Esc on the first screen)" className="-ml-1.5 flex rounded p-1 text-muted hover:bg-surface-grey hover:text-fg">
          <X size={16} />
        </button>
        <span className="h-5 w-px bg-line" aria-hidden />
        <span className="truncate text-base leading-[22px] font-medium tracking-[-0.18px] text-fg">Add customer</span>
        <span className="hidden truncate text-sm text-muted md:inline">· {ws.name}</span>
      </div>
      <div>{current && <AddClientSwitch current={current} />}</div>
      <div className="flex items-center justify-end">{right}</div>
    </header>
  );
}

/** Segmented switch between the two ways of adding clients. */
export function AddClientSwitch({ current }: { current: "new" | "import" }) {
  const software = softwareById(useOrg((s) => s.taxSoftware[s.currentId]))?.name;
  const me = useCurrentUser();
  const canImport = !!me && userType(me) !== "Reviewer";
  // Same pattern as the Workspace filter chips: 28px, rounded-3xl, active = brand-soft.
  const item = (on: boolean) => `flex h-7 items-center gap-2 rounded-3xl border px-3 text-sm whitespace-nowrap ${on ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-fg"}`;
  return (
    <nav aria-label="How to add customers" className="flex items-center gap-2">
      <a href="#new-client" aria-current={current === "new" ? "page" : undefined} className={item(current === "new")}><UserPlus size={16} /> <span className="hidden sm:inline">New customer</span><span className="sm:hidden">New</span></a>
      {canImport && (
        <a href="#import" aria-current={current === "import" ? "page" : undefined} className={item(current === "import")}>
          <Download size={16} /> <span className="hidden sm:inline">Import{software ? ` from ${software}` : ""}</span><span className="sm:hidden">Import</span>
        </a>
      )}
    </nav>
  );
}
