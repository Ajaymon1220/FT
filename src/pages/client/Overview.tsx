import { useMemo, useState } from "react";
import { CircleCheckBig, LoaderCircle, MessageCircle, Plus, Smile } from "lucide-react";

import { formatDue } from "@/components/Reminders";
import { Avatar } from "@/components/org/Avatar";
import { AssigneePicker } from "@/components/org/AssigneePicker";
import { useEngagement } from "@/store/engagement";
import { ME, useMembers, useOrg } from "@/store/org";
import statusDraft from "@/assets/v2/status-draft.svg";

const labelCls = "w-[200px] shrink-0 text-sm leading-5 tracking-[-0.16px] text-muted";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className={labelCls}>{label}</div>
      <div className="flex items-center gap-3 text-sm leading-5 tracking-[-0.16px] text-muted">{children}</div>
    </div>
  );
}

export function Overview({ clientId }: { clientId: string }) {
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const reminders = useEngagement((s) => s.engagements[clientId]?.reminders);
  const members = useMembers();
  const assigned = useOrg((s) => s.assignments[clientId]);
  const people = useMemo(() => members.filter((m) => assigned?.memberIds.includes(m.id)), [members, assigned]);
  const [notes, setNotes] = useState<{ id: string; author: string; text: string }[]>([
    { id: "n1", author: "Ajay Mon", text: "I have updated the checklist with the required documents please review all the documents and with the worksheet" },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  if (!client) return null;
  const admin = people.find((m) => m.role === "Owner" || m.role === "Admin") ?? people[0];
  const pct = client.checklistTotal ? Math.round((client.checklistDone / client.checklistTotal) * 100) : 0;

  const saveNote = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((n) => [...n, { id: crypto.randomUUID(), author: members.find((m) => m.id === ME)?.name ?? "Ajay Mon", text }]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-6 px-3">
          <h1 className="text-xl leading-6 font-medium text-fg">{client.name}</h1>
          <div className="flex flex-col gap-4">
            <Row label="Return type"><span>{client.returnType}</span></Row>
            <Row label="Status">
              <span className="flex items-center justify-center gap-1 rounded-[26px] border border-brand-border bg-brand-soft px-3 py-1 text-xs leading-4 tracking-[-0.12px] text-fg">
                <img alt="" src={statusDraft} className="size-3" />
                {client.status}
              </span>
            </Row>
            <Row label="Tag">
              {client.tag ? <span className="flex h-5 items-center rounded bg-tag px-2 text-[10px] leading-3 text-fg">{client.tag}</span> : <span>—</span>}
            </Row>
            <Row label="Admin"><span>{admin?.name ?? "—"}</span></Row>
            <Row label="Members">
              <span className="flex items-center">
                {people.map((m, i) => <Avatar key={m.id} name={m.name} size={23} className={i ? "-ml-2" : ""} />)}
              </span>
              <AssigneePicker clientId={clientId} />
            </Row>
            <Row label="Due date"><span className="tnum">{reminders?.enabled && reminders.dueDate ? formatDue(reminders.dueDate) : "—"}</span></Row>
          </div>
        </div>

        <section aria-label="Notes" className="flex min-h-[165px] flex-col justify-between gap-3 rounded-md border border-line bg-surface p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm leading-[22px] font-semibold text-muted">Notes</h2>
              <button type="button" aria-label="Add note" onClick={() => setAdding(true)} className="flex rounded text-muted hover:text-fg"><Plus size={16} /></button>
            </div>
            {notes.map((n) => (
              <div key={n.id} className="flex flex-col gap-1">
                <Avatar name={n.author} size={23} />
                <p className="text-sm leading-5 text-fg">{n.text}</p>
              </div>
            ))}
            {adding && (
              <div className="flex flex-col gap-2">
                <textarea id="client-note" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Write a note"
                  className="w-full resize-none rounded-md border border-line p-2 text-sm leading-5 outline-none placeholder:text-muted focus:border-brand" />
                <div className="flex justify-end gap-2 text-sm">
                  <button type="button" onClick={() => { setAdding(false); setDraft(""); }} className="px-2 py-1 text-muted hover:text-fg">Cancel</button>
                  <button type="button" onClick={saveNote} className="rounded-md bg-brand px-3 py-1 text-on-brand">Save</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 text-muted">
            <button type="button" aria-label="React to note" className="flex hover:text-fg"><Smile size={16} /></button>
            <button type="button" aria-label="Comment on note" className="flex hover:text-fg"><MessageCircle size={16} /></button>
          </div>
        </section>
      </div>

      <aside aria-label="Assignee" className="flex w-full shrink-0 flex-col gap-6 border-t border-line bg-surface-grey pt-8 pr-6 pb-6 pl-3 md:w-[318px] md:border-t-0 md:border-l">
        <h2 className="text-base leading-[22px] font-medium tracking-[-0.18px] text-fg">Assignee</h2>
        {people.length === 0 && <p className="text-sm text-muted">No one is assigned yet.</p>}
        <ul className="flex flex-col gap-4">
          {people.map((m) => (
            <li key={m.id} className="flex items-center gap-4 text-sm leading-5 tracking-[-0.16px] text-muted">
              <span className="flex w-[130px] items-center gap-1 font-medium">
                <Avatar name={m.name} size={23} />
                <span className="truncate">{m.name}</span>
              </span>
              <span className="flex-1">{m.title}</span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                {pct === 100 ? <CircleCheckBig size={16} className="text-brand" /> : <LoaderCircle size={16} className="text-brand" />}
                {pct}% of {client.checklistTotal}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
