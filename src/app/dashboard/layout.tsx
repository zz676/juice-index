"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navItems = [
    { href: "/dashboard", icon: "dashboard", label: "Overview" },
    { href: "/dashboard/explorer", icon: "show_chart", label: "Data Explorer" },
    { href: "/dashboard/keys", icon: "vpn_key", label: "API Keys" },
    { href: "/dashboard/billing", icon: "credit_card", label: "Billing" },
    { href: "/dashboard/settings", icon: "settings", label: "Settings" },
];

import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    return (
        <div className="bg-background-light font-display text-slate-custom-800 antialiased overflow-hidden h-screen flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-custom-200 flex flex-col justify-between h-full p-6 flex-shrink-0 z-20 shadow-sm">
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(106,218,27,0.4)]">
                            J
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-custom-900">Juice Index</h1>
                    </div>
                    <nav className="space-y-2 flex-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all group ${isActive
                                        ? "bg-primary/20 text-slate-custom-900"
                                        : "text-slate-custom-600 hover:bg-slate-custom-100"
                                        }`}
                                >
                                    <span className={`material-icons-round transition-transform group-hover:scale-110 ${isActive ? "text-primary" : "group-hover:text-primary"}`}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 rounded-full font-medium text-slate-custom-600 hover:bg-slate-custom-100 transition-all group mt-auto mb-6"
                    >
                        <span className="material-icons-round group-hover:text-red-500 transition-colors">logout</span>
                        Sign Out
                    </button>
                </div>
                {/* Pro Upgrade Card */}
                <div className="bg-slate-custom-900 rounded-lg p-5 text-center relative overflow-hidden group cursor-pointer">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all"></div>
                    <h3 className="text-white font-semibold mb-1 relative z-10">Juice Pro</h3>
                    <p className="text-xs text-slate-custom-300 mb-3 relative z-10">Access real-time insurance data.</p>
                    <Link href="/pricing" className="block w-full py-2 bg-primary text-slate-custom-900 font-semibold text-sm rounded-full hover:shadow-[0_0_15px_rgba(106,218,27,0.4)] transition-all relative z-10">
                        Upgrade
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header */}
                <header className="h-20 flex items-center justify-between px-8 bg-background-light z-10 sticky top-0">
                    <div className="relative w-96 group">
                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-custom-400 group-focus-within:text-primary transition-colors">search</span>
                        <input
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-custom-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm placeholder-slate-custom-400 text-slate-custom-700"
                            placeholder="Search tickers, reports, or news..."
                            type="text"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-full bg-white border border-slate-custom-200 flex items-center justify-center text-slate-custom-500 hover:text-primary hover:border-primary/50 transition-all shadow-sm relative">
                            <span className="material-icons-round">notifications_none</span>
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-2 border-l border-slate-custom-200">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-slate-custom-900">Alex Chen</p>
                                <p className="text-xs text-slate-custom-500">Senior Analyst</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-200 relative overflow-hidden border-2 border-white shadow-sm ring-2 ring-transparent hover:ring-primary/30 transition-all cursor-pointer">
                                <span className="material-icons-round absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-2">
                    {children}
                </div>
            </main>
        </div>
    );
}
