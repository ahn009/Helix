import { getSql } from "@/lib/db";

export function nid(): string {
  return crypto.randomUUID();
}

export function asJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

export function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return d.toISOString();
}

export async function sql() {
  return getSql();
}

export function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 12, 0, 0);
  return d.toISOString();
}

export function domainFrom(url?: string | null, company?: string | null): string {
  if (url) {
    try {
      const withProto = url.includes("://") ? url : `https://${url}`;
      return new URL(withProto).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  if (company) {
    return (
      company
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 18) + ".com"
    );
  }
  return "unknown.com";
}
