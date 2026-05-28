import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FolderKanban,
  FileText,
  Wallet,
  Receipt,
  Wrench,
  Bell,
  Settings,
  Menu,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/leads", label: "Leads", icon: Sparkles },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />
      <Topbar user={user} />
      <main className="pt-[50px] pb-[80px] md:pt-[60px] md:pb-6 md:pl-[240px]">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
          {children}
        </div>
      </main>
      <MobileBottomNav />
      <QuickAddFab />
    </div>
  );
}

function Sidebar() {
  return (
    <aside
      aria-label="Primary navigation"
      className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-sidebar md:flex"
    >
      <div className="flex h-[60px] items-center border-b border-border px-5">
        <Link
          href="/dashboard"
          className="text-base font-semibold tracking-tight"
        >
          <span className="text-accent-gradient">webvibe</span>
          <span className="text-foreground-muted"> / CRM</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <item.icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border px-5 py-3 text-xs text-foreground-subtle">
        v0.1.0 • iter 1
      </div>
    </aside>
  );
}

function Topbar({ user }: { user?: { email: string; name: string } | null }) {
  return (
    <header
      aria-label="Top bar"
      className="fixed inset-x-0 top-0 z-20 flex h-[50px] items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:left-[240px] md:h-[60px] md:px-6"
    >
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex size-11 items-center justify-center rounded-md text-foreground-muted hover:bg-secondary hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight">
          <span className="text-accent-gradient">webvibe</span>
          <span className="text-foreground-muted"> / CRM</span>
        </span>
      </div>
      <div className="hidden text-sm text-foreground-muted md:block">
        {/* Breadcrumbs / page header slot — filled by pages in later iterations */}
      </div>
      <div className="flex items-center gap-2">
        {user ? <UserBadge name={user.name} email={user.email} /> : null}
        {user ? <SignOutButton /> : null}
      </div>
    </header>
  );
}

function UserBadge({ name, email }: { name: string; email: string }) {
  const initial = (name?.[0] ?? email[0] ?? "?").toUpperCase();
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1"
      title={email}
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full text-xs font-semibold text-white bg-accent-gradient"
      >
        {initial}
      </span>
      <span className="hidden text-xs text-foreground-muted sm:inline">{email}</span>
    </div>
  );
}

function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {MOBILE_TABS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center justify-center gap-1 text-[11px] text-foreground-muted active:scale-95"
        >
          <item.icon className="size-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function QuickAddFab() {
  return (
    <button
      type="button"
      aria-label="Quick add"
      className="fixed bottom-20 right-4 z-40 inline-flex size-14 items-center justify-center rounded-full text-white shadow-lg bg-accent-gradient md:hidden"
    >
      <Plus className="size-6" strokeWidth={2.25} />
    </button>
  );
}
