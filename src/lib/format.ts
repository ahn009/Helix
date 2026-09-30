import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    return formatDistanceToNowStrict(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    return format(d, "MMM d");
  } catch {
    return "—";
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
