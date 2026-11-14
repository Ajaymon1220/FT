import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ME, type Member } from "@/mocks/org";
import { can, useOrg, type Capability } from "@/store/org";

interface AuthState {
  /** Signed-in team member id; null when signed out. */
  userId: string | null;
  signedIn: boolean;
  signIn: (userId: string) => void;
  signOut: () => void;
}

/** Prototype session: a persisted member id, no real credentials are checked. */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      signedIn: false,
      signIn: (userId) => set({ userId, signedIn: true }),
      signOut: () => set({ userId: null, signedIn: false }),
    }),
    { name: "flowtax-auth" },
  ),
);

/** Find a team member by email across all workspaces (first workspace they belong to wins). */
export function memberByEmail(email: string): { member: Member; workspaceId: string } | undefined {
  const all = useOrg.getState().members;
  for (const [workspaceId, list] of Object.entries(all)) {
    const member = list.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
    if (member) return { member, workspaceId };
  }
  return undefined;
}

/** The signed-in person as a member of the current workspace. */
export function useCurrentUser(): Member | undefined {
  const userId = useAuth((s) => s.userId) ?? ME;
  return useOrg((s) => s.members[s.currentId]?.find((m) => m.id === userId));
}

export const isAdminRole = (m: Member | undefined) => m?.role === "Owner" || m?.role === "Admin";

/** Reactive capability check for the signed-in person (re-renders when an admin changes access). */
export function useCan(cap: Capability): boolean {
  const me = useCurrentUser();
  return useOrg((s) => can(me, cap, s));
}
