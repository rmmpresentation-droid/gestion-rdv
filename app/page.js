'use client';
import { useCallback, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const COULEURS = { formation: '#6475e8', rdv: '#17a58b' };
const pad = (n) => String(n).padStart(2, '0');
const versInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dateLocale = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const heureLocale = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const cleJour = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function Indicateur({ label, valeur, detail, accent }) {
  return (
    <article className="overview-card">
      <div className="overview-card-top">
        <span className={`overview-dot ${accent}`} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="overview-value">{valeur}</p>
      <p className="overview-detail">{detail}</p>
    </article>
  );
}

export default function Accueil() {
  const profile = useProfile();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('creneaux').select('*');
    return (data || []).map((c) => ({
      id: c.id,
      title: c.titre_public,
      start: c.debut,
      end: c.fin,
      backgroundColor: COULEURS[c.type],
      borderColor: c.est_a_moi ? '#25324b' : COULEURS[c.type],
      extendedProps: { type: c.type },
    }));
  }, []);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    charger().then((nextEvents) => { if (active) setEvents(nextEvents); });
    return () => { active = false; };
  }, [profile, charger]);

  if (!isSupabaseConfigured) {
    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="setup-title">
          <div className="login-brand" aria-label="RMM Network">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span className="brand-name">RMM <span>Network</span></span>
          </div>
          <p className="section-kicker">ESPACE DE RÉSERVATION</p>
          <h1 className="login-heading" id="setup-title">Configuration requise</h1>
          <p className="login-description">
            Le calendrier a besoin d’une connexion Supabase pour charger les réservations. Aucune intégration n’est configurée pour ce projet.
          </p>
        </section>
      </main>
    );
  }

  if (!profile) return <p className="p-6 text-sm text-slate-500">Chargement de votre espace…</p>;

  const ouvrir = (debut, fin) => {
    setErreur('');
setForm({
  type: profile.role === 'admin' ? 'rdv' : 'formation',
  titre: '', debut: versInput(debut), fin: versInput(fin), nb: '', notes: '', invites: [],
});
  };

  const nouvelle = () => {
    const debut = new Date();
    debut.setHours(debut.getHours() + 1, 0, 0, 0);
    ouvrir(debut, new Date(debut.getTime() + 60 * 60 * 1000));
  };

  const maj = (k) => (e) => setForm((current) => ({ ...current, [k]: e.target.value }));
  
  const ajouterInvite = () =>
  setForm((c) => (c.invites.length >= 20 ? c : { ...c, invites: [...c.invites, { nom: '', telephone: '', email: '' }] }));
const majInvite = (i, k) => (e) =>
  setForm((c) => ({ ...c, invites: c.invites.map((inv, j) => (j === i ? { ...inv, [k]: e.target.value } : inv)) }));
