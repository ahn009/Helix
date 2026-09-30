import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  label,
  invert,
}: {
  value: number;
  label: string;
  invert?: boolean;
}) {
  const good = invert ? value < 3 : value >= 8;
  const warn = invert ? value < 5 : value >= 6;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "font-mono text-lg tabular-nums",
          good ? "text-sage" : warn ? "text-fg" : "text-rust",
        )}
      >
        {value.toFixed(1)}
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</div>
    </div>
  );
}
