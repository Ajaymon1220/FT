import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Lock, Mail, MailCheck, Sparkles, Upload, UserPlus, UserRound } from "lucide-react";

import { go } from "@/lib/route";
import { isAdminRole, memberByEmail, useAuth } from "@/store/auth";
import { ME, useOrg } from "@/store/org";
import { Logo } from "@/components/Logo";
import { SoftwarePicker } from "@/components/SoftwarePicker";
import { Avatar } from "@/components/org/Avatar";
import { StatusPill } from "@/components/workspace/parts";
import { STAGES } from "@/lib/workflow";
import { softwareById, type SoftwareId } from "@/lib/taxSoftware";
import badgeAicpa from "@/assets/auth/badge-aicpa.png";
import badgeIso from "@/assets/auth/badge-iso.png";

const CLIENT_RANGES = ["1–25", "26–100", "101–250", "251–500", "500+"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const linkCls = "font-medium text-brand underline-offset-2 hover:underline";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ================= Brand panel: one return moving through the real workflow ================= */
const FLOW_EVENTS: { text: string; who: string; ai?: boolean }[] = [
  { text: "Checklist drafted from last year's 1040", who: "Flowtax AI", ai: true },
  { text: "Checklist shared with Sara", who: "Anjali Varma" },
  { text: "W-2 uploaded · 14 fields pulled", who: "Flowtax AI", ai: true },
  { text: "All 7 documents approved", who: "Anjali Varma" },
  { text: "Worksheet sent for review", who: "Anjali Varma" },
  { text: "Return approved", who: "Karan Sharma" },
  { text: "Pushed to Lacerte", who: "Ajay Mon" },
];
const DOCS_IN = [0, 0, 3, 7, 7, 7, 7];

function FlowDemo() {
  const [step, setStep] = useState(() => (prefersReducedMotion() ? 4 : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % STAGES.length), 2600);
    return () => window.clearInterval(t);
  }, []);
  const stage = STAGES[step];
  const feed = [step, step - 1, step - 2].filter((i) => i >= 0);

  return (
    <div className="relative w-full max-w-[440px]" aria-hidden>
      {/* Main client card */}
      <div className="animate-drift relative z-10 rounded-2xl bg-surface p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name="Sara Pritchard" size={36} />
            <div>
              <p className="text-sm leading-5 font-medium text-fg">Sara Pritchard</p>
              <p className="text-xs leading-4 text-muted">1040 · Head of household · 2025</p>
            </div>
          </div>
          <StatusPill status={stage.status} />
        </div>

        <div className="mt-5 flex gap-1">
          {STAGES.map((s, i) => (
            <span key={s.status} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i < step ? "bg-brand/50" : i === step ? stage.dot : "bg-grid"}`} />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs leading-4">
          <span className="text-muted">Step {step + 1} of {STAGES.length}</span>
          <span className="text-fg">{stage.owner === "Done" ? "Filed" : <>Whose turn: <b className="font-medium">{stage.owner}</b></>}</span>
        </div>

        <div className="mt-4 rounded-lg bg-surface-grey p-3">
          <div className="flex items-center justify-between text-xs leading-4">
            <span className="text-muted">Documents</span>
            <span className="tnum text-fg">{DOCS_IN[step]}/7</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-grid">
            <div className="h-full rounded-full bg-status-prep-fg transition-[width] duration-700" style={{ width: `${(DOCS_IN[step] / 7) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Activity feed tucked under the card */}
      <ul className="relative mx-4 -mt-3 flex flex-col gap-1.5 rounded-b-2xl bg-cream/95 px-4 pt-6 pb-3">
        {feed.map((i, n) => {
          const e = FLOW_EVENTS[i];
          return (
            <li key={i} className={`animate-fade-up flex items-center gap-2 text-xs leading-4 ${n ? "text-muted" : "text-fg"}`}>
              {e.ai ? <Sparkles size={12} className="shrink-0 text-ai-border" /> : <Check size={12} className="shrink-0 text-status-prep-fg" />}
              <span className="truncate">{e.text}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted">{e.who}</span>
            </li>
          );
        })}
      </ul>

      {/* Floating AI chip */}
      <div className="animate-drift absolute -top-5 -right-4 z-20 flex items-center gap-2 rounded-full border border-brand-border bg-surface py-1.5 pr-3 pl-1.5 shadow-lg [animation-delay:-3s]">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-on-brand"><Sparkles size={12} /></span>
        <span className="flex flex-col">
          <span className="text-[11px] leading-3 font-medium text-fg">Reading W-2…</span>
          <span className="ai-shimmer mt-1 h-1 w-20 rounded-full" />
        </span>
      </div>
    </div>
  );
}

function BrandPanel({ title, accent, body }: { title: string; accent: string; body: string }) {
  return (
    <aside className="auth-panel relative hidden flex-col justify-between overflow-hidden rounded-3xl p-10 text-on-brand lg:flex lg:w-[52%] xl:p-14">
      <p className="font-display text-2xl tracking-tight">flowtax</p>

      <div className="flex flex-col gap-10">
        <div className="flex max-w-[480px] flex-col gap-4">
          <h2 className="font-display text-[44px] leading-[1.05] font-normal tracking-[-0.02em] text-cream xl:text-[52px]">
            {title} <em className="text-cream-deep/80 italic">{accent}</em>
          </h2>
          <p className="max-w-[420px] text-[15px] leading-6 text-sage-deep">{body}</p>
        </div>
        <FlowDemo />
      </div>

      <div className="flex items-center gap-4 text-xs leading-4 text-sage-deep">
        <span className="flex gap-2">
          <img alt="AICPA SOC certified" src={badgeAicpa} className="size-10 rounded-full bg-white object-cover" />
          <span className="flex size-10 items-center justify-center rounded-full bg-white p-1"><img alt="ISO 9001:2015 certified" src={badgeIso} className="w-full object-contain" /></span>
        </span>
        <span>SOC 2 and ISO 9001:2015 certified.<br />Customer data is encrypted in transit and at rest.</span>
      </div>
    </aside>
  );
}

/* ================= Layout ================= */
function AuthLayout({ panel, topRight, children }: { panel: { title: string; accent: string; body: string }; topRight: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-full bg-surface p-3 lg:h-full lg:p-4">
      <BrandPanel {...panel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-2 py-2 sm:px-6 lg:px-10">
          <span className="lg:invisible"><Logo /></span>
          <p className="text-right text-sm text-muted">{topRight}</p>
        </header>
        <main className="flex flex-1 items-center justify-center px-2 py-10 sm:px-6 lg:overflow-y-auto">
          <div className="animate-fade-up flex w-full max-w-[420px] flex-col gap-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Heading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && <p className="text-xs font-medium tracking-[0.08em] text-ai-border uppercase">{eyebrow}</p>}
      <h1 className="font-display text-[34px] leading-[1.1] font-normal tracking-[-0.02em] text-fg">{title}</h1>
      {sub && <p className="text-sm leading-5 text-muted">{sub}</p>}
    </div>
  );
}

/* ================= Form pieces ================= */
function Field({ id, label, error, aside, children }: { id: string; label: string; error?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm leading-5 font-medium text-fg">{label}</label>
        {aside}
      </div>
      {children}
      {error && <p id={`${id}-err`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const shell = (invalid: boolean) =>
  `flex h-11 w-full items-center gap-2.5 rounded-xl border bg-surface px-3.5 text-sm text-fg transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 ${invalid ? "border-destructive" : "border-line hover:border-brand-border"}`;
const bare = "w-full min-w-0 bg-transparent outline-none placeholder:text-muted-80";

function TextInput({ id, icon, type = "text", value, onChange, placeholder, invalid, autoComplete, autoFocus }: { id: string; icon?: ReactNode; type?: string; value: string; onChange: (v: string) => void; placeholder: string; invalid: boolean; autoComplete?: string; autoFocus?: boolean }) {
  return (
    <div className={shell(invalid)}>
      {icon && <span className="shrink-0 text-muted">{icon}</span>}
      <input id={id} type={type} value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined} className={bare} />
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; invalid: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className={shell(invalid)}>
      <Lock size={16} className="shrink-0 text-muted" />
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined} className={bare} />
      <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((s) => !s)} className="shrink-0 rounded text-muted hover:text-fg">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** 0–4 score from length and character variety. */
function strength(pw: string) {
  if (!pw) return 0;
  let s = pw.length >= 8 ? 1 : 0;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
}
const STRENGTH = [
  { label: "", bar: "" },
  { label: "Weak", bar: "bg-destructive" },
  { label: "Okay", bar: "bg-status-pending-fg" },
  { label: "Good", bar: "bg-status-prep-fg" },
  { label: "Strong", bar: "bg-brand" },
];

function StrengthMeter({ value }: { value: string }) {
  const s = strength(value);
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= s ? STRENGTH[s].bar : "bg-grid"}`} />)}
      </div>
      <span className="w-20 text-right text-xs text-muted">{value ? STRENGTH[s].label : "8+ characters"}</span>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type={onClick ? "button" : "submit"} onClick={onClick} disabled={disabled}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-on-brand shadow-[0_8px_20px_-8px_rgba(27,77,62,0.6)] transition-[background-color,transform] hover:bg-brand-bar active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function Divider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />{children}<span className="h-px flex-1 bg-line" />
    </div>
  );
}

/* ================= Demo accounts (prototype only): one per user type ================= */
const DEMO_ACCOUNTS = [
  { role: "Admin", name: "Ajay Mon", email: "ajaymon@gmail.com", note: "Runs the firm" },
  { role: "Preparer", name: "Rihaan Mehta", email: "rihaan@monassociates.com", note: "Prepares returns" },
  { role: "Reviewer", name: "Karan Sharma", email: "karan@monassociates.com", note: "Approves returns" },
];

function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Divider>or explore the prototype as</Divider>
      <div className="grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.role} type="button" onClick={() => onPick(a.email)} aria-label={`Sign in as ${a.name}, ${a.role}`}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-grey px-2 py-3 text-center transition-colors hover:border-brand hover:bg-brand-soft">
            <Avatar name={a.name} size={32} />
            <span className="text-sm leading-5 font-medium text-fg">{a.role}</span>
            <span className="text-[11px] leading-3 text-muted">{a.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= Login ================= */
const LOGIN_PANEL = {
  title: "Tax season,",
  accent: "minus the chase.",
  body: "Checklists that draft themselves, documents that sort themselves, and a team that always knows whose turn it is.",
};

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mode, setMode] = useState<"login" | "forgot" | "sent">("login");
  const signIn = useAuth((s) => s.signIn);

  const enter = (address: string) => {
    const found = memberByEmail(address);
    if (!found) return false;
    useOrg.getState().switchWorkspace(found.workspaceId);
    signIn(found.member.id);
    go({ name: isAdminRole(found.member) ? "workspace" : "dashboard" });
    return true;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: EMAIL_RE.test(email.trim()) ? undefined : "Enter a valid email address",
      password: password ? undefined : "Enter your password",
    };
    if (!next.email && !memberByEmail(email)) next.email = "No account uses this email. Try a demo account below, or sign up.";
    setErrors(next);
    if (!next.email && !next.password) enter(email);
  };

  const sendReset = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErrors({ email: "Enter the email you sign in with" });
    setErrors({});
    setMode("sent");
  };

  const topRight = <><span className="hidden sm:inline">New to Flowtax? </span><a href="#signup" className={linkCls}>Create an account</a></>;

  if (mode !== "login") {
    return (
      <AuthLayout panel={LOGIN_PANEL} topRight={topRight}>
        <button type="button" onClick={() => { setMode("login"); setErrors({}); }} className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Back to log in</button>
        {mode === "forgot" ? (
          <>
            <Heading title="Reset your password" sub="Enter the email you sign in with and we'll send you a link to set a new one." />
            <form onSubmit={sendReset} noValidate className="flex flex-col gap-5">
              <Field id="reset-email" label="Work email" error={errors.email}>
                <TextInput id="reset-email" icon={<Mail size={16} />} type="email" value={email} onChange={setEmail} placeholder="you@yourfirm.com" invalid={!!errors.email} autoComplete="email" autoFocus />
              </Field>
              <PrimaryButton>Send reset link</PrimaryButton>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-start gap-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-status-prep-bg text-status-prep-fg"><MailCheck size={22} /></span>
            <Heading title="Check your inbox" sub={<>If <b className="font-medium text-fg">{email.trim()}</b> has an account, a reset link is on its way. It expires in 30 minutes.</>} />
            <p className="text-xs text-muted">Prototype: no email is actually sent. Use a demo account to sign in.</p>
          </div>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panel={LOGIN_PANEL} topRight={topRight}>
      <Heading eyebrow="Welcome back" title="Log in to your firm" sub="Pick up right where your team left off." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field id="login-email" label="Work email" error={errors.email}>
          <TextInput id="login-email" icon={<Mail size={16} />} type="email" value={email} onChange={setEmail} placeholder="you@yourfirm.com" invalid={!!errors.email} autoComplete="email" />
        </Field>
        <Field id="login-password" label="Password" error={errors.password}
          aside={<button type="button" onClick={() => { setMode("forgot"); setErrors({}); }} className={`text-xs ${linkCls}`}>Forgot password?</button>}>
          <PasswordInput id="login-password" value={password} onChange={setPassword} placeholder="Enter your password" invalid={!!errors.password} autoComplete="current-password" />
        </Field>
        <PrimaryButton>Log in</PrimaryButton>
      </form>
      <DemoAccounts onPick={enter} />
    </AuthLayout>
  );
}

/* ================= Sign up ================= */
const SIGNUP_STEPS = ["Your firm", "Tax software", "First customers"];
const SIGNUP_PANEL = [
  { title: "Set up your firm", accent: "in three quick steps.", body: "Tell us about your practice, connect your tax software, and bring last year's customers over. Most firms are ready in under five minutes." },
  { title: "File where you", accent: "already file.", body: "Approved returns push straight into your tax software, and last year's customers come over with their prior-year details." },
  { title: "Every customer gets", accent: "a checklist on day one.", body: "Import last year's backup and each customer gets a document checklist drafted from their prior-year return." },
];

function Stepper({ at }: { at: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${at + 1} of ${SIGNUP_STEPS.length}`}>
      {SIGNUP_STEPS.map((label, i) => {
        const done = i < at, on = i === at;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={on ? "step" : undefined}>
            <span className={`h-1 rounded-full transition-colors duration-500 ${done || on ? "bg-brand" : "bg-grid"}`} />
            <span className={`flex items-center gap-1 text-xs ${on ? "font-medium text-fg" : done ? "text-brand" : "text-muted"}`}>
              {done && <Check size={12} strokeWidth={3} />}{label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Signup() {
  const [v, setV] = useState({ first: "", last: "", email: "", company: "", clients: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const signIn = useAuth((s) => s.signIn);
  // After the form: the new admin picks the firm's tax software, then can import clients from it.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [software, setSoftware] = useState<SoftwareId | undefined>();
  const set = (k: keyof typeof v) => (val: string) => { setV((s) => ({ ...s, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const req = (x: string, msg: string) => (x.trim() ? undefined : msg);
    const next: Record<string, string | undefined> = {
      first: req(v.first, "Enter your first name"),
      last: req(v.last, "Enter your last name"),
      email: EMAIL_RE.test(v.email.trim()) ? undefined : "Enter a valid email address",
      company: req(v.company, "Enter your firm's name"),
      clients: v.clients ? undefined : "Pick the closest range",
      password: v.password.length >= 8 ? undefined : "Use at least 8 characters",
    };
    setErrors(next);
    if (Object.values(next).every((x) => !x)) setStage(1);
  };

  // A new sign-up becomes the owner (admin) of the demo firm. Sign in last: the route guard leaves auth screens once signed in.
  const finish = (to: "import" | "new-client" | "workspace") => {
    const org = useOrg.getState();
    org.switchWorkspace("ws1");
    if (software) org.setTaxSoftware(software);
    signIn(ME);
    go({ name: to });
  };
  const softwareName = softwareById(software)?.name;
  const topRight = <><span className="hidden sm:inline">Already have an account? </span><a href="#login" className={linkCls}>Log in</a></>;

  return (
    <AuthLayout panel={SIGNUP_PANEL[stage]} topRight={topRight}>
      <Stepper at={stage} />

      {stage === 0 && (
        <>
          <Heading title="Create your firm's workspace" sub="Free during the prototype. No card needed." />
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:gap-3">
              <Field id="su-first" label="First name" error={errors.first}><TextInput id="su-first" icon={<UserRound size={16} />} value={v.first} onChange={set("first")} placeholder="Ajay" invalid={!!errors.first} autoComplete="given-name" /></Field>
              <Field id="su-last" label="Last name" error={errors.last}><TextInput id="su-last" value={v.last} onChange={set("last")} placeholder="Mon" invalid={!!errors.last} autoComplete="family-name" /></Field>
            </div>
            <Field id="su-email" label="Work email" error={errors.email}><TextInput id="su-email" icon={<Mail size={16} />} type="email" value={v.email} onChange={set("email")} placeholder="you@yourfirm.com" invalid={!!errors.email} autoComplete="email" /></Field>
            <Field id="su-company" label="Firm name" error={errors.company}><TextInput id="su-company" icon={<Building2 size={16} />} value={v.company} onChange={set("company")} placeholder="Mon & Associates CPA" invalid={!!errors.company} autoComplete="organization" /></Field>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm leading-5 font-medium text-fg">How many customers do you file for?</legend>
              <div role="radiogroup" aria-invalid={!!errors.clients || undefined} className="flex flex-wrap gap-2">
                {CLIENT_RANGES.map((r) => {
                  const on = v.clients === r;
                  return (
                    <label key={r} className={`tnum cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${on ? "border-brand bg-brand text-on-brand" : errors.clients ? "border-destructive text-fg" : "border-line text-fg hover:border-brand-border hover:bg-surface-grey"}`}>
                      <input type="radio" name="su-clients" value={r} checked={on} onChange={() => set("clients")(r)} className="sr-only" />{r}
                    </label>
                  );
                })}
              </div>
              {errors.clients && <p role="alert" className="text-xs text-destructive">{errors.clients}</p>}
            </fieldset>

            <Field id="su-password" label="Password" error={errors.password}>
              <PasswordInput id="su-password" value={v.password} onChange={set("password")} placeholder="Create a password" invalid={!!errors.password} autoComplete="new-password" />
              <StrengthMeter value={v.password} />
            </Field>

            <PrimaryButton>Continue</PrimaryButton>
            <p className="text-center text-xs leading-4 text-muted">By continuing you agree to the Terms of Service and Privacy Policy.</p>
          </form>
        </>
      )}

      {stage === 1 && (
        <>
          <Heading title="Which tax software do you file with?" sub="Approved returns are pushed here, and you can bring last year's customers over from it. You can change this later in Settings." />
          <SoftwarePicker value={software} onChange={setSoftware} compact />
          <div className="flex flex-col gap-3">
            <PrimaryButton disabled={!software} onClick={() => setStage(2)}>Continue</PrimaryButton>
            <button type="button" onClick={() => setStage(0)} className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Back</button>
          </div>
        </>
      )}

      {stage === 2 && (
        <>
          <Heading title="Add your first customers" sub={<>Bring last year's customers over from {softwareName}, or start with one by hand.</>} />
          <div className="flex flex-col gap-3">
            {[
              { to: "import" as const, icon: <Upload size={18} />, title: `Import from ${softwareName}`, body: "Upload last year's backup. Each customer gets a checklist built from their prior-year return.", tag: "Fastest" },
              { to: "new-client" as const, icon: <UserPlus size={18} />, title: "Add a customer by hand", body: "Enter one customer's details and we'll draft their checklist.", tag: "" },
            ].map((o) => (
              <button key={o.to} type="button" onClick={() => finish(o.to)}
                className="group flex items-start gap-3 rounded-2xl border border-line p-4 text-left transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_8px_24px_-12px_rgba(27,77,62,0.4)]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{o.icon}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">{o.title}{o.tag && <span className="rounded-full bg-cream-deep px-2 text-[10px] leading-5">{o.tag}</span>}</span>
                  <span className="text-xs leading-4 text-muted">{o.body}</span>
                </span>
                <ArrowRight size={16} className="mt-3 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
              </button>
            ))}
            <div className="mt-1 flex items-center justify-between">
              <button type="button" onClick={() => setStage(1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Back</button>
              <button type="button" onClick={() => finish("workspace")} className={`text-sm ${linkCls}`}>Skip for now</button>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
