import { initials } from "@/store/org";

const TONES = ["bg-sage text-fg", "bg-status-review-bg text-status-review-fg", "bg-status-prep-bg text-status-prep-fg", "bg-status-pending-bg text-status-pending-fg", "bg-cream-deep text-fg"];
const tone = (name: string) => TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];

export function Avatar({ name, size = 24, pending, className = "" }: { name: string; size?: number; pending?: boolean; className?: string }) {
  return (
    <span
      title={pending ? `${name} (invite pending)` : name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2 ring-surface ${pending ? "border border-dashed border-muted bg-surface text-muted" : tone(name)} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3, size = 24 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="flex items-center">
      {shown.map((n, i) => <Avatar key={n + i} name={n} size={size} className={i ? "-ml-1" : ""} />)}
      {names.length > max && <span className="-ml-1 inline-flex items-center justify-center rounded-full bg-section text-[10px] text-muted ring-2 ring-surface" style={{ width: size, height: size }}>+{names.length - max}</span>}
    </span>
  );
}

/** Square workspace mark (replaces the logo in the sidebar). */
export function WorkspaceMark({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.46 }}>
      {name.trim()[0]?.toUpperCase()}
    </span>
  );
}
