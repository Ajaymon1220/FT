import type { Client } from "@/mocks/clients";

export type ItemStatus = "Pending" | "Needs Review" | "Validated" | "Rejected";

export interface Comment {
  id: string;
  author: string;
  fromClient?: boolean;
  at: string;
  text: string;
}

export interface Field {
  box: string;
  label: string;
  value: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
  /** group = category row; slot = a requested document not yet uploaded; file = an uploaded document. */
  kind: "group" | "slot" | "file";
  /** Uploaded file name once a slot is filled. */
  fileName?: string;
  parentId?: string;
  note?: string;
  required?: boolean;
  aiSuggested?: boolean;
  isNew?: boolean;
  status: ItemStatus;
  comments: Comment[];
  notes: number;
  /** Document preview used in Review Doc. */
  preview?: "w2" | "w2-2023" | "none";
  employer?: string;
  fields?: Field[];
  /** Boxes the extractor can fetch on request ("Add Additional Fields"). */
  extraFields?: Field[];
  requestedAt?: string;
  rejectReason?: string;
}

const W2_NOTE = "Please upload your W-2 form for any employment you had in 2025.";
const STOCK_NOTE = "You mentioned selling stock. Please upload the 1099-B from your brokerage.";

const c = (author: string, text: string, fromClient = false): Comment => ({
  id: crypto.randomUUID(),
  author,
  fromClient,
  at: "Dec 23, 10:53 am",
  text,
});

/* Marci Fumons — before invitation (Figma "Section 1", V2 checklist).
   Every row is suggested from last year's return; nothing is uploaded yet. */
const slot = (id: string, parentId: string, name: string, note: string, ai: boolean, fields: Field[], employer?: string): ChecklistItem => ({
  id, parentId, name, note, kind: "slot", aiSuggested: ai, status: "Pending", comments: [], notes: 0, preview: "none", fields, employer,
});

/* W-2 shown in the V2 Review Doc frames (Optum Services, 2023 sample). Values are read from that image so the review traces to the source. */
const w2OptumFields: Field[] = [
  { box: "Box 1", label: "Wages, Tips, other Compensation", value: "32998.01" },
  { box: "Box 2", label: "Federal Income Tax Withheld", value: "690.20" },
  { box: "Box 4", label: "Social Security Tax Withheld", value: "2125.51" },
  { box: "Box 6", label: "Medicare Tax Withheld", value: "497.10" },
];
const w2OptumExtra: Field[] = [
  { box: "Box 3", label: "Social Security Wages", value: "34282.43" },
  { box: "Box 5", label: "Medicare Wages and Tips", value: "34282.43" },
  { box: "Box 12a", label: "Code C — Group-term life insurance", value: "30.36" },
  { box: "Box 12b", label: "Code D — 401(k) elective deferrals", value: "1083.78" },
  { box: "Box 12c", label: "Code W — HSA contributions", value: "1966.66" },
  { box: "Box 12d", label: "Code DD — Employer health coverage", value: "6811.30" },
  { box: "Box 16", label: "State Wages, Tips, etc.", value: "32998.01" },
  { box: "Box 17", label: "State Income Tax", value: "1366.40" },
  { box: "Box 19", label: "Local Income Tax", value: "791.95" },
];
const marciV2: ChecklistItem[] = [
  { id: "w2", name: "W-2 Income", kind: "group", required: true, aiSuggested: true, status: "Pending", comments: [], notes: 0, note: "One W-2 for every job held in 2025." },
  { ...slot("w2a", "w2", "W-2", "David’s Job A - Previous Employer", true, w2OptumFields, "Optum Services, Inc"), preview: "w2-2023", extraFields: w2OptumExtra },
  slot("w2b", "w2", "W-2", "David’s Job B - Current Employer", true, [{ box: "Box 1", label: "Wages, Tips, other Compensation", value: "41200.00" }, { box: "Box 2", label: "Federal Income Tax Withheld", value: "3920.00" }], "David’s Job B"),
  slot("w2c", "w2", "W-2", "Elena’s - Current Employer", false, [{ box: "Box 1", label: "Wages, Tips, other Compensation", value: "38750.00" }, { box: "Box 2", label: "Federal Income Tax Withheld", value: "3310.00" }], "Elena’s employer"),
  { id: "int", name: "1099 Income", kind: "group", required: true, aiSuggested: true, status: "Pending", comments: [], notes: 0, note: "Interest statements from each bank." },
  slot("inta", "int", "1099-INT", "Chase Bank - Report even if less than $10 if you have the form", true, [{ box: "Box 1", label: "Interest Income", value: "142.18" }]),
  slot("intb", "int", "1099-INT", "Ally Bank - Check for \"Early Withdrawal Penalties\" in Box 2", true, [{ box: "Box 1", label: "Interest Income", value: "611.40" }, { box: "Box 2", label: "Early Withdrawal Penalty", value: "0.00" }]),
  slot("intc", "int", "1099-INT", "Credit Union - Often found on the Dec 31st bank statement, not a separate letter", false, [{ box: "Box 1", label: "Interest Income", value: "38.02" }]),
  { id: "div", name: "Dividends & Brokerage", kind: "group", required: true, aiSuggested: true, status: "Pending", comments: [], notes: 0, note: "Consolidated 1099s from each brokerage." },
  slot("diva", "div", "1099", "Vanguard Consolidated - Look for \"Qualified Dividends\" vs. \"Ordinary Dividends.\"", true, [{ box: "Box 1a", label: "Total Ordinary Dividends", value: "1284.55" }, { box: "Box 1b", label: "Qualified Dividends", value: "1102.10" }]),
  slot("divb", "div", "1099", "Fidelity Consolidated", true, [{ box: "Box 1a", label: "Total Ordinary Dividends", value: "406.90" }, { box: "Box 1b", label: "Qualified Dividends", value: "390.00" }]),
  slot("divc", "div", "1099", "Robinhood/Crypto", false, [{ box: "1099-B", label: "Proceeds", value: "5320.00" }, { box: "1099-DA", label: "Digital asset proceeds", value: "880.00" }]),
];

