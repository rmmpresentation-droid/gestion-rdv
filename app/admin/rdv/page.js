'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const formatDate = (value) => new Date(value).toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const formatTime = (value) => new Date(value).toLocaleTimeString('fr-FR', {
  hour: '2-digit', minute: '2-digit',
});
const unwrap = (value) => (Array.isArray(value) ? value[0] : value) || null;
const resultLabels = { inscrit: 'Inscrit', a_relancer: 'À relancer', refuse: 'Refusé' };

function Field({ label, htmlFor, children }) {
  return <label className="admin-field" htmlFor={htmlFor}><span>{label}</span>{children}</label>;
}

function ResultatForm({ reservation, existant, onSaved }) {
  const premierInvite = reservation.invites?.[0] || {};
  const [form, setForm] = useState({
    nom_prospect: existant?.nom_prospect || premierInvite.nom || '',
    telephone_prospect: existant?.telephone_prospect || premierInvite.telephone || '',
    present: existant?.present ?? true,
    resultat: existant?.resultat || 'a_relancer',
    produit_pack: existant?.produit_pack || '',
    commentaire: existant?.commentaire || '',
    date_relance: existant?.date_relance?.slice(0, 10) || '',
    nb_presents: existant?.nb_presents ?? '',
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const update = (key) => (event) => setForm((current) => ({
    ...current,
    [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
  }));

  const enregistrer = async (event) => {
    event.preventDefault();
    setEnCours(true);
    setErreur('');
    const payload = { reservation_id: reservation.id, commentaire: form.commentaire || null };
    if (reservation.type === 'rdv') {
      Object.assign(payload, {
        nom_prospect: form.nom_prospect,
        telephone_prospect: form.telephone_prospect,
        present: form.present,
        resultat: form.present ? form.resultat : null,
        produit_pack: form.produit_pack || null,
        date_relance: form.date_relance || null,
      });
    } else {
      payload.nb_presents = form.nb_presents === '' ? null : Number(form.nb_presents);
    }
    const { error: saveError } = await supabase.from('rdv_resultats').upsert(payload, { onConflict: 'reservation_id' });
    if (saveError) {
      setErreur('Le résultat n’a pas pu être enregistré. Vérifiez les informations puis réessayez.');
      setEnCours(false);
      return;
    }
    const { error: updateError } = await supabase.from('reservations').update({ statut: 'terminee' }).eq('id', reservation.id);
    if (updateError) {
      setErreur('Le résultat est enregistré, mais le statut du rendez-vous n’a pas pu être actualisé.');
      setEnCours(false);
      return;
    }
    setEnCours(false);
    onSaved();
  };

  return (
    <form className="result-form" onSubmit={enregistrer}>
      <div className="result-form-heading"><div><p className="workspace-eyebrow">COMPTE RENDU</p><h3>{reservation.type === 'rdv' ? 'Résultat du rendez-vous' : 'Présence à la formation'}</h3></div><span className="form-required-note">Les champs avec * sont obligatoires</span></div>
      {reservation.type === 'rdv' ? (
        <>
          <div className="admin-form-grid">
            <Field label="Nom du prospect *" htmlFor={`prospect-${reservation.id}`}><input id={`prospect-${reservation.id}`} required value={form.nom_prospect} onChange={update('nom_prospect')} className="admin-control" placeholder="Nom complet" /></Field>
            <Field label="Téléphone" htmlFor={`phone-${reservation.id}`}><input id={`phone-${reservation.id}`} type="tel" value={form.telephone_prospect} onChange={update('telephone_prospect')} className="admin-control" placeholder="06 00 00 00 00" /></Field>
          </div>
          <label className="attendance-toggle"><input type="checkbox" checked={form.present} onChange={update('present')} /><span className="toggle-copy"><strong>Le prospect était présent</strong><small>Indiquez sa présence avant de qualifier le rendez-vous.</small></span></label>
          {form.present && <div className="admin-form-grid">
            <Field label="Résultat *" htmlFor={`result-${reservation.id}`}><select id={`result-${reservation.id}`} value={form.resultat} onChange={update('resultat')} className="admin-control"><option value="inscrit">Inscrit</option><option value="a_relancer">À relancer</option><option value="refuse">Refusé</option></select></Field>
            <Field label="Produit ou pack" htmlFor={`product-${reservation.id}`}><input id={`product-${reservation.id}`} value={form.produit_pack} onChange={update('produit_pack')} className="admin-control" placeholder="Ex. Pack découverte" /></Field>
          </div>}
          <Field label="Date de relance" htmlFor={`followup-${reservation.id}`}><input id={`followup-${reservation.id}`} type="date" value={form.date_relance} onChange={update('date_relance')} className="admin-control" /></Field>
        </>
      ) : <Field label="Nombre de participants présents" htmlFor={`attendees-${reservation.id}`}><input id={`attendees-${reservation.id}`} type="number" min="0" value={form.nb_presents} onChange={update('nb_presents')} className="admin-control" placeholder="0" /></Field>}
      <Field label="Commentaire" htmlFor={`comment-${reservation.id}`}><textarea id={`comment-${reservation.id}`} value={form.commentaire} onChange={update('commentaire')} className="admin-control admin-textarea" placeholder="Ajoutez les informations utiles au suivi…" /></Field>
      {erreur && <p className="workspace-alert" role="alert">{erreur}</p>}
      <div className="result-form-actions"><button type="submit" disabled={enCours} className="workspace-primary">{enCours ? 'Enregistrement…' : 'Enregistrer le compte rendu'}</button></div>
    </form>
  );
}

const tabs = [
  { id: 'all', label: 'Tout' },
  { id: 'a_suivre', label: 'À suivre' },
  { id: 'terminees', label: 'Terminés' },
  { id: 'formations', label: 'Formations' },
];

export default function SuiviRdv() {
  const profile = useProfile({ adminOnly: true });
  const [liste, setListe] = useState([]);
  const [ouvert, setOuvert] = useState(null);
  const [filtre, setFiltre] = useState('all');
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [annulation, setAnnulation] = useState(null);
  const userId = profile?.id;

  const charger = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase.from('reservations')
      .select('*, profiles(nom), rdv_resultats(*)')
      .neq('statut', 'annulee').order('debut', { ascending: false });
    return { data: data || [], error };
  }, [userId]);

  useEffect(() => {
    let active = true;
    charger().then((result) => {
      if (!active || !result) return;
      if (result.error) setErreur('Impossible de charger le suivi des rendez-vous. Réessayez.');
      else setListe(result.data);
      setOuvert(null);
      setChargement(false);
    });
    return () => { active = false; };
  }, [charger]);

  const annuler = async (reservation) => {
    if (!window.confirm('Annuler cette réservation ?')) return;
    setAnnulation(reservation.id);
    const { error } = await supabase.from('reservations').update({ statut: 'annulee' }).eq('id', reservation.id);
    if (error) setErreur('Le rendez-vous n’a pas pu être annulé. Réessayez.');
    else {
      const result = await charger();
      if (result?.error) setErreur('Le rendez-vous est annulé, mais la liste n’a pas pu être actualisée.');
      else if (result) setListe(result.data);
      setOuvert(null);
    }
    setAnnulation(null);
  };

  const counts = useMemo(() => ({
    total: liste.length,
    a_suivre: liste.filter((item) => !unwrap(item.rdv_resultats)).length,
    terminees: liste.filter((item) => Boolean(unwrap(item.rdv_resultats))).length,
    formations: liste.filter((item) => item.type === 'formation').length,
  }), [liste]);
  const visibles = useMemo(() => liste.filter((item) => {
    const result = unwrap(item.rdv_resultats);
    const text = `${item.titre || ''} ${item.profiles?.nom || ''} ${result?.nom_prospect || ''} ${item.invites?.map((guest) => guest.nom).join(' ') || ''}`.toLocaleLowerCase('fr');
    const matchesText = text.includes(recherche.toLocaleLowerCase('fr'));
    const matchesFilter = filtre === 'all'
      || (filtre === 'a_suivre' && !result)
      || (filtre === 'terminees' && Boolean(result))
      || (filtre === 'formations' && item.type === 'formation');
    return matchesText && matchesFilter;
  }), [filtre, liste, recherche]);

  if (!profile) return <p className="page-loading">Chargement de votre espace…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="workspace-page workspace-page-wide">
        <section className="workspace-heading">
          <div><p className="workspace-eyebrow">PILOTAGE · ÉQUIPE</p><h1>Suivi des rendez-vous</h1><p className="workspace-description">Centralisez les comptes rendus, les présences et les prochaines relances.</p></div>
        </section>
        <section className="workspace-metrics" aria-label="Résumé du suivi">
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-indigo" aria-hidden="true">▤</span><div><span className="metric-label">Réservations suivies</span><strong>{counts.total}</strong></div></article>
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-amber" aria-hidden="true">◷</span><div><span className="metric-label">À traiter</span><strong>{counts.a_suivre}</strong></div></article>
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-teal" aria-hidden="true">✓</span><div><span className="metric-label">Comptes rendus</span><strong>{counts.terminees}</strong></div></article>
        </section>
        <section className="workspace-panel" aria-labelledby="followup-title">
          <div className="workspace-panel-heading"><div><p className="workspace-eyebrow">ACTIVITÉ DE L’ÉQUIPE</p><h2 id="followup-title">Rendez-vous et formations</h2></div><label className="workspace-search"><span className="search-icon" aria-hidden="true">⌕</span><span className="sr-only">Rechercher dans le suivi</span><input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Nom, prospect, titre…" /></label></div>
          <div className="workspace-filters" role="group" aria-label="Filtrer le suivi">
            {tabs.map((tab) => <button key={tab.id} type="button" className={`filter-chip${filtre === tab.id ? ' filter-chip-active' : ''}`} onClick={() => setFiltre(tab.id)} aria-pressed={filtre === tab.id}>{tab.label}<span>{counts[tab.id === 'all' ? 'total' : tab.id]}</span></button>)}
          </div>
          {erreur && <p className="workspace-alert" role="alert">{erreur}</p>}
          {chargement ? <p className="workspace-message">Chargement du suivi…</p> : visibles.length === 0 ? (
            <div className="workspace-empty"><span className="empty-symbol" aria-hidden="true">⌕</span><h3>{recherche || filtre !== 'all' ? 'Aucun résultat' : 'Aucune réservation à suivre'}</h3><p>Les rendez-vous et formations apparaîtront ici dès qu’ils seront planifiés.</p></div>
          ) : <div className="followup-list">{visibles.map((reservation) => {
            const result = unwrap(reservation.rdv_resultats);
            const isOpen = ouvert === reservation.id;
            return (
              <article key={reservation.id} className={`followup-card${isOpen ? ' followup-card-open' : ''}`}>
                <div className="followup-card-main">
                  <span className={`reservation-type-mark ${reservation.type === 'rdv' ? 'reservation-type-rdv' : 'reservation-type-formation'}`} aria-hidden="true">{reservation.type === 'rdv' ? 'R' : 'F'}</span>
                  <div className="followup-content">
                    <div className="reservation-title-line"><h3>{reservation.titre}</h3><span className={`status-pill ${result ? 'status-terminee' : 'status-confirmee'}`}>{result ? 'Compte rendu saisi' : 'À traiter'}</span></div>
                    <p className="reservation-meta"><span>{reservation.type === 'rdv' ? 'Rendez-vous' : 'Formation'}</span><span aria-hidden="true">·</span><span>{formatDate(reservation.debut)} · {formatTime(reservation.debut)}</span></p>
                    <p className="followup-owner">Organisé par <strong>{reservation.profiles?.nom || 'Membre'}</strong></p>
                    {reservation.invites?.length > 0 && <p className="reservation-guests">Invités : {reservation.invites.map((guest) => [guest.nom, guest.telephone, guest.email].filter(Boolean).join(' · ')).join(' ; ')}</p>}
                    {result && reservation.type === 'rdv' && <div className="followup-result"><span>{result.present ? resultLabels[result.resultat] || 'Résultat saisi' : 'Absent'}</span>{result.nom_prospect && <strong>{result.nom_prospect}</strong>}{result.produit_pack && <span>{result.produit_pack}</span>}</div>}
                    {result && reservation.type === 'formation' && <div className="followup-result"><strong>{result.nb_presents ?? '—'}</strong><span>participant{result.nb_presents === 1 ? '' : 's'} présent{result.nb_presents === 1 ? '' : 's'}</span></div>}
                    {result?.date_relance && <p className="followup-reminder">Relance prévue le {formatDate(result.date_relance)}</p>}
                  </div>
                  <div className="followup-actions"><button type="button" className="row-action" onClick={() => setOuvert(isOpen ? null : reservation.id)} aria-expanded={isOpen}>{isOpen ? 'Fermer' : result ? 'Modifier' : 'Saisir le résultat'}</button>{reservation.statut === 'confirmee' && <button type="button" className="row-action row-action-danger" disabled={annulation === reservation.id} onClick={() => annuler(reservation)}>{annulation === reservation.id ? 'Annulation…' : 'Annuler'}</button>}</div>
                </div>
                {isOpen && <ResultatForm key={`${reservation.id}-${result?.id || 'new'}`} reservation={reservation} existant={result} onSaved={charger} />}
              </article>
            );
          })}</div>}
          <div className="workspace-panel-footer">{visibles.length} élément{visibles.length !== 1 ? 's' : ''} affiché{visibles.length !== 1 ? 's' : ''}</div>
        </section>
      </main>
    </>
  );
}
