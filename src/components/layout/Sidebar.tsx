"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Users, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";

/** Role-aware left navigation. */
export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  const items =
    user.role === "hr"
      ? [{ href: "/dashboard/hr", label: "Candidate batch", icon: Users }]
      : [{ href: "/dashboard/student", label: "My report", icon: GraduationCap }];

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
      <div className="mb-3 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
      </div>
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-accent/10 font-medium text-accent" : "text-muted-foreground hover:bg-muted",
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
