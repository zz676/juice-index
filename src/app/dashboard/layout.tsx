"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

const navItems = [
    { href: "/dashboard", icon: "dashboard", label: "Overview" },
    { href: "/dashboard/posts", icon: "article", label: "Posts" },
    { href: "/dashboard/explorer", icon: "show_chart", label: "Data Explorer" },
    { href: "/dashboard/billing", icon: "credit_card", label: "Billing" },
    { href: "/dashboard/settings", icon: "settings", label: "Settings" },
];

import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const supabase = createClient();
    const [collapsed, setCollapsed] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
            if (!authUser) return;
            const meta = authUser.user_metadata ?? {};
            setUser({
                name: meta.full_name || meta.name || "",
                email: authUser.email ?? "",
                avatarUrl: meta.avatar_url || meta.picture || null,
            });
        });
    }, [supabase]);

    const displayName = user?.name || user?.email || "";
    const initials = user?.name
        ? user.name.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2)
        : (user?.email?.[0]?.toUpperCase() ?? "?");

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        }
        if (profileOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [profileOpen]);

    return (
        <div className="bg-background-light font-display text-slate-custom-800 antialiased overflow-hidden h-screen flex">
            {/* Sidebar */}
            <aside
                className={`${collapsed ? "w-16" : "w-64"} bg-white border-r border-slate-custom-200 flex flex-col h-full flex-shrink-0 z-20 transition-all duration-300`}
            >
                {/* Top: Logo + Toggle */}
                <div className={`flex items-center ${collapsed ? "justify-center px-0" : "justify-between px-6"} h-20 flex-shrink-0`}>
                    {collapsed ? (
                        <button
                            onClick={() => setCollapsed(false)}
                            className="flex items-center"
                            title="Expand sidebar"
                        >
                            <img src="/logo.png" alt="Juice Index" className="w-10 h-10 transition-all flex-shrink-0" />
                        </button>
                    ) : (
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <img src="/logo.png" alt="Juice Index" className="w-10 h-10 transition-all flex-shrink-0" />
                            <h1 className="text-xl font-bold tracking-tight text-slate-custom-900 whitespace-nowrap">
                                Juice Index
                            </h1>
                        </Link>
                    )}
                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(true)}
                            className="p-1.5 rounded-lg text-slate-custom-400 hover:text-primary hover:bg-slate-custom-50 transition-all"
                            title="Collapse sidebar"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="16" height="14" rx="2" />
                                <line x1="7.5" y1="3" x2="7.5" y2="17" />
                                <path d="M12 8l-2 2 2 2" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Nav Items */}
                <nav className={`flex-1 flex flex-col gap-1 ${collapsed ? "items-center px-2" : "px-4"} mt-2`}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.label : undefined}
                                className={`flex items-center ${collapsed ? "justify-center w-10 h-10 rounded-xl" : "gap-3 px-4 py-2.5 rounded-xl"} font-medium transition-all group
                                    ${isActive
                                        ? "bg-primary/10 text-slate-custom-900"
                                        : "text-slate-custom-500 hover:bg-slate-custom-50 hover:text-slate-custom-700"
                                    }`}
                            >
                                <span
                                    className={`material-icons-round text-[20px] transition-colors ${isActive ? "text-primary" : "group-hover:text-primary"}`}
                                >
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <span className="text-sm whitespace-nowrap">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className={`flex flex-col ${collapsed ? "items-center px-2" : "px-4"} pb-4 gap-2`}>
                    {/* Pro Upgrade */}
                    {!collapsed ? (
                        <div className="bg-slate-custom-900 rounded-xl p-4 text-center relative overflow-hidden group cursor-pointer mx-1 mb-2">
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all"></div>
                            <h3 className="text-white font-semibold text-sm mb-1 relative z-10">Juice Pro</h3>
                            <p className="text-xs text-slate-custom-300 mb-2.5 relative z-10">Access real-time insurance data.</p>
                            <Link
                                href="/pricing"
                                className="block w-full py-1.5 bg-primary text-slate-custom-900 font-semibold text-xs rounded-full hover:shadow-[0_0_15px_rgba(106,218,27,0.4)] transition-all relative z-10"
                            >
                                Upgrade
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href="/pricing"
                            title="Upgrade to Pro"
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-primary bg-slate-custom-900 hover:shadow-[0_0_12px_rgba(106,218,27,0.4)] transition-all mb-2"
                        >
                            <span className="material-icons-round text-[18px]">star</span>
                        </Link>
                    )}

                    {/* Divider */}
                    <div className={`border-t border-slate-custom-200 ${collapsed ? "w-8" : "mx-1"}`}></div>

                    {/* User Avatar with Popover */}
                    <div ref={profileRef} className="relative">
                        <button
                            onClick={() => setProfileOpen((v) => !v)}
                            className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-3 w-full"} py-2 mt-1 rounded-xl hover:bg-slate-custom-50 transition-all cursor-pointer`}
                            title="Account menu"
                        >
                            {user?.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={displayName || "Avatar"}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-custom-800 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                    {initials}
                                </div>
                            )}
                            {!collapsed && (
                                <>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-semibold text-slate-custom-900 truncate">{displayName}</p>
                                        <p className="text-xs text-slate-custom-500 truncate">{user?.email || ""}</p>
                                    </div>
                                    <span className="material-icons-round text-[16px] text-slate-custom-400">
                                        {profileOpen ? "expand_more" : "expand_less"}
                                    </span>
                                </>
                            )}
                        </button>

                        {/* Popover Menu */}
                        {profileOpen && (
                            <div className={`absolute ${collapsed ? "left-full ml-2" : "left-0 right-0 mx-1"} bottom-full mb-2 bg-white rounded-xl border border-slate-custom-200 shadow-lg py-1 z-50`}>
                                <div className="px-4 py-3 border-b border-slate-custom-100">
                                    <p className="text-sm font-semibold text-slate-custom-900">{displayName}</p>
                                    <p className="text-xs text-slate-custom-500">{user?.email || ""}</p>
                                </div>
                                <Link
                                    href="/dashboard/settings"
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-custom-600 hover:bg-slate-custom-50 transition-all"
                                >
                                    <span className="material-icons-round text-[18px]">settings</span>
                                    Settings
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-all w-full"
                                >
                                    <span className="material-icons-round text-[18px]">logout</span>
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-8 bg-background-light z-10 sticky top-0">
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
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-8 pt-2">
                    {children}
                </div>
            </main>
        </div>
    );
}
