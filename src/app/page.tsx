"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-background-light text-slate-custom-800 font-display antialiased overflow-x-hidden min-h-screen">
      {/* Navbar */}
      <nav className="fixed w-full z-50 backdrop-blur-md bg-background-light/80 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                J
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-custom-900">
                Juice Index
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              <Link href="#features" className="text-sm font-medium text-slate-custom-600 hover:text-primary transition-colors">Features</Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-custom-600 hover:text-primary transition-colors">Pricing</Link>
              <Link href="/docs" className="text-sm font-medium text-slate-custom-600 hover:text-primary transition-colors">Docs</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login?mode=password&intent=signin" className="text-sm font-semibold text-slate-custom-900 hover:text-primary transition-colors">Log in</Link>
              <Link href="/login?mode=magic&intent=signup" className="hidden sm:inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-slate-custom-900 bg-primary hover:bg-primary/90 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] opacity-40 mix-blend-multiply"></div>
          <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[80px] opacity-30 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-custom-800">
              Live Data 2024 Q1
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-custom-900 tracking-tight mb-6 leading-[1.1]">
            The Pulse of <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-custom-800 via-slate-custom-600 to-slate-custom-800">
              China&apos;s EV Market
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-custom-600 mb-10 leading-relaxed">
            Real-time intelligence on production, insurance registrations, and
            supply chain dynamics for the world&apos;s fastest-growing auto sector.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login?mode=magic&intent=signup" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full text-slate-custom-900 bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(106,218,27,0.4)] transition-all duration-300">
              Start Free Trial
              <span className="material-icons-round ml-2 text-lg">arrow_forward</span>
            </Link>
            <Link href="/dashboard/explorer" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full text-slate-custom-700 bg-transparent border-2 border-slate-custom-200 hover:border-primary hover:text-primary transition-all duration-300">
              Explore Data
            </Link>
          </div>

          {/* UI Mockup */}
          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-slate-custom-400/30 rounded-lg blur opacity-20"></div>
            <div className="relative bg-white border border-slate-custom-200 rounded-lg shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center opacity-80">
                <div className="w-1/3 h-40 mx-4 bg-gradient-to-t from-primary/10 to-transparent rounded-lg border-b-2 border-primary relative flex items-end gap-2 p-2">
                  <div className="w-full bg-primary/40 h-[40%] rounded-t-sm"></div>
                  <div className="w-full bg-primary/60 h-[70%] rounded-t-sm"></div>
                  <div className="w-full bg-primary h-[55%] rounded-t-sm shadow-[0_0_15px_rgba(106,218,27,0.5)]"></div>
                  <div className="w-full bg-primary/30 h-[30%] rounded-t-sm"></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-custom-100 z-10 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-custom-500">Weekly Output</span>
                    <span className="text-xs text-primary font-bold">+12.4%</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-custom-900">42,891</div>
                  <div className="text-[10px] text-slate-custom-400">Units produced (BYD)</div>
                </div>
                <div className="w-1/3 h-40 mx-4 flex items-center justify-center relative">
                  <div className="w-32 h-32 border-[12px] border-slate-custom-100 rounded-full relative">
                    <div className="absolute top-0 left-0 w-full h-full border-[12px] border-primary rounded-full border-t-transparent border-l-transparent rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-4">Granular insights at every level</h2>
            <p className="text-slate-custom-600">Our platform aggregates millions of data points daily to give you the most accurate picture of the Chinese EV ecosystem.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
            {/* Card 1 */}
            <div className="group relative bg-white rounded-lg p-8 border border-slate-custom-200 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-icons-round text-9xl text-primary transform rotate-12">precision_manufacturing</span>
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <span className="material-icons-round text-2xl">factory</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-custom-900 mb-3">Production Data</h3>
                  <p className="text-slate-custom-600 leading-relaxed">Track factory output across major OEMs including BYD, Tesla China, and NIO. Monitor capacity utilization rates in real-time.</p>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-custom-100">
                  <Link href="#" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark">View Factory Analytics <span className="material-icons-round text-sm ml-1">arrow_forward</span></Link>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div className="group relative bg-slate-custom-900 rounded-lg p-8 border border-slate-custom-800 shadow-2xl overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-20"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6 text-primary">
                    <span className="material-icons-round text-2xl">verified</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Insurance Registrations</h3>
                  <p className="text-slate-custom-300 leading-relaxed">The gold standard for demand signals. Access weekly policy registration data broken down by province, city, and model trim.</p>
                </div>
                <div className="mt-8">
                  <div className="flex items-end gap-1 h-16 w-full opacity-80">
                    <div className="w-full bg-primary/20 h-4 rounded-t-sm"></div>
                    <div className="w-full bg-primary/40 h-8 rounded-t-sm"></div>
                    <div className="w-full bg-primary/60 h-6 rounded-t-sm"></div>
                    <div className="w-full bg-primary h-12 rounded-t-sm"></div>
                    <div className="w-full bg-primary/80 h-10 rounded-t-sm"></div>
                    <div className="w-full bg-primary h-14 rounded-t-sm"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Card 3 */}
            <div className="group relative bg-white rounded-lg p-8 border border-slate-custom-200 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-icons-round text-9xl text-primary transform -rotate-12">hub</span>
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <span className="material-icons-round text-2xl">local_shipping</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-custom-900 mb-3">Supply Chain Analytics</h3>
                  <p className="text-slate-custom-600 leading-relaxed">Deep dive into battery costs (LFP vs NMC), lithium pricing trends, and tier-1 component sourcing networks.</p>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-custom-100">
                  <Link href="#" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark">Explore Supply Chain <span className="material-icons-round text-sm ml-1">arrow_forward</span></Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Prop */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-1/2 relative order-2 md:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-custom-200 group">
                <div className="w-full h-64 bg-slate-custom-200 flex items-center justify-center">
                  <span className="material-icons-round text-6xl text-slate-custom-400">dashboard</span>
                </div>
                <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-background-light p-4 rounded-xl shadow-lg border border-slate-custom-200 max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <span className="material-icons-round">trending_up</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-custom-800">Predictive Modeling</p>
                    <p className="text-xs text-slate-custom-500 mt-1">Forecast delivery numbers with 94% accuracy before official earnings calls.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-custom-900 mb-6">Built for analysts, investors, and strategists.</h2>
              <p className="text-lg text-slate-custom-600 mb-8 leading-relaxed">In the fast-moving Chinese EV market, yesterday&apos;s data is irrelevant. Juice Index provides the granular, high-frequency data you need to make decisions with conviction.</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3"><span className="material-icons-round text-primary">check_circle</span><span className="text-slate-custom-700 font-medium">Daily API updates</span></li>
                <li className="flex items-center gap-3"><span className="material-icons-round text-primary">check_circle</span><span className="text-slate-custom-700 font-medium">Exportable CSV &amp; Excel reports</span></li>
                <li className="flex items-center gap-3"><span className="material-icons-round text-primary">check_circle</span><span className="text-slate-custom-700 font-medium">Customizable watchlists</span></li>
              </ul>
              <Link href="/docs" className="text-primary font-bold hover:underline underline-offset-4 decoration-2">Read our methodology -&gt;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-t border-slate-custom-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-slate-custom-400 uppercase tracking-widest mb-10">Trusted by leading financial firms</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-2xl font-bold text-slate-custom-800 font-serif flex items-center gap-2"><span className="material-icons-round">account_balance</span> GOLDMAN</div>
            <div className="text-xl font-bold text-slate-custom-800 font-sans tracking-tighter flex items-center gap-2"><span className="material-icons-round">show_chart</span> MORGAN</div>
            <div className="text-2xl font-black text-slate-custom-800 italic flex items-center gap-2">CITIC <span className="w-2 h-2 bg-primary rounded-full"></span></div>
            <div className="text-xl font-bold text-slate-custom-800 font-mono flex items-center gap-2"><span className="material-icons-round">language</span> HSBC</div>
            <div className="text-xl font-bold text-slate-custom-800 flex items-center gap-2"><span className="material-icons-round">savings</span> UBS</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-slate-custom-900 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary rounded-full blur-[120px] opacity-20"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Stop guessing. Start knowing.</h2>
          <p className="text-xl text-slate-custom-300 mb-10 max-w-2xl mx-auto">Join 500+ institutional investors tracking the Chinese EV revolution with Juice Index.</p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input className="flex-1 px-6 py-4 rounded-full border-none focus:ring-2 focus:ring-primary text-slate-custom-900 placeholder-slate-custom-400" placeholder="Enter your work email" type="email" />
            <button className="px-8 py-4 bg-primary text-slate-custom-900 font-bold rounded-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 whitespace-nowrap" type="button">Get Access</button>
          </form>
          <p className="mt-4 text-sm text-slate-custom-500">14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background-light pt-16 pb-8 border-t border-slate-custom-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white font-bold text-xs">J</div>
                <span className="font-bold text-lg text-slate-custom-900">Juice Index</span>
              </div>
              <p className="text-sm text-slate-custom-500">Providing clarity in the world&apos;s most complex automotive market.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-custom-900 mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-custom-600">
                <li><Link href="/docs" className="hover:text-primary">API Docs</Link></li>
                <li><Link href="/dashboard/explorer" className="hover:text-primary">Data Explorer</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/dashboard/keys" className="hover:text-primary">API Keys</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-custom-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-custom-600">
                <li><Link href="#" className="hover:text-primary">About Us</Link></li>
                <li><Link href="#" className="hover:text-primary">Methodology</Link></li>
                <li><Link href="#" className="hover:text-primary">Careers</Link></li>
                <li><Link href="#" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-custom-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-custom-600">
                <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-custom-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-custom-400">© 2024 Juice Index Ltd. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="text-slate-custom-400 hover:text-primary transition-colors"><span className="material-icons-round text-lg">public</span></Link>
              <Link href="#" className="text-slate-custom-400 hover:text-primary transition-colors"><span className="material-icons-round text-lg">alternate_email</span></Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
