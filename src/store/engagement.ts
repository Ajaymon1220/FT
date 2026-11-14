import { create } from "zustand";

import { checklistFor, type ChecklistItem, type Field, type ItemStatus } from "@/mocks/checklists";
import { clients as seedClients, type Client, type ClientStatus } from "@/mocks/clients";
import { generateChecklist, type FilingStatus, type ReturnType } from "@/mocks/generateChecklist";
import { useOrg } from "@/store/org";

/** Work stages from the research "State and handoff rules" table (first three used by this prototype). */
export type Stage = "Intake" | "Preparation" | "Review";

import type { Reminders } from "@/components/Reminders";
export type { Reminders };

/** Auto-reminder schedules shown in the Figma "Workspace / Auto-Reminders" frames. */
const SEED_REMINDERS: Record<string, Reminders> = {
  c1: { enabled: true, dueDate: "2026-01-26", everyDays: 7 },
  c3: { enabled: true, dueDate: "2026-04-26", everyDays: 5 },
  c5: { enabled: true, dueDate: "2026-07-26", everyDays: 7 },
  c7: { enabled: true, dueDate: "2026-09-26", everyDays: 2 },
  c9: { enabled: true, dueDate: "2026-12-26", everyDays: 7 },
};
const reminderText = (r: Reminders) => (r.enabled ? `every ${r.everyDays} days${r.dueDate ? ` until ${r.dueDate.split("-").reverse().join("/")}` : ""}` : "off");

export interface Engagement {
  stage: Stage;
  /** Client has received the portal invitation (research Flow 1 → "Invite client"). */
  invited: boolean;
  invitedEmail?: string;
  bannerDismissed: boolean;
  reminders: Reminders;
  preparedAt?: string;
  /** Preparer → reviewer → admin handoff record (who acted, when, and any note). */
  handoff?: Handoff;
}

export interface Handoff {
  preparedBy?: string;
  reviewerId?: string;
  prepNote?: string;
  changesRequested?: { by: string; note: string; at: string };
  approvedBy?: string;
  approvedAt?: string;
  adminId?: string;
  pushedBy?: string;
  pushedAt?: string;
  pushedTo?: string;
}

export interface ImportRow {
  name: string;
  returnType: ReturnType;
  filingStatus?: FilingStatus;
  email?: string;
}

export interface Mark {
  id: string;
  kind: "check" | "rect" | "circle" | "stamp";
  /** Position as % of the document box, so marks survive zoom. */
  x: number;
  y: number;
  color: string;
  label?: string;
}

interface State {
  marks: Record<string, Mark[]>;
  addMark: (itemId: string, mark: Omit<Mark, "id">) => void;
  removeMark: (itemId: string, markId: string) => void;
  attachDocument: (clientId: string, itemId: string, fileName: string) => void;
  clients: Client[];
  checklists: Record<string, ChecklistItem[]>;
  engagements: Record<string, Engagement>;
  toast: string | null;

  showToast: (msg: string) => void;
  clearToast: () => void;

  addItem: (clientId: string, name: string, note: string) => void;
  uploadFiles: (clientId: string, names: string[]) => void;
  deleteItems: (clientId: string, ids: string[]) => void;
  addComment: (clientId: string, itemId: string, text: string) => void;
  requestDocument: (clientId: string, itemId: string, note: string, reminders: Reminders) => void;
  dismissBanner: (clientId: string) => void;
  setReminders: (clientId: string, reminders: Reminders) => void;
  sendInvitation: (clientId: string, email: string, reminders: Reminders) => void;
  createClient: (input: Omit<Client, "id" | "checklistDone" | "checklistTotal" | "status" | "lastActivity" | "taxYear">, checklist: ChecklistItem[]) => string;

  setStatus: (clientId: string, itemId: string, status: ItemStatus, rejectReason?: string) => void;
  updateField: (clientId: string, itemId: string, box: string, value: string) => void;
  fetchField: (clientId: string, itemId: string, box: string) => Field | undefined;

  startPrep: (clientId: string) => void;
  markPrepared: (clientId: string) => void;
  /** Move a client to another workflow stage (Board drag-and-drop / status menu). */
  setClientStatus: (clientId: string, status: ClientStatus) => void;

