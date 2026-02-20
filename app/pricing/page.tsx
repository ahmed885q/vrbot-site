'use client'

import { useState, useEffect } from 'react'

type Language = 'ar' | 'en' | 'ru' | 'zh'

const text: Record<Language, {
  title: string; subtitle: string;
  free_title: string; free_price: string; free_f1: string; free_f2: string; free_f3: string; free_cta: string;
  pro_title: string; pro_price: string; pro_per: string; pro_f1: string; pro_f2: string; pro_f3: string; pro_f4: string; pro_f5: string; pro_cta: string;
  enterprise_title: string; enterprise_price: string; enterprise_f1: string; enterprise_f2: string; enterprise_f3: string; enterprise_cta: string;
  popular: string;
}> = {
  ar: {
    title: '💎 خطط الأسعار', subtitle: 'اختر الخطة المناسبة لك',
    free_title: 'مجاني', free_price: '$0', free_f1: '✓ مزرعة واحدة', free_f2: '✓ جمع موارد أساسي', free_f3: '✓ تجربة 7 أيام', free_cta: 'ابدأ مجاناً',
    pro_title: 'احترافي', pro_price: '$2', pro_per: '/ مزرعة / شهرياً', pro_f1: '✓ مزارع غير محدودة', pro_f2: '✓ جميع المهام الآلية', pro_f3: '✓ حماية متقدمة ضد الحظر', pro_f4: '✓ لوحة تحكم متقدمة', pro_f5: '✓ أولوية الدعم', pro_cta: 'اشترك الآن',
    enterprise_title: 'المؤسسات', enterprise_price: 'مخصص', enterprise_f1: '✓ دعم التحالفات', enterprise_f2: '✓ ذكاء اصطناعي متقدم', enterprise_f3: '✓ ميزات مخصصة', enterprise_cta: 'تواصل معنا',
    popular: '⭐ الأكثر طلباً',
  },
  en: {
    title: '💎 Pricing Plans', subtitle: 'Choose the right plan for you',
    free_title: 'Free', free_price: '$0', free_f1: '✓ 1 Farm', free_f2: '✓ Basic resource collection', free_f3: '✓ 7-day trial', free_cta: 'Start Free',
    pro_title: 'Pro', pro_price: '$2', pro_per: '/ farm / month', pro_f1: '✓ Unlimited farms', pro_f2: '✓ All automated tasks', pro_f3: '✓ Advanced ban protection', pro_f4: '✓ Advanced dashboard', pro_f5: '✓ Priority support', pro_cta: 'Subscribe Now',
    enterprise_title: 'Enterprise', enterprise_price: 'Custom', enterprise_f1: '✓ Alliance support', enterprise_f2: '✓ Advanced AI', enterprise_f3: '✓ Custom features', enterprise_cta: 'Contact Us',
    popular: '⭐ POPULAR',
  },
  ru: {
    title: '💎 Тарифные планы', subtitle: 'Выберите подходящий план',
    free_title: 'Бесплатный', free_price: '$0', free_f1: '✓ 1 ферма', free_f2: '✓ Базовый сбор ресурсов', free_f3: '✓ 7 дней пробного периода', free_cta: 'Начать бесплатно',
    pro_title: 'Про', pro_price: '$2', pro_per: '/ ферма / месяц', pro_f1: '✓ Безлимитные фермы', pro_f2: '✓ Все автоматические задачи', pro_f3: '✓ Продвинутая защита от бана', pro_f4: '✓ Продвинутая панель', pro_f5: '✓ Приоритетная поддержка', pro_cta: 'Подписаться',
    enterprise_title: 'Предприятие', enterprise_price: 'Индивидуально', enterprise_f1: '✓ Поддержка альянсов', enterprise_f2: '✓ Продвинутый ИИ', enterprise_f3: '✓ Индивидуальные функции', enterprise_cta: 'Связаться',
    popular: '⭐ ПОПУЛЯРНЫЙ',
  },
  zh: {
    title: '💎 价格方案', subtitle: '选择适合您的方案',
    free_title: '免费版', free_price: '$0', free_f1: '✓ 1个农场', free_f2: '✓ 基础资源收集', free_f3: '✓ 7天试用', free_cta: '免费开始',
    pro_title: '专业版', pro_price: '$2', pro_per: '/ 农场 / 月', pro_f1: '✓ 无限农场', pro_f2: '✓ 所有自动化任务', pro_f3: '✓ 高级防封保护', pro_f4: '✓ 高级仪表板', pro_f5: '✓ 优先支持', pro_cta: '立即订阅',
    enterprise_title: '企业版', enterprise_price: '定制', enterprise_f1: '✓ 联盟支持', enterprise_f2: '✓ 高级AI', enterprise_f3: '✓ 定制功能', enterprise_cta: '联系我们',
    popular: '⭐ 热门',
  },
}

export default function PricingPage() {
  const [lang, setLang] = useState<Language>('ar')

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language
    if (saved && text[saved]) setLang(saved)
  }, [])

  const t = text[lang]
  const isRtl = lang === 'ar'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: '#0f0e1a', minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>{t.title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '48px' }}>{t.subtitle}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Free */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '40px 32px', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>{t.free_title}</h3>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff', marginBottom: '24px' }}>{t.free_price}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: isRtl ? 'right' : 'left' }}>
              {[t.free_f1, t.free_f2, t.free_f3].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/signup" style={{
              display: 'block', background: 'rgba(255,255,255,0.1)', color: '#fff',
              padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
            }}>{t.free_cta}</a>
          </div>

          {/* Pro */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))',
            border: '2px solid rgba(124,58,237,0.4)', borderRadius: '20px', padding: '40px 32px',
            textAlign: 'center', position: 'relative', boxShadow: '0 8px 40px rgba(124,58,237,0.15)',
          }}>
            <div style={{
              position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              padding: '4px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700,
            }}>{t.popular}</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px' }}>{t.pro_title}</h3>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{t.pro_price}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>{t.pro_per}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: isRtl ? 'right' : 'left' }}>
              {[t.pro_f1, t.pro_f2, t.pro_f3, t.pro_f4, t.pro_f5].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/billing" style={{
              display: 'block', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700,
              boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
            }}>{t.pro_cta}</a>
          </div>

          {/* Enterprise */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '40px 32px', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>{t.enterprise_title}</h3>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', marginBottom: '24px' }}>{t.enterprise_price}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: isRtl ? 'right' : 'left' }}>
              {[t.enterprise_f1, t.enterprise_f2, t.enterprise_f3].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="mailto:support@vrbot.me" style={{
              display: 'block', background: 'rgba(255,255,255,0.1)', color: '#fff',
              padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
            }}>{t.enterprise_cta}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
