import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Juice Index to access EV market data, AI-powered analytics, and API tools.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
