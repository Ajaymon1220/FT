/** Workspace = one firm (ClickUp-style). Each has its own people, teams and clients. */
export interface Workspace {
  id: string;
  name: string;
  color: string;
  plan: "Free" | "Firm";
}

/** Permission role (what they can do) — separate from their job title (what they do on returns). */
export type Role = "Owner" | "Admin" | "Member" | "Guest";
export type Title = "Partner" | "Preparer" | "Reviewer" | "Admin staff";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: Title;
  status: "Active" | "Pending";
  lastActive: string;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  alias: string;
  description: string;
  color: string;
  memberIds: string[];
}

export const WS_COLORS = ["#1b4d3e", "#c2570c", "#1f4e8c", "#8a5a00", "#6d5bd0", "#b42318"];

export const workspaces: Workspace[] = [
  { id: "ws1", name: "Mon & Associates CPA", color: "#1b4d3e", plan: "Firm" },
  { id: "ws2", name: "Bay Area Tax Partners", color: "#1f4e8c", plan: "Free" },
];

/** The signed-in user is the same person in every workspace. */
export const ME = "m-ajay";

export const members: Record<string, Member[]> = {
  ws1: [
    { id: ME, name: "Ajay Mon", email: "ajaymon@gmail.com", role: "Owner", title: "Partner", status: "Active", lastActive: "Now" },
    { id: "m-anjali", name: "Anjali Varma", email: "anjali@monassociates.com", role: "Member", title: "Preparer", status: "Active", lastActive: "Today" },
    { id: "m-rihaan", name: "Rihaan Mehta", email: "rihaan@monassociates.com", role: "Member", title: "Preparer", status: "Active", lastActive: "Yesterday" },
    { id: "m-karan", name: "Karan Sharma", email: "karan@monassociates.com", role: "Member", title: "Reviewer", status: "Active", lastActive: "Nov 9" },
    { id: "m-sofia", name: "Sofia Patel", email: "sofia.patel@gmail.com", role: "Member", title: "Preparer", status: "Pending", lastActive: "—" },
  ],
  ws2: [
    { id: "m-liam", name: "Liam Johnson", email: "liam@bayareatax.com", role: "Owner", title: "Partner", status: "Active", lastActive: "Today" },
    { id: ME, name: "Ajay Mon", email: "ajaymon@gmail.com", role: "Admin", title: "Reviewer", status: "Active", lastActive: "Now" },
    { id: "m-chloe", name: "Chloe Kim", email: "chloe@bayareatax.com", role: "Member", title: "Preparer", status: "Active", lastActive: "Nov 10" },
    { id: "m-aiden", name: "Aiden Smith", email: "aiden@bayareatax.com", role: "Member", title: "Preparer", status: "Active", lastActive: "Nov 7" },
  ],
};

export const teams: Team[] = [
  { id: "t-ind", workspaceId: "ws1", name: "Individual Returns", alias: "@individual", description: "1040 preparation for households and sole proprietors.", color: "#1b4d3e", memberIds: ["m-anjali", "m-rihaan"] },
  { id: "t-review", workspaceId: "ws1", name: "Review Desk", alias: "@review", description: "Final review and sign-off before customer approval.", color: "#1f4e8c", memberIds: [ME, "m-karan"] },
  { id: "t-biz", workspaceId: "ws2", name: "Business Returns", alias: "@business", description: "1065, 1120 and 1120-S engagements.", color: "#c2570c", memberIds: ["m-chloe", "m-aiden"] },
];

/** Who is assigned to each client (member ids) and which team owns it. */
export const assignments: Record<string, { memberIds: string[]; teamId?: string }> = {
  c1: { memberIds: [ME, "m-rihaan"], teamId: "t-ind" },
  c2: { memberIds: [ME] },
  c3: { memberIds: [ME, "m-rihaan", "m-karan"], teamId: "t-ind" },
  c4: { memberIds: ["m-anjali", "m-karan"], teamId: "t-review" },
  c5: { memberIds: ["m-anjali", "m-karan"] },
  c6: { memberIds: ["m-rihaan"], teamId: "t-ind" },
  c7: { memberIds: ["m-anjali"] },
  c8: { memberIds: ["m-rihaan", "m-karan"], teamId: "t-ind" },
  c9: { memberIds: ["m-anjali", "m-karan"] },
  d1: { memberIds: ["m-chloe"], teamId: "t-biz" },
  d2: { memberIds: ["m-aiden", ME] },
  d3: { memberIds: ["m-chloe"], teamId: "t-biz" },
  d4: { memberIds: ["m-aiden", ME] },
};
