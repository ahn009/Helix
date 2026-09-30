import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listZoho, toggleZoho } from "@/lib/server/fns";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ZohoService } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/integrations")({ component: IntegrationsPage });

const COPY: Record<
  ZohoService,
  { title: string; body: string }
> = {
  mail: {
    title: "Zoho Mail",
    body: "Send from a real Northwind mailbox. Helix respects daily caps, warmup, and spaces sends so the domain stays healthy.",
  },
  sheets: {
    title: "Zoho Sheet",
    body: "Live prospect workbooks. Import a sheet into a list without a CSV round-trip. Google Sheets is not used.",
  },
  crm: {
    title: "Zoho CRM",
    body: "Push sent activity and positive replies back as notes on the lead. Optional — connect when you want a single source of truth.",
  },
  bookings: {
    title: "Zoho Bookings",
    body: "The meeting CTA in every first-touch email. Helix inserts your public booking link and attributes meetings to the campaign.",
  },
  cliq: {
    title: "Zoho Cliq",
    body: "A ping when a reply lands or a meeting is booked, so the desk does not have to stay open.",
  },
};

function IntegrationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["zoho"], queryFn: () => listZoho() });
  const mut = useMutation({
    mutationFn: (d: { service: ZohoService; connect: boolean }) => toggleZoho({ data: d }),
    onSuccess: () => {
      toast.success("Zoho connection updated");
      void qc.invalidateQueries({ queryKey: ["zoho"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  if (!q.data) return <Skeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Zoho</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">The pipe, not the product</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Helix does not talk to Gmail, Google Sheets, or Outlook. Mail, lists, meetings, CRM, and
          alerts all sit on Zoho.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {q.data.connections.map((c) => {
          const meta = COPY[c.service];
          return (
            <Card key={c.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight">{meta.title}</h2>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{meta.body}</p>
              {c.email && <p className="mt-3 text-xs text-subtle">{c.email}</p>}
              {c.service === "mail" && c.status === "connected" && (
                <p className="mt-1 text-xs text-subtle">
                  {c.dailySendCount} / {c.dailySendLimit} sent today · warmup {c.warmupStatus}
                </p>
              )}
              <div className="mt-4">
                <Button
                  variant={c.status === "connected" ? "secondary" : "default"}
                  onClick={() =>
                    mut.mutate({ service: c.service, connect: c.status !== "connected" })
                  }
                >
                  {c.status === "connected" ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {q.data.sheets.length > 0 && (
        <Card>
          <h2 className="font-display text-xl tracking-tight">Workbooks in Zoho Sheet</h2>
          <ul className="mt-3 space-y-2">
            {q.data.sheets.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.workbookName}</span>
                <span className="text-subtle">{s.rowCount} rows · {s.sheetName}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
