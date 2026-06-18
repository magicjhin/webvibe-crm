import {
  LayoutDashboard,
  Users,
  Sparkles,
  FolderKanban,
  FileText,
  FileSignature,
  FileCheck2,
  Wallet,
  Receipt,
  Wrench,
  Bell,
  Settings,
  MoreHorizontal,
} from "lucide-react";

export type NavItem = {
  href: string;
  // ключ в неймспейсе `nav` каталога сообщений (messages/*.json).
  // Подпись подставляется при рендере через useTranslations/getTranslations("nav").
  key: string;
  icon: typeof LayoutDashboard;
};

export const NAV: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/clients", key: "clients", icon: Users },
  { href: "/leads", key: "leads", icon: Sparkles },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/proposals", key: "proposals", icon: FileCheck2 },
  { href: "/contracts", key: "contracts", icon: FileSignature },
  { href: "/payments", key: "payments", icon: Wallet },
  { href: "/expenses", key: "expenses", icon: Receipt },
  { href: "/maintenance", key: "maintenance", icon: Wrench },
  { href: "/reminders", key: "reminders", icon: Bell },
  { href: "/settings/profile", key: "settings", icon: Settings },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/clients", key: "clients", icon: Users },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/more", key: "more", icon: MoreHorizontal },
];
