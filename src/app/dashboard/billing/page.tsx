import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import { BillingButtons } from "@/components/BillingButtons";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  await syncUserToPrisma(data.user);

  const sub = await prisma.apiSubscription.findUnique({
    where: { userId: data.user.id },
    select: {
      tier: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Billing</h1>
      <p>
        <a href="/dashboard">Back</a>
      </p>

      <p>Current tier: {sub ? `${sub.tier} (${sub.status})` : "FREE"}</p>
      {sub ? (
        <p>
          Period: {new Date(sub.currentPeriodStart).toLocaleDateString("en-US")} - {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US")}
          {sub.cancelAtPeriodEnd ? " (cancel at period end)" : ""}
        </p>
      ) : null}

      <BillingButtons />
    </main>
  );
}
