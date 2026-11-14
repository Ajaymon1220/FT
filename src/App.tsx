import { useEffect, useState } from "react";

import { ClientShell } from "@/components/client/ClientShell";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Toast } from "@/components/ui";
import { useUi } from "@/store/ui";
import { go, parseHash, type Route } from "@/lib/route";
import { Checklist } from "@/pages/client/Checklist";
import { Overview } from "@/pages/client/Overview";
import { ReviewDoc } from "@/pages/client/ReviewDoc";
import { Worksheet } from "@/pages/client/Worksheet";
import { Login, Signup } from "@/pages/Auth";
import { Dashboard } from "@/pages/Dashboard";
import { AddClientStart } from "@/pages/AddClientStart";
import { ImportClients } from "@/pages/ImportClients";
import { NewClient } from "@/pages/NewClient";
import { Settings } from "@/pages/Settings";
import { TeamPage } from "@/pages/Team";
import { Workspace } from "@/pages/Workspace";
import { useAuth, useCan, useCurrentUser } from "@/store/auth";
import { useOrg } from "@/store/org";
import { useEngagement } from "@/store/engagement";

export type View = "dashboard" | "workspace" | "clients" | "preferences" | "people" | "teams";

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

function Redirect({ to }: { to: Route }) {
  useEffect(() => go(to), [to]);
  return null;
}

function NoAccess({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-surface p-10 text-center">
      <p className="text-base font-medium text-fg">{what}</p>
      <p className="text-sm text-muted">Ask an admin if you need access. <a className="text-brand underline" href="#workspace">Back to Workspace</a></p>
    </div>
  );
}

function Screen({ route }: { route: Route }) {
  const signedIn = useAuth((s) => s.signedIn);
  const exists = useEngagement((s) => ("clientId" in route ? s.clients.some((c) => c.id === route.clientId) : true));
  const me = useCurrentUser();
  const canAll = useCan("viewAllClients");
  const canAdd = useCan("addClients");
  const assignedToMe = useOrg((s) => ("clientId" in route && !!me ? !!s.assignments[route.clientId]?.memberIds.includes(me.id) : false));
  if (!exists) return <p className="p-10 text-sm text-muted">That client doesn't exist. <a className="text-brand underline" href="#workspace">Back to Workspace</a></p>;

  const isAuthRoute = route.name === "login" || route.name === "signup";
  // Route guard: signed-out users only see login/signup; signed-in users skip them.
  if (!signedIn && !isAuthRoute) return <Login />;
  if (signedIn && isAuthRoute) return <Redirect to={{ name: "dashboard" }} />;
  if (route.name === "login") return <Login />;
  if (route.name === "signup") return <Signup />;

  // Access guard: people limited to their own clients can't open others by link; adding clients needs "addClients".
  if ("clientId" in route && !canAll && !assignedToMe) return <NoAccess what="This client isn't assigned to you." />;
  if ((route.name === "add-client" || route.name === "new-client" || route.name === "import") && !canAdd) return <NoAccess what="You don't have access to add or import clients." />;

  if (route.name === "review") return <ReviewDoc clientId={route.clientId} itemId={route.itemId} />;

  if (route.name === "client") {
    return (
      <ClientShell clientId={route.clientId} section={route.section}>
        {route.section === "overview" && <Overview clientId={route.clientId} />}
        {route.section === "checklist" && <Checklist clientId={route.clientId} />}
        {route.section === "worksheet" && <Worksheet clientId={route.clientId} />}
        {(route.section === "utility" || route.section === "contracts") && (
          <p className="px-6 py-10 text-sm text-muted">{route.section === "utility" ? "Utility" : "Contracts"} isn't in the prototype yet. Use Checklist or Worksheet.</p>
        )}
      </ClientShell>
    );
  }

  // Add client is a focused, full-screen flow: no sidebar.
  if (route.name === "add-client" || route.name === "new-client" || route.name === "import") {
    return (
      <main className="h-full overflow-y-auto bg-surface">
        {route.name === "add-client" ? <AddClientStart /> : route.name === "import" ? <ImportClients /> : <NewClient />}
      </main>
    );
  }

  const view = route.name as View;
  return (
    <div className="flex h-full flex-col bg-surface md:flex-row">
      <Sidebar current={view} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface">
        {view === "dashboard" && <Dashboard onNewClient={() => useUi.getState().openAddClient()} />}
        {view === "workspace" && <Workspace />}
        {(view === "people" || view === "teams") && <TeamPage tab={view} />}
        {view === "preferences" && <Settings />}
        {view === "clients" && (
          <>
            <TopBar title="Clients" />
            <p className="px-6 py-10 text-sm text-muted">This screen isn't in the prototype yet. Use Dashboard or Workspace.</p>
          </>
        )}
      </main>
    </div>
  );
}

export function App() {
  const route = useRoute();
  return (
    <>
      <Screen route={route} />
      <Toast />
    </>
  );
}
