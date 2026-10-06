"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { PasswordField } from "@/components/auth/PasswordField";
import { authErrorMessage } from "@/lib/authError";

/** Where users can reach the team; shown under the sign-in form. */
const CONTACT_EMAIL = "bxk127@gmail.com";

export default function LoginPage() {
  const { login, user, devMode } = useAuth();
  const router = useRouter();
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
      await login(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle={devMode ? "Dev mode: any email/password works." : "Welcome back."}
      footer={
        <>
          No account?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create one
          </Link>
          <p className="mt-2 text-xs">
            Questions or feedback? Contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          rightSlot={
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-accent">
              Forgot?
            </Link>
          }
        />
        {error && <p className="text-sm text-negative">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />} Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
