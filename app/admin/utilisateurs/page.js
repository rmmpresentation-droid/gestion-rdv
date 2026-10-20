'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

export default function Utilisateurs() {
  const profile = useProfile({ adminOnly: true });
  const [users, setUsers] = useState([]);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers(data || []);
  }, []);

  useEffect(() => { if (profile) charger(); }, [profile, charger]);

  const maj = async (id, champs) => {
    await supabase.from('profiles').update(champs).eq('id', id);
    charger();
  };

  if (!profile) return <p className="p-6">Chargement…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <h1 className="text-xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-slate-600">
          Pour ajouter un membre : Supabase → Authentication → Users → Add user. Il apparaît ici automatiquement.
        </p>
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