import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juice Index — EV Market Data API",
  description:
    "Real-time electric vehicle metrics, delivery data, and market analytics for developers.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header style={{ borderBottom: "1px solid var(--border)" }}>
          <nav className="nav">
            <a href="/" className="nav-logo">
              <img src="/logo.png" alt="Juice Index" />
              Juice Index
            </a>
            <div className="nav-links">
              <a href="/docs">Docs</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/login" className="btn btn-primary btn-sm">
                Get Started
              </a>
            </div>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <p>© {new Date().getFullYear()} Juice Index. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
