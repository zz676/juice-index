import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import { getSubscription, getUsageCount, getStripeData } from "./data";
import { getTierLimit } from "./tier-display";
import CurrentPlanCard from "./current-plan-card";
import ApiUsageCard from "./api-usage-card";
import PaymentMethodCard from "./payment-method-card";
import NextBillingCard from "./next-billing-card";
import InvoiceHistoryCard from "./invoice-history-card";
import UpgradePrompt from "./upgrade-prompt";
import SuccessRefresh from "./success-refresh";

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string; plan?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  await syncUserToPrisma(data.user);

  const params = await searchParams;

  // Fetch subscription + usage in parallel
  const [subscription, usageCount] = await Promise.all([
    getSubscription(data.user.id),
    getUsageCount(data.user.id),
  ]);

  const tier = subscription?.tier ?? "FREE";
  const isPaidUser = tier !== "FREE";
  const tierLimit = getTierLimit(tier);

  // Fetch Stripe data if customer exists
  const stripeData = subscription?.stripeCustomerId
    ? await getStripeData(subscription.stripeCustomerId)
    : { paymentMethod: null, invoices: [], upcomingInvoice: null };

  return (
    <div className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto">

      {/* Upgrade prompt from ?plan= (e.g., pricing page → "Get Started with Pro") */}
      {params.plan && (
        <UpgradePrompt plan={params.plan} currentTier={tier} />
      )}

      {/* Checkout success/canceled banners */}
      {params.success === "1" && (
        <>
          <SuccessRefresh currentTier={tier} />
          <div className="mb-6 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <span className="material-icons-round text-[18px] text-green-600 mt-0.5">
              check_circle
            </span>
            <p className="text-sm text-green-700">
              Your subscription has been activated. Welcome aboard!
            </p>
          </div>
        </>
      )}
      {params.canceled === "1" && (
        <div className="mb-6 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <span className="material-icons-round text-[18px] text-yellow-600 mt-0.5">
            info
          </span>
          <p className="text-sm text-yellow-700">
            Checkout was canceled. No changes were made to your account.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentPlanCard
          tier={tier}
          status={subscription?.status ?? "active"}
          cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
          currentPeriodStart={subscription?.currentPeriodStart ?? null}
          currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
          isPaidUser={isPaidUser}
        />

        <PaymentMethodCard
          paymentMethod={stripeData.paymentMethod}
          isPaidUser={isPaidUser}
        />

        <ApiUsageCard
          usageCount={usageCount}
          tierLimit={tierLimit}
          tier={tier}
        />

        <NextBillingCard
          upcomingInvoice={stripeData.upcomingInvoice}
          currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
          cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
          isPaidUser={isPaidUser}
          hasStripeSubscription={!!subscription?.stripeCustomerId}
        />

        <div className="lg:col-span-2">
          <InvoiceHistoryCard
            invoices={stripeData.invoices}
            isPaidUser={isPaidUser}
          />
        </div>

      </div>
      </div>
    </div>
  );
}
