import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Help",
  description: "Get help with Juice Index — contact us and find answers to common questions.",
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-white font-display text-slate-custom-800 antialiased">
      <div className="px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <Image src="/logo.png" alt="Juice Index" width={32} height={32} className="rounded" />
          <span className="font-bold text-lg text-slate-custom-900">Juice Index</span>
        </Link>
      </div>
      <div className="max-w-2xl mx-auto px-6 pb-16">

        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Juice Index"
            width={72}
            height={72}
            className="rounded-2xl mb-6"
          />
          <h1 className="text-3xl font-extrabold text-slate-custom-900 mb-3">How can we help?</h1>
          <p className="text-slate-custom-500 leading-relaxed mb-10 max-w-md">
            Juice Index is a small team building AI-powered EV market tools. If you have a question,
            hit a bug, or just want to say hello — we read every email.
          </p>

          <a
            href="mailto:ai.compute.index@gmail.com"
            className="inline-flex items-center gap-2.5 bg-primary text-black font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            ai.compute.index@gmail.com
          </a>

          <div className="mt-16 w-full border-t border-slate-custom-100 pt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            <div className="bg-slate-custom-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-custom-900 text-sm mb-1.5">Billing & Subscriptions</h3>
              <p className="text-sm text-slate-custom-500">Questions about charges, plan changes, or cancellations? Email us and we'll sort it out.</p>
            </div>
            <div className="bg-slate-custom-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-custom-900 text-sm mb-1.5">API & Data</h3>
              <p className="text-sm text-slate-custom-500">Need help with the API, data accuracy, or specific EV metrics? We're happy to dig in.</p>
            </div>
            <div className="bg-slate-custom-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-custom-900 text-sm mb-1.5">Feature Requests</h3>
              <p className="text-sm text-slate-custom-500">Have an idea for a chart, dataset, or feature? We'd love to hear it.</p>
            </div>
            <div className="bg-slate-custom-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-custom-900 text-sm mb-1.5">Bug Reports</h3>
              <p className="text-sm text-slate-custom-500">Something broken? Let us know what happened and we'll fix it fast.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
