import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import { CreateApiKeyButton } from "@/components/CreateApiKeyButton";
import Link from "next/link";

export default async function KeysPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  await syncUserToPrisma(data.user);

  const keys = await prisma.apiKey.findMany({
    where: { userId: data.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      revokedAt: true,
      expiresAt: true,
      createdAt: true,
      rateLimitOverride: true,
      tierOverride: true,
    },
  });

  return (
    <div className="legacy-ui">
      <main style={{ padding: "48px 24px", minHeight: "calc(100vh - 160px)" }}>
        <div className="container">
          <div style={{ marginBottom: 8 }}>
            <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginLeft: -16 }}>
              ← Back to Dashboard
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 28,
            }}
          >
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>API Keys</h1>
            <CreateApiKeyButton />
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Prefix</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--text-secondary)",
                      }}
                    >
                      No API keys yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                        {k.keyPrefix}
                      </td>
                      <td>{k.name || "—"}</td>
                      <td>
                        {k.isActive && !k.revokedAt ? (
                          <span className="badge badge-green">Active</span>
                        ) : (
                          <span className="badge badge-red">Revoked</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {new Date(k.createdAt).toLocaleDateString("en-US")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
