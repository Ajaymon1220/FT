import { useState, type ReactNode } from "react";
import { ChevronDown, Download, Link2, MessageCircle, Search } from "lucide-react";

import { HandoffBanner, HandoffBar } from "@/components/client/Handoff";
import { go, href } from "@/lib/route";
import { useEngagement } from "@/store/engagement";
import { useCan } from "@/store/auth";
import form1040 from "@/assets/ws/form-1040.png";

/* ---------- Worksheet cells: green = pulled from a document, blue = preparer input ---------- */
// Contact and identity fields are masked for people without "viewContactInfo".
const SENSITIVE = /-(phone|email|ssn|dob|idno)$/;

function Cell({ id, value, filled, wide }: { id: string; value?: string; filled?: boolean; wide?: boolean }) {
  const [v, setV] = useState(value ?? "");
  const canEdit = useCan("editWorksheet");
  const canSeeContact = useCan("viewContactInfo");
  const masked = !canSeeContact && SENSITIVE.test(id) && !!v;
  return (
    <input
      id={id}
      aria-label={id.replace(/-/g, " ")}
      value={masked ? "••••••••" : v}
      readOnly={!canEdit || masked}
      title={masked ? "Hidden: you don't have access to customer contact details" : !canEdit ? "View only" : undefined}
      onChange={(e) => setV(e.target.value)}
      className={`h-7 min-w-0 px-1.5 text-sm text-fg outline-none focus:ring-1 focus:ring-brand ${wide ? "flex-[2]" : "flex-1"} ${filled || v ? "bg-cell-filled" : "bg-cell-empty"}`}
    />
  );
}

function L({ children }: { children: ReactNode }) {
  return <span className="flex h-7 w-[150px] shrink-0 items-center justify-center bg-surface text-center text-sm text-fg">{children}</span>;
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex border-b border-line">{children}</div>;
}

function Checks({ prefix, checked = [] }: { prefix: string; checked?: string[] }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line px-8 py-1.5">
      {["Blind or disabled", "Full-time student", "On active duty", "Can be claimed", "Passed away"].map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm text-fg">
          <input id={`${prefix}-${o}`} type="checkbox" defaultChecked={checked.includes(o)} className="size-4 accent-brand" /> {o}
        </label>
      ))}
    </div>
  );
}

