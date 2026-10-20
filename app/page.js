'use client';
import { useCallback, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import Nav from '@/components/Nav';

const COULEURS = { formation: '#2563eb', rdv: '#16a34a' };
const pad = (n) => String(n).padStart(2, '0');
const versInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function Accueil() {
  const profile = useProfile();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    const { data } = await supabase.from('creneaux').select('*');
    setEvents((data || []).map((c) => ({
      id: c.id,
      title: c.titre_public,
      start: c.debut,
      end: c.fin,
      backgroundColor: COULEURS[c.type],
      borderColor: c.est_a_moi ? '#000' : COULEURS[c.type],
    })));
  }, []);

  useEffect(() => { if (profile) charger(); }, [profile, charger]);

  if (!profile) return <p className="p-6">Chargement…</p>;

  const ouvrir = (debut, fin) => {
    setErreur('');
    setForm({
      type: profile.role === 'admin' ? 'rdv' : 'formation',
      titre: '', debut: versInput(debut), fin: versInput(fin), nb: '', notes: '',
    });
  };

  const nouvelle = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    ouvrir(d, new Date(d.getTime() + 60 * 60 * 1000));
  };

  const maj = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const enregistrer = async (e) => {
    e.preventDefault();
    setErreur('');
    const debut = new Date(form.debut);
    const fin = new Date(form.fin);
    if (fin <= debut) return setErreur('La fin doit être après le début');
    if (debut < new Date()) return setErreur('Impossible de réserver dans le passé');

    const { error } = await supabase.from('reservations').insert({
      user_id: profile.id,
      type: form.type,
      titre: form.titre,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      nb_participants: form.nb ? Number(form.nb) : null,
      notes: form.notes || null,
    });

    if (error) {
      setErreur(error.message.includes('pas_de_chevauchement')
        ? 'Ce créneau est déjà occupé.' : error.message);
    } else {
      setForm(null);
      charger();
    }
  };

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto max-w-6xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm">
            <span className="mr-3"><b className="text-blue-600">■</b> Formation</span>
            <span><b className="text-green-600">■</b> Rendez-vous</span>
          </p>
          <button onClick={nouvelle} className="rounded bg-slate-900 px-4 py-2 text-white">
            + Réserver
          </button>
        </div>

        <div className="rounded bg-white p-2 shadow">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={frLocale}
            firstDay={1}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,dayGridMonth' }}
            slotMinTime="09:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            height="auto"
            selectable
            selectMirror
            selectAllow={(s) => s.start >= new Date()}
            select={(info) => ouvrir(info.start, info.end)}
            events={events}
          />
        </div>
      </main>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={enregistrer} className="w-full max-w-md space-y-3 rounded bg-white p-5">
            <h2 className="text-lg font-bold">Nouvelle réservation</h2>

            <select value={form.type} onChange={maj('type')} className="w-full rounded border p-2">
              <option value="formation">Formation</option>
              {profile.role === 'admin' && <option value="rdv">Rendez-vous prospect</option>}
            </select>

            <input required placeholder="Titre" value={form.titre} onChange={maj('titre')}
              className="w-full rounded border p-2" />
            {form.type === 'rdv' && (
              <p className="text-xs text-slate-500">Ne mettez pas le nom du prospect dans le titre : il se saisit dans le suivi.</p>
            )}

            <label className="block text-sm">Début
              <input type="datetime-local" required value={form.debut} onChange={maj('debut')}
                className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="block text-sm">Fin
              <input type="datetime-local" required value={form.fin} onChange={maj('fin')}
                className="mt-1 w-full rounded border p-2" />
            </label>

            <input type="number" min="1" placeholder="Participants prévus" value={form.nb}
              onChange={maj('nb')} className="w-full rounded border p-2" />
            <textarea placeholder="Notes" value={form.notes} onChange={maj('notes')}
              className="w-full rounded border p-2" />

            {erreur && <p className="text-sm text-red-600">{erreur}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded border px-4 py-2">Annuler</button>
              <button className="rounded bg-slate-900 px-4 py-2 text-white">Réserver</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}