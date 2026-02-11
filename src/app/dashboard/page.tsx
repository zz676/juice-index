import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  await syncUserToPrisma(data.user);

  return (
    <main style={{ padding: "48px 24px", minHeight: "calc(100vh - 160px)" }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
              Dashboard
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Signed in as{" "}
              <span style={{ fontWeight: 500, color: "var(--text)" }}>
                {data.user.email}
              </span>
            </p>
          </div>
          <span className="badge badge-green">Active</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          <Link href="/dashboard/keys" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🔑</div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>API Keys</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Create and manage your API keys.
              </p>
            </div>
          </Link>
          <Link href="/dashboard/billing" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>💳</div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Billing</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Manage your subscription and payment.
              </p>
            </div>
          </Link>
          <Link href="/docs" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📖</div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Documentation</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Explore the API reference and guides.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
