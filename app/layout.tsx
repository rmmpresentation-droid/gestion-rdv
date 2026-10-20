import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Salle RMM — Réservation",
    template: "%s | Salle RMM",
  },
  description: "Consultez le calendrier de la salle RMM et gérez vos rendez-vous et formations.",
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
