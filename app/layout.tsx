import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "RMM Network — Réservations",
    template: "%s | RMM Network",
  },
  description: "Gérez les réservations, les rendez-vous et les formations de votre réseau RMM.",
};

export const viewport: Viewport = {
  themeColor: "#f4f6fa",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
