'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

export function useProfile({ adminOnly = false } = {}) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!data || !data.actif) {
        await supabase.auth.signOut();
        return router.replace('/login');
      }
      if (adminOnly && data.role !== 'admin') return router.replace('/');
      setProfile(data);
    })();
  }, [adminOnly, router]);

  return profile;
}