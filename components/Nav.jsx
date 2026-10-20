'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Nav({ profile }) {
  const router = useRouter();
  const sortir = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };
  return (
    <nav className="flex flex-wrap items-center gap-4 bg-slate-900 px-4 py-3 text-white">
      <b className="mr-4">Salle RMM</b>
      <Link href="/">Calendrier</Link>
      <Link href="/mes-reservations">Mes réservations</Link>
      {profile.role === 'admin' && (
        <>
          <Link href="/admin/rdv">Suivi RDV</Link>
          <Link href="/admin/stats">Statistiques</Link>
          <Link href="/admin/utilisateurs">Utilisateurs</Link>
        </>
      )}
      <span className="ml-auto text-sm opacity-80">{profile.nom} ({profile.role})</span>
      <button onClick={sortir} className="rounded bg-white/20 px-3 py-1">Déconnexion</button>
    </nav>
  );
}