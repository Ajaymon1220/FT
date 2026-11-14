import { create } from "zustand";

import type { SoftwareId } from "@/lib/taxSoftware";

import { ME, WS_COLORS, assignments as seedAssign, members as seedMembers, teams as seedTeams, workspaces as seedWs, type Member, type Role, type Team, type Title, type Workspace } from "@/mocks/org";

interface OrgState {
  workspaces: Workspace[];
  currentId: string;
  members: Record<string, Member[]>;
  teams: Team[];
  assignments: Record<string, { memberIds: string[]; teamId?: string }>;
  /** Getting-started steps the user dismissed or finished per workspace. */
  onboardingDismissed: Record<string, boolean>;
  /** Tax filing software each workspace pushes to and imports from. */
  taxSoftware: Record<string, SoftwareId | undefined>;
  setTaxSoftware: (id: SoftwareId) => void;
  /** The three user types: Admin, Preparer, Reviewer (sets permission role + job title). */
  setUserType: (memberId: string, type: UserType) => void;

  switchWorkspace: (id: string) => void;
  createWorkspace: (input: { name: string; color: string; invites: { email: string; role: Role }[]; teamName?: string }) => string;
  inviteMembers: (emails: string[], role: Role, title?: Title) => number;
  acceptInvite: (memberId: string) => void;
  setRole: (memberId: string, role: Role) => void;
  setTitle: (memberId: string, title: Title) => void;
  removeMember: (memberId: string) => void;
  createTeam: (input: { name: string; description: string; color: string; memberIds: string[] }) => string;
  setTeamMembers: (teamId: string, memberIds: string[]) => void;
  deleteTeam: (teamId: string) => void;
  assign: (clientId: string, memberIds: string[], teamId?: string) => void;
  dismissOnboarding: () => void;

  /** Per-workspace changes an admin made to the Preparer / Reviewer defaults. */
  roleAccess: Record<string, Partial<Record<"Preparer" | "Reviewer", Partial<Record<Capability, boolean>>>>>;
  /** Per-workspace, per-person grants or removals on top of their user type. */
  memberAccess: Record<string, Record<string, Partial<Record<Capability, boolean>>>>;
  setRoleAccess: (type: "Preparer" | "Reviewer", cap: Capability, on: boolean) => void;
  resetRoleAccess: (type: "Preparer" | "Reviewer") => void;
  /** `undefined` clears the person's override so they follow their user type again. */
  setMemberAccess: (memberId: string, cap: Capability, on: boolean | undefined) => void;
  resetMemberAccess: (memberId: string) => void;
}

