import { cn } from "@/lib/utils";

export function HelixMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <path
        d="M10 5c6 3.2 12 3.2 18 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 27c6-3.2 12-3.2 18 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M12 8.2c4.6 2.4 9.4 2.4 14 0M12 23.8c4.6-2.4 9.4-2.4 14 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M13.5 11.5c3.6 1.7 7.4 1.7 11 0M13.5 20.5c3.6-1.7 7.4-1.7 11 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function HelixWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <HelixMark className="text-accent" />
      <span className="font-display text-[1.15rem] font-medium tracking-[-0.03em]">
        Helix
      </span>
    </span>
  );
}
