'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');

  const connecter = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreur(error.message);
    else router.replace('/');
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={connecter} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-bold">Connexion</h1>
        <input type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} className="w-full rounded border p-2" />
        <input type="password" required placeholder="Mot de passe" value={password}
          onChange={(e) => setPassword(e.target.value)} className="w-full rounded border p-2" />
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <button className="w-full rounded bg-slate-900 p-2 text-white">Se connecter</button>
      </form>
    </main>
  );
}