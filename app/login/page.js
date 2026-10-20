'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const connecter = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!supabase) {
      setErreur('La connexion est indisponible : Supabase n’est pas configuré pour ce projet.');
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErreur('Adresse e-mail ou mot de passe incorrect.');
      setEnCours(false);
    } else {
      router.replace('/');
    }
  };

  return (
    <main className="login-page">
      <form onSubmit={connecter} className="login-card">
        <div className="login-brand" aria-label="Salle RMM">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">salle<span>rmm</span></span>
        </div>
        <p className="section-kicker">VOTRE ESPACE MEMBRE</p>
        <h1 className="login-heading">Ravi de vous revoir</h1>
        <p className="login-description">Connectez-vous pour consulter le calendrier et gérer vos réservations.</p>
        {!supabase && <p className="login-error" role="status">La connexion est indisponible : Supabase n’est pas configuré pour ce projet.</p>}

        <label className="login-field" htmlFor="login-email">Adresse e-mail
          <input id="login-email" type="email" required autoComplete="email" placeholder="vous@exemple.fr" value={email}
            onChange={(e) => setEmail(e.target.value)} className="login-input" />
        </label>
        <label className="login-field" htmlFor="login-password">Mot de passe
          <input id="login-password" type="password" required autoComplete="current-password" placeholder="Votre mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)} className="login-input" />
        </label>
        {erreur && <p className="login-error" role="alert">{erreur}</p>}
        <button disabled={!supabase || enCours} className="login-submit">{enCours ? 'Connexion…' : 'Se connecter'}</button>
        <p className="login-footnote">Un espace dédié pour planifier vos rendez-vous.</p>
      </form>
    </main>
  );
}
