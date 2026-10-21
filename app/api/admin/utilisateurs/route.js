import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  if (!url || !serviceKey) {
    return Response.json({ error: 'Serveur non configuré : SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Vérifier que l'appelant est un admin actif
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Non authentifié.' }, { status: 401 });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Session invalide.' }, { status: 401 });
  const { data: me } = await admin.from('profiles').select('role, actif').eq('id', user.id).single();
  if (!me || me.role !== 'admin' || !me.actif) {
    return Response.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  // 2. Valider les données
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password || '';
  const nom = body?.nom?.trim();
  const telephone = body?.telephone?.trim() || null;
  const role = body?.role === 'admin' ? 'admin' : 'leader';
  if (!email || !nom) return Response.json({ error: 'Nom et e-mail obligatoires.' }, { status: 400 });
  if (password.length < 8) return Response.json({ error: 'Mot de passe : 8 caractères minimum.' }, { status: 400 });

  // 3. Créer le compte
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom },
  });
  if (error) {
    const existe = /already|registered|exists/i.test(error.message);
    return Response.json(
      { error: existe ? 'Un compte existe déjà avec cet e-mail.' : error.message },
      { status: existe ? 409 : 400 },
    );
  }

  // 4. Créer ou mettre à jour le profil (au cas où un trigger l'a déjà créé)
  const { error: profErr } = await admin.from('profiles').upsert(
    { id: data.user.id, nom, telephone, role, actif: true },
    { onConflict: 'id' },
  );
  if (profErr) {
    await admin.auth.admin.deleteUser(data.user.id); // annule le compte si le profil échoue
    return Response.json({ error: profErr.message }, { status: 500 });
  }

  return Response.json({ ok: true, id: data.user.id });
}