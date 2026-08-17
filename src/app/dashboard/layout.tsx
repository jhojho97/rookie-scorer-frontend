"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/misc";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const home = user?.role === "hr" ? "/dashboard/hr" : "/dashboard/student";
  // Each role has exactly one dashboard. Without this, typing the other role's
  // URL walked straight into it — hiding the navigation is not the same as
  // preventing the visit.
  const wrongDashboard = Boolean(user) && pathname !== home && pathname.startsWith("/dashboard");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (wrongDashboard) router.replace(home);
  }, [loading, user, wrongDashboard, home, router]);

  // Silently warm the backend when the dashboard opens (no UI shown), so the
  // first score doesn't pay the cold-start. Fire-and-forget.
  useEffect(() => {
    if (user) fetch("/api/health").catch(() => {});
  }, [user]);

  if (loading || !user || wrongDashboard) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No sidebar: each role has exactly ONE destination, so a nav rail was 224px
  // of chrome pointing at the page you were already on. Role switching lives in
  // the header instead.
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
