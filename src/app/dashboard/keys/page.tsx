import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import { CreateApiKeyButton } from "@/components/CreateApiKeyButton";

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
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>API Keys</h1>
      <p>
        <a href="/dashboard">Back</a>
      </p>

      <CreateApiKeyButton />

      <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Prefix</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Status</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id}>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8, fontFamily: "monospace" }}>{k.keyPrefix}</td>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{k.name || ""}</td>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{k.isActive && !k.revokedAt ? "ACTIVE" : "INACTIVE"}</td>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{new Date(k.createdAt).toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
