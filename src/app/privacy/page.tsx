import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Juice Index Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-extrabold text-slate-custom-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-custom-400">Last updated: March 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-custom-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly, including your name, email address, and payment details when you create an account or subscribe to a paid plan. We also collect usage data such as pages visited, features used, and API queries made, to improve our service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve Juice Index; process transactions; send transactional emails (e.g., payment confirmations, password resets); and respond to your support requests. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">3. Data Storage &amp; Security</h2>
            <p>Your data is stored securely on Supabase (PostgreSQL) hosted infrastructure. Payments are processed by Stripe — we never store raw card details. We apply industry-standard encryption in transit (HTTPS/TLS) and at rest.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">4. Cookies</h2>
            <p>We use session cookies required for authentication. We do not use third-party advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">5. Third-Party Services</h2>
            <p>Juice Index uses the following third-party services: Stripe (payments), Resend (transactional email), Vercel (hosting), and Supabase (database). Each service operates under its own privacy policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us. You can delete your account from the account settings page.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-custom-900 mb-3">7. Contact</h2>
            <p>Questions about this policy? Reach us at{" "}
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
