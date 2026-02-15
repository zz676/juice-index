import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://juiceindex.io"),
  title: {
    default: "Juice Index — EV Market Intelligence",
    template: "%s | Juice Index",
  },
  description:
    "AI-powered data intelligence on the global electric vehicle market. Production, insurance registrations, battery supply chain, and market analytics updated daily.",
  openGraph: {
    title: "Juice Index — EV Market Intelligence",
    description:
      "AI-powered data intelligence on the global electric vehicle market. Production, insurance registrations, battery supply chain, and market analytics updated daily.",
    url: "https://juiceindex.io",
    siteName: "Juice Index",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juice Index — EV Market Intelligence",
    description:
      "AI-powered data intelligence on the global electric vehicle market.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://juiceindex.io",
  },
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
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
