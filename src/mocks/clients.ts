export type ClientStatus = "Draft" | "Customer Invited" | "Pending Docs" | "Prep Started" | "Ready for Review" | "Approved" | "Pushed";
export type Priority = "Urgent" | "High" | "Normal" | "Low";

export interface Client {
  id: string;
  name: string;
  tag?: string;
  taxYear: number;
  returnType: string;
  filingStatus?: "MFJ" | "MFS" | "HOH" | "QSS" | "Single";
  checklistDone: number;
  checklistTotal: number;
  reminderSet?: boolean;
  status: ClientStatus;
  /** ClickUp-style priority; Urgent and High count as important clients for the admin view. */
  priority?: Priority;
  /** Set when the client came from a tax-software import, e.g. "Lacerte". */
  importedFrom?: string;
  lastActivity: string; // DD/MM/YYYY, as shown in the design
  email?: string;
  phone?: string;
  /** Firm workspace that owns this client. Defaults to ws1 for the original demo data. */
  workspaceId?: string;
  /** Archived clients drop out of the Workspace list, board and counts but keep their data. */
  archived?: boolean;
}

export const clients: Client[] = [
  { id: "c1", name: "Marci Fumons", tag: "Important", priority: "Urgent", taxYear: 2025, returnType: "1040", filingStatus: "MFJ", checklistDone: 0, checklistTotal: 7, reminderSet: true, status: "Draft", lastActivity: "25/11/2025", email: "marci@example.com" },
  { id: "c2", name: "Leo Mendez", taxYear: 2025, returnType: "1065", checklistDone: 0, checklistTotal: 7, status: "Customer Invited", lastActivity: "26/11/2025" },
  { id: "c3", name: "Sara Pritchard", priority: "High", taxYear: 2025, returnType: "1040", filingStatus: "HOH", checklistDone: 3, checklistTotal: 7, status: "Pending Docs", lastActivity: "27/11/2025" },
  { id: "c4", name: "Smith Consulting, Inc.", priority: "High", taxYear: 2025, returnType: "1065", checklistDone: 7, checklistTotal: 7, status: "Ready for Review", lastActivity: "28/11/2025" },
  { id: "c5", name: "Jordan & Partners, LLP", priority: "Normal", taxYear: 2025, returnType: "1120s", checklistDone: 6, checklistTotal: 7, status: "Prep Started", lastActivity: "29/11/2025" },
  { id: "c6", name: "Elena Patrov", taxYear: 2025, returnType: "1040", filingStatus: "QSS", checklistDone: 5, checklistTotal: 7, status: "Draft", lastActivity: "30/11/2025" },
  { id: "c7", name: "Dr. Jane Allen, Medical Corp.", priority: "Urgent", taxYear: 2025, returnType: "1120", checklistDone: 0, checklistTotal: 10, status: "Draft", lastActivity: "01/12/2025" },
  { id: "c8", name: "Alex Antony", taxYear: 2025, returnType: "1040", filingStatus: "MFS", checklistDone: 10, checklistTotal: 10, status: "Prep Started", lastActivity: "21/01/2026", email: "alex.antony@gmail.com" },
  { id: "c9", name: "Alex Antony", priority: "Low", taxYear: 2025, returnType: "1040", checklistDone: 10, checklistTotal: 10, status: "Approved", lastActivity: "21/01/2026" },
  // Bay Area Tax Partners (second workspace) — names from the Figma board view.
  { id: "d1", workspaceId: "ws2", name: "Liam Johnson Holdings", priority: "High", taxYear: 2025, returnType: "1120", checklistDone: 2, checklistTotal: 7, status: "Pending Docs", lastActivity: "08/11/2025" },
  { id: "d2", workspaceId: "ws2", name: "Nina Roberts Design, Inc.", taxYear: 2025, returnType: "1120s", checklistDone: 4, checklistTotal: 7, status: "Prep Started", lastActivity: "09/11/2025" },
  { id: "d3", workspaceId: "ws2", name: "Omar Lewis & Co.", taxYear: 2025, returnType: "1065", checklistDone: 0, checklistTotal: 7, status: "Customer Invited", lastActivity: "10/11/2025" },
  { id: "d4", workspaceId: "ws2", name: "Penny Wong", taxYear: 2025, returnType: "1040", filingStatus: "Single", checklistDone: 5, checklistTotal: 5, status: "Ready for Review", lastActivity: "10/11/2025" },
];
