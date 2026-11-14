import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChartPie, FileType } from "lucide-react";

import { icons } from "@/components/icons";
import { usePopover } from "@/components/ui";
import { UserMenu } from "@/components/UserMenu";
import { href, type ClientSection } from "@/lib/route";
import { useEngagement } from "@/store/engagement";
import { useCan, useCurrentUser } from "@/store/auth";
import { useOrg } from "@/store/org";
import { WorkspaceSwitcher } from "@/components/org/WorkspaceSwitcher";
import { AssigneePicker } from "@/components/org/AssigneePicker";
import railHome from "@/assets/v2/rail-home.svg";
import railWorkspace from "@/assets/v2/rail-workspace.svg";
import railInbox from "@/assets/v2/rail-inbox.svg";
import railTeam from "@/assets/v2/rail-team.svg";
import railFiles from "@/assets/v2/rail-files.svg";
import railUser from "@/assets/v2/rail-user.svg";
import down from "@/assets/v2/down.svg";
import navChecklist from "@/assets/v2/nav-checklist.svg";
import navWorksheet from "@/assets/v2/nav-worksheet.svg";
import dragDrop from "@/assets/v2/drag-drop.svg";

const sections: { id: ClientSection; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <ChartPie size={16} /> },
  { id: "checklist", label: "Checklist", icon: <img alt="" src={navChecklist} className="size-4" /> },
  { id: "utility", label: "Utility", icon: <ArrowLeftRight size={16} /> },
  { id: "worksheet", label: "Worksheet", icon: <img alt="" src={navWorksheet} className="size-4" /> },
  { id: "contracts", label: "Contracts", icon: <FileType size={16} /> },
];

function Rail() {
  const items = [
    { icon: railHome, label: "Dashboard", to: "#dashboard" },
    { icon: railWorkspace, label: "Workspace", to: "#workspace", active: true },
    { icon: railInbox, label: "Inbox", to: "#dashboard", badge: "15" },
    { icon: railTeam, label: "Team", to: "#people" },
    { icon: railFiles, label: "Files", to: "#dashboard" },
  ];
  return (
    <div className="hidden h-full w-[55px] shrink-0 flex-col border-r border-line bg-surface-grey md:flex">
      <div className="flex justify-center pt-4 pb-6"><WorkspaceSwitcher compact /></div>
      <nav aria-label="App" className="flex flex-1 flex-col items-center gap-2 px-2">
        {items.map((it) => (
          <a key={it.label} href={it.to} title={it.label} aria-label={it.label} className={`relative flex size-8 items-center justify-center rounded ${it.active ? "bg-nav-active" : "hover:bg-nav-active"}`}>
            <img alt="" src={it.icon} className="size-4" />
            {it.badge && (
              <span className="absolute -top-1.5 left-5 flex size-[13px] items-center justify-center rounded-full bg-brand text-[8.5px] leading-none text-on-brand">{it.badge}</span>
            )}
          </a>
        ))}
      </nav>
      <UserMenu className="p-2" title="Ajay Mon" buttonClassName="flex rounded-lg bg-brand-soft p-2">
        <img alt="" src={railUser} className="size-4" />
      </UserMenu>
    </div>
  );
}

