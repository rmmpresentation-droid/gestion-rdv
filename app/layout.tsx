import './globals.css';

export const metadata = { title: 'Réservation de la salle' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}