import type { PaymentMethodInfo } from "./types";

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodInfo | null;
  isPaidUser: boolean;
}

export default function PaymentMethodCard({
  paymentMethod,
  isPaidUser,
}: PaymentMethodCardProps) {
  return (
    <section className="bg-card rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">credit_card</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Payment Method</h3>
      </div>
      <div className="p-6">
        {paymentMethod ? (
          <div className="flex items-center gap-3">
            <span className="material-icons-round text-slate-custom-400 text-[28px]">
              credit_card
            </span>
            <div>
              <p className="text-sm font-medium text-slate-custom-900">
                {paymentMethod.brand.charAt(0).toUpperCase() +
                  paymentMethod.brand.slice(1)}{" "}
                ending in {paymentMethod.last4}
              </p>
              <p className="text-sm text-slate-custom-500">
                Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-custom-500">
            {isPaidUser
              ? "No default payment method on file."
              : "No payment method on file."}
          </p>
        )}
      </div>
    </section>
  );
}
