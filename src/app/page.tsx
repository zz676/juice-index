import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/landing/Navbar";
import HeroViz from "@/components/landing/HeroViz";
import AnimatedSection from "@/components/landing/AnimatedSection";
import PricingToggle from "@/components/landing/PricingToggle";
import CountUp from "@/components/landing/CountUp";

const features = [
  {
    icon: "factory",
    title: "Production Data",
    description:
      "Track factory output across 50+ OEMs including BYD, Tesla China, and NIO. Monitor capacity utilization in real-time.",
  },
  {
    icon: "verified",
    title: "Insurance Registrations",
    description:
      "The gold standard for demand signals. Weekly policy registration data broken down by province, city, and model.",
  },
  {
    icon: "local_shipping",
    title: "Supply Chain & Battery",
    description:
      "Deep dive into battery costs (LFP vs NMC), lithium pricing trends, and tier-1 component sourcing networks.",
  },
  {
    icon: "monitoring",
    title: "Market Health",
    description:
      "Aggregate market indicators, pricing indices, export volumes, and competitive positioning across segments.",
  },
];

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

const categories = [
  "Brand Deliveries",
  "Industry Sales",
  "Market Health",
  "Battery",
  "Exports",
  "Vehicle Specs",
];

export default function LandingPage() {
  return (
    <div className="bg-background-light text-slate-custom-800 font-display antialiased overflow-x-hidden min-h-screen">
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Hero */}
      <section className="relative pt-28 pb-5 lg:pt-36 lg:pb-7 overflow-hidden">
        {/* Background blurs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] opacity-40" />
          <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  China&apos;s EV market
                </span>
              </h1>

              <p className="text-lg text-slate-custom-500 max-w-xl mb-10 leading-relaxed mx-auto lg:mx-0">
                AI-powered data intelligence on production, insurance
                registrations, and supply chain dynamics for the world&apos;s
                fastest-growing auto sector.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/login?mode=magic&intent=signup"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold rounded-full bg-slate-custom-900 text-white hover:bg-slate-custom-800 transition-colors"
                >
                  Start Free
                  <span className="material-icons-round ml-2 text-base">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/dashboard/studio"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold rounded-full text-slate-custom-700 border border-slate-custom-200 hover:border-slate-custom-300 hover:bg-slate-custom-50 transition-all"
                >
                  Try the Studio
                </Link>
              </div>
            </div>

            {/* Right column — animated viz */}
            <div className="flex-1 w-full max-w-[36.8rem] flex flex-col">
              <HeroViz />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section id="features" className="py-12 bg-white/50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-4">
              Granular insights at every level
            </h2>
            <p className="text-slate-custom-500">
              Our platform aggregates millions of data points daily to give you
              the most accurate picture of the Chinese EV ecosystem.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.1}>
                <div className="group bg-white rounded-2xl p-7 border border-slate-custom-200 hover:border-primary/40 hover:shadow-lg transition-all duration-300 h-full">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 text-primary group-hover:bg-primary/20 transition-colors">
                    <span className="material-icons-round text-xl">
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-custom-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-custom-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="pt-24 pb-[7.5rem] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </section>

      {/* 5. Pricing Preview */}
      <section id="pricing" className="py-12 bg-white/50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-custom-500">
              Start free. Upgrade when you need deeper access.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <PricingToggle />
          </AnimatedSection>
        </div>
      </section>

      {/* 6. Data Coverage */}
      <section className="py-24 bg-slate-custom-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comprehensive coverage
            </h2>
            <p className="text-slate-custom-400 max-w-xl mx-auto">
              The most granular dataset on China&apos;s electric vehicle market.
            </p>
          </AnimatedSection>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {[
              { value: 50, suffix: "+", label: "OEMs Tracked" },
              { value: 6, suffix: "", label: "Data Categories" },
              { value: 365, suffix: "", label: "Daily Updates" },
              { value: 5, suffix: "+", label: "Years History" },
            ].map((stat, i) => (
              <AnimatedSection
                key={stat.label}
                delay={i * 0.1}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-slate-custom-400">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>

          {/* Category pills */}
          <AnimatedSection
            delay={0.3}
            className="flex flex-wrap justify-center gap-3"
          >
            {categories.map((cat) => (
              <span
                key={cat}
                className="px-4 py-2 rounded-full bg-white/10 text-sm font-medium text-slate-custom-300 border border-white/10"
              >
                {cat}
              </span>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-custom-900 mb-6">
              Ready to see the data?
            </h2>
            <p className="text-lg text-slate-custom-500 mb-10 max-w-xl mx-auto">
              Join analysts and investors tracking the Chinese EV revolution
              with Juice Index.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login?mode=magic&intent=signup"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold rounded-full bg-slate-custom-900 text-white hover:bg-slate-custom-800 transition-colors"
              >
                Get Started Free
                <span className="material-icons-round ml-2 text-base">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/dashboard/studio"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold rounded-full text-slate-custom-700 border border-slate-custom-200 hover:border-slate-custom-300 hover:bg-slate-custom-50 transition-all"
              >
                Try the Studio
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-custom-400">
              Free tier available. No credit card required.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-white border-t border-slate-custom-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src="/logo.png"
                  alt="Juice Index"
                  width={28}
                  height={28}
                  className="rounded"
                />
                <span className="font-bold text-lg text-slate-custom-900">
                  Juice Index
                </span>
              </div>
              <p className="text-sm text-slate-custom-500 leading-relaxed">
                Providing clarity in the world&apos;s most complex automotive
                market.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-custom-900 mb-4 text-sm">
                Platform
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-custom-500">
                <li>
                  <Link
                    href="/dashboard/studio"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    Studio
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    API Docs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/keys"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    API Keys
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-custom-900 mb-4 text-sm">
                Company
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-custom-500">
                <li>
                  <Link
                    href="/docs"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    Methodology
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:support@juiceindex.com"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-custom-900 mb-4 text-sm">
                Legal
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-custom-500">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-slate-custom-900 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-custom-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-custom-400">
              &copy; {new Date().getFullYear()} Juice Index Ltd. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
