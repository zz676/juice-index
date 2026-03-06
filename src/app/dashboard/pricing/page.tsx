import { Suspense } from "react";
import AnimatedSection from "@/components/landing/AnimatedSection";
import PricingToggle from "@/components/landing/PricingToggle";

export default function PricingPage() {
  return (
    <div className="pt-8 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        <AnimatedSection className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-custom-500">
            Start free. Upgrade when you need deeper access.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Suspense>
            <PricingToggle />
          </Suspense>
        </AnimatedSection>
      </div>
    </div>
  );
}
