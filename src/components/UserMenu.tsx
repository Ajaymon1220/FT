import { useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";

import { usePopover } from "@/components/ui";
import { go } from "@/lib/route";
import { useAuth } from "@/store/auth";

/** Wraps a user chip; clicking it opens a menu with "Log out". */
export function UserMenu({ children, className = "", buttonClassName = "", title }: { children: ReactNode; className?: string; buttonClassName?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const signOut = useAuth((s) => s.signOut);

  const logout = () => {
    setOpen(false);
    signOut();
    go({ name: "login" });
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" title={title} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonClassName}>
        {children}
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-lg border border-line bg-surface p-1 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <button type="button" role="menuitem" autoFocus onClick={logout} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-grey">
            <LogOut size={14} className="text-muted" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
