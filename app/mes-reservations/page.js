'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function MesReservations() {
  const profile = useProfile();
  const [liste, setListe] = useState([]);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('reservations').select('*')
      .eq('user_id', profile.id).order('debut', { ascending: false });
    setListe(data || []);
  }, [profile]);

  useEffect(() => { if (profile) charger(); }, [profile, charger]);

  const annuler = async (id) => {
    if (!confirm('Annuler cette réservation ?')) return;
    await supabase.from('reservations').update({ statut: 'annulee' }).eq('id', id);
    charger();
  };

  if (!profile) return <p className="p-6">Chargement…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <h1 className="text-xl font-bold">Mes réservations</h1>
        {liste.length === 0 && <p>Aucune réservation.</p>}
        {liste.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded bg-white p-3 shadow">
            <div>
              <p className="font-semibold">{r.titre} <span className="text-xs text-slate-500">({r.type})</span></p>
              <p className="text-sm">{fmt(r.debut)} → {new Date(r.fin).toLocaleTimeString('fr-FR', { timeStyle: 'short' })}</p>
              {r.invites?.length > 0 && (
                <p className="text-sm text-slate-600">Invités : {r.invites.map((i) => i.nom).join(', ')}</p>
              )}
              <p className="text-xs uppercase text-slate-500">{r.statut}</p>
            </div>
            {r.statut === 'confirmee' && new Date(r.debut) > new Date() && (
              <button onClick={() => annuler(r.id)} className="rounded border border-red-500 px-3 py-1 text-red-600">
                Annuler
              </button>
            )}
          </div>
        ))}
      </main>
    </>
  );
}