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
  MoreHorizontal,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export const NAV: NavItem[] = [
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

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/more", label: "More", icon: MoreHorizontal },
];
