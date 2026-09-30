import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getBootstrap, updateProfile } from "@/lib/server/fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const p = q.data?.profile;
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  useEffect(() => {
    if (!p) return;
    setDisplayName(p.displayName ?? "");
    setCompanyName(p.companyName);
    setCompanyWebsite(p.companyWebsite);
    setRoleTitle(p.roleTitle);
    setPhysicalAddress(p.physicalAddress);
    setBookingUrl(p.bookingUrl);
  }, [p]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        data: { displayName, companyName, companyWebsite, roleTitle, physicalAddress, bookingUrl },
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  if (!p) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Settings</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">The sender</h1>
      </header>
      <Card className="grid max-w-xl gap-3">
        <Field label="Name" value={displayName} onChange={setDisplayName} />
        <Field label="Title" value={roleTitle} onChange={setRoleTitle} />
        <Field label="Company" value={companyName} onChange={setCompanyName} />
        <Field label="Website" value={companyWebsite} onChange={setCompanyWebsite} />
        <Field label="Physical address (CAN-SPAM footer)" value={physicalAddress} onChange={setPhysicalAddress} />
        <Field label="Zoho Bookings URL" value={bookingUrl} onChange={setBookingUrl} />
        <Button className="mt-2 w-fit" onClick={() => save.mutate()} disabled={save.isPending}>
          Save
        </Button>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