  /** Preparer sends the prepared worksheet to a reviewer (assigns them). */
  sendToReviewer: (clientId: string, by: string, reviewerId: string, note: string) => void;
  /** Reviewer sends it back to the preparer with what to fix. */
  requestChanges: (clientId: string, by: string, note: string) => void;
  /** Reviewer approves this version and assigns an admin to push it. */
  approveReturn: (clientId: string, by: string, adminId: string) => void;
  /** Admin records the push to the firm's tax filing software. */
  pushToSoftware: (clientId: string, by: string, software: string) => void;
  /** Hide a client from the Workspace without losing its checklist or history. */
  archiveClient: (clientId: string) => void;
  /** Permanently remove a client, its checklist, engagement and assignments. */
  deleteClient: (clientId: string) => void;
  /** Nudge the client about required documents that are still missing. */
  remindClient: (clientId: string) => void;
  /** Create clients from a tax-software import, each with a checklist built from prior-year data. */
  importClients: (rows: ImportRow[], source: string, workspaceId: string, memberIds: string[]) => string[];
}

/** Engagement stage that matches a workflow status. */
const stageFor = (status: ClientStatus): Stage =>
  status === "Prep Started" ? "Preparation" : status === "Ready for Review" || status === "Approved" || status === "Pushed" ? "Review" : "Intake";

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** A group's status follows its documents: any to review → Needs Review, all validated → Validated, nothing in → Pending. */
function rollUp(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((it) => {
    if (it.kind !== "group") return it;
    const kids = items.filter((k) => k.parentId === it.id);
    if (kids.length === 0) return it;
    let status: ItemStatus = "Pending";
    if (kids.some((k) => k.status === "Needs Review")) status = "Needs Review";
    else if (kids.every((k) => k.status === "Validated")) status = "Validated";
    else if (kids.every((k) => k.status === "Rejected")) status = "Rejected";
    return { ...it, status };
  });
}

/** Workspace "Checklist x/y": count requested documents (leaves), not category rows. */
function checklistCounts(items: ChecklistItem[]) {
  const leaves = items.filter((i) => !items.some((k) => k.parentId === i.id));
  return { done: leaves.filter((i) => i.status === "Validated").length, total: leaves.length };
}

/** Which slot form an uploaded file name most likely belongs to. */
function guessForm(name: string): string | undefined {
  if (/w-?2/i.test(name)) return "W-2";
  if (/1099[-_ ]?int|interest/i.test(name)) return "1099-INT";
  if (/1099|div|brokerage|consolidated|crypto/i.test(name)) return "1099";
  return undefined;
}

