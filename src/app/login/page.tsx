"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/dashboard`,
        },
      });
      if (error) throw error;
      setStatus("Check your email for the login link.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Login</h1>
      <p>Sign in via email magic link (Supabase Auth).</p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: "10px 14px" }}>
          {isLoading ? "Sending..." : "Send link"}
        </button>
      </form>
      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
    </main>
  );
}
