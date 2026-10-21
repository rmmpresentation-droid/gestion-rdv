'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const EMPTY_USER = { nom: '', email: '', telephone: '', role: 'leader', password: '' };
const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};
const initials = (name) => name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'M';

export default function Utilisateurs() {
  const profile = useProfile({ adminOnly: true });
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_USER);
  const [erreur, setErreur] = useState('');
  const [cree, setCree] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [majEnCours, setMajEnCours] = useState(null);
  const userId = profile?.id;

  const charger = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    return { data: data || [], error };
  }, [userId]);

  useEffect(() => {
    let active = true;
    charger().then((result) => {
      if (!active || !result) return;
      if (result.error) setErreur('La liste des utilisateurs n’a pas pu être chargée. Réessayez.');
      else setUsers(result.data);
      setChargement(false);
    });
    return () => { active = false; };
  }, [charger]);

  const maj = async (id, champs) => {
    setMajEnCours(id);
    const { error } = await supabase.from('profiles').update(champs).eq('id', id);
    if (error) setErreur('Cette modification n’a pas pu être enregistrée. Réessayez.');
    else {
      const result = await charger();
      if (result?.error) setErreur('La modification est enregistrée, mais la liste n’a pas pu être actualisée.');
      else if (result) setUsers(result.data);
    }
    setMajEnCours(null);
  };
  const updateForm = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const creer = async (event) => {
    event.preventDefault();
    setErreur('');
    setCree(null);
    setEnCours(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/utilisateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    setEnCours(false);
    if (!response.ok) {
      setErreur(result.error || 'La création du compte a échoué. Réessayez.');
      return;
    }
    setCree({ email: form.email, password: form.password });
    setForm(EMPTY_USER);
    setOpen(false);
    const refreshedUsers = await charger();
    if (refreshedUsers?.error) setErreur('Le compte est créé, mais la liste n’a pas pu être actualisée.');
    else if (refreshedUsers) setUsers(refreshedUsers.data);
  };

  const filteredUsers = useMemo(() => users.filter((user) => `${user.nom || ''} ${user.email || ''} ${user.telephone || ''}`.toLocaleLowerCase('fr').includes(recherche.toLocaleLowerCase('fr'))), [users, recherche]);
  const activeCount = users.filter((user) => user.actif).length;
  const adminCount = users.filter((user) => user.role === 'admin').length;

  if (!profile) return <p className="page-loading">Chargement de votre espace…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="workspace-page workspace-page-wide">
        <section className="workspace-heading">
          <div><p className="workspace-eyebrow">PILOTAGE · MEMBRES</p><h1>Utilisateurs</h1><p className="workspace-description">Gérez les accès et les informations des membres de votre réseau.</p></div>
          <button type="button" onClick={() => { setOpen((current) => !current); setErreur(''); }} className="workspace-primary"><span aria-hidden="true">＋</span>{open ? 'Fermer le formulaire' : 'Ajouter un membre'}</button>
        </section>
        <section className="workspace-metrics" aria-label="Résumé des utilisateurs">
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-indigo" aria-hidden="true">◎</span><div><span className="metric-label">Membres</span><strong>{users.length}</strong></div></article>
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-teal" aria-hidden="true">✓</span><div><span className="metric-label">Comptes actifs</span><strong>{activeCount}</strong></div></article>
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-violet" aria-hidden="true">◇</span><div><span className="metric-label">Administrateurs</span><strong>{adminCount}</strong></div></article>
        </section>

        {cree && <section className="credentials-notice" role="status"><span className="credentials-icon" aria-hidden="true">✓</span><div><strong>Compte créé</strong><p>Transmettez ces identifiants au membre : <strong>{cree.email}</strong><span className="credential-separator">·</span><code>{cree.password}</code></p><small>Le mot de passe ne sera plus affiché après cette étape.</small></div><button type="button" className="notice-close" aria-label="Masquer les identifiants" onClick={() => setCree(null)}>×</button></section>}

        {open && <section className="workspace-panel user-create-panel" aria-labelledby="create-user-title"><div className="workspace-panel-heading"><div><p className="workspace-eyebrow">NOUVEAU COMPTE</p><h2 id="create-user-title">Ajouter un membre</h2></div><span className="subtle-count">Accès à RMM Network</span></div><form onSubmit={creer} className="user-form">
          <label className="admin-field"><span>Nom complet *</span><input required autoComplete="name" value={form.nom} onChange={updateForm('nom')} className="admin-control" placeholder="Ex. Camille Martin" /></label>
          <label className="admin-field"><span>Adresse e-mail *</span><input required type="email" autoComplete="email" value={form.email} onChange={updateForm('email')} className="admin-control" placeholder="camille@exemple.fr" /></label>
          <label className="admin-field"><span>Téléphone <small>(facultatif)</small></span><input type="tel" autoComplete="tel" value={form.telephone} onChange={updateForm('telephone')} className="admin-control" placeholder="06 00 00 00 00" /></label>
          <label className="admin-field"><span>Rôle *</span><select value={form.role} onChange={updateForm('role')} className="admin-control"><option value="leader">Tête de réseau</option><option value="admin">Administrateur</option></select></label>
          <div className="password-field"><label className="admin-field" htmlFor="new-user-password"><span>Mot de passe provisoire *</span><input id="new-user-password" required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={updateForm('password')} className="admin-control" placeholder="8 caractères minimum" /></label><button type="button" className="row-action" onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))}>Générer</button></div>
          {erreur && <p className="workspace-alert user-form-error" role="alert">{erreur}</p>}
          <div className="user-form-footer"><p>Le membre pourra utiliser ces identifiants pour accéder à son espace.</p><button type="submit" disabled={enCours} className="workspace-primary">{enCours ? 'Création du compte…' : 'Créer le compte'}</button></div>
        </form></section>}

        <section className="workspace-panel" aria-labelledby="users-title">
          <div className="workspace-panel-heading"><div><p className="workspace-eyebrow">ANNUAIRE</p><h2 id="users-title">Membres du réseau</h2></div><label className="workspace-search"><span className="search-icon" aria-hidden="true">⌕</span><span className="sr-only">Rechercher un membre</span><input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Nom ou téléphone…" /></label></div>
          {erreur && !open && <p className="workspace-alert" role="alert">{erreur}</p>}
          {chargement ? <p className="workspace-message">Chargement de l’annuaire…</p> : filteredUsers.length === 0 ? <div className="workspace-empty"><span className="empty-symbol" aria-hidden="true">⌕</span><h3>{recherche ? 'Aucun membre trouvé' : 'Aucun membre pour le moment'}</h3><p>{recherche ? 'Essayez avec un autre nom ou numéro.' : 'Les comptes du réseau apparaîtront ici.'}</p></div> : <div className="user-list">{filteredUsers.map((user) => (
            <article key={user.id} className="user-row">
              <span className={`member-avatar user-avatar-${user.role}`} aria-hidden="true">{initials(user.nom)}</span>
              <div className="user-identity"><label className="admin-field"><span className="sr-only">Nom complet de {user.nom || 'ce membre'}</span><input aria-label={`Nom complet de ${user.nom || 'ce membre'}`} defaultValue={user.nom || ''} onBlur={(event) => event.target.value !== (user.nom || '') && maj(user.id, { nom: event.target.value })} className="admin-control user-name-input" /></label><span>{user.email || 'Adresse e-mail non renseignée'}</span></div>
              <label className="admin-field user-edit-field user-phone-field"><span className="sr-only">Téléphone de {user.nom || 'ce membre'}</span><input aria-label={`Téléphone de ${user.nom || 'ce membre'}`} defaultValue={user.telephone || ''} placeholder="Ajouter un téléphone" onBlur={(event) => event.target.value !== (user.telephone || '') && maj(user.id, { telephone: event.target.value })} className="admin-control" /></label>
              <label className="admin-field user-role-field"><span className="sr-only">Rôle de {user.nom || 'ce membre'}</span><select aria-label={`Rôle de ${user.nom || 'ce membre'}`} value={user.role} onChange={(event) => maj(user.id, { role: event.target.value })} className="admin-control"><option value="leader">Membre réseau</option><option value="admin">Administrateur</option></select></label>
              <label className="user-active"><input type="checkbox" checked={Boolean(user.actif)} disabled={majEnCours === user.id} onChange={(event) => maj(user.id, { actif: event.target.checked })} /><span className={`status-pill ${user.actif ? 'status-terminee' : 'status-annulee'}`}>{user.actif ? 'Actif' : 'Inactif'}</span></label>
            </article>
          ))}</div>}
          <div className="workspace-panel-footer">{filteredUsers.length} membre{filteredUsers.length !== 1 ? 's' : ''} affiché{filteredUsers.length !== 1 ? 's' : ''}</div>
        </section>
      </main>
    </>
  );
}
