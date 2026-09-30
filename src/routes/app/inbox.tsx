import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categorizeReply, listInbox, markReplyRead } from "@/lib/server/fns";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatWhen } from "@/lib/format";
import type { ReplyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/inbox")({ component: InboxPage });

const FILTERS: { id: "all" | ReplyCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "meeting", label: "Meetings" },
  { id: "positive", label: "Positive" },
  { id: "neutral", label: "Neutral" },
  { id: "negative", label: "No" },
  { id: "out_of_office", label: "OOO" },
];

function InboxPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["inbox"], queryFn: () => listInbox() });
  const [id, setId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const read = useMutation({
    mutationFn: (rid: string) => markReplyRead({ data: rid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });
  const cat = useMutation({
    mutationFn: (d: { id: string; category: ReplyCategory }) => categorizeReply({ data: d }),
    onSuccess: () => {
      toast.success("Tagged");
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const rows = useMemo(() => {
    const all = q.data ?? [];
    if (filter === "all") return all;
    return all.filter((r) => r.category === filter);
  }, [q.data, filter]);
  const current = rows.find((r) => r.id === id) ?? rows[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Inbox</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">What came back</h1>
      </header>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              setId(null);
            }}
            className={cn(
              "h-9 rounded-md px-3 text-xs transition-colors",
              filter === f.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {!q.data ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <Card className="p-2">
            <ul>
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setId(r.id);
                      if (!r.isRead) read.mutate(r.id);
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-3 text-left hover:bg-elevated/70",
                      current?.id === r.id && "bg-elevated",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{r.contactName}</span>
                      {!r.isRead && <span className="size-1.5 rounded-full bg-accent" />}
                    </div>
                    <p className="truncate text-xs text-subtle">{r.companyName}</p>
                  </button>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-muted">Nothing in this tray.</li>
              )}
            </ul>
          </Card>
          {current ? (
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl tracking-tight">{current.contactName}</h2>
                  <p className="text-sm text-muted">
                    {current.companyName} · {current.fromEmail}
                  </p>
                </div>
                <StatusBadge status={current.category} />
              </div>
              <p className="text-xs text-subtle">{formatWhen(current.receivedAt)}</p>
              <p className="text-sm font-medium">{current.subject}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{current.body}</p>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {(["meeting", "positive", "neutral", "negative", "out_of_office"] as const).map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={current.category === c ? "default" : "secondary"}
                    onClick={() => cat.mutate({ id: current.id, category: c })}
                    disabled={cat.isPending}
                  >
                    {c.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="grid place-items-center text-sm text-muted">No replies yet</Card>
          )}
        </div>
      )}
    </div>
  );
}
