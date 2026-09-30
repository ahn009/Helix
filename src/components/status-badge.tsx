import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";

const VARIANT: Record<string, "default" | "accent" | "sage" | "rust" | "ink" | "outline"> = {
  running: "sage",
  completed: "ink",
  reviewing: "accent",
  generating: "accent",
  draft: "outline",
  paused: "default",
  cancelled: "rust",
  sent: "sage",
  approved: "sage",
  generated: "accent",
  edited: "accent",
  rejected: "rust",
  replied: "sage",
  converted: "sage",
  pending: "outline",
  active: "sage",
  connected: "sage",
  disconnected: "outline",
  positive: "sage",
  meeting: "sage",
  negative: "rust",
  out_of_office: "ink",
  neutral: "default",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "default"}>{statusLabel(status)}</Badge>;
}
