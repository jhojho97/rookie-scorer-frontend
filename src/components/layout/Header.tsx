"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LineChart className="h-5 w-5 text-accent" />
          <span className="hidden sm:inline">Research Productivity Predictor</span>
          <span className="sm:hidden">RPP</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
                <Badge tone="accent">{user.role === "hr" ? "HR" : "Student"}</Badge>
              </div>
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
