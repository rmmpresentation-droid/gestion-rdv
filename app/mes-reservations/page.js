'use client';
import Link from 'next/link';
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
const statusNames = {
  confirmee: 'Confirmée',
  terminee: 'Terminée',
  annulee: 'Annulée',
};
const filters = [
  { id: 'all', label: 'Toutes' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'past', label: 'Passées' },
  { id: 'cancelled', label: 'Annulées' },
];

export default function MesReservations() {
  const profile = useProfile();
  const [liste, setListe] = useState([]);
  const [now, setNow] = useState(null);
  const [filtre, setFiltre] = useState('all');
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [annulation, setAnnulation] = useState(null);

  const userId = profile?.id;
  const charger = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase.from('reservations').select('*')
      .eq('user_id', userId).order('debut', { ascending: false });
    return { data: data || [], error };
  }, [userId]);

  useEffect(() => {
    let active = true;
    charger().then((result) => {
      if (!active || !result) return;
      if (result.error) setErreur('Impossible de charger vos réservations. Réessayez dans un instant.');
      else setListe(result.data);
      setChargement(false);
    });
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [charger]);

  const annuler = async (reservation) => {
    if (!window.confirm('Annuler cette réservation ?')) return;
    setAnnulation(reservation.id);
    const { error } = await supabase.from('reservations')
      .update({ statut: 'annulee' }).eq('id', reservation.id);
    if (error) setErreur('La réservation n’a pas pu être annulée. Réessayez.');
    else {
      const result = await charger();
      if (result?.error) setErreur('La réservation est annulée, mais la liste n’a pas pu être actualisée.');
      else if (result) setListe(result.data);
    }
    setAnnulation(null);
  };

  const currentTime = now ?? 0;
  const prochaines = liste.filter((item) => item.statut === 'confirmee' && new Date(item.debut).getTime() >= currentTime).length;
  const terminees = liste.filter((item) => item.statut === 'terminee').length;
  const annulees = liste.filter((item) => item.statut === 'annulee').length;
  const visibles = useMemo(() => liste.filter((item) => {
    const matchRecherche = `${item.titre || ''} ${item.type || ''}`.toLocaleLowerCase('fr').includes(recherche.toLocaleLowerCase('fr'));
    const debut = new Date(item.debut).getTime();
    const matchFiltre = filtre === 'all'
      || (filtre === 'upcoming' && item.statut === 'confirmee' && debut >= currentTime)
      || (filtre === 'past' && (item.statut === 'terminee' || debut < currentTime))
      || (filtre === 'cancelled' && item.statut === 'annulee');
    return matchRecherche && matchFiltre;
  }), [filtre, liste, currentTime, recherche]);

  if (!profile) return <p className="page-loading">Chargement de votre espace…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="workspace-page">
        <section className="workspace-heading">
          <div>
            <p className="workspace-eyebrow">VOTRE ESPACE · RÉSERVATIONS</p>
            <h1>Mes réservations</h1>
            <p className="workspace-description">Retrouvez et gérez tous vos créneaux en un seul endroit.</p>
          </div>
          <Link href="/" className="workspace-primary"><span aria-hidden="true">＋</span> Réserver un créneau</Link>
        </section>

        <section className="workspace-metrics" aria-label="Résumé de vos réservations">
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-indigo" aria-hidden="true">↗</span><div><span className="metric-label">À venir</span><strong>{prochaines}</strong></div></article>
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-teal" aria-hidden="true">✓</span><div><span className="metric-label">Terminées</span><strong>{terminees}</strong></div></article>
          <article className="workspace-metric"><span className="metric-symbol metric-symbol-neutral" aria-hidden="true">—</span><div><span className="metric-label">Annulées</span><strong>{annulees}</strong></div></article>
        </section>

        <section className="workspace-panel" aria-labelledby="reservations-title">
          <div className="workspace-panel-heading">
            <div><p className="workspace-eyebrow">VUE D’ENSEMBLE</p><h2 id="reservations-title">Votre activité</h2></div>
            <label className="workspace-search"><span className="search-icon" aria-hidden="true">⌕</span><span className="sr-only">Rechercher une réservation</span><input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher…" /></label>
          </div>
          <div className="workspace-filters" role="group" aria-label="Filtrer les réservations">
            {filters.map((item) => <button key={item.id} type="button" className={`filter-chip${filtre === item.id ? ' filter-chip-active' : ''}`} onClick={() => setFiltre(item.id)} aria-pressed={filtre === item.id}>{item.label}{item.id === 'all' ? <span>{liste.length}</span> : null}</button>)}
          </div>

          {erreur && <p className="workspace-alert" role="alert">{erreur}</p>}
          {chargement ? <p className="workspace-message">Chargement des réservations…</p> : visibles.length === 0 ? (
            <div className="workspace-empty"><span className="empty-symbol" aria-hidden="true">▤</span><h3>{recherche || filtre !== 'all' ? 'Aucun résultat' : 'Pas encore de réservation'}</h3><p>{recherche || filtre !== 'all' ? 'Essayez une autre recherche ou un autre filtre.' : 'Vos prochains rendez-vous et formations apparaîtront ici.'}</p>{!recherche && filtre === 'all' && <Link href="/" className="workspace-primary">Voir le calendrier</Link>}</div>
          ) : (
            <div className="reservation-list">
              {visibles.map((reservation) => {
                const future = reservation.statut === 'confirmee' && new Date(reservation.debut).getTime() >= currentTime;
                const typeLabel = reservation.type === 'rdv' ? 'Rendez-vous' : 'Formation';
                return (
                  <article key={reservation.id} className="reservation-row">
                    <div className={`reservation-type-mark ${reservation.type === 'rdv' ? 'reservation-type-rdv' : 'reservation-type-formation'}`} aria-hidden="true">{reservation.type === 'rdv' ? 'R' : 'F'}</div>
                    <div className="reservation-main">
                      <div className="reservation-title-line"><h3>{reservation.titre}</h3><span className={`status-pill status-${reservation.statut}`}>{statusNames[reservation.statut] || reservation.statut}</span></div>
                      <p className="reservation-meta"><span>{typeLabel}</span><span aria-hidden="true">·</span><span>{formatDate(reservation.debut)}</span></p>
                      <p className="reservation-time">{formatTime(reservation.debut)} – {formatTime(reservation.fin)}</p>
                      {reservation.invites?.length > 0 && <p className="reservation-guests">{reservation.invites.length} invité{reservation.invites.length > 1 ? 's' : ''} · {reservation.invites.map((guest) => guest.nom).filter(Boolean).join(', ')}</p>}
                    </div>
                    {future && <button type="button" disabled={annulation === reservation.id} onClick={() => annuler(reservation)} className="row-action row-action-danger">{annulation === reservation.id ? 'Annulation…' : 'Annuler'}</button>}
                  </article>
                );
              })}
            </div>
          )}
          <div className="workspace-panel-footer">{visibles.length} réservation{visibles.length !== 1 ? 's' : ''} affichée{visibles.length !== 1 ? 's' : ''}</div>
        </section>
      </main>
    </>
  );
}
