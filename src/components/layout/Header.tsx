"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, LineChart, LogOut, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Role } from "@/types";

export function Header() {
  const { user, logout, setRole } = useAuth();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  /**
   * Role is self-declared and now lives on the account, so let people change
   * it. Previously it was fixed at registration and stored per-browser, which
   * meant an HR user on a new device silently became a Student with no way back.
   */
  async function switchRole(next: Role) {
    if (!user || user.role === next) return;
    setSwitching(true);
    try {
      await setRole(next);
      router.push(next === "hr" ? "/dashboard/hr" : "/dashboard/student");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LineChart className="h-5 w-5 text-accent" />
          <span className="hidden sm:inline">Research Productivity Predictor</span>
          <span className="sm:hidden">RPP</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <div
                role="radiogroup"
                aria-label="Switch role"
                className="hidden items-center gap-0.5 rounded-md border border-border p-0.5 sm:flex"
              >
                {(
                  [
                    { value: "student", label: "Student", icon: GraduationCap },
                    { value: "hr", label: "HR", icon: Users },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={user.role === value}
                    disabled={switching}
                    onClick={() => switchRole(value)}
                    className={
                      "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 " +
                      (user.role === value
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <ThemeToggle />
              <span className="hidden text-sm text-muted-foreground lg:inline">{user.email}</span>
              <Badge tone="accent" className="sm:hidden">
                {user.role === "hr" ? "HR" : "Student"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
