'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const VIDE = { nom: '', email: '', telephone: '', role: 'leader', password: '' };

const genererMotDePasse = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const octets = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(octets, (o) => alphabet[o % alphabet.length]).join('');
};

export default function Utilisateurs() {
  const profile = useProfile({ adminOnly: true });
  const [users, setUsers] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(VIDE);
  const [erreur, setErreur] = useState('');
  const [cree, setCree] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers(data || []);
  }, []);

  useEffect(() => { if (profile) charger(); }, [profile, charger]);

  const maj = async (id, champs) => {
    await supabase.from('profiles').update(champs).eq('id', id);
    charger();
  };

  const set = (k) => (e) => setF((c) => ({ ...c, [k]: e.target.value }));

  const creer = async (e) => {
    e.preventDefault();
    setErreur('');
    setCree(null);
    setEnCours(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/utilisateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(f),
    });
    const json = await res.json().catch(() => ({}));
    setEnCours(false);
    if (!res.ok) return setErreur(json.error || 'Création impossible.');
    setCree({ email: f.email, password: f.password });
    setF(VIDE);
    setOuvert(false);
    charger();
  };

  if (!profile) return <p className="p-6">Chargement…</p>;

  const champ = 'w-full rounded border p-2';

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Utilisateurs</h1>
          <button type="button" onClick={() => { setOuvert((o) => !o); setErreur(''); }}
            className="rounded bg-slate-900 px-4 py-2 text-white">
            {ouvert ? 'Fermer' : '＋ Ajouter un utilisateur'}
          </button>
        </div>

        {cree && (
          <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800" role="status">
            Compte créé. Communiquez ces identifiants à la personne (ils ne seront plus affichés) :<br />
            <strong>{cree.email}</strong> / <strong>{cree.password}</strong>
          </div>
        )}

        {ouvert && (
          <form onSubmit={creer} className="space-y-2 rounded bg-white p-4 shadow">
            <input required placeholder="Nom complet" value={f.nom} onChange={set('nom')} className={champ} />
            <input required type="email" placeholder="Adresse e-mail" value={f.email} onChange={set('email')} className={champ} />
            <input placeholder="Téléphone (facultatif)" value={f.telephone} onChange={set('telephone')} className={champ} />
            <select value={f.role} onChange={set('role')} className={champ}>
              <option value="leader">Tête de réseau</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2">
              <input required minLength={8} placeholder="Mot de passe (8 caractères min.)" value={f.password}
                onChange={set('password')} className={champ} />
              <button type="button" onClick={() => setF((c) => ({ ...c, password: genererMotDePasse() }))}
                className="shrink-0 rounded border px-3">Générer</button>
            </div>
            {erreur && <p className="text-sm text-red-600" role="alert">{erreur}</p>}
            <button disabled={enCours} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
              {enCours ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        )}

        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow">
            <input defaultValue={u.nom || ''} onBlur={(e) => e.target.value !== u.nom && maj(u.id, { nom: e.target.value })}
              className="rounded border p-1" />
            <input defaultValue={u.telephone || ''} placeholder="Téléphone"
              onBlur={(e) => e.target.value !== (u.telephone || '') && maj(u.id, { telephone: e.target.value })}
              className="rounded border p-1" />
            <select value={u.role} onChange={(e) => maj(u.id, { role: e.target.value })} className="rounded border p-1">
              <option value="leader">Tête de réseau</option>
              <option value="admin">Admin</option>
            </select>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={u.actif} onChange={(e) => maj(u.id, { actif: e.target.checked })} /> Actif
            </label>
          </div>
        ))}
      </main>
    </>
  );
}