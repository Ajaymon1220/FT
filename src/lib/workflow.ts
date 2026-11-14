// Client workflow from research/Our_Platform_User_Flow.md ("State and handoff rules"):
// preparer sets up the checklist → shares it → client uploads → preparer approves documents and
// prepares the worksheet → reviewer reviews and approves → admin pushes to the tax filing software. Board columns, list status and the admin view all read from here.
import type { Client, ClientStatus, Priority } from "@/mocks/clients";
import type { Member } from "@/mocks/org";
import { can, userType } from "@/store/org";

export type StageOwner = "Preparer" | "Client" | "Reviewer" | "Admin" | "Done";

export interface StageDef {
  status: ClientStatus;
  /** What is happening in this column, in plain words. */
  caption: string;
  owner: StageOwner;
  /** Status pill classes (list + board). */
  pill: string;
  /** Solid dot/bar colour for the stage. */
  dot: string;
}

export const STAGES: StageDef[] = [
  { status: "Draft", caption: "Preparer builds the checklist", owner: "Preparer", pill: "bg-status-draft-bg text-fg", dot: "bg-muted" },
  { status: "Client Invited", caption: "Checklist shared with client", owner: "Client", pill: "bg-status-invited-bg text-status-invited-fg", dot: "bg-status-invited-fg" },
  { status: "Pending Docs", caption: "Client uploading documents", owner: "Client", pill: "bg-status-pending-bg text-status-pending-fg", dot: "bg-status-pending-fg" },
  { status: "Prep Started", caption: "Preparer approves docs, prepares worksheet", owner: "Preparer", pill: "bg-status-prep-bg text-status-prep-fg", dot: "bg-status-prep-fg" },
  { status: "Ready for Review", caption: "Reviewer checking the work", owner: "Reviewer", pill: "bg-status-review-bg text-status-review-fg", dot: "bg-status-review-fg" },
  { status: "Approved", caption: "Reviewer approved · admin pushes it", owner: "Admin", pill: "bg-sage text-brand", dot: "bg-ai-border" },
  { status: "Pushed", caption: "Sent to the tax filing software", owner: "Done", pill: "bg-brand text-on-brand", dot: "bg-brand" },
];

export const STATUSES = STAGES.map((s) => s.status);
export const stageOf = (status: ClientStatus) => STAGES.find((s) => s.status === status) ?? STAGES[0];
export const stageIndex = (status: ClientStatus) => STATUSES.indexOf(status);

export const PRIORITIES: Priority[] = ["Urgent", "High", "Normal", "Low"];
export const priorityColor: Record<Priority, string> = {
  Urgent: "text-destructive",
  High: "text-status-pending-fg",
  Normal: "text-status-review-fg",
  Low: "text-muted",
};
export const isImportant = (c: Client) => c.priority === "Urgent" || c.priority === "High" || c.tag === "Important";

export { userType };

/** Split a client's assignees into preparers, reviewers and admins. */
export function clientTeam(memberIds: string[] | undefined, members: Member[]) {
  const assigned = members.filter((m) => memberIds?.includes(m.id));
  return {
    assigned,
    preparers: assigned.filter((m) => userType(m) === "Preparer"),
    reviewers: assigned.filter((m) => userType(m) === "Reviewer"),
    admins: assigned.filter((m) => userType(m) === "Admin"),
  };
}

/** Is this client currently waiting on this person to act? */
export function waitingOn(member: Member, status: ClientStatus) {
  const owner = stageOf(status).owner;
  return owner !== "Client" && owner !== "Done" && owner === userType(member);
}

/** Approving and pushing need those permissions (Reviewer / Admin by default); anyone can move work earlier. */
export function canMoveTo(member: Member | undefined, to: ClientStatus) {
  if (!member) return false;
  if (to === "Pushed") return can(member, "pushReturns");
  if (to === "Approved") return can(member, "approveReturns");
  return true;
}

/** Due dates are stored as YYYY-MM-DD on the engagement's reminders. */
export function isOverdue(dueDate: string | undefined, status: ClientStatus) {
  if (!dueDate || status === "Pushed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`) < today;
}

export const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

/** Last stage this user type owns; a client past it is finished from their side. */
export const lastOwnedStage = (type: StageOwner) => Math.max(...STAGES.map((s, i) => (s.owner === type ? i : -1)));
