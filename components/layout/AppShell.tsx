import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickAddFab } from "@/components/layout/QuickAddFab";
import { NAV, MOBILE_TABS } from "@/components/layout/nav-items";

/**
 * Адаптивный каркас (UI-DESIGN):
 *   < 640px (mobile)  — topbar + бургер + bottom-nav, без sidebar.
 *   640–1024 (tablet) — свёрнутый sidebar 60px (только иконки), без bottom-nav.
 *   ≥ 1024px (desktop) — полный sidebar 240px с подписями.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />
      <Topbar user={user} />
      <main className="pt-[50px] pb-[80px] sm:pt-[60px] sm:pb-6 sm:pl-[60px] lg:pl-[240px]">
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
      className="fixed inset-y-0 left-0 z-30 hidden w-[60px] flex-col border-r border-border bg-sidebar sm:flex lg:w-[240px]"
    >
      <div className="flex h-[60px] items-center justify-center border-b border-border lg:justify-start lg:px-5">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          {/* Collapsed (tablet): compact mark. Full (desktop): wordmark. */}
          <span className="text-accent-gradient lg:hidden">w</span>
          <span className="hidden lg:inline">
            <span className="text-accent-gradient">webvibe</span>
            <span className="text-foreground-muted"> / CRM</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4 lg:px-3">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                className="group flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-sidebar-accent hover:text-foreground lg:justify-start"
              >
                <item.icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="hidden border-t border-border px-5 py-3 text-xs text-foreground-subtle lg:block">
        v0.1.0
      </div>
    </aside>
  );
}

function Topbar({ user }: { user?: { email: string; name: string } | null }) {
  return (
    <header
      aria-label="Top bar"
      className="fixed inset-x-0 top-0 z-20 flex h-[50px] items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:left-[60px] sm:h-[60px] sm:px-6 lg:left-[240px]"
    >
      <div className="flex items-center gap-3 sm:hidden">
        <MobileNav />
        <span className="text-sm font-semibold tracking-tight">
          <span className="text-accent-gradient">webvibe</span>
          <span className="text-foreground-muted"> / CRM</span>
        </span>
      </div>
      <div className="hidden text-sm text-foreground-muted sm:block">
        {/* Breadcrumbs / page header slot */}
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
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-border bg-background/95 backdrop-blur sm:hidden"
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