function ClientSwitcher({ clientId, section }: { clientId: string; section: ClientSection }) {
  const allClients = useEngagement((s) => s.clients);
  const wsId = useOrg((s) => s.currentId);
  const me = useCurrentUser();
  const canAll = useCan("viewAllClients");
  const assignments = useOrg((s) => s.assignments);
  const clients = useMemo(() => allClients.filter((c) => (!c.archived && (c.workspaceId ?? "ws1") === wsId && (canAll || (!!me && !!assignments[c.id]?.memberIds.includes(me.id)))) || c.id === clientId), [allClients, wsId, clientId, canAll, me, assignments]);
  const [open, setOpen] = useState(false);
  const ref = usePopover(open, () => setOpen(false));
  const current = clients.find((c) => c.id === clientId);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-12 w-full items-center justify-between border-b border-line px-3">
        <span className="truncate text-sm leading-5 font-medium tracking-[-0.16px] text-fg">{current?.name}</span>
        <img alt="" src={down} className="size-4" />
      </button>
      {open && (
        <ul className="absolute top-12 right-2 left-2 z-30 max-h-72 overflow-auto rounded-md border border-line bg-surface py-1 shadow-lg">
          {clients.map((c) => (
            <li key={c.id}>
              <a href={href({ name: "client", clientId: c.id, section })} onClick={() => setOpen(false)} className={`block truncate px-3 py-2 text-sm hover:bg-surface-grey ${c.id === clientId ? "text-brand" : "text-fg"}`}>
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientPanel({ clientId, section }: { clientId: string; section: ClientSection }) {
  const uploadFiles = useEngagement((s) => s.uploadFiles);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (files: FileList | null) => files?.length && uploadFiles(clientId, Array.from(files).map((f) => f.name));

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 border-b border-line bg-surface-grey pb-3 md:h-full md:w-[200px] md:border-r md:border-b-0">
      <ClientSwitcher clientId={clientId} section={section} />
      <div className="flex flex-1 flex-col justify-between gap-3 px-2">
        <nav aria-label="Customer" className="flex gap-1 md:flex-col">
          {sections.map((s) => {
            const active = s.id === section;
            return (
              <a key={s.id} href={href({ name: "client", clientId, section: s.id })} aria-current={active ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2 text-sm leading-5 font-medium tracking-[-0.16px] ${active ? "bg-nav-active text-brand" : "text-muted hover:bg-nav-active"}`}>
                {s.icon}
                {s.label}
              </a>
            );
          })}
        </nav>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          className={`hidden flex-col items-center gap-3 rounded-md border border-dashed border-brand px-3 py-4 text-center md:flex ${drag ? "bg-brand-soft" : "bg-surface"}`}
        >
          <img alt="" src={dragDrop} className="size-6" />
          <div className="flex flex-col gap-1 text-muted">
            <p className="text-xs leading-4 font-medium">
              Drop any file here to add it to the checklist or{" "}
              <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-brand underline">browse</button>
            </p>
            <p className="text-[10px] leading-3">Supported Formats: pdf, jpeg, png</p>
          </div>
          <input ref={fileRef} id="client-upload" type="file" multiple accept=".pdf,.jpeg,.jpg,.png" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </div>
      </div>
    </div>
  );
}

export function ClientTopBar({ clientName, clientId }: { clientName: string; clientId?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-base leading-[22px] font-medium tracking-[-0.18px]">
        <a href="#workspace" className="text-muted hover:text-fg">Workspace</a>
        <span className="text-muted">/</span>
        <span className="truncate text-fg">{clientName}</span>
      </nav>
      <div className="flex items-center gap-3">
        {clientId && <AssigneePicker clientId={clientId} align="right" />}
        <button type="button" className="flex items-center gap-1.5 rounded-[31px] border border-ai-border px-2 py-1"
          style={{ backgroundImage: "var(--ai-gradient)" }}>
          <img alt="" src={icons.star} className="size-4" />
          <span className="text-xs leading-4 font-medium text-brand">Ask Ai</span>
        </button>
        <button type="button" aria-label="Notifications" className="flex"><img alt="" src={icons.bellDot} className="size-4" /></button>
      </div>
    </header>
  );
}

export function ClientShell({ clientId, section, children }: { clientId: string; section: ClientSection; children: ReactNode }) {
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  return (
    <div className="flex h-full flex-col bg-surface md:flex-row">
      <Rail />
      <ClientPanel clientId={clientId} section={section} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface">
        <ClientTopBar clientName={client?.name ?? "Customer"} clientId={clientId} />
        {children}
      </main>
    </div>
  );
}
