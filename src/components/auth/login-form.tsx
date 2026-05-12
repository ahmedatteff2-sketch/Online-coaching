"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkLoginThrottle } from "@/lib/auth/login-throttle";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/types/database";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    // Server-side IP/email throttle. Supabase has per-account back-off
    // but not per-IP, so a credential-stuffing run that rotates the
    // email field would otherwise slip past Supabase's own limits.
    const throttle = await checkLoginThrottle(email);
    if (!throttle.ok) {
      setError(throttle.error ?? "Too many attempts. Try again later.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      },
    );

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Invalid email or password.");
      setPending(false);
      return;
    }

    // Look up the profile to figure out where to send them.
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle()) as { data: { role: UserRole } | null };

    const fallback =
      profile?.role === "admin" ? "/admin/dashboard" : "/client/dashboard";
    // Reject off-site or schemed redirect targets to avoid open-redirect
    // attacks via `?redirect=https://evil.example`.
    const redirect = safeRedirectPath(params.get("redirect")) ?? fallback;
    router.replace(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
