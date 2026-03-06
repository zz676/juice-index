import AnimatedSection from "@/components/landing/AnimatedSection";
import CountUp from "@/components/landing/CountUp";

const features = [
  {
    icon: "factory",
    title: "Production Data",
    description:
      "Track factory output across 50+ OEMs including BYD, Tesla, and NIO. Monitor capacity utilization in real-time.",
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

const categories = [
  "Brand Deliveries",
  "Industry Sales",
  "Market Health",
  "Battery",
  "Exports",
  "Vehicle Specs",
];

export default function FeaturesPage() {
  return (
    <div className="pt-8 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Features Grid */}
        <section className="mb-16">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-4">
              Granular insights at every level
            </h2>
            <p className="text-slate-custom-500">
              Our platform aggregates millions of data points daily to give you
              the most accurate picture of the global EV ecosystem.
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
        </section>

        {/* Data Coverage */}
        <section className="rounded-3xl bg-slate-custom-900 text-white py-16 px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comprehensive coverage
            </h2>
            <p className="text-slate-custom-400 max-w-xl mx-auto">
              The most granular dataset on the global electric vehicle market.
            </p>
          </AnimatedSection>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
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
        </section>
      </div>
    </div>
  );
}
