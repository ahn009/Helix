import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createContact,
  getContactDetail,
  importCsv,
  importZohoSheet,
  listContacts,
  listZoho,
} from "@/lib/server/fns";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatWhen } from "@/lib/format";
import { fullName } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/leads")({ component: LeadsPage });

function LeadsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["contacts"], queryFn: () => listContacts() });
  const zoho = useQuery({ queryKey: ["zoho"], queryFn: () => listZoho() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const rows = q.data?.contacts ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) =>
      [c.firstName, c.lastName, c.email, c.companyName, c.industry].some((v) =>
        v?.toLowerCase().includes(s),
      ),
    );
  }, [q.data, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Leads</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">People you can write to</h1>
        </div>
        <Button onClick={() => setOpen(true)}>Import</Button>
      </header>
      <div className="flex flex-wrap gap-2">
        {(q.data?.lists ?? []).map((l) => (
          <span key={l.id} className="rounded-full bg-elevated px-3 py-1 text-xs text-muted">
            {l.name} · {l.contactCount}
          </span>
        ))}
      </div>
      <Input
        placeholder="Search name, company, email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-elevated/50"
                  onClick={() => setSelected(c.id)}
                >
                  <td className="px-4 py-3">
                    <p>{fullName(c.firstName, c.lastName)}</p>
                    <p className="text-xs text-subtle">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">{c.companyName}</td>
                  <td className="px-4 py-3 text-muted">{c.jobTitle}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{c.emailScore}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <ImportDialog
        open={open}
        onOpenChange={setOpen}
        sheets={zoho.data?.sheets ?? []}
        onDone={() => {
          void qc.invalidateQueries({ queryKey: ["contacts"] });
          setOpen(false);
        }}
      />
      <ContactSheet id={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ContactSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["contact", id],
    queryFn: () => getContactDetail({ data: id! }),
    enabled: Boolean(id),
  });
  const d = q.data;
  return (
    <Sheet open={Boolean(id)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[min(26rem,92vw)] overflow-y-auto pt-12">
        {!d ? (
          <Skeleton className="mt-8 h-40" />
        ) : (
          <div className="space-y-4 pr-4 pt-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Lead</p>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                {fullName(d.contact.firstName, d.contact.lastName)}
              </h2>
              <p className="text-sm text-muted">
                {d.contact.jobTitle} · {d.contact.companyName}
              </p>
              <p className="mt-1 text-xs text-subtle">{d.contact.email}</p>
              {d.contact.location && <p className="text-xs text-subtle">{d.contact.location}</p>}
            </div>
            {d.company?.description && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Research</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d.company.description}</p>
              </div>
            )}
            {d.company?.recentSignals && d.company.recentSignals.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Signals</p>
                <ul className="mt-1 space-y-1 text-sm text-muted">
                  {d.company.recentSignals.map((s) => (
                    <li key={s}>· {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {d.company?.painPoints && d.company.painPoints.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Pain</p>
                <ul className="mt-2 space-y-2">
                  {d.company.painPoints.map((p) => (
                    <li key={p.hypothesis} className="text-sm">
                      {p.hypothesis}
                      <p className="text-xs text-subtle">{p.evidence}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.sent.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Sent via Zoho Mail</p>
                <ul className="mt-2 space-y-2">
                  {d.sent.map((s) => (
                    <li key={s.id} className="text-sm">
                      <p>{s.subject}</p>
                      <p className="text-xs text-subtle">
                        {formatWhen(s.sentAt)}
                        {s.opened ? " · opened" : ""}
                        {s.replied ? " · replied" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  sheets,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sheets: { id: string; workbookName: string; rowCount: number }[];
  onDone: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [listName, setListName] = useState("Imported list");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const csvMut = useMutation({
    mutationFn: () => importCsv({ data: { csv, listName } }),
    onSuccess: (r) => {
      if (!r.ok) return;
      toast.success(`Imported ${r.created}, skipped ${r.skipped}`);
      onDone();
    },
  });
  const sheetMut = useMutation({
    mutationFn: (id: string) => importZohoSheet({ data: { sheetId: id } }),
    onSuccess: (r) => {
      if ("ok" in r && r.ok) {
        toast.success(`Imported ${r.created} from Zoho Sheet`);
        onDone();
      } else toast.error("Could not import sheet");
    },
  });
  const addMut = useMutation({
    mutationFn: () =>
      createContact({
        data: {
          firstName: first,
          lastName: last,
          email,
          companyName: company,
          websiteUrl: "",
          jobTitle: "",
          phone: "",
          industry: "",
          location: "",
          linkedinUrl: "",
        },
      }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.error);
      toast.success("Contact added");
      onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bring leads in</DialogTitle>
          <DialogDescription>CSV, a connected Zoho Sheet, or a single contact.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="zoho">
          <TabsList>
            <TabsTrigger value="zoho">Zoho Sheet</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="one">One person</TabsTrigger>
          </TabsList>
          <TabsContent value="zoho" className="mt-4 space-y-3">
            {sheets.length === 0 && (
              <p className="text-sm text-muted">Connect Zoho Sheet in Integrations first.</p>
            )}
            {sheets.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md bg-elevated px-3 py-2">
                <div>
                  <p className="text-sm">{s.workbookName}</p>
                  <p className="text-xs text-subtle">{s.rowCount} rows</p>
                </div>
                <Button size="sm" onClick={() => sheetMut.mutate(s.id)} disabled={sheetMut.isPending}>
                  Import
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="csv" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>List name</Label>
              <Input value={listName} onChange={(e) => setListName(e.target.value)} />
            </div>
            <Textarea
              className="min-h-36 font-mono text-xs"
              placeholder={"first_name,last_name,email,company,website\nAda,Lovelace,ada@analytical.com,Analytical Engines,https://analytical.com"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <Button onClick={() => csvMut.mutate()} disabled={!csv || csvMut.isPending}>
              Parse and import
            </Button>
          </TabsContent>
          <TabsContent value="one" className="mt-4 space-y-3">
            <Input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
            <Input placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Button onClick={() => addMut.mutate()} disabled={!email}>
              Add contact
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
