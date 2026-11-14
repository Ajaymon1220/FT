import { create } from "zustand";

import { go } from "@/lib/route";

interface UiState {
  /** Where to go back to when the full-screen Add client flow is closed. */
  returnTo: string;
  /** Open the full-screen Add client flow (new client or import), remembering where we came from. */
  openAddClient: () => void;
  closeAddClient: () => void;
  /** A backup dropped on the Add client screen; the import page starts reading it right away. */
  pendingImport: string | null;
  setPendingImport: (fileName: string | null) => void;
}

const FLOW = ["add-client", "new-client", "import"];

export const useUi = create<UiState>((set, get) => ({
  returnTo: "workspace",
  openAddClient: () => {
    const here = window.location.hash.replace(/^#/, "");
    if (!FLOW.includes(here)) set({ returnTo: here || "workspace" });
    go({ name: "add-client" });
  },
  closeAddClient: () => { window.location.hash = get().returnTo || "workspace"; },
  pendingImport: null,
  setPendingImport: (pendingImport) => set({ pendingImport }),
}));
