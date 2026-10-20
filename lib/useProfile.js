'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from './supabase';

export function useProfile({ adminOnly = false } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!supabase) {
      if (pathname !== '/') router.replace('/login');
      return;
    }

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
  }, [adminOnly, pathname, router]);

  return profile;
}
