import type { ChecklistItem, Field } from "@/mocks/checklists";

export type ReturnType = "1040" | "1065" | "1120" | "1120s";
export type FilingStatus = "Single" | "MFJ" | "MFS" | "HOH" | "QSS";

export interface ChecklistInput {
  returnType: ReturnType;
  filingStatus?: FilingStatus;
  hasPriorYear: boolean;
  /** Meeting transcript + key life events, used to add situation-specific items. */
  notes: string;
}

let n = 0;
const id = (p: string) => `${p}${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function group(name: string, note: string, ai: boolean): ChecklistItem {
  return { id: id("g"), name, note, kind: "group", required: true, aiSuggested: ai, status: "Pending", comments: [], notes: 0 };
}
function slot(parent: ChecklistItem, name: string, note: string, ai: boolean, fields: Field[]): ChecklistItem {
  return { id: id("s"), parentId: parent.id, name, note, kind: "slot", aiSuggested: ai, status: "Pending", comments: [], notes: 0, preview: "none", fields };
}
const money = (box: string, label: string, value: string): Field => ({ box, label, value });

/**
 * Drafts a starting checklist. Prior-year items are marked AI-suggested; items triggered by the
 * notes are also suggestions. The preparer edits the list before inviting the client.
 */
export function generateChecklist({ returnType, filingStatus, hasPriorYear, notes }: ChecklistInput): ChecklistItem[] {
  const text = notes.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));
  const out: ChecklistItem[] = [];
  const add = (g: ChecklistItem, ...slots: [string, string, boolean, Field[]][]) => {
    out.push(g, ...slots.map(([name, note, ai, fields]) => slot(g, name, note, ai, fields)));
  };

  if (returnType === "1040") {
    const w2 = group("W-2 Income", "One W-2 for every job held in 2025.", hasPriorYear);
    const joint = filingStatus === "MFJ";
    add(
      w2,
      ["W-2", "Taxpayer - Current Employer", hasPriorYear, [money("Box 1", "Wages, Tips, other Compensation", "52400.00"), money("Box 2", "Federal Income Tax Withheld", "5120.00")]],
      ...(joint ? [["W-2", "Spouse - Current Employer", hasPriorYear, [money("Box 1", "Wages, Tips, other Compensation", "47800.00"), money("Box 2", "Federal Income Tax Withheld", "4390.00")]] as [string, string, boolean, Field[]]] : []),
    );
    add(group("1099 Income", "Interest statements from each bank.", hasPriorYear), ["1099-INT", "Primary bank - Interest statement", hasPriorYear, [money("Box 1", "Interest Income", "214.60")]]);

    if (hasPriorYear || has("stock", "brokerage", "crypto", "dividend", "invest")) {
      add(group("Dividends & Brokerage", "Consolidated 1099s from each brokerage.", true), ["1099", "Brokerage Consolidated - Dividends and sales", true, [money("Box 1a", "Total Ordinary Dividends", "880.40"), money("Box 1b", "Qualified Dividends", "702.15")]]);
    }
    if (has("freelance", "self-employ", "consult", "side business", "1099-nec", "contractor")) {
      add(group("Self-Employment (Schedule C)", "Income and expenses for freelance work.", true),
        ["1099-NEC", "Customers who paid $600 or more", true, [money("Box 1", "Nonemployee Compensation", "18200.00")]],
        ["P&L", "Income and expense summary for the year", true, [money("Line 31", "Net profit", "12950.00")]]);
    }
    if (has("home", "house", "mortgage", "condo")) {
      add(group("Home Ownership", "Mortgage and property tax records.", true),
        ["1098", "Mortgage interest statement", true, [money("Box 1", "Mortgage Interest Received", "9640.00")]],
        ["Closing", "Closing disclosure for the purchase", true, [money("Line A", "Points paid", "1200.00")]]);
    }
    if (has("baby", "child", "daycare", "kid")) {
      add(group("Dependents & Childcare", "Care provider details for the child care credit.", true), ["Receipt", "Daycare provider name, EIN and total paid", true, [money("Total", "Care expenses paid", "6400.00")]]);
    }
    if (has("married", "wedding") && filingStatus !== "MFJ") {
      add(group("Marital Status Change", "Confirm filing status after the marriage.", true), ["Info", "Spouse's SSN and date of marriage", true, [money("Date", "Date of marriage", "06/14/2025")]]);
    }
    if (has("refund", "direct deposit", "bank account")) {
      add(group("Refund Deposit", "Where the refund should be deposited.", true), ["Info", "Routing and account number for direct deposit", true, [money("Acct", "Account ending", "4421")]]);
    }
  } else {
    const entity = returnType === "1065" ? "Partnership" : returnType === "1120s" ? "S Corporation" : "Corporation";
    add(group("Financial Statements", `Year-end books for the ${entity.toLowerCase()}.`, hasPriorYear),
      ["P&L", "Profit and loss statement, Jan 1 - Dec 31, 2025", hasPriorYear, [money("Total", "Gross receipts", "412000.00")]],
      ["Balance Sheet", "Balance sheet as of Dec 31, 2025", hasPriorYear, [money("Total", "Total assets", "268500.00")]],
      ["Trial Balance", "Adjusted trial balance export", false, [money("Check", "Debits equal credits", "Yes")]]);
    add(group("Banking", "Statements for every business account.", hasPriorYear),
      ["Statement", "December bank statements for all accounts", hasPriorYear, [money("Ending", "Ending balance", "58210.00")]]);
    add(group("Payroll", "Payroll filings for the year.", hasPriorYear),
      ["941", "Quarterly payroll returns (Q1-Q4)", hasPriorYear, [money("Line 2", "Wages paid", "184000.00")]],
      ["W-3", "Transmittal of wage statements", false, [money("Box 1", "Total wages", "184000.00")]]);
    if (returnType === "1065") {
      add(group("Partner Information", "Details needed for each partner's K-1.", true), ["K-1 Info", "Partner names, addresses, ownership %", true, [money("Partners", "Number of partners", "3")]]);
    } else if (returnType === "1120s") {
      add(group("Shareholder Information", "Ownership and officer compensation.", true),
        ["Ownership", "Shareholder names and ownership %", true, [money("Owners", "Number of shareholders", "2")]],
        ["Officer W-2", "Officer compensation W-2s", true, [money("Box 1", "Officer wages", "96000.00")]]);
    } else {
      add(group("Corporate Records", "Board and estimated tax records.", true), ["1120-W", "Estimated tax payments made in 2025", true, [money("Total", "Estimated payments", "24000.00")]]);
    }
    if (has("equipment", "vehicle", "asset", "purchase")) {
      add(group("Fixed Assets", "New purchases for depreciation.", true), ["Invoices", "Invoices for assets bought in 2025", true, [money("Total", "Cost of additions", "38500.00")]]);
    }
  }
  return out;
}

/** What the prior-year extractor "reads" from an uploaded 2024 return (mocked). */
export function extractFromPriorYear(fileName: string) {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").split(/[_\-\s]/)[0] ?? "";
  const words = base.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").filter((w) => /^[A-Z][a-z]+$/.test(w) && !/^(Tax|Return|Prior|Year|Form)$/.test(w));
  const [firstName, lastName] = words.length >= 2 ? words : ["Marlena", "Matthews"];
  return {
    returnType: "1040" as ReturnType,
    filingStatus: "MFJ" as FilingStatus,
    firstName,
    lastName,
    email: `${firstName}${lastName}@gmail.com`.toLowerCase(),
    phone: "(202) 555-0160",
    ssn: "383-86-2793",
    lifeEvents:
      "The IRS was instructed to deposit your refund of $2810 directly into an account at Refundo. Once this direct deposit is received by the bank, the bank will deposit the funds into your bank account. This deposit will be available based on the time and date your bank receives the deposit from Refundo.",
  };
}
