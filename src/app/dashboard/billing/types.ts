export interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface InvoiceInfo {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  description: string | null;
}

export interface UpcomingInvoiceInfo {
  amount: number;
  currency: string;
  nextPaymentDate: Date | null;
}
