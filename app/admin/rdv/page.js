'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const un = (x) => (Array.isArray(x) ? x[0] : x) || null;

function ResultatForm({ resa, existant, onSaved }) {
  const [f, setF] = useState({
    nom_prospect: existant?.nom_prospect || '',
    telephone_prospect: existant?.telephone_prospect || '',
    present: existant?.present ?? true,
    resultat: existant?.resultat || 'a_relancer',
    produit_pack: existant?.produit_pack || '',
    commentaire: existant?.commentaire || '',
    date_relance: existant?.date_relance || '',
    nb_presents: existant?.nb_presents ?? '',
  });
  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const enregistrer = async () => {
    const payload = { reservation_id: resa.id, commentaire: f.commentaire || null };
    if (resa.type === 'rdv') {
      Object.assign(payload, {
        nom_prospect: f.nom_prospect,
        telephone_prospect: f.telephone_prospect,
        present: f.present,
        resultat: f.present ? f.resultat : null,
        produit_pack: f.produit_pack || null,
        date_relance: f.date_relance || null,
      });
    } else {
      payload.nb_presents = f.nb_presents === '' ? null : Number(f.nb_presents);
    }
    await supabase.from('rdv_resultats').upsert(payload, { onConflict: 'reservation_id' });
    await supabase.from('reservations').update({ statut: 'terminee' }).eq('id', resa.id);
    onSaved();
  };

  const champ = 'w-full rounded border p-2';
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {resa.type === 'rdv' ? (
        <>
          <input placeholder="Nom du prospect" value={f.nom_prospect} onChange={set('nom_prospect')} className={champ} />
          <input placeholder="Téléphone" value={f.telephone_prospect} onChange={set('telephone_prospect')} className={champ} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.present} onChange={set('present')} /> Le prospect est venu
          </label>
          {f.present && (
            <>
              <select value={f.resultat} onChange={set('resultat')} className={champ}>
                <option value="inscrit">Inscrit</option>
                <option value="a_relancer">Intéressé, à relancer</option>
                <option value="refuse">Refusé</option>
              </select>
              <input placeholder="Produit / pack concerné" value={f.produit_pack} onChange={set('produit_pack')} className={champ} />
            </>
          )}
          <label className="block text-sm">Date de relance
            <input type="date" value={f.date_relance} onChange={set('date_relance')} className={champ} />
          </label>
        </>
      ) : (
        <input type="number" min="0" placeholder="Nombre de présents" value={f.nb_presents}
          onChange={set('nb_presents')} className={champ} />
      )}
      <textarea placeholder="Commentaire" value={f.commentaire} onChange={set('commentaire')} className={champ} />
      <button onClick={enregistrer} className="rounded bg-slate-900 px-4 py-2 text-white">Enregistrer</button>
    </div>
  );
}

export default function SuiviRdv() {
  const profile = useProfile({ adminOnly: true });
  const [liste, setListe] = useState([]);
  const [ouvert, setOuvert] = useState(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('reservations')
      .select('*, profiles(nom), rdv_resultats(*)')
      .neq('statut', 'annulee').order('debut', { ascending: false });
    setListe(data || []);
    setOuvert(null);
  }, []);

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
        <h1 className="text-xl font-bold">Suivi des rendez-vous et formations</h1>
        {liste.map((r) => {
          const res = un(r.rdv_resultats);
          return (
            <div key={r.id} className="rounded bg-white p-3 shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.titre} <span className="text-xs text-slate-500">({r.type})</span></p>
                  <p className="text-sm">{fmt(r.debut)} · par {r.profiles?.nom}</p>
                  {res && r.type === 'rdv' && (
                    <p className="text-sm text-green-700">
                      {res.nom_prospect} — {res.present ? res.resultat : 'absent'}
                    </p>
                  )}
                  {res && r.type === 'formation' && (
                    <p className="text-sm text-green-700">{res.nb_presents ?? '?'} présents</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setOuvert(ouvert === r.id ? null : r.id)} className="rounded border px-3 py-1">
                    {res ? 'Modifier' : 'Résultat'}
                  </button>
                  {r.statut === 'confirmee' && (
                    <button onClick={() => annuler(r.id)} className="rounded border border-red-500 px-3 py-1 text-red-600">
                      Annuler
                    </button>
                  )}
                </div>
              </div>
              {ouvert === r.id && <ResultatForm resa={r} existant={res} onSaved={charger} />}
            </div>
          );
        })}
      </main>
    </>
  );
}