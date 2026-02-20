'use client'

import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, {
  title: string; subtitle: string;
  free_title: string; free_price: string; free_f1: string; free_f2: string; free_f3: string; free_cta: string;
  pro_title: string; pro_price: string; pro_per: string;
  pro_f1: string; pro_f2: string; pro_f3: string; pro_f4: string; pro_f5: string; pro_cta: string;
  popular: string;
}> = {
  ar: {
    title: '\uD83D\uDC8E \u062e\u0637\u0637 \u0627\u0644\u0623\u0633\u0639\u0627\u0631', subtitle: '\u0627\u062e\u062a\u0631 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0643',
    free_title: '\u0645\u062c\u0627\u0646\u064a', free_price: '$0', free_f1: '\u2713 \u0645\u0632\u0631\u0639\u0629 \u0648\u0627\u062d\u062f\u0629', free_f2: '\u2713 \u062c\u0645\u0639 \u0645\u0648\u0627\u0631\u062f \u0623\u0633\u0627\u0633\u064a', free_f3: '\u2713 \u062a\u062c\u0631\u0628\u0629 7 \u0623\u064a\u0627\u0645', free_cta: '\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b',
    pro_title: '\u0627\u062d\u062a\u0631\u0627\u0641\u064a', pro_price: '$2', pro_per: '/ \u0645\u0632\u0631\u0639\u0629 / \u0634\u0647\u0631\u064a\u0627\u064b',
    pro_f1: '\u2713 \u0645\u0632\u0627\u0631\u0639 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629', pro_f2: '\u2713 \u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0622\u0644\u064a\u0629', pro_f3: '\u2713 \u062d\u0645\u0627\u064a\u0629 \u0645\u062a\u0642\u062f\u0645\u0629 \u0636\u062f \u0627\u0644\u062d\u0638\u0631',
    pro_f4: '\u2713 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0645\u062a\u0642\u062f\u0645\u0629', pro_f5: '\u2713 \u0623\u0648\u0644\u0648\u064a\u0629 \u0627\u0644\u062f\u0639\u0645', pro_cta: '\u0627\u0634\u062a\u0631\u0643 \u0627\u0644\u0622\u0646',
    popular: '\u2B50 \u0627\u0644\u0623\u0643\u062b\u0631 \u0637\u0644\u0628\u0627\u064b',
  },
  en: {
    title: '\uD83D\uDC8E Pricing Plans', subtitle: 'Choose the right plan for you',
    free_title: 'Free', free_price: '$0', free_f1: '\u2713 1 Farm', free_f2: '\u2713 Basic resource collection', free_f3: '\u2713 7-day trial', free_cta: 'Start Free',
    pro_title: 'Pro', pro_price: '$2', pro_per: '/ farm / month',
    pro_f1: '\u2713 Unlimited farms', pro_f2: '\u2713 All automated tasks', pro_f3: '\u2713 Advanced ban protection',
    pro_f4: '\u2713 Advanced dashboard', pro_f5: '\u2713 Priority support', pro_cta: 'Subscribe Now',
    popular: '\u2B50 POPULAR',
  },
  ru: {
    title: '\uD83D\uDC8E \u0422\u0430\u0440\u0438\u0444\u043d\u044b\u0435 \u043f\u043b\u0430\u043d\u044b', subtitle: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043f\u043b\u0430\u043d',
    free_title: '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439', free_price: '$0', free_f1: '\u2713 1 \u0444\u0435\u0440\u043c\u0430', free_f2: '\u2713 \u0411\u0430\u0437\u043e\u0432\u044b\u0439 \u0441\u0431\u043e\u0440', free_f3: '\u2713 7 \u0434\u043d\u0435\u0439 \u043f\u0440\u043e\u0431\u043d\u043e\u0433\u043e', free_cta: '\u041d\u0430\u0447\u0430\u0442\u044c',
    pro_title: '\u041f\u0440\u043e', pro_price: '$2', pro_per: '/ \u0444\u0435\u0440\u043c\u0430 / \u043c\u0435\u0441\u044f\u0446',
    pro_f1: '\u2713 \u0411\u0435\u0437\u043b\u0438\u043c\u0438\u0442\u043d\u044b\u0435 \u0444\u0435\u0440\u043c\u044b', pro_f2: '\u2713 \u0412\u0441\u0435 \u0437\u0430\u0434\u0430\u0447\u0438', pro_f3: '\u2713 \u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u0430\u044f \u0437\u0430\u0449\u0438\u0442\u0430',
    pro_f4: '\u2713 \u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u0430\u044f \u043f\u0430\u043d\u0435\u043b\u044c', pro_f5: '\u2713 \u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430', pro_cta: '\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f',
    popular: '\u2B50 \u041f\u041e\u041f\u0423\u041b\u042f\u0420\u041d\u042b\u0419',
  },
  zh: {
    title: '\uD83D\uDC8E \u4ef7\u683c\u65b9\u6848', subtitle: '\u9009\u62e9\u9002\u5408\u60a8\u7684\u65b9\u6848',
    free_title: '\u514d\u8d39\u7248', free_price: '$0', free_f1: '\u2713 1\u4e2a\u519c\u573a', free_f2: '\u2713 \u57fa\u7840\u8d44\u6e90\u6536\u96c6', free_f3: '\u2713 7\u5929\u8bd5\u7528', free_cta: '\u514d\u8d39\u5f00\u59cb',
    pro_title: '\u4e13\u4e1a\u7248', pro_price: '$2', pro_per: '/ \u519c\u573a / \u6708',
    pro_f1: '\u2713 \u65e0\u9650\u519c\u573a', pro_f2: '\u2713 \u6240\u6709\u81ea\u52a8\u5316\u4efb\u52a1', pro_f3: '\u2713 \u9ad8\u7ea7\u9632\u5c01\u4fdd\u62a4',
    pro_f4: '\u2713 \u9ad8\u7ea7\u4eea\u8868\u677f', pro_f5: '\u2713 \u4f18\u5148\u652f\u6301', pro_cta: '\u7acb\u5373\u8ba2\u9605',
    popular: '\u2B50 \u70ed\u95e8',
  },
}

export default function PricingPage() {
  const { lang, mounted, isRtl } = useLanguage()
  if (!mounted) return null
  const s = t[lang]

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: '#0f0e1a', minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>{s.title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '48px' }}>{s.subtitle}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Free */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px 32px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>{s.free_title}</h3>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff', marginBottom: '24px' }}>{s.free_price}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: isRtl ? 'right' : 'left' }}>
              {[s.free_f1, s.free_f2, s.free_f3].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/signup" style={{ display: 'block', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)' }}>
              {s.free_cta}
            </a>
          </div>

          {/* Pro */}
          <div style={{ background: 'linear-gradient(160deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))', border: '2px solid rgba(124,58,237,0.4)', borderRadius: '20px', padding: '40px 32px', textAlign: 'center', position: 'relative', boxShadow: '0 8px 40px rgba(124,58,237,0.15)' }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', padding: '4px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              {s.popular}
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px' }}>{s.pro_title}</h3>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{s.pro_price}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>{s.pro_per}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: isRtl ? 'right' : 'left' }}>
              {[s.pro_f1, s.pro_f2, s.pro_f3, s.pro_f4, s.pro_f5].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/billing" style={{ display: 'block', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
              {s.pro_cta}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
