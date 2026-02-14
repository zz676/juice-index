import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import type {
  SubscriptionData,
  PaymentMethodInfo,
  InvoiceInfo,
  UpcomingInvoiceInfo,
} from "./types";

// Raw SQL with .catch() fallback — same resilience pattern as settings/page.tsx
export async function getSubscription(
  userId: string
): Promise<SubscriptionData | null> {
  type BaseRow = { tier: string; status: string; stripeCustomerId: string | null; stripeSubscriptionId: string | null };
  type ExtraRow = { currentPeriodStart: Date | null; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean };

  const baseRows = await prisma.$queryRaw<BaseRow[]>`
    SELECT "tier", "status", "stripeCustomerId", "stripeSubscriptionId"
    FROM "public"."juice_api_subscriptions"
    WHERE "userId" = ${userId}
    LIMIT 1
  `.catch(() => [] as BaseRow[]);

  if (!baseRows[0]) return null;

  const extra = await prisma.$queryRaw<ExtraRow[]>`
    SELECT "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd"
    FROM "public"."juice_api_subscriptions"
    WHERE "userId" = ${userId}
    LIMIT 1
  `.catch(() => [{ currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }]);

  return {
    ...baseRows[0],
    currentPeriodStart: extra[0]?.currentPeriodStart ?? null,
    currentPeriodEnd: extra[0]?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: extra[0]?.cancelAtPeriodEnd ?? false,
  };
}

export async function getUsageCount(userId: string): Promise<number> {
  const periodStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  return prisma.apiRequestLog
    .count({
      where: {
        userId,
        createdAt: { gte: periodStart },
      },
    })
    .catch(() => 0);
}

export async function getStripeData(stripeCustomerId: string): Promise<{
  paymentMethod: PaymentMethodInfo | null;
  invoices: InvoiceInfo[];
  upcomingInvoice: UpcomingInvoiceInfo | null;
}> {
  const stripe = getStripe();

  const [customerResult, invoicesResult, upcomingResult] =
    await Promise.allSettled([
      stripe.customers.retrieve(stripeCustomerId, {
        expand: ["default_payment_method"],
      }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 12 }),
      stripe.invoices.retrieveUpcoming({ customer: stripeCustomerId }),
    ]);

  // Payment method — expanded via retrieve(), so it may be a full PaymentMethod object
  let paymentMethod: PaymentMethodInfo | null = null;
  if (customerResult.status === "fulfilled" && !("deleted" in customerResult.value && customerResult.value.deleted)) {
    const customer = customerResult.value as Stripe.Customer;
    const pm = (customer as unknown as { default_payment_method: Stripe.PaymentMethod | string | null }).default_payment_method;
    if (pm && typeof pm === "object" && pm.type === "card" && pm.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    }
  }

  // Invoices
  let invoices: InvoiceInfo[] = [];
  if (invoicesResult.status === "fulfilled") {
    invoices = invoicesResult.value.data.map((inv) => ({
      id: inv.id,
      date: new Date((inv.created ?? 0) * 1000),
      amount: (inv.amount_paid ?? 0) / 100,
      currency: inv.currency ?? "usd",
      status: inv.status ?? "unknown",
      pdfUrl: inv.invoice_pdf ?? null,
      description: inv.description ?? null,
    }));
  }

  // Upcoming invoice (will error for canceled subs — expected)
  let upcomingInvoice: UpcomingInvoiceInfo | null = null;
  if (upcomingResult.status === "fulfilled") {
    const upcoming = upcomingResult.value;
    upcomingInvoice = {
      amount: (upcoming.amount_due ?? 0) / 100,
      currency: upcoming.currency ?? "usd",
      nextPaymentDate: upcoming.next_payment_attempt
        ? new Date(upcoming.next_payment_attempt * 1000)
        : null,
    };
  }

  return { paymentMethod, invoices, upcomingInvoice };
}
