"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Explorer", href: "/dashboard/explorer" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <div className="flex flex-col px-6 py-8 gap-2">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
