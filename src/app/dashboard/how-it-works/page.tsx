import AnimatedSection from "@/components/landing/AnimatedSection";

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
    <div className="pt-28 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
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
