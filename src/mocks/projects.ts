import type { Project } from "@/types";

export const projects: Project[] = [
  { id: "p1", name: "Product Demo - A", color: "var(--color-avatar-2)" },
  { id: "p2", name: "Marketing Campaign", color: "var(--color-avatar-7)" },
];

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
