import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  violet: "stat-violet",
  emerald: "stat-emerald",
  amber: "stat-amber",
  sky: "stat-sky",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "violet",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <div className={cn("panel p-5", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-background/40 text-foreground/80">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
