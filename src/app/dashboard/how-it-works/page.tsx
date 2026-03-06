import { Suspense } from "react";
import Link from "next/link";
import AnimatedSection from "@/components/landing/AnimatedSection";
import HeroViz from "@/components/landing/HeroViz";

const steps = [
  {
    number: "1",
    icon: "person_add",
    title: "Sign up",
    description: "Create a free account in seconds. No credit card required.",
  },
  {
    number: "2",
    icon: "chat",
    title: "Ask a question",
    description:
      "Use natural language to query our comprehensive EV dataset.",
  },
  {
    number: "3",
    icon: "insights",
    title: "Get insights",
    description:
      "Receive charts, tables, and analysis powered by AI in real-time.",
  },
  {
    number: "4",
    icon: "share",
    title: "Share with the world",
    description:
      "Share or schedule posts to X with a single click.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-40 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">

        {/* Hero Section */}
        <section className="mb-20">
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8">
            {/* Left column */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-custom-700">
                  Live Data &mdash; Updated Daily
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-custom-900 tracking-tight leading-[1.1] mb-6">
                Ask anything about{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-custom-800 via-slate-custom-600 to-slate-custom-800">
                  the EV market
                </span>
              </h1>

              <p className="text-lg text-slate-custom-500 max-w-xl mb-10 leading-relaxed mx-auto lg:mx-0">
                AI-powered data intelligence on production, insurance
                registrations, and supply chain dynamics for the world&apos;s
                fastest-growing industry.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/login?mode=magic&intent=signup"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold rounded-full bg-slate-custom-900 text-white hover:bg-slate-custom-800 transition-colors"
                >
                  Start Free
                  <span className="material-icons-round ml-2 text-base">arrow_forward</span>
                </Link>
                <Link
                  href="/dashboard/studio"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold rounded-full text-slate-custom-700 border border-slate-custom-200 hover:border-slate-custom-300 hover:bg-slate-custom-50 transition-all"
                >
                  Try Juice AI
                </Link>
              </div>
            </div>

            {/* Right column — animated viz */}
            <div className="flex-1 w-full max-w-[36.8rem] flex flex-col">
              <Suspense>
                <HeroViz />
              </Suspense>
            </div>
          </div>
        </section>

        {/* How It Works Steps */}
        <AnimatedSection className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-4">
            How it works
          </h2>
          <p className="text-slate-custom-500">
            From sign-up to social post in under a minute.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Dashed connector line (desktop only) */}
          <div className="hidden lg:block absolute top-14 left-[13%] right-[13%] h-px border-t-2 border-dashed border-slate-custom-200 z-0" />

          {steps.map((step, i) => (
            <AnimatedSection
              key={step.title}
              delay={i * 0.15}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-custom-200 flex items-center justify-center mb-6 shadow-sm">
                <span className="material-icons-round text-primary text-2xl">
                  {step.icon}
                </span>
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                Step {step.number}
              </span>
              <h3 className="text-lg font-bold text-slate-custom-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-custom-500 max-w-xs">
                {step.description}
              </p>
            </AnimatedSection>
          ))}
        </div>

      </div>
    </div>
  );
}