// Sara Pritchard — documents uploaded and in review (earlier Figma Checklist frames).
const sara: ChecklistItem[] = [
  {
    id: "w2", name: "W-2 Form", kind: "group", required: true, aiSuggested: true, note: W2_NOTE, status: "Needs Review", notes: 1,
    comments: [c("Ajay Mon", "Two employers this year — uploaded both.", true), c("Ajay Mon", "Thanks, reviewing now."), c("Ajay Mon", "I'd like to discuss this further", true)],
  },
  {
    id: "w2-sample", parentId: "w2", name: "W-2_Sample Company.INC", kind: "file", status: "Needs Review", notes: 1, preview: "w2",
    employer: "Sample Company Inc", comments: [c("Ajay Mon", "I'd like to discuss this further", true)],
    fields: [
      { box: "Box 1", label: "Wages, Tips, other Compensation", value: "23500.00" },
      { box: "Box 2", label: "Federal Income Tax Withheld", value: "1500.00" },
      { box: "Box 4", label: "Social Security Tax Withheld", value: "1457.00" },
      { box: "Box 6", label: "Medicare Tax Withheld", value: "340.75" },
    ],
    extraFields: [
      { box: "Box 3", label: "Social Security Wages", value: "23500.00" },
      { box: "Box 5", label: "Medicare Wages and Tips", value: "23500.00" },
      { box: "Box 12a", label: "Code W — HSA contributions", value: "500.00" },
      { box: "Box 16", label: "State Wages, Tips, etc.", value: "23500.00" },
      { box: "Box 17", label: "State Income Tax", value: "800.00" },
    ],
  },
  {
    id: "w2-aia", parentId: "w2", name: "W-2_AIA", kind: "file", status: "Needs Review", notes: 1, preview: "w2",
    employer: "AIA Holdings", comments: [c("Ajay Mon", "This is from my part-time job.", true)],
    fields: [
      { box: "Box 1", label: "Wages, Tips, other Compensation", value: "8200.00" },
      { box: "Box 2", label: "Federal Income Tax Withheld", value: "640.00" },
      { box: "Box 4", label: "Social Security Tax Withheld", value: "508.40" },
      { box: "Box 6", label: "Medicare Tax Withheld", value: "118.90" },
    ],
    extraFields: [{ box: "Box 17", label: "State Income Tax", value: "210.00" }],
  },
  { id: "int", name: "Interest Income (Form 1099-INT)", kind: "group", required: true, note: "Interest Income (Form 1099-INT) from each bank account.", status: "Pending", notes: 1, comments: [c("Ajay Mon", "Which banks do I need?", true), c("Ajay Mon", "Any account that paid over $10 in interest."), c("Ajay Mon", "Got it.", true)] },
  { id: "stock", name: "Sale of Stock (Form 1099-B)", kind: "group", required: true, note: STOCK_NOTE, status: "Pending", notes: 1, comments: [] },
  { id: "schc", name: "New Business Income (Schedule C)", kind: "group", required: true, note: "Profit and loss summary for your consulting business.", status: "Validated", notes: 1, comments: [] },
  {
    id: "schc-pl", parentId: "schc", name: "Consulting_P&L_2025.xlsx", kind: "file", status: "Validated", notes: 0, preview: "none", comments: [],
    fields: [
      { box: "Line 1", label: "Gross receipts or sales", value: "18400.00" },
      { box: "Line 28", label: "Total expenses", value: "4950.00" },
      { box: "Line 31", label: "Net profit", value: "13450.00" },
    ],
  },
  { id: "f8889a", name: "Form 8889", kind: "file", status: "Rejected", notes: 0, preview: "none", rejectReason: "Wrong tax year (2023).", comments: [c("Ajay Mon", "Please upload the 2025 version.")] },
  { id: "f8889b", name: "Form 8889", kind: "file", status: "Needs Review", notes: 0, preview: "none", comments: [], fields: [{ box: "Line 2", label: "HSA contributions you made", value: "500.00" }] },
  { id: "f8879", name: "Form 8879", kind: "file", isNew: true, status: "Needs Review", notes: 0, preview: "none", comments: [], fields: [{ box: "Line 1", label: "Adjusted gross income", value: "31700.00" }] },
  { id: "f8867", name: "Form 8867", kind: "file", isNew: true, status: "Needs Review", notes: 0, preview: "none", comments: [], fields: [{ box: "Part I", label: "Due diligence questions answered", value: "Yes" }] },
];

