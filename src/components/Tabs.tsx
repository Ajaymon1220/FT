interface TabsProps<T extends string> {
  tabs: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Underline tabs from the Figma "Tab" component: active = brand + 2px rule, rest = 1px border rule. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex h-7 w-full items-start border-b border-line">
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`-mb-px flex h-7 min-w-[70px] items-start justify-center px-4 text-sm leading-5 tracking-[-0.16px] ${
              active ? "border-b-2 border-brand font-semibold text-brand" : "border-b border-line font-medium text-muted hover:text-fg"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
