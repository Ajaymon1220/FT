import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: string;
}

/** Figma "Button" (shadcn-based): 28px tall, 6px radius, 8px side padding + 4px text wrap. */
export function Button({ variant = "primary", icon, children, className = "", ...rest }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-brand text-on-brand hover:bg-brand/90"
      : "border border-line bg-surface text-muted hover:bg-surface-grey";
  return (
    <button
      type="button"
      className={`flex min-w-16 shrink-0 items-center justify-center overflow-hidden rounded-md px-2 py-1 text-sm leading-5 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    >
      {icon && <img alt="" src={icon} className="size-4" />}
      <span className="px-1 whitespace-nowrap">{children}</span>
    </button>
  );
}
