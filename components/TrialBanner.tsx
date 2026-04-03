'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type TrialState = 'loading' | 'active' | 'expiring' | 'expired' | 'paid' | 'admin' | 'none';

export default function TrialBanner() {
  const [state, setState] = useState<TrialState>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [trialEnd, setTrialEnd] = useState('');

  useEffect(() => {
    checkTrial();
  }, []);

  async function checkTrial() {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState('none'); return; }

      // Check admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.is_admin) { setState('admin'); return; }

      // Check trial farms
      const { data: farms } = await supabase
        .from('cloud_farms')
        .select('is_trial, trial_ends_at, status')
        .eq('user_id', user.id)
        .neq('status', 'deleted');

      if (!farms?.length) { setState('none'); return; }

      const trialFarm = farms.find((f: any) => f.is_trial && f.trial_ends_at);
      if (!trialFarm) { setState('paid'); return; }

      const endsAt = new Date(trialFarm.trial_ends_at);
      const now = new Date();
      const msLeft = endsAt.getTime() - now.getTime();
      const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

      setTrialEnd(endsAt.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric' }));
      setDaysLeft(days);

      if (msLeft <= 0) {
        setState('expired');
      } else if (days <= 3) {
        setState('expiring');
      } else {
        setState('active');
      }
    } catch {
      setState('none');
    }
  }

  if (state === 'loading' || state === 'none' || state === 'paid' || state === 'admin') return null;

  if (state === 'expired') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
        fontWeight: 600,
      }}>
        <span>انتهت تجربتك المجانية — اشترك الآن أو ستُوقف مزرعتك</span>
        <a href="/billing" style={{
          background: '#fff',
          color: '#dc2626',
          padding: '6px 16px',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 13,
          whiteSpace: 'nowrap',
        }}>
          اشترك الآن
        </a>
      </div>
    );
  }

  if (state === 'expiring') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: '#0d1117',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        fontWeight: 600,
      }}>
        <span>تجربتك المجانية تنتهي خلال {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} ({trialEnd})</span>
        <a href="/billing" style={{
          background: '#0d1117',
          color: '#f59e0b',
          padding: '5px 14px',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}>
          اشترك الآن
        </a>
      </div>
    );
  }

  // state === 'active' — subtle info banner
  return (
    <div style={{
      background: '#1a1a2e',
      borderBottom: '1px solid #2a2a3a',
      color: '#8b949e',
      padding: '8px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 12,
    }}>
      <span>تجربة مجانية — {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} متبقية</span>
      <a href="/billing" style={{ color: '#58a6ff', textDecoration: 'none', fontSize: 12 }}>
        ترقية
      </a>
    </div>
  );
}