function Person({ prefix, data }: { prefix: string; data?: { first: string; last: string; phone?: string; email?: string } }) {
  return (
    <>
      <Row><L>First Name</L><Cell id={`${prefix}-first`} value={data?.first} filled={!!data} /><L>Last Name</L><Cell id={`${prefix}-last`} value={data?.last} filled={!!data} /><L>SSN</L><Cell id={`${prefix}-ssn`} value={data ? "**********" : ""} filled={!!data} /></Row>
      <Row><L>Date of Birth</L><Cell id={`${prefix}-dob`} wide /><L>Occupation</L><Cell id={`${prefix}-occ`} value={data ? "**********" : ""} filled={!!data} wide /></Row>
      <Row><L>Phone No</L><Cell id={`${prefix}-phone`} value={data?.phone} filled={!!data?.phone} wide /><L>Email</L><Cell id={`${prefix}-email`} value={data?.email} filled={!!data?.email} wide /></Row>
      <Row><L>ID No.</L><Cell id={`${prefix}-idno`} wide /><L>ID State</L><Cell id={`${prefix}-idstate`} wide /></Row>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h3 className="px-2 pt-6 pb-2 text-base text-fg">{title}:</h3>
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

const nav = [
  { n: "1", label: "Personal Information", kids: [["1.1", "Taxpayer", "ws-taxpayer"], ["1.2", "Spouse", "ws-spouse"], ["1.3", "Mailing Address", "ws-address"], ["1.4", "Dependent 1", "ws-dependent"]] },
  { n: "2", label: "Income Information", kids: [["2.1", "Job Income (W-2)", "ws-w2"], ["2.2", "Investment & Savings", "ws-invest"]] },
  { n: "3", label: "Deductions and Credits", kids: [["3.1", "HSA (Form 8889)", "ws-hsa"]] },
] as const;

export function Worksheet({ clientId }: { clientId: string }) {
  const items = useEngagement((s) => s.checklists[clientId] ?? []);
  const engagement = useEngagement((s) => s.engagements[clientId]);
  const client = useEngagement((s) => s.clients.find((c) => c.id === clientId));
  const [tab, setTab] = useState<"Worksheet" | "1040">("Worksheet");
  const [active, setActive] = useState("ws-taxpayer");
  const [navQuery, setNavQuery] = useState("");

  const [first, ...rest] = (client?.name ?? "").split(" ");
  const isMarci = clientId === "c1";
  const w2s = items.filter((i) => (i.kind === "file" || i.kind === "slot") && (i.parentId === "w2" || /w-?2/i.test(i.name)) && i.fields);
  const unreviewed = items.filter((i) => i.kind !== "group" && i.status === "Needs Review");
  const pendingInvest = items.filter((i) => !i.parentId && /1099|interest|dividend|stock/i.test(i.name));
  const hsa = items.find((i) => i.name === "Form 8889" && i.status !== "Rejected");
  const field = (doc: (typeof items)[number], box: string) => doc.fields?.find((f) => f.box === box)?.value;

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const intake = engagement.stage === "Intake";

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Worksheet views" className="flex border-b border-line px-6">
        {(["Worksheet", "1040"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px px-4 pt-3 pb-2 text-sm ${tab === t ? "border-b-2 border-brand font-semibold text-brand" : "font-medium text-muted hover:text-fg"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "1040" ? (
        <div className="bg-surface-grey p-2 sm:p-4">
          <img alt="Form 1040 draft" src={form1040} className="mx-auto w-full max-w-[900px] bg-surface" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3 text-sm text-muted">
            <div className="flex gap-12">
              <span>Federal Balance Due: <span className="text-fg">$ --</span></span>
              <span>Va Balance Due <span className="text-fg">$ --</span></span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Download worksheet" className="flex rounded-md border border-line p-1.5 hover:bg-surface-grey"><Download size={16} /></button>
              <button type="button" aria-label="Comments" className="flex rounded-md border border-line p-1.5 hover:bg-surface-grey"><MessageCircle size={16} /></button>
              <HandoffBar clientId={clientId} unreviewed={unreviewed} />
            </div>
          </div>

          {intake && (
            <p className="bg-banner px-6 py-2 text-sm text-fg">
              Intake isn't complete yet. Values below may change. <a href={href({ name: "client", clientId, section: "checklist" })} className="font-medium text-brand underline">Go to checklist</a>
            </p>
          )}
          <HandoffBanner clientId={clientId} />

          <div className="flex gap-2 p-2">
            <aside className="sticky top-14 hidden h-[calc(100vh-200px)] w-[170px] shrink-0 overflow-auto rounded-md bg-surface p-2 shadow-[0_0_0_1px_var(--color-line)] lg:block">
              <label className="mb-3 flex h-8 items-center gap-2 rounded-3xl border border-line px-3">
                <Search size={14} className="text-muted" />
                <input id="ws-nav-search" value={navQuery} onChange={(e) => setNavQuery(e.target.value)} placeholder="Search" className="w-full min-w-0 text-sm outline-none placeholder:text-muted" />
              </label>
              {nav.map((g) => (
                <div key={g.n} className="mb-2">
                  <p className="flex items-center justify-between px-1 text-xs text-muted"><span>{g.n} &nbsp;{g.label}</span><ChevronDown size={14} /></p>
                  <ul className="mt-1">
                    {g.kids.filter(([, l]) => !navQuery || l.toLowerCase().includes(navQuery.toLowerCase())).map(([n, l, id]) => (
                      <li key={id}>
                        <button type="button" onClick={() => jump(id)} className={`w-full truncate py-1 pl-4 text-left text-xs ${active === id ? "text-brand" : "text-muted hover:text-fg"}`}>{n} {l}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </aside>

            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="min-w-[760px]">
                <h2 className="bg-brand px-2 py-2 text-xl font-medium text-on-brand">2025 Individual Tax Prep</h2>
                <h3 className="mt-4 bg-section px-2 py-2 text-xl text-fg">Personal Information</h3>

                <Section id="ws-taxpayer" title="Taxpayer">
                  <Person prefix="tp" data={{ first, last: rest.join(" "), phone: isMarci ? "7010845504" : "", email: isMarci ? "Marci@example.com" : "" }} />
                  <Checks prefix="tp" checked={isMarci ? ["On active duty"] : []} />
                </Section>
                <Section id="ws-spouse" title="Spouse">
                  <Person prefix="sp" />
                  <Checks prefix="sp" />
                </Section>
                <Section id="ws-address" title="Mailing Address">
                  <Row><L>Address</L><Cell id="addr-line" wide /></Row>
                  <Row><L>City</L><Cell id="addr-city" /><L>State</L><Cell id="addr-state" /><L>Country</L><Cell id="addr-country" /><L>Zip</L><Cell id="addr-zip" /></Row>
                  <Row>
                    <L>Moved in 2025?</L>
                    <label className="flex flex-1 items-center gap-2 bg-cell-empty px-3 text-sm"><input type="radio" name="moved" defaultChecked={isMarci} className="accent-brand" /> Yes</label>
                    <label className="flex flex-1 items-center gap-2 px-3 text-sm"><input type="radio" name="moved" defaultChecked={!isMarci} className="accent-brand" /> No</label>
                    <L>Date moved</L><Cell id="addr-moved" value={isMarci ? "12/06/2025" : ""} />
                  </Row>
                </Section>
                <Section id="ws-dependent" title="Dependent 1">
                  <Row><L>First Name</L><Cell id="dep-first" value={isMarci ? "Mark" : ""} filled={isMarci} /><L>Last Name</L><Cell id="dep-last" value={isMarci ? "Fumons" : ""} filled={isMarci} /><L>SSN</L><Cell id="dep-ssn" value={isMarci ? "**********" : ""} filled={isMarci} /></Row>
                  <Row><L>Date of Birth</L><Cell id="dep-dob" wide /><L>Relationship</L><Cell id="dep-rel" value={isMarci ? "Son" : ""} filled={isMarci} wide /></Row>
                </Section>

                <h3 className="mt-6 bg-section px-2 py-2 text-xl text-fg">Income Information</h3>
                <Section id="ws-w2" title="Job Income (W-2)">
                  <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] border-b border-line bg-surface-muted text-xs font-medium text-muted">
                    {["Employer", "Wages (Box 1)", "Federal withheld (Box 2)", "State tax (Box 17)", "Source"].map((h) => <span key={h} className="px-2 py-2">{h}</span>)}
                  </div>
                  {w2s.length === 0 && <p className="px-2 py-3 text-sm text-muted">No W-2 uploaded yet.</p>}
                  {w2s.map((d) => {
                    const ok = d.status === "Validated";
                    const cell = `tnum px-2 py-1.5 text-sm ${ok ? "bg-cell-filled text-fg" : "bg-cell-empty text-muted"}`;
                    return (
                      <div key={d.id} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] border-b border-line">
                        <span className={cell}>{d.employer ?? d.name}</span>
                        <span className={cell}>{ok ? `$ ${field(d, "Box 1") ?? "--"}` : "—"}</span>
                        <span className={cell}>{ok ? `$ ${field(d, "Box 2") ?? "--"}` : "—"}</span>
                        <span className={cell}>{ok ? (field(d, "Box 17") ? `$ ${field(d, "Box 17")}` : "Fetch in review") : "—"}</span>
                        {d.kind === "slot" && !d.fileName ? (
                          <span className="truncate px-2 py-1.5 text-xs text-muted">Waiting on customer</span>
                        ) : (
                          <a href={href({ name: "review", clientId, itemId: d.id })} className="flex items-center gap-1.5 truncate px-2 py-1.5 text-xs text-brand hover:underline" title="Open the source document">
                            <Link2 size={12} className="shrink-0" /> {d.fileName ?? d.name}{ok ? "" : " · needs review"}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </Section>
                <Section id="ws-invest" title="Investment & Savings">
                  {pendingInvest.map((p) => (
                    <Row key={p.id}>
                      <L>{p.name.replace(/.*\((.*)\)/, "$1")}</L>
                      <span className={`flex flex-1 items-center px-2 text-sm ${p.status === "Validated" ? "bg-cell-filled text-fg" : "bg-cell-empty text-muted"}`}>
                        {p.status === "Pending" ? "Waiting on customer" : p.status}
                      </span>
                      {p.status === "Pending" && (
                        <button type="button" onClick={() => go({ name: "client", clientId, section: "checklist" })} className="px-3 text-xs text-brand hover:underline">Request</button>
                      )}
                    </Row>
                  ))}
                </Section>

                <h3 className="mt-6 bg-section px-2 py-2 text-xl text-fg">Deductions and Credits</h3>
                <Section id="ws-hsa" title="HSA (Form 8889)">
                  <Row>
                    <L>HSA contributions</L>
                    <span className={`tnum flex flex-1 items-center px-2 text-sm ${hsa?.status === "Validated" ? "bg-cell-filled text-fg" : "bg-cell-empty text-muted"}`}>
                      {hsa?.status === "Validated" ? `$ ${field(hsa, "Line 2")}` : hsa ? "Needs review" : "Not provided"}
                    </span>
                    {hsa && <a href={href({ name: "review", clientId, itemId: hsa.id })} className="flex items-center px-3 text-xs text-brand hover:underline"><Link2 size={12} className="mr-1" /> Source</a>}
                  </Row>
                </Section>
                <div className="h-10" />
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
