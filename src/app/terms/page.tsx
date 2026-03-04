import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Juice Index Terms of Service — the rules and conditions for using our platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white font-display text-slate-custom-800 antialiased">
      <div className="px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <Image src="/logo.png" alt="Juice Index" width={32} height={32} className="rounded" />
          <span className="font-bold text-lg text-slate-custom-900">Juice Index</span>
        </Link>
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-16">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-custom-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-custom-400">Last updated: March 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-custom-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Juice Index, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">2. Use of the Service</h2>
            <p>Juice Index provides AI-powered EV market data, charts, and analytics tools. You may use the service for lawful purposes only. You may not use the service to scrape, redistribute, or resell our data without explicit written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. Notify us immediately at{" "}
              <a href="mailto:ai.compute.index@gmail.com" className="text-primary font-medium hover:underline">
                ai.compute.index@gmail.com
              </a>{" "}if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">4. Subscriptions &amp; Payments</h2>
            <p>Paid plans are billed on a recurring basis. You may cancel at any time from your billing settings. Cancellations take effect at the end of the current billing period — no partial refunds are issued. We reserve the right to change pricing with 30 days' notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">5. API Usage</h2>
            <p>API access is subject to rate limits and quota defined by your subscription tier. Excessive or abusive API usage may result in throttling or account suspension. You may not use the API to build competing products.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">6. Data &amp; Accuracy</h2>
            <p>Data provided by Juice Index is sourced from public and licensed datasets. We make reasonable efforts to ensure accuracy but do not guarantee completeness or timeliness. Do not use Juice Index data as the sole basis for financial or investment decisions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">7. Limitation of Liability</h2>
            <p>Juice Index is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">8. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms. You may terminate your account at any time from account settings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">9. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">10. Contact</h2>
            <p>Questions? Reach us at{" "}
              <a href="mailto:ai.compute.index@gmail.com" className="text-primary font-medium hover:underline">
                ai.compute.index@gmail.com
              </a>.
            </p>
          </section>
        </div>

      </div>
    </main>
  );
}
