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
    <div className="legacy-ui">
      <main
        style={{
          minHeight: "calc(100vh - 160px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background:
            "radial-gradient(ellipse at 50% 0%, var(--green-50) 0%, var(--bg) 60%)",
        }}
      >
        <div className="card" style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img
              src="/logo.png"
              alt="Juice Index"
              style={{ height: 48, marginBottom: 16 }}
            />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Sign in with a magic link sent to your email.
            </p>
          </div>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
            />
            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: "100%" }}>
              {isLoading ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
          {status ? (
            <p
              style={{
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.9rem",
                background: status.includes("Check") ? "var(--green-50)" : "#fef2f2",
                color: status.includes("Check") ? "var(--green-700)" : "#dc2626",
              }}
            >
              {status}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
