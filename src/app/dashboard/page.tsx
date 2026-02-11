import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncUserToPrisma } from "@/lib/auth/sync-user";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  await syncUserToPrisma(data.user);

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Dashboard</h1>
      <p>
        <a href="/dashboard/keys">API Keys</a> | <a href="/dashboard/billing">Billing</a>
      </p>
      <p>Signed in as {data.user.email}</p>
    </main>
  );
}
