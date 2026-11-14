import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/Button";
import { icons } from "@/components/icons";
import { Modal, usePopover } from "@/components/ui";
import { go, href } from "@/lib/route";
import { stageOf } from "@/lib/workflow";
import type { Client } from "@/mocks/clients";
import { isAdminRole, useCan, useCurrentUser } from "@/store/auth";
import { useEngagement } from "@/store/engagement";
import sendIcon from "@/assets/ws/actions/send.svg";
import copyIcon from "@/assets/ws/actions/copy.svg";
import archiveIcon from "@/assets/ws/actions/archive.svg";
import deleteIcon from "@/assets/ws/actions/delete.svg";
import separator from "@/assets/ws/actions/separator.svg";

// Figma "Workspace -> actions" (8600:17413): 216px menu, 32px rows, 8px item radius, shadow-md.
const MENU_W = 218;
const MENU_H = 156;

function Item({ icon, label, onClick, disabled, title }: { icon: string; label: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <div className="flex w-full flex-col items-start px-1">
      <button type="button" role="menuitem" disabled={disabled} title={title} onClick={onClick}
        className="flex min-h-8 w-full items-center gap-2 rounded-lg px-4 py-1.5 text-left text-sm leading-5 text-fg outline-none hover:bg-surface-grey focus-visible:bg-surface-grey disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
        <img alt="" src={icon} width={16} height={16} className="size-4 shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
      </button>
    </div>
  );
}

/** "⋯" menu at the end of each Workspace row: request documents, share, archive, delete. */
export function RowActions({ client }: { client: Client }) {
  const me = useCurrentUser();
  const isAdmin = isAdminRole(me);
  const canRequestDocs = useCan("editChecklist");
  const engagement = useEngagement((s) => s.engagements[client.id]);
  const { sendInvitation, remindClient, archiveClient, deleteClient, showToast } = useEngagement.getState();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [confirming, setConfirming] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const ref = usePopover(open, () => setOpen(false));

  // Fixed position so the menu isn't clipped by the table's scroll container; flips up near the bottom.
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.bottom + 4 + MENU_H <= window.innerHeight;
    setPos({ top: below ? r.bottom + 4 : r.top - MENU_H - 4, left: Math.max(8, r.right - MENU_W) });
  };
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const run = (fn: () => void) => () => { setOpen(false); fn(); btn.current?.focus(); };

  // Send Request follows the workflow: invite while in Draft, remind while waiting on the client.
  const owner = stageOf(client.status).owner;
  const email = engagement?.invitedEmail ?? client.email;
  const canRequest = canRequestDocs && (client.status === "Draft" || owner === "Client");
  const sendRequest = () => {
    if (owner === "Client") return remindClient(client.id);
    if (!email) { go({ name: "client", clientId: client.id, section: "checklist" }); return showToast(`Add ${client.name}'s email, then send the checklist request.`); }
    sendInvitation(client.id, email, engagement?.reminders ?? { enabled: false, dueDate: "", everyDays: 7 });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${href({ name: "client", clientId: client.id, section: "checklist" })}`;
    try { await navigator.clipboard.writeText(url); showToast(`Link to ${client.name} copied.`); }
    catch { showToast(`Couldn't copy automatically. Link: ${url}`); }
  };

  const adminOnly = isAdmin ? undefined : "Only admins can do this";

  return (
    // Stop clicks here (menu and confirm dialog) from opening the client row.
    <div ref={ref} onClick={(e) => e.stopPropagation()}>
      <button ref={btn} type="button" aria-label={`More actions for ${client.name}`} aria-haspopup="menu" aria-expanded={open}
        onClick={() => { if (!open) place(); setOpen((o) => !o); }}
        className={`flex rounded p-1 hover:bg-line/60 ${open ? "bg-line/60" : ""}`}>
        <img alt="" src={icons.ellipsis} className="size-4" />
      </button>

      {open && (
        <div ref={menu} role="menu" aria-label={`Actions for ${client.name}`} onKeyDown={onMenuKey}
          className="fixed z-40 flex flex-col items-center justify-center rounded-md border border-line bg-surface py-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
          style={{ top: pos.top, left: pos.left, width: MENU_W }}>
          <Item icon={sendIcon} label="Send Request" onClick={run(sendRequest)} disabled={!canRequest}
            title={!canRequestDocs ? "You don't have access to client requests" : canRequest ? (owner === "Client" ? "Remind the client about missing documents" : "Share the checklist with the client") : "Documents are in. Nothing to request."} />
          <Item icon={copyIcon} label="Copy Sharable Link" onClick={run(copyLink)} />
          <img alt="" src={separator} width={208} height={8} className="h-2 w-full shrink-0" />
          <Item icon={archiveIcon} label="Archive Client" onClick={run(() => archiveClient(client.id))} disabled={!isAdmin} title={adminOnly} />
          <Item icon={deleteIcon} label="Delete Client" onClick={run(() => setConfirming(true))} disabled={!isAdmin} title={adminOnly} />
        </div>
      )}

      {confirming && (
        <Modal title={`Delete ${client.name}?`} width={460} onClose={() => setConfirming(false)}
          description="This permanently removes the client, their checklist, uploaded documents and assignments. Archive instead if you might need them later."
          footer={<>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { setConfirming(false); archiveClient(client.id); }}>Archive instead</Button>
            <button type="button" onClick={() => { setConfirming(false); deleteClient(client.id); }} className="rounded-md bg-destructive px-3 py-1 text-sm text-white hover:bg-destructive/90">Delete client</button>
          </>}>
          <span className="sr-only">Confirm delete</span>
        </Modal>
      )}
    </div>
  );
}
