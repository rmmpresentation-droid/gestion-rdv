'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Nav({ profile }) {
  const router = useRouter();
  const pathname = usePathname();
  const sortir = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };
  const liens = [
    { href: '/', label: 'Calendrier' },
    { href: '/mes-reservations', label: 'Mes réservations' },
    ...(profile.role === 'admin' ? [
      { href: '/admin/rdv', label: 'Suivi RDV' },
      { href: '/admin/stats', label: 'Statistiques' },
      { href: '/admin/utilisateurs', label: 'Utilisateurs' },
    ] : []),
  ];
  const initiales = profile.nom?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'M';

  return (
    <header className="app-header">
      <nav className="app-nav" aria-label="Navigation principale">
        <Link href="/" className="brand-lockup" aria-label="Salle RMM, accueil">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">salle<span>rmm</span></span>
        </Link>

        <div className="nav-links">
          {liens.map((lien) => {
            const actif = lien.href === '/' ? pathname === '/' : pathname.startsWith(lien.href);
            return (
              <Link key={lien.href} href={lien.href} className={`nav-link${actif ? ' nav-link-active' : ''}`} aria-current={actif ? 'page' : undefined}>
                {lien.label}
              </Link>
            );
          })}
        </div>

        <div className="nav-account">
          <span className="account-avatar" aria-hidden="true">{initiales}</span>
          <span className="account-copy">
            <span className="account-name">{profile.nom}</span>
            <span className="account-role">{profile.role === 'admin' ? 'Administrateur' : 'Membre'}</span>
          </span>
          <button type="button" onClick={sortir} className="logout-button" aria-label="Déconnexion">
            <span aria-hidden="true">↗</span><span className="logout-label">Quitter</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