const nameFromEmail = (email: string) =>
  email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const useOrg = create<OrgState>((set, get) => ({
  workspaces: seedWs,
  currentId: "ws1",
  members: seedMembers,
  teams: seedTeams,
  assignments: seedAssign,
  onboardingDismissed: { ws1: true, ws2: true },
  taxSoftware: { ws1: "lacerte", ws2: "drake" },

  setTaxSoftware: (id) => set((s) => ({ taxSoftware: { ...s.taxSoftware, [s.currentId]: id } })),

  setUserType: (memberId, type) => {
    const ws = get().currentId;
    set((s) => ({
      members: {
        ...s.members,
        [ws]: s.members[ws].map((m) => {
          if (m.id !== memberId) return m;
          if (type === "Admin") return { ...m, role: m.role === "Owner" ? "Owner" : "Admin" };
          return { ...m, role: m.role === "Owner" ? "Owner" : "Member", title: type };
        }),
      },
    }));
  },

  switchWorkspace: (id) => set({ currentId: id }),

  createWorkspace: ({ name, color, invites, teamName }) => {
    const id = `ws${Date.now().toString(36)}`;
    const me: Member = { id: ME, name: "Ajay Mon", email: "ajaymon@gmail.com", role: "Owner", title: "Partner", status: "Active", lastActive: "Now" };
    const invited: Member[] = invites.map((i, n) => ({
      id: `m-${id}-${n}`, name: nameFromEmail(i.email), email: i.email, role: i.role, title: "Preparer", status: "Pending", lastActive: "—",
    }));
    const team: Team[] = teamName?.trim()
      ? [{ id: `t-${id}`, workspaceId: id, name: teamName.trim(), alias: `@${teamName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, description: "", color, memberIds: [ME] }]
      : [];
    set((s) => ({
      workspaces: [...s.workspaces, { id, name: name.trim(), color, plan: "Free" }],
      members: { ...s.members, [id]: [me, ...invited] },
      teams: [...s.teams, ...team],
      currentId: id,
      onboardingDismissed: { ...s.onboardingDismissed, [id]: false },
    }));
    return id;
  },

  inviteMembers: (emails, role, title = "Preparer") => {
    const ws = get().currentId;
    const existing = new Set((get().members[ws] ?? []).map((m) => m.email.toLowerCase()));
    const fresh = [...new Set(emails.map((e) => e.trim().toLowerCase()))].filter((e) => e && !existing.has(e));
    const added: Member[] = fresh.map((email, i) => ({
      id: `m-${Date.now().toString(36)}-${i}`, name: nameFromEmail(email), email, role, title, status: "Pending", lastActive: "—",
    }));
    set((s) => ({ members: { ...s.members, [ws]: [...(s.members[ws] ?? []), ...added] } }));
    return added.length;
  },

  acceptInvite: (memberId) => {
    const ws = get().currentId;
    set((s) => ({ members: { ...s.members, [ws]: s.members[ws].map((m) => (m.id === memberId ? { ...m, status: "Active", lastActive: "Just now" } : m)) } }));
  },

  setRole: (memberId, role) => {
    const ws = get().currentId;
    set((s) => ({ members: { ...s.members, [ws]: s.members[ws].map((m) => (m.id === memberId ? { ...m, role } : m)) } }));
  },

  setTitle: (memberId, title) => {
    const ws = get().currentId;
    set((s) => ({ members: { ...s.members, [ws]: s.members[ws].map((m) => (m.id === memberId ? { ...m, title } : m)) } }));
  },

  removeMember: (memberId) => {
    const ws = get().currentId;
    set((s) => ({
      members: { ...s.members, [ws]: s.members[ws].filter((m) => m.id !== memberId) },
      // Removing someone also takes them off this workspace's teams and client assignments.
      teams: s.teams.map((t) => (t.workspaceId === ws ? { ...t, memberIds: t.memberIds.filter((id) => id !== memberId) } : t)),
      assignments: Object.fromEntries(Object.entries(s.assignments).map(([k, a]) => [k, { ...a, memberIds: a.memberIds.filter((id) => id !== memberId) }])),
    }));
  },

  createTeam: ({ name, description, color, memberIds }) => {
    const id = `t-${Date.now().toString(36)}`;
    const ws = get().currentId;
    set((s) => ({ teams: [...s.teams, { id, workspaceId: ws, name: name.trim(), alias: `@${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, description, color, memberIds }] }));
    return id;
  },

  setTeamMembers: (teamId, memberIds) => set((s) => ({ teams: s.teams.map((t) => (t.id === teamId ? { ...t, memberIds } : t)) })),

  deleteTeam: (teamId) =>
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== teamId),
      assignments: Object.fromEntries(Object.entries(s.assignments).map(([k, a]) => [k, a.teamId === teamId ? { memberIds: a.memberIds } : a])),
    })),

  assign: (clientId, memberIds, teamId) => set((s) => ({ assignments: { ...s.assignments, [clientId]: { memberIds, teamId } } })),

  dismissOnboarding: () => set((s) => ({ onboardingDismissed: { ...s.onboardingDismissed, [s.currentId]: true } })),

  roleAccess: {},
  memberAccess: {},
  setRoleAccess: (type, cap, on) =>
    set((s) => {
      const ws = s.roleAccess[s.currentId] ?? {};
      return { roleAccess: { ...s.roleAccess, [s.currentId]: { ...ws, [type]: { ...ws[type], [cap]: on } } } };
    }),
  resetRoleAccess: (type) =>
    set((s) => ({ roleAccess: { ...s.roleAccess, [s.currentId]: { ...s.roleAccess[s.currentId], [type]: {} } } })),
  setMemberAccess: (memberId, cap, on) =>
    set((s) => {
      const ws = s.memberAccess[s.currentId] ?? {};
      const mine = { ...ws[memberId] };
      if (on === undefined) delete mine[cap]; else mine[cap] = on;
      return { memberAccess: { ...s.memberAccess, [s.currentId]: { ...ws, [memberId]: mine } } };
    }),
  resetMemberAccess: (memberId) =>
    set((s) => ({ memberAccess: { ...s.memberAccess, [s.currentId]: { ...s.memberAccess[s.currentId], [memberId]: {} } } })),
}));

/* ================= Access (from research/Our_Platform_User_Flow.md "Primary users") =================
 * Admin (firm owner): configures the firm, integrations, access and policies → everything, always.
 * Preparer: resolves intake gaps, verifies extracted data, prepares the return → all client work.
 * Reviewer / approver: traces sources, resolves issues, approves a version → reads the work and approves,
 *   but doesn't edit intake, contact clients directly or see clients they aren't assigned to.
 * Admins can change the Preparer/Reviewer defaults per workspace, or grant/remove access per person. */
export type Capability =
  | "viewAllClients" | "addClients" | "assignWork" | "editChecklist" | "reviewDocuments" | "editWorksheet"
  | "viewContactInfo" | "approveReturns" | "pushReturns" | "viewTeamProgress" | "manageTeam" | "manageSettings";

export const CAPABILITIES: { id: Capability; label: string; help: string; group: "Clients" | "Preparation" | "Review & filing" | "Firm" }[] = [
  { id: "viewAllClients", group: "Clients", label: "See every client in the firm", help: "Without this, people only see clients assigned to them." },
  { id: "viewContactInfo", group: "Clients", label: "See client contact details", help: "Client email, phone and SSN. Hidden (masked) otherwise." },
  { id: "addClients", group: "Clients", label: "Add and import clients", help: "Create clients by hand or import them from tax software." },
  { id: "assignWork", group: "Clients", label: "Assign people to clients", help: "Change who prepares and reviews each client." },
  { id: "editChecklist", group: "Preparation", label: "Manage checklists and client requests", help: "Edit checklist items, invite clients, request documents and set reminders." },
  { id: "reviewDocuments", group: "Preparation", label: "Approve or reject client documents", help: "Accept uploads and correct extracted values." },
  { id: "editWorksheet", group: "Preparation", label: "Prepare the worksheet", help: "Edit worksheet values and send the return to a reviewer." },
  { id: "approveReturns", group: "Review & filing", label: "Approve returns or request changes", help: "Sign off a prepared return, or send it back to the preparer." },
  { id: "pushReturns", group: "Review & filing", label: "Push approved returns to tax software", help: "Send the approved return to the firm's filing software." },
  { id: "viewTeamProgress", group: "Firm", label: "View team progress", help: "See each team member's clients, what's waiting on them and what's overdue." },
  { id: "manageTeam", group: "Firm", label: "Invite people and manage teams", help: "Invite or remove people and create or edit teams." },
  { id: "manageSettings", group: "Firm", label: "Change firm settings", help: "Tax filing software and other workspace settings." },
];

const all = (on: boolean) => Object.fromEntries(CAPABILITIES.map((c) => [c.id, on])) as Record<Capability, boolean>;
export const ROLE_DEFAULTS: Record<UserType, Record<Capability, boolean>> = {
  Admin: all(true),
  Preparer: { ...all(false), viewAllClients: true, viewContactInfo: true, addClients: true, assignWork: true, editChecklist: true, reviewDocuments: true, editWorksheet: true },
  Reviewer: { ...all(false), approveReturns: true },
};

type AccessState = Pick<OrgState, "currentId" | "roleAccess" | "memberAccess">;
/** What a person's user type allows in this workspace (admin-edited defaults applied). */
export function roleAllows(type: UserType, cap: Capability, s: AccessState = useOrg.getState()) {
  if (type === "Admin") return true;
  return s.roleAccess[s.currentId]?.[type]?.[cap] ?? ROLE_DEFAULTS[type][cap];
}
/** Can this member do this? Admins always can; guests are view-only; then personal override, then role. */
export function can(member: Member | undefined, cap: Capability, s: AccessState = useOrg.getState()) {
  if (!member) return false;
  if (member.role === "Owner" || member.role === "Admin") return true;
  if (member.role === "Guest") return false;
  return s.memberAccess[s.currentId]?.[member.id]?.[cap] ?? roleAllows(userType(member), cap, s);
}
/** Personal override for a member, if an admin set one. */
export const overrideOf = (memberId: string, cap: Capability, s: AccessState = useOrg.getState()) => s.memberAccess[s.currentId]?.[memberId]?.[cap];

export { WS_COLORS, ME };

export type UserType = "Admin" | "Preparer" | "Reviewer";
/** Owners/Admins are Admin; otherwise Reviewers (and Partners) review and everyone else prepares. */
export const userType = (m: Member): UserType =>
  m.role === "Owner" || m.role === "Admin" ? "Admin" : m.title === "Reviewer" || m.title === "Partner" ? "Reviewer" : "Preparer";
/** Label shown next to a person everywhere: their workflow user type, or Guest for view-only access. */
export const typeLabel = (m: Member) => (m.role === "Guest" ? "Guest" : userType(m));

const NO_MEMBERS: Member[] = [];
/** Members of the current workspace (stable reference for selectors). */
export const useMembers = () => useOrg((s) => s.members[s.currentId] ?? NO_MEMBERS);
export const useCurrentWorkspace = () => useOrg((s) => s.workspaces.find((w) => w.id === s.currentId)!);
export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
