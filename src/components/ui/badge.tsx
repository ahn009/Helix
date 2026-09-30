import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-elevated text-muted shadow-[var(--shadow-border)]",
        accent: "bg-accent/15 text-accent",
        sage: "bg-sage/15 text-sage",
        rust: "bg-rust/15 text-rust",
        ink: "bg-ink/15 text-ink",
        outline: "text-muted shadow-[var(--shadow-border)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