export const useEngagement = create<State>((set, get) => {
  const touchClient = (clientId: string, patch: Partial<Client> = {}) =>
    set((s) => {
      const counts = checklistCounts(s.checklists[clientId] ?? []);
      return {
        clients: s.clients.map((c) =>
          c.id === clientId ? { ...c, checklistDone: counts.done, checklistTotal: counts.total, lastActivity: today(), ...patch } : c,
        ),
      };
    });

  const patchHandoff = (clientId: string, h: Partial<Handoff>, e: Partial<Engagement> = {}) =>
    set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], ...e, handoff: { ...s.engagements[clientId]?.handoff, ...h } } } }));
  const addAssignee = (clientId: string, memberId: string) => {
    const org = useOrg.getState();
    const a = org.assignments[clientId];
    if (!a?.memberIds.includes(memberId)) org.assign(clientId, [...(a?.memberIds ?? []), memberId], a?.teamId);
  };
  const memberName = (id: string) => Object.values(useOrg.getState().members).flat().find((m) => m.id === id)?.name ?? "the team";

  const editList = (clientId: string, fn: (items: ChecklistItem[]) => ChecklistItem[]) => {
    set((s) => ({ checklists: { ...s.checklists, [clientId]: rollUp(fn(s.checklists[clientId] ?? [])) } }));
    touchClient(clientId);
  };

  const checklists: Record<string, ChecklistItem[]> = {};
  const engagements: Record<string, Engagement> = {};
  for (const c of seedClients) {
    checklists[c.id] = checklistFor(c);
    engagements[c.id] = {
      stage: stageFor(c.status),
      invited: c.status !== "Draft",
      bannerDismissed: false,
      reminders: SEED_REMINDERS[c.id] ?? { enabled: false, dueDate: "", everyDays: 7 },
    };
  }
  // Marci's Workspace row reads from her real checklist.
  // Workspace rows for the detailed demo clients read from their real checklists.
  const clients = seedClients.map((c) => {
    if (c.id !== "c1" && c.id !== "c3") return c;
    const n = checklistCounts(checklists[c.id]);
    return { ...c, checklistDone: n.done, checklistTotal: n.total };
  });

  return {
    clients,
    checklists,
    engagements,
    toast: null,
    marks: {},

    addMark: (itemId, mark) => set((s) => ({ marks: { ...s.marks, [itemId]: [...(s.marks[itemId] ?? []), { ...mark, id: crypto.randomUUID() }] } })),
    removeMark: (itemId, markId) => set((s) => ({ marks: { ...s.marks, [itemId]: (s.marks[itemId] ?? []).filter((m) => m.id !== markId) } })),

    attachDocument: (clientId, itemId, fileName) => {
      editList(clientId, (items) => items.map((i) => (i.id === itemId ? { ...i, fileName, status: "Needs Review", isNew: true } : i)));
      get().showToast(`${fileName} attached. Check the extracted fields against the document.`);
    },

    showToast: (msg) => set({ toast: msg }),
    clearToast: () => set({ toast: null }),

    addItem: (clientId, name, note) =>
      editList(clientId, (items) => [
        ...items,
        { id: crypto.randomUUID(), name, kind: "group", note, status: "Pending", isNew: true, required: true, comments: [], notes: note ? 1 : 0 },
      ]),

    uploadFiles: (clientId, names) => {
      // Propose a match to the first open slot of the same form; unmatched files land as their own rows.
      // A match is only a suggestion: the file still needs review before the item counts as done.
      const matched: string[] = [];
      editList(clientId, (items) => {
        let next = [...items];
        for (const name of names) {
          const form = guessForm(name);
          const slot = form && next.find((i) => i.kind === "slot" && i.name === form && !i.fileName);
          if (slot) {
            next = next.map((i) => (i.id === slot.id ? { ...i, fileName: name, status: "Needs Review" as const, isNew: true } : i));
            matched.push(`${name} → ${slot.name} · ${slot.note}`);
          } else {
            next.push({
              id: crypto.randomUUID(), name, fileName: name, kind: "file", status: "Needs Review", isNew: true, comments: [], notes: 0, preview: "none",
              fields: [{ box: "—", label: "Extraction queued", value: "Pending extraction" }],
            });
          }
        }
        return next;
      });
      get().showToast(
        matched.length
          ? `Matched ${matched[0]}${matched.length > 1 ? ` (+${matched.length - 1} more)` : ""}. Check it in review.`
          : `${names.length} file${names.length > 1 ? "s" : ""} added. Match ${names.length > 1 ? "them" : "it"} to a checklist item in review.`,
      );
    },

    createClient: (input, checklist) => {
      const clientId = `n${Date.now().toString(36)}`;
      const counts = checklistCounts(checklist);
      set((s) => ({
        clients: [{ ...input, id: clientId, taxYear: 2025, status: "Draft", lastActivity: today(), checklistDone: counts.done, checklistTotal: counts.total }, ...s.clients],
        checklists: { ...s.checklists, [clientId]: checklist },
        engagements: {
          ...s.engagements,
          [clientId]: { stage: "Intake", invited: false, bannerDismissed: false, reminders: { enabled: false, dueDate: "", everyDays: 7 } },
        },
      }));
      get().showToast(`${input.name} created with ${counts.total} checklist items. Review them, then send the invitation.`);
      return clientId;
    },

    sendInvitation: (clientId, email, reminders) => {
      set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], invited: true, invitedEmail: email, reminders } } }));
      touchClient(clientId, { status: "Customer Invited" });
      get().showToast(`Invitation sent to ${email}. Reminders ${reminderText(reminders)}.`);
    },

    deleteItems: (clientId, ids) => {
      editList(clientId, (items) => items.filter((i) => !ids.includes(i.id) && !ids.includes(i.parentId ?? "")));
      get().showToast(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`);
    },

    addComment: (clientId, itemId, text) =>
      editList(clientId, (items) =>
        items.map((i) => (i.id === itemId ? { ...i, comments: [...i.comments, { id: crypto.randomUUID(), author: "Ajay Mon", at: "Just now", text }] } : i)),
      ),

    requestDocument: (clientId, itemId, note, reminders) => {
      editList(clientId, (items) => items.map((i) => (i.id === itemId ? { ...i, note, requestedAt: today() } : i)));
      set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], reminders } } }));
      const client = get().clients.find((c) => c.id === clientId);
      if (client && client.status === "Draft") touchClient(clientId, { status: "Pending Docs" });
      get().showToast(
        `Request sent to ${client?.name}.${reminders.enabled ? ` Reminders ${reminderText(reminders)}, stopping once it's uploaded.` : ""}`,
      );
    },

    setReminders: (clientId, reminders) => {
      set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], reminders } } }));
      const name = get().clients.find((c) => c.id === clientId)?.name;
      get().showToast(`${name}: auto-reminders ${reminderText(reminders)}.`);
    },

    dismissBanner: (clientId) => set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], bannerDismissed: true } } })),

    setStatus: (clientId, itemId, status, rejectReason) =>
      editList(clientId, (items) => items.map((i) => (i.id === itemId ? { ...i, status, rejectReason, isNew: false } : i))),

    updateField: (clientId, itemId, box, value) =>
      editList(clientId, (items) =>
        items.map((i) => (i.id === itemId ? { ...i, fields: i.fields?.map((f) => (f.box === box ? { ...f, value } : f)) } : i)),
      ),

    fetchField: (clientId, itemId, box) => {
      const item = get().checklists[clientId]?.find((i) => i.id === itemId);
      const field = item?.extraFields?.find((f) => f.box === box);
      if (!field) return undefined;
      editList(clientId, (items) =>
        items.map((i) =>
          i.id === itemId ? { ...i, fields: [...(i.fields ?? []), field], extraFields: i.extraFields?.filter((f) => f.box !== box) } : i,
        ),
      );
      return field;
    },

    startPrep: (clientId) => {
      set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], stage: "Preparation", bannerDismissed: true } } }));
      touchClient(clientId, { status: "Prep Started" as ClientStatus });
      get().showToast("Intake marked complete. Prep started — you can still request documents.");
    },

    markPrepared: (clientId) => {
      set((s) => ({ engagements: { ...s.engagements, [clientId]: { ...s.engagements[clientId], stage: "Review", preparedAt: today() } } }));
      touchClient(clientId, { status: "Ready for Review" as ClientStatus });
      get().showToast("Marked as prepared. The return is now with the reviewer.");
    },

    archiveClient: (clientId) => {
      const client = get().clients.find((c) => c.id === clientId);
      if (!client) return;
      set((s) => ({ clients: s.clients.map((c) => (c.id === clientId ? { ...c, archived: true } : c)) }));
      get().showToast(`${client.name} archived.`);
    },

    deleteClient: (clientId) => {
      const client = get().clients.find((c) => c.id === clientId);
      if (!client) return;
      set((s) => {
        const { [clientId]: _list, ...checklists } = s.checklists;
        const { [clientId]: _eng, ...engagements } = s.engagements;
        return { clients: s.clients.filter((c) => c.id !== clientId), checklists, engagements };
      });
      useOrg.setState((o) => {
        const { [clientId]: _a, ...assignments } = o.assignments;
        return { assignments };
      });
      get().showToast(`${client.name} deleted.`);
    },

    remindClient: (clientId) => {
      const client = get().clients.find((c) => c.id === clientId);
      const missing = waitingItems(get().checklists[clientId] ?? []).length;
      const to = get().engagements[clientId]?.invitedEmail ?? client?.email ?? client?.name;
      get().showToast(missing ? `Reminder sent to ${to} for ${missing} missing document${missing === 1 ? "" : "s"}.` : `${client?.name} has sent every required document.`);
    },

    setClientStatus: (clientId, status) => {
      const client = get().clients.find((c) => c.id === clientId);
      if (!client || client.status === status) return;
      set((s) => ({
        engagements: {
          ...s.engagements,
          [clientId]: { ...s.engagements[clientId], stage: stageFor(status), invited: s.engagements[clientId]?.invited || status !== "Draft" },
        },
      }));
      touchClient(clientId, { status });
      get().showToast(`${client.name} moved to ${status}.`);
    },

    sendToReviewer: (clientId, by, reviewerId, note) => {
      const reviewer = memberName(reviewerId);
      patchHandoff(clientId, { preparedBy: by, reviewerId, prepNote: note || undefined, changesRequested: undefined }, { stage: "Review", preparedAt: today() });
      addAssignee(clientId, reviewerId);
      touchClient(clientId, { status: "Ready for Review" });
      get().showToast(`Sent to ${reviewer} for review.`);
    },

    requestChanges: (clientId, by, note) => {
      patchHandoff(clientId, { changesRequested: { by, note, at: today() }, approvedBy: undefined, approvedAt: undefined }, { stage: "Preparation", preparedAt: undefined });
      touchClient(clientId, { status: "Prep Started" });
      get().showToast("Sent back to the preparer with your notes.");
    },

    approveReturn: (clientId, by, adminId) => {
      patchHandoff(clientId, { approvedBy: by, approvedAt: today(), adminId, changesRequested: undefined });
      addAssignee(clientId, adminId);
      touchClient(clientId, { status: "Approved" });
      get().showToast(`Approved. Assigned to ${memberName(adminId)} to push.`);
    },

    pushToSoftware: (clientId, by, software) => {
      patchHandoff(clientId, { pushedBy: by, pushedAt: today(), pushedTo: software });
      touchClient(clientId, { status: "Pushed" });
      const name = get().clients.find((c) => c.id === clientId)?.name;
      get().showToast(`${name} pushed to ${software}.`);
    },

    importClients: (rows, source, workspaceId, memberIds) => {
      const stamp = Date.now().toString(36);
      const created = rows.map((r, i) => {
        const checklist = generateChecklist({ returnType: r.returnType, filingStatus: r.filingStatus, hasPriorYear: true, notes: "" });
        const counts = checklistCounts(checklist);
        const client: Client = {
          id: `i${stamp}${i}`, name: r.name, email: r.email, returnType: r.returnType, filingStatus: r.filingStatus, workspaceId,
          taxYear: 2025, status: "Draft", lastActivity: today(), checklistDone: counts.done, checklistTotal: counts.total, importedFrom: source,
        };
        return { client, checklist };
      });
      set((s) => ({
        clients: [...created.map((c) => c.client), ...s.clients],
        checklists: { ...s.checklists, ...Object.fromEntries(created.map((c) => [c.client.id, c.checklist])) },
        engagements: {
          ...s.engagements,
          ...Object.fromEntries(created.map((c) => [c.client.id, { stage: "Intake" as Stage, invited: false, bannerDismissed: false, reminders: { enabled: false, dueDate: "", everyDays: 7 } }])),
        },
      }));
      if (memberIds.length) created.forEach((c) => useOrg.getState().assign(c.client.id, memberIds));
      return created.map((c) => c.client.id);
    },
  };
});

/** Items that block a clean intake: required and not yet validated. */
export function outstandingItems(items: ChecklistItem[]) {
  return items.filter((i) => !i.parentId && i.required && i.status !== "Validated");
}

/** Required items with nothing uploaded yet — drives the "Waiting on N required items" banner. */
export function waitingItems(items: ChecklistItem[]) {
  return items.filter((i) => !i.parentId && i.required && i.status === "Pending");
}

/** A row can be opened in Review Doc once a document exists behind it. */
export function hasDocument(i: ChecklistItem) {
  return i.kind === "file" || (i.kind === "slot" && !!i.fileName);
}
