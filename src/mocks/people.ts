import type { Person } from "@/types";

export const people: Person[] = [
  { id: "u1", name: "Alex Smith", avatarColor: "var(--color-avatar-2)", initials: "AS" },
  { id: "u2", name: "Priya Nair", avatarColor: "var(--color-avatar-3)", initials: "PN" },
  { id: "u3", name: "Sam Lee", avatarColor: "var(--color-avatar-5)", initials: "SL" },
];

export function getPerson(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}
