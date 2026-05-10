"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Apple,
  BarChart3,
  Dumbbell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  {
    href: "/admin/exercise-library",
    label: "Exercise Library",
    icon: Dumbbell,
  },
  { href: "/admin/nutrition", label: "Nutrition", icon: Apple },
  { href: "/admin/site-content", label: "Site Content", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-card/40 lg:block">
      <div className="px-5 py-6">
        <Link
          href="/admin/dashboard"
          className="font-display text-xl font-bold"
        >
          Coach<span className="text-primary">.</span>
        </Link>
      </div>
      <nav className="space-y-1 px-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
