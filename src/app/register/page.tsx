"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { authErrorMessage } from "@/lib/authError";
import { cn } from "@/lib/cn";
import type { Role } from "@/types";

function RegisterForm() {
  const { register, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<Role>((params.get("role") as Role) === "hr" ? "hr" : "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(user.role === "hr" ? "/dashboard/hr" : "/dashboard/student");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password, role);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const roles: { value: Role; label: string; icon: React.ReactNode }[] = [
    { value: "student", label: "Student", icon: <GraduationCap className="h-4 w-4" /> },
    { value: "hr", label: "HR / Headhunter", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <AuthShell
      title="Create your account"
      subtitle="Choose how you'll use the predictor."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {roles.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setRole(r.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors",
                role === r.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />} Create account
        </Button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
