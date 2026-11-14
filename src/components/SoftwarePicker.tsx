import { Check } from "lucide-react";

import { TAX_SOFTWARE, type SoftwareId } from "@/lib/taxSoftware";

/** Radio-card grid of tax filing software (used at sign-up, in Settings and on import). */
export function SoftwarePicker({ value, onChange, disabled, name = "tax-software", compact }: { value?: SoftwareId; onChange: (id: SoftwareId) => void; disabled?: boolean; name?: string; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Tax filing software" className={`grid grid-cols-2 gap-2 ${compact ? "" : "sm:grid-cols-4"}`}>
      {TAX_SOFTWARE.map((s) => {
        const on = s.id === value;
        return (
          <label key={s.id} className={`relative flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand-border"} ${disabled ? "cursor-default opacity-70" : ""}`}>
            <input type="radio" name={name} value={s.id} checked={on} disabled={disabled} onChange={() => onChange(s.id)} className="sr-only" />
            <span className="text-sm leading-5 font-medium text-fg">{s.name}</span>
            <span className="text-xs leading-4 text-muted">{s.vendor}</span>
            {on && <Check size={14} className="absolute top-3 right-3 text-brand" aria-hidden />}
          </label>
        );
      })}
    </div>
  );
}