const retirerInvite = (i) =>
  setForm((c) => ({ ...c, invites: c.invites.filter((_, j) => j !== i) }));

  const enregistrer = async (e) => {
    e.preventDefault();
    setErreur('');
    const debut = new Date(form.debut);
    const fin = new Date(form.fin);
    if (fin <= debut) return setErreur('La fin doit être après le début.');
    if (debut < new Date()) return setErreur('Impossible de réserver dans le passé.');
    const invites = form.invites
  .map((i) => ({ nom: i.nom.trim(), telephone: i.telephone.trim(), email: i.email.trim() }))
  .filter((i) => i.nom || i.telephone || i.email);
if (invites.some((i) => !i.nom)) return setErreur('Chaque invité doit avoir un nom.');

    setEnCours(true);
const { error } = await supabase.from('reservations').insert({
  user_id: profile.id,
  type: form.type,
  titre: form.titre,
  debut: debut.toISOString(),
  fin: fin.toISOString(),
  nb_participants: form.nb ? Number(form.nb) : null,
  notes: form.notes || null,
  invites,
});

    if (error) {
      setErreur(error.message.includes('pas_de_chevauchement')
        ? 'Ce créneau est déjà occupé.' : error.message);
      setEnCours(false);
    } else {
      setForm(null);
      setEnCours(false);
      charger().then(setEvents);
    }
  };

  const maintenant = new Date();
  const aujourdHui = cleJour(maintenant);
  const aVenir = events.filter((event) => new Date(event.start) >= maintenant);
  const aujourdHuiCount = events.filter((event) => cleJour(event.start) === aujourdHui).length;
  const prochaines = [...aVenir].sort((a, b) => new Date(a.start) - new Date(b.start));
  const prochain = prochaines[0];
  const prenom = profile.nom?.trim().split(/\s+/)[0] || 'à vous';

  return (
    <>
      <Nav profile={profile} />
      <main className="calendar-page">
        <section className="welcome-panel" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> VOTRE ESPACE DE RÉSERVATION</p>
            <h1 id="welcome-title">Bonjour {prenom}<span className="welcome-comma">,</span></h1>
            <p className="welcome-description">Organisez vos rendez-vous et trouvez le bon créneau en un coup d’œil.</p>
          </div>
          <div className="welcome-date" aria-label={`Aujourd'hui, ${dateLocale.format(maintenant)}`}>
            <span className="date-kicker">AUJOURD’HUI</span>
            <span className="date-main">{dateLocale.format(maintenant)}</span>
            <span className="date-year">{maintenant.getFullYear()}</span>
          </div>
          <div className="welcome-orb" aria-hidden="true" />
        </section>

        <section className="overview-grid" aria-label="Résumé de votre calendrier">
          <Indicateur label="Aujourd’hui" valeur={aujourdHuiCount} detail={aujourdHuiCount === 1 ? 'créneau planifié' : 'créneaux planifiés'} accent="accent-indigo" />
          <Indicateur label="À venir" valeur={aVenir.length} detail="créneaux à venir" accent="accent-teal" />
          <Indicateur
            label="Prochain rendez-vous"
            valeur={prochain ? heureLocale.format(new Date(prochain.start)) : '—'}
            detail={prochain ? prochain.title : 'Aucun rendez-vous prévu'}
            accent="accent-amber"
          />
        </section>

        <section className="calendar-section" aria-labelledby="calendar-heading">
          <div className="calendar-section-heading">
            <div>
              <p className="section-kicker">PLANIFICATION</p>
              <h2 id="calendar-heading">Votre calendrier</h2>
            </div>
            <button type="button" onClick={nouvelle} className="primary-action">
              <span aria-hidden="true">＋</span> Réserver un créneau
            </button>
          </div>

          <div className="calendar-legend" aria-label="Légende du calendrier">
            <span><span className="legend-dot legend-formation" /> Formation</span>
            <span><span className="legend-dot legend-rdv" /> Rendez-vous</span>
            <span className="calendar-hint">Sélectionnez une plage horaire pour réserver</span>
          </div>

          <div className="calendar-shell">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale={frLocale}
              firstDay={1}
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,dayGridMonth' }}
              buttonText={{ today: "Aujourd’hui", week: 'Semaine', day: 'Jour', month: 'Mois' }}
              slotMinTime="09:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              height="auto"
              selectable
              selectMirror
              selectAllow={(selection) => selection.start >= new Date()}
              select={(info) => ouvrir(info.start, info.end)}
              events={events}
              nowIndicator
              dayMaxEvents
            />
          </div>
        </section>
      </main>

      {form && (
        <div className="booking-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}>
          <form onSubmit={enregistrer} className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <div className="booking-heading">
              <div>
                <p className="section-kicker">NOUVELLE RÉSERVATION</p>
                <h2 id="booking-title">Choisir un créneau</h2>
              </div>
              <button type="button" onClick={() => setForm(null)} className="dialog-close" aria-label="Fermer">×</button>
            </div>

            <label className="booking-label" htmlFor="booking-type">Type de réservation</label>
            <select id="booking-type" value={form.type} onChange={maj('type')} className="booking-control">
              <option value="formation">Formation</option>
              {profile.role === 'admin' && <option value="rdv">Rendez-vous prospect</option>}
            </select>

            <label className="booking-label" htmlFor="booking-title-input">Titre</label>
            <input id="booking-title-input" required placeholder="Ex. Formation commerciale" value={form.titre} onChange={maj('titre')} className="booking-control" />
            {form.type === 'rdv' && (
              <p className="booking-help">Ne mettez pas le nom du prospect dans le titre : il se saisit dans le suivi.</p>
            )}

            <div className="booking-time-grid">
              <label className="booking-label" htmlFor="booking-start">Début
                <input id="booking-start" type="datetime-local" required value={form.debut} onChange={maj('debut')} className="booking-control" />
              </label>
              <label className="booking-label" htmlFor="booking-end">Fin
                <input id="booking-end" type="datetime-local" required value={form.fin} onChange={maj('fin')} className="booking-control" />
              </label>
            </div>

            <label className="booking-label" htmlFor="booking-participants">Participants prévus <span className="optional-label">(facultatif)</span></label>
            <input id="booking-participants" type="number" min="1" placeholder="Nombre de participants" value={form.nb} onChange={maj('nb')} className="booking-control" />
            <div className="guest-block">
  <div className="guest-block-head">
    <span className="booking-label guest-title">Invités <span className="optional-label">(facultatif)</span></span>
    <button type="button" onClick={ajouterInvite} className="guest-add">＋ Ajouter un invité</button>
  </div>
  {form.invites.map((inv, i) => (
    <div key={i} className="guest-row">
      <input required placeholder="Nom de l’invité" value={inv.nom} onChange={majInvite(i, 'nom')} className="booking-control" aria-label={`Nom de l’invité ${i + 1}`} />
      <input type="tel" placeholder="Téléphone" value={inv.telephone} onChange={majInvite(i, 'telephone')} className="booking-control" aria-label={`Téléphone de l’invité ${i + 1}`} />
      <input type="email" placeholder="E-mail" value={inv.email} onChange={majInvite(i, 'email')} className="booking-control" aria-label={`E-mail de l’invité ${i + 1}`} />
      <button type="button" onClick={() => retirerInvite(i)} className="guest-remove" aria-label={`Retirer l’invité ${i + 1}`}>×</button>
    </div>
  ))}
</div>
            <label className="booking-label" htmlFor="booking-notes">Notes <span className="optional-label">(facultatif)</span></label>
            <textarea id="booking-notes" placeholder="Informations complémentaires…" value={form.notes} onChange={maj('notes')} className="booking-control booking-textarea" />

            {erreur && <p className="booking-error" role="alert">{erreur}</p>}

            <div className="booking-actions">
              <button type="button" onClick={() => setForm(null)} className="secondary-action">Annuler</button>
              <button type="submit" disabled={enCours} className="primary-action">
                {enCours ? 'Réservation…' : 'Confirmer la réservation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
