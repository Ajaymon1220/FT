// Plain `#name` hash routes (letters, digits, hyphens) so links can be shared.
export type ClientSection = "overview" | "checklist" | "utility" | "worksheet" | "contracts";

export type Route =
  | { name: "dashboard" }
  | { name: "login" }
  | { name: "signup" }
  | { name: "workspace" }
  | { name: "new-client" }
  | { name: "import" }
  | { name: "add-client" }
  | { name: "people" }
  | { name: "teams" }
  | { name: "clients" }
  | { name: "preferences" }
  | { name: "client"; clientId: string; section: ClientSection }
  | { name: "review"; clientId: string; itemId: string };

const sections: ClientSection[] = ["overview", "checklist", "utility", "worksheet", "contracts"];

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "");
  if (h === "login" || h === "signup" || h === "workspace" || h === "clients" || h === "preferences" || h === "new-client" || h === "import" || h === "add-client" || h === "people" || h === "teams") return { name: h };
  let m = h.match(/^client-([a-z0-9]+)-([a-z]+)$/);
  if (m && sections.includes(m[2] as ClientSection)) return { name: "client", clientId: m[1], section: m[2] as ClientSection };
  m = h.match(/^review-([a-z0-9]+)-([a-z0-9-]+)$/);
  if (m) return { name: "review", clientId: m[1], itemId: m[2] };
  return { name: "dashboard" };
}

export function href(route: Route): string {
  switch (route.name) {
    case "client":
      return `#client-${route.clientId}-${route.section}`;
    case "review":
      return `#review-${route.clientId}-${route.itemId}`;
    default:
      return `#${route.name}`;
  }
}

export function go(route: Route) {
  window.location.hash = href(route).slice(1);
}