const TEMPLATE = [
  "W-2 Form", "Interest Income (Form 1099-INT)", "Sale of Stock (Form 1099-B)", "Dividends (Form 1099-DIV)",
  "Prior Year Return", "Health Coverage (Form 1095-A)", "Mortgage Interest (Form 1098)", "Charitable Donations",
  "Estimated Tax Payments", "Business Expenses",
];

/** Generic checklist for the other clients, sized to their Workspace "Checklist" count. */
function generic(client: Client): ChecklistItem[] {
  return TEMPLATE.slice(0, client.checklistTotal).map((name, i) => ({
    id: `${client.id}-${i}`,
    name,
    kind: "group" as const,
    required: i < 5,
    note: `Please upload your ${name} for 2025.`,
    status: i < client.checklistDone ? ("Validated" as const) : i < client.checklistDone + 1 ? ("Needs Review" as const) : ("Pending" as const),
    comments: [],
    notes: 0,
  }));
}

export function checklistFor(client: Client): ChecklistItem[] {
  if (client.id === "c1") return marciV2.map((i) => ({ ...i }));
  if (client.id === "c3") return sara.map((i) => ({ ...i }));
  return generic(client);
}

export const checklistCategories = [
  "New Business Income (Schedule C)", "Dividends (Form 1099-DIV)", "Mortgage Interest (Form 1098)",
  "Health Coverage (Form 1095-A)", "Charitable Donations", "Estimated Tax Payments", "Other",
];
