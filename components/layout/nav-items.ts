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
  label: string;
  icon: typeof LayoutDashboard;
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/leads", label: "Лиды", icon: Sparkles },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/proposals", label: "КП", icon: FileCheck2 },
  { href: "/contracts", label: "Договора", icon: FileSignature },
  { href: "/payments", label: "Платежи", icon: Wallet },
  { href: "/expenses", label: "Расходы", icon: Receipt },
  { href: "/maintenance", label: "Поддержка", icon: Wrench },
  { href: "/reminders", label: "Напоминания", icon: Bell },
  { href: "/settings/profile", label: "Настройки", icon: Settings },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/more", label: "Ещё", icon: MoreHorizontal },
];
