// Tax filing software a firm can connect. The admin picks one at sign-up (or in Settings);
// it is the destination for "Push to …" and the default source for client import.
export type SoftwareId = "lacerte" | "proconnect" | "proseries" | "drake" | "ultratax" | "cch-axcess" | "cch-prosystem" | "atx";

export interface TaxSoftware {
  id: SoftwareId;
  name: string;
  vendor: string;
  /** File the firm exports to bring clients in (shown on the import screen). */
  exportFile: string;
  /** Plain-language export steps. Exact menu names vary by version, so these stay general. */
  exportSteps: string[];
}

export const TAX_SOFTWARE: TaxSoftware[] = [
  {
    id: "lacerte", name: "Lacerte", vendor: "Intuit", exportFile: "Client backup (.zip)",
    exportSteps: ["Open Lacerte and choose last year's tax year.", "Back up the client files you want to bring over (individual and business modules).", "Zip the backup folder and upload it here."],
  },
  {
    id: "proconnect", name: "ProConnect Tax", vendor: "Intuit", exportFile: "Client list export (.csv)",
    exportSteps: ["Open ProConnect Tax and go to your client list.", "Select the clients for last year and export them.", "Upload the exported file here."],
  },
  {
    id: "proseries", name: "ProSeries", vendor: "Intuit", exportFile: "Client backup (.zip)",
    exportSteps: ["Open ProSeries for last year.", "Back up the client files you want to bring over.", "Zip the backup and upload it here."],
  },
  {
    id: "drake", name: "Drake Tax", vendor: "Drake Software", exportFile: "Client backup (.zip)",
    exportSteps: ["Open Drake Tax for last year.", "Create a backup of the returns you want to bring over.", "Zip the backup and upload it here."],
  },
  {
    id: "ultratax", name: "UltraTax CS", vendor: "Thomson Reuters", exportFile: "Client backup (.zip)",
    exportSteps: ["Open UltraTax CS for last year.", "Back up the clients you want to bring over.", "Zip the backup and upload it here."],
  },
  {
    id: "cch-axcess", name: "CCH Axcess Tax", vendor: "Wolters Kluwer", exportFile: "Return export (.zip or .csv)",
    exportSteps: ["Open CCH Axcess Tax for last year.", "Export the returns or client list you want to bring over.", "Upload the export here."],
  },
  {
    id: "cch-prosystem", name: "CCH ProSystem fx", vendor: "Wolters Kluwer", exportFile: "Client backup (.zip)",
    exportSteps: ["Open ProSystem fx Tax for last year.", "Back up or export the clients you want to bring over.", "Upload the file here."],
  },
  {
    id: "atx", name: "ATX", vendor: "Wolters Kluwer", exportFile: "Client backup (.zip)",
    exportSteps: ["Open ATX for last year.", "Back up the returns you want to bring over.", "Zip the backup and upload it here."],
  },
];

/** File types accepted for a client import. */
export const IMPORT_ACCEPT = [".zip", ".csv", ".xlsx"];

export const softwareById = (id: SoftwareId | undefined) => TAX_SOFTWARE.find((s) => s.id === id);
