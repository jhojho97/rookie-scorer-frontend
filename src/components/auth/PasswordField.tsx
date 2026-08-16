"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export const MIN_PASSWORD = 8;

/**
 * Rough strength signal. Deliberately about LENGTH and VARIETY rather than a
 * strict rule set — arbitrary composition rules push people toward "Passw0rd!"
 * while a longer passphrase scores better and is genuinely stronger.
 */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (pw.length < MIN_PASSWORD) return { score: 0, label: "Too short" };
  const variety =
    Number(/[a-z]/.test(pw)) + Number(/[A-Z]/.test(pw)) + Number(/\d/.test(pw)) + Number(/[^\w]/.test(pw));
  if (pw.length >= 16 || (pw.length >= 12 && variety >= 3)) return { score: 3, label: "Strong" };
  if (pw.length >= 12 || variety >= 3) return { score: 2, label: "Good" };
  return { score: 1, label: "Weak" };
}

export function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  showStrength = false,
  minLength,
  error,
  id: idProp,
  rightSlot,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  showStrength?: boolean;
  minLength?: number;
  error?: string | null;
  id?: string;
  rightSlot?: React.ReactNode;
}) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;
  const bars = ["bg-negative", "bg-negative", "bg-warning", "bg-positive"];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {rightSlot}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // Not focusable by Tab: it sits between the field and Submit, and
          // catching keyboard users there on every sign-in is pure friction.
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {strength && value.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex h-1 flex-1 gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-full flex-1 rounded-full transition-colors",
                  i < strength.score ? bars[strength.score] : "bg-muted",
                )}
              />
            ))}
          </div>
          <span className="w-16 text-right text-xs text-muted-foreground">{strength.label}</span>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
