import { icons } from "@/components/icons";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
      <h1 className="text-base leading-[22px] font-medium tracking-[-0.18px] text-fg">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-[31px] border border-ai-border px-2 py-1"
          style={{
            backgroundImage:
              "var(--ai-gradient)",
          }}
        >
          <img alt="" src={icons.star} className="size-4" />
          <span className="text-xs leading-4 font-medium text-brand">Ask Ai</span>
        </button>
        <button type="button" aria-label="Notifications" className="flex">
          <img alt="" src={icons.bellDot} className="size-4" />
        </button>
      </div>
    </header>
  );
}
