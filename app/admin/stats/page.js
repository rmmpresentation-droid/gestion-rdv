'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const un = (x) => (Array.isArray(x) ? x[0] : x) || null;
const pct = (a, b) => (b ? Math.round((a / b) * 100) + ' %' : '–');

function Carte({ titre, valeur }) {
  return (
    <div className="rounded bg-white p-4 text-center shadow">
      <p className="text-2xl font-bold">{valeur}</p>
      <p className="text-sm text-slate-600">{titre}</p>
    </div>
  );
}

export default function Stats() {
  const profile = useProfile({ adminOnly: true });
  const [s, setS] = useState(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('reservations')
        .select('*, profiles(nom), rdv_resultats(*)').neq('statut', 'annulee');
      const rows = (data || []).map((r) => ({ ...r, res: un(r.rdv_resultats) }));

      const rdvs = rows.filter((r) => r.type === 'rdv' && r.res);
      const presents = rdvs.filter((r) => r.res.present).length;
      const inscrits = rdvs.filter((r) => r.res.present && r.res.resultat === 'inscrit').length;

      // Occupation : 30 derniers jours, salle ouverte 11h/jour (9h-20h)
      const depuis = Date.now() - 30 * 24 * 3600 * 1000;
      const heures = rows
        .filter((r) => new Date(r.debut).getTime() >= depuis && new Date(r.debut) <= new Date())
        .reduce((t, r) => t + (new Date(r.fin) - new Date(r.debut)) / 3600000, 0);

      const parUser = {};
      rows.forEach((r) => {
        const nom = r.profiles?.nom || '?';
        parUser[nom] ||= { formations: 0, participants: 0, rdv: 0, inscrits: 0 };
        if (r.type === 'formation') {
          parUser[nom].formations++;
          parUser[nom].participants += r.res?.nb_presents || 0;
        } else {
          parUser[nom].rdv++;
          if (r.res?.present && r.res?.resultat === 'inscrit') parUser[nom].inscrits++;
        }
      });

      setS({
        total: rows.length, rdvSuivis: rdvs.length, presents, inscrits,
        presence: pct(presents, rdvs.length),
        conversion: pct(inscrits, presents),
        occupation: pct(heures, 30 * 11),
        parUser,
      });
    })();
  }, [profile]);

  if (!profile || !s) return <p className="p-6">Chargement…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <h1 className="text-xl font-bold">Statistiques</h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Carte titre="Réservations" valeur={s.total} />
          <Carte titre="Taux de présence RDV" valeur={s.presence} />
          <Carte titre="Taux de conversion" valeur={s.conversion} />
          <Carte titre="Occupation (30 j)" valeur={s.occupation} />
        </div>

        <table className="w-full rounded bg-white text-sm shadow">
          <thead className="bg-slate-100 text-left">
            <tr><th className="p-2">Membre</th><th>Formations</th><th>Participants</th><th>RDV</th><th>Inscrits</th></tr>
          </thead>
          <tbody>
            {Object.entries(s.parUser).map(([nom, v]) => (
              <tr key={nom} className="border-t">
                <td className="p-2">{nom}</td><td>{v.formations}</td><td>{v.participants}</td><td>{v.rdv}</td><td>{v.inscrits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}