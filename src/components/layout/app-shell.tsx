import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Inbox,
  LayoutDashboard,
  LineChart,
  Mail,
  Menu,
  Settings2,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { HelixWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { UserButton } from "@/lib/auth/gates";
import { useQuery } from "@tanstack/react-query";
import { getBootstrap, markNotificationsRead } from "@/lib/server/fns";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/app/campaigns", label: "Campaigns", icon: Mail },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/analytics", label: "Analytics", icon: LineChart },
  { to: "/app/sequences", label: "Sequences", icon: Workflow },
  { to: "/app/ai", label: "Voice", icon: Sparkles },
  { to: "/app/integrations", label: "Zoho", icon: BookOpen },
  { to: "/app/settings", label: "Settings", icon: Settings2 },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
              active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const boot = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const unread = boot.data?.notifications.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface/80 px-3 py-5 md:flex">
        <Link to="/app" className="mb-6 px-2">
          <HelixWordmark />
        </Link>
        <NavLinks />
        <div className="mt-auto space-y-3 px-1 pt-4">
          <div className="rounded-lg bg-elevated p-3 shadow-[var(--shadow-border)]">
            <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">Zoho Mail</p>
            <p className="mt-1 truncate text-sm">
              {boot.data?.zoho.find((z) => z.service === "mail" && z.status === "connected")?.email ??
                "Not connected"}
            </p>
          </div>
          <UserButton />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
        <HelixWordmark />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setNotesOpen(true)} aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="size-4" />
          </Button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-surface pt-12">
          <HelixWordmark className="mb-6" />
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="mt-6">
            <UserButton />
          </div>
        </SheetContent>
      </Sheet>

      <div className="md:pl-60">
        <div className="hidden items-center justify-end gap-2 border-b border-border px-6 py-3 md:flex">
          <button
            type="button"
            onClick={() => {
              setNotesOpen((v) => !v);
              if (unread) void markNotificationsRead().then(() => boot.refetch());
            }}
            className="relative flex h-10 items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-elevated hover:text-fg"
          >
            <Bell className="size-4" />
            Notifications
            {unread > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] text-accent-fg">
                {unread}
              </span>
            )}
          </button>
        </div>
        {notesOpen && (
          <div className="border-b border-border bg-surface px-4 py-3 md:px-6">
            <div className="mx-auto max-w-5xl space-y-2">
              {(boot.data?.notifications ?? []).map((n) => (
                <a
                  key={n.id}
                  href={n.href ?? "/app"}
                  className="block rounded-md px-3 py-2 hover:bg-elevated"
                  onClick={() => setNotesOpen(false)}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted">{n.message}</p>
                </a>
              ))}
            </div>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
