"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

import type { User } from "@supabase/supabase-js";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Juice AI", href: "/dashboard/studio" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser);
    });
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[4.6rem] backdrop-blur-md bg-background-light/80 border-b border-slate-custom-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full pt-1">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Juice Index"
              width={62}
              height={62}
              className=""
            />
            <span className="text-xl tracking-tight">
              <span className="font-extrabold text-primary">Juice</span>{" "}
              <span className="font-bold text-slate-custom-900">Index</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[15px] font-medium text-slate-custom-600 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center text-primary hover:text-primary-dark hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
              >
                <svg width="38" height="38" viewBox="0 0 64 52" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Outer panel */}
                  <rect x="2" y="2" width="60" height="48" rx="5" />
                  {/* Pie chart */}
                  <circle cx="20" cy="20" r="10" />
                  <path d="M20 10 L20 20 L28.66 15" />
                  <line x1="20" y1="20" x2="13" y2="27" />
                  {/* List items top-right */}
                  <circle cx="38" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="42" y1="12" x2="54" y2="12" />
                  <circle cx="38" cy="19" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="42" y1="19" x2="54" y2="19" />
                  {/* List items bottom-left */}
                  <circle cx="8" cy="36" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="12" y1="36" x2="24" y2="36" />
                  <circle cx="8" cy="42" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="12" y1="42" x2="24" y2="42" />
                  {/* Bar chart */}
                  <line x1="34" y1="44" x2="56" y2="44" />
                  <rect x="35" y="38" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
                  <rect x="41" y="34" width="4" height="10" rx="0.5" fill="currentColor" stroke="none" />
                  <rect x="47" y="30" width="4" height="14" rx="0.5" fill="currentColor" stroke="none" />
                  <rect x="53" y="26" width="4" height="18" rx="0.5" fill="currentColor" stroke="none" />
                  {/* Trend line */}
                  <polyline x1="35" y1="35" points="35,35 42,30 48,33 56,24" fill="none" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/login?mode=password&intent=signin"
                  className="text-[15px] font-medium text-slate-custom-600 hover:text-slate-custom-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/login?mode=magic&intent=signup"
                  className="inline-flex items-center justify-center px-5 py-2 text-[15px] font-semibold rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-custom-600 hover:bg-slate-custom-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {mobileOpen ? (
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M3 5h14" strokeLinecap="round" />
                  <path d="M3 10h14" strokeLinecap="round" />
                  <path d="M3 15h14" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden fixed inset-0 top-16 bg-background-light z-40"
          >
            <div className="flex flex-col px-6 py-8 gap-2 bg-white/80 backdrop-blur-md">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-medium text-slate-custom-700 hover:text-primary py-3 border-b border-slate-custom-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-6 flex flex-col gap-3">
                {user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center py-2.5 text-primary hover:text-primary-dark active:scale-[0.98] transition-all duration-200"
                  >
                    <svg width="42" height="42" viewBox="0 0 64 52" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      {/* Outer panel */}
                      <rect x="2" y="2" width="60" height="48" rx="5" />
                      {/* Pie chart */}
                      <circle cx="20" cy="20" r="10" />
                      <path d="M20 10 L20 20 L28.66 15" />
                      <line x1="20" y1="20" x2="13" y2="27" />
                      {/* List items top-right */}
                      <circle cx="38" cy="12" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="42" y1="12" x2="54" y2="12" />
                      <circle cx="38" cy="19" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="42" y1="19" x2="54" y2="19" />
                      {/* List items bottom-left */}
                      <circle cx="8" cy="36" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="12" y1="36" x2="24" y2="36" />
                      <circle cx="8" cy="42" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="12" y1="42" x2="24" y2="42" />
                      {/* Bar chart */}
                      <line x1="34" y1="44" x2="56" y2="44" />
                      <rect x="35" y="38" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
                      <rect x="41" y="34" width="4" height="10" rx="0.5" fill="currentColor" stroke="none" />
                      <rect x="47" y="30" width="4" height="14" rx="0.5" fill="currentColor" stroke="none" />
                      <rect x="53" y="26" width="4" height="18" rx="0.5" fill="currentColor" stroke="none" />
                      {/* Trend line */}
                      <polyline x1="35" y1="35" points="35,35 42,30 48,33 56,24" fill="none" />
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login?mode=password&intent=signin"
                      onClick={() => setMobileOpen(false)}
                      className="text-center py-3 text-sm font-medium text-slate-custom-600 border border-slate-custom-200 rounded-full hover:bg-slate-custom-50 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/login?mode=magic&intent=signup"
                      onClick={() => setMobileOpen(false)}
                      className="text-center py-3 text-sm font-semibold bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
