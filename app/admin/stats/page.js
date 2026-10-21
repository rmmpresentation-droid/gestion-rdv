'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const unwrap = (value) => (Array.isArray(value) ? value[0] : value) || null;
const percentage = (value, total) => total ? Math.round((value / total) * 100) : 0;
const metricDisplay = (value) => `${value} %`;

function MetricCard({ label, value, detail, tone, percentageValue }) {
  return (
    <article className={`analytics-metric analytics-${tone}`}>
      <div className="analytics-metric-top"><span className="analytics-indicator" aria-hidden="true" /><span>{label}</span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
      {typeof percentageValue === 'number' && <div className="metric-track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentageValue}><span style={{ width: `${percentageValue}%` }} /></div>}
    </article>
  );
}

export default function Stats() {
  const profile = useProfile({ adminOnly: true });
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.from('reservations')
        .select('*, profiles(nom), rdv_resultats(*)').neq('statut', 'annulee');
      if (!active) return;
      if (error) {
        setErreur('Les statistiques ne sont pas disponibles pour le moment. Réessayez.');
        return;
      }
      const rows = (data || []).map((reservation) => ({ ...reservation, result: unwrap(reservation.rdv_resultats) }));
      const appointments = rows.filter((reservation) => reservation.type === 'rdv' && reservation.result);
      const presentCount = appointments.filter((reservation) => reservation.result.present).length;
      const registeredCount = appointments.filter((reservation) => reservation.result.present && reservation.result.resultat === 'inscrit').length;
      const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const occupiedHours = rows
        .filter((reservation) => new Date(reservation.debut).getTime() >= since && new Date(reservation.debut).getTime() <= Date.now())
        .reduce((total, reservation) => total + (new Date(reservation.fin) - new Date(reservation.debut)) / 3600000, 0);
      const memberMap = {};
      rows.forEach((reservation) => {
        const name = reservation.profiles?.nom || 'Membre';
        memberMap[name] ||= { reservations: 0, formations: 0, participants: 0, appointments: 0, registrations: 0 };
        memberMap[name].reservations += 1;
        if (reservation.type === 'formation') {
          memberMap[name].formations += 1;
          memberMap[name].participants += reservation.result?.nb_presents || 0;
        } else {
          memberMap[name].appointments += 1;
          if (reservation.result?.present && reservation.result?.resultat === 'inscrit') memberMap[name].registrations += 1;
        }
      });
      const members = Object.entries(memberMap).sort(([, first], [, second]) => second.reservations - first.reservations);
      setStats({
        total: rows.length,
        trackedAppointments: appointments.length,
        presentCount,
        registeredCount,
        attendanceRate: percentage(presentCount, appointments.length),
        conversionRate: percentage(registeredCount, presentCount),
        occupancyRate: percentage(occupiedHours, 30 * 11),
        memberMap: members,
        formationCount: rows.filter((reservation) => reservation.type === 'formation').length,
        appointmentCount: rows.filter((reservation) => reservation.type === 'rdv').length,
      });
    })();
    return () => { active = false; };
  }, [profile?.id]);

  const maxReservations = useMemo(() => Math.max(1, ...(stats?.memberMap.map(([, member]) => member.reservations) || [1])), [stats]);

  if (!profile) return <p className="page-loading">Chargement de votre espace…</p>;

  return (
    <>
      <Nav profile={profile} />
      <main className="workspace-page workspace-page-wide">
        <section className="workspace-heading">
          <div><p className="workspace-eyebrow">PILOTAGE · INDICATEURS</p><h1>Statistiques</h1><p className="workspace-description">Un aperçu de l’activité, de la présence et des résultats de votre réseau.</p></div>
          <span className="period-label"><span className="period-dot" aria-hidden="true" /> Activité des 30 derniers jours</span>
        </section>
        {erreur ? <p className="workspace-alert" role="alert">{erreur}</p> : !stats ? <p className="workspace-message">Calcul des indicateurs…</p> : <>
          <section className="analytics-grid" aria-label="Indicateurs clés">
            <MetricCard label="Réservations" value={stats.total} detail={`${stats.appointmentCount} rendez-vous · ${stats.formationCount} formations`} tone="indigo" />
            <MetricCard label="Présence aux rendez-vous" value={metricDisplay(stats.attendanceRate)} detail={`${stats.presentCount} présents sur ${stats.trackedAppointments} comptes rendus`} tone="teal" percentageValue={stats.attendanceRate} />
            <MetricCard label="Conversion" value={metricDisplay(stats.conversionRate)} detail={`${stats.registeredCount} inscription${stats.registeredCount !== 1 ? 's' : ''} confirmée${stats.registeredCount !== 1 ? 's' : ''}`} tone="amber" percentageValue={stats.conversionRate} />
            <MetricCard label="Occupation estimée" value={metricDisplay(stats.occupancyRate)} detail="Sur une base de 11 h par jour" tone="violet" percentageValue={stats.occupancyRate} />
          </section>
          <div className="analytics-layout">
            <section className="workspace-panel analytics-members" aria-labelledby="member-stats-title">
              <div className="workspace-panel-heading"><div><p className="workspace-eyebrow">CONTRIBUTION</p><h2 id="member-stats-title">Activité par membre</h2></div><span className="subtle-count">{stats.memberMap.length} membre{stats.memberMap.length !== 1 ? 's' : ''}</span></div>
              {stats.memberMap.length === 0 ? <div className="workspace-empty workspace-empty-compact"><h3>Pas encore de données</h3><p>Les indicateurs apparaîtront après les premières réservations.</p></div> : <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th scope="col">Membre</th><th scope="col">Réservations</th><th scope="col">Formations</th><th scope="col">Participants</th><th scope="col">RDV</th><th scope="col">Inscrits</th></tr></thead><tbody>{stats.memberMap.map(([name, member]) => <tr key={name}><th scope="row"><span className="member-cell"><span className="member-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>{name}</span></th><td><span className="table-count">{member.reservations}</span></td><td>{member.formations}</td><td>{member.participants}</td><td>{member.appointments}</td><td><span className="registration-count">{member.registrations}</span></td></tr>)}</tbody></table></div>}
            </section>
            <aside className="workspace-panel analytics-breakdown" aria-labelledby="breakdown-title">
              <div className="workspace-panel-heading"><div><p className="workspace-eyebrow">RÉPARTITION</p><h2 id="breakdown-title">Activité du réseau</h2></div></div>
              <div className="breakdown-list">{stats.memberMap.length === 0 ? <p className="workspace-message">Aucune activité à afficher.</p> : stats.memberMap.slice(0, 5).map(([name, member], index) => <div className="breakdown-item" key={name}><div className="breakdown-label"><span>{name}</span><strong>{member.reservations}</strong></div><div className={`breakdown-track breakdown-tone-${index % 4}`}><span style={{ width: `${Math.max(4, member.reservations / maxReservations * 100)}%` }} /></div><p>{member.formations} formation{member.formations !== 1 ? 's' : ''} · {member.appointments} RDV</p></div>)}</div>
              <div className="analytics-note"><span className="note-mark" aria-hidden="true">i</span><p>L’occupation est calculée sur les créneaux réservés au cours des 30 derniers jours.</p></div>
            </aside>
          </div>
        </>}
      </main>
    </>
  );
}
