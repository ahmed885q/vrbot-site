'use client';

import { useState, useEffect } from 'react';

type Language = 'ar' | 'en' | 'ru' | 'zh';

const content: Record<Language, {
  hero_title: string;
  hero_subtitle: string;
  hero_desc: string;
  cta_early: string;
  cta_pricing: string;
  features_title: string;
  f1_title: string;
  f1_desc: string;
  f2_title: string;
  f2_desc: string;
  f3_title: string;
  f3_desc: string;
  f4_title: string;
  f4_desc: string;
  stats_farms: string;
  stats_resources: string;
  stats_uptime: string;
  stats_languages: string;
  how_title: string;
  step1_title: string;
  step1_desc: string;
  step2_title: string;
  step2_desc: string;
  step3_title: string;
  step3_desc: string;
  pricing_title: string;
  pricing_free_title: string;
  pricing_free_price: string;
  pricing_free_f1: string;
  pricing_free_f2: string;
  pricing_free_f3: string;
  pricing_free_cta: string;
  pricing_pro_title: string;
  pricing_pro_price: string;
  pricing_pro_f1: string;
  pricing_pro_f2: string;
  pricing_pro_f3: string;
  pricing_pro_f4: string;
  pricing_pro_cta: string;
  footer_text: string;
}> = {
  ar: {
    hero_title: 'VRBOT',
    hero_subtitle: 'بوت أتمتة ذكي لـ Viking Rise',
    hero_desc: 'أدِر مزارعك، اجمع الموارد، وطوّر حسابك — تلقائياً على مدار الساعة. بدون تدخل يدوي.',
    cta_early: '🚀 ابدأ مجاناً',
    cta_pricing: '💰 عرض الأسعار',
    features_title: '⚡ لماذا VRBOT؟',
    f1_title: '🌾 إدارة المزارع تلقائياً',
    f1_desc: 'جمع الموارد، الترقية، والحصاد بشكل مستمر بدون أي تدخل.',
    f2_title: '🛡️ حماية ذكية',
    f2_desc: 'نظام محاكاة سلوك بشري متقدم لحماية حسابك من الحظر.',
    f3_title: '📊 لوحة تحكم مباشرة',
    f3_desc: 'تابع حالة مزارعك ومواردك في الوقت الحقيقي من أي مكان.',
    f4_title: '🌍 متعدد اللغات',
    f4_desc: 'واجهة تدعم العربية، الإنجليزية، الروسية، والصينية.',
    stats_farms: 'مزرعة نشطة',
    stats_resources: 'موارد مُجمّعة',
    stats_uptime: 'وقت التشغيل',
    stats_languages: 'لغات مدعومة',
    how_title: '🎯 كيف يعمل؟',
    step1_title: '1. سجّل حسابك',
    step1_desc: 'أنشئ حساب مجاني وأضف مزرعتك الأولى خلال دقائق.',
    step2_title: '2. فعّل البوت',
    step2_desc: 'اختر إعداداتك وشغّل البوت بضغطة واحدة.',
    step3_title: '3. استمتع بالنتائج',
    step3_desc: 'تابع تقدمك من لوحة التحكم بينما البوت يعمل لأجلك.',
    pricing_title: '💎 خطط الأسعار',
    pricing_free_title: 'مجاني',
    pricing_free_price: '$0',
    pricing_free_f1: '✓ مزرعة واحدة',
    pricing_free_f2: '✓ جمع موارد أساسي',
    pricing_free_f3: '✓ تجربة 7 أيام',
    pricing_free_cta: 'ابدأ مجاناً',
    pricing_pro_title: 'احترافي',
    pricing_pro_price: '$9.99',
    pricing_pro_f1: '✓ مزارع غير محدودة',
    pricing_pro_f2: '✓ حماية متقدمة',
    pricing_pro_f3: '✓ أولوية الدعم',
    pricing_pro_f4: '✓ لوحة تحكم متقدمة',
    pricing_pro_cta: 'اشترك الآن',
    footer_text: '© 2026 VRBOT. جميع الحقوق محفوظة.',
  },
  en: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Smart Automation Bot for Viking Rise',
    hero_desc: 'Manage your farms, collect resources, and grow your account — automatically 24/7. No manual effort needed.',
    cta_early: '🚀 Start Free',
    cta_pricing: '💰 View Pricing',
    features_title: '⚡ Why VRBOT?',
    f1_title: '🌾 Auto Farm Management',
    f1_desc: 'Collect resources, upgrade, and harvest continuously without any intervention.',
    f2_title: '🛡️ Smart Protection',
    f2_desc: 'Advanced human behavior simulation to keep your account safe from bans.',
    f3_title: '📊 Live Dashboard',
    f3_desc: 'Monitor your farms and resources in real-time from anywhere.',
    f4_title: '🌍 Multi-Language',
    f4_desc: 'Interface supports Arabic, English, Russian, and Chinese.',
    stats_farms: 'Active Farms',
    stats_resources: 'Resources Collected',
    stats_uptime: 'Uptime',
    stats_languages: 'Languages',
    how_title: '🎯 How It Works',
    step1_title: '1. Create Account',
    step1_desc: 'Sign up free and add your first farm in minutes.',
    step2_title: '2. Activate Bot',
    step2_desc: 'Choose your settings and start the bot with one click.',
    step3_title: '3. Enjoy Results',
    step3_desc: 'Track progress from your dashboard while the bot works for you.',
    pricing_title: '💎 Pricing Plans',
    pricing_free_title: 'Free',
    pricing_free_price: '$0',
    pricing_free_f1: '✓ 1 Farm',
    pricing_free_f2: '✓ Basic resource collection',
    pricing_free_f3: '✓ 7-day trial',
    pricing_free_cta: 'Start Free',
    pricing_pro_title: 'Pro',
    pricing_pro_price: '$9.99',
    pricing_pro_f1: '✓ Unlimited farms',
    pricing_pro_f2: '✓ Advanced protection',
    pricing_pro_f3: '✓ Priority support',
    pricing_pro_f4: '✓ Advanced dashboard',
    pricing_pro_cta: 'Subscribe Now',
    footer_text: '© 2026 VRBOT. All rights reserved.',
  },
  ru: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Умный бот для автоматизации Viking Rise',
    hero_desc: 'Управляйте фермами, собирайте ресурсы и развивайте аккаунт — автоматически 24/7. Без ручного труда.',
    cta_early: '🚀 Начать бесплатно',
    cta_pricing: '💰 Тарифы',
    features_title: '⚡ Почему VRBOT?',
    f1_title: '🌾 Авто-управление фермами',
    f1_desc: 'Сбор ресурсов, улучшения и урожай непрерывно без вмешательства.',
    f2_title: '🛡️ Умная защита',
    f2_desc: 'Продвинутая имитация поведения для защиты аккаунта от бана.',
    f3_title: '📊 Панель в реальном времени',
    f3_desc: 'Отслеживайте свои фермы и ресурсы из любого места.',
    f4_title: '🌍 Многоязычность',
    f4_desc: 'Интерфейс поддерживает арабский, английский, русский и китайский.',
    stats_farms: 'Активных ферм',
    stats_resources: 'Собрано ресурсов',
    stats_uptime: 'Время работы',
    stats_languages: 'Языков',
    how_title: '🎯 Как это работает',
    step1_title: '1. Создайте аккаунт',
    step1_desc: 'Зарегистрируйтесь бесплатно и добавьте первую ферму за минуты.',
    step2_title: '2. Активируйте бота',
    step2_desc: 'Выберите настройки и запустите бота одним нажатием.',
    step3_title: '3. Наслаждайтесь результатами',
    step3_desc: 'Следите за прогрессом из панели управления, пока бот работает за вас.',
    pricing_title: '💎 Тарифные планы',
    pricing_free_title: 'Бесплатный',
    pricing_free_price: '$0',
    pricing_free_f1: '✓ 1 ферма',
    pricing_free_f2: '✓ Базовый сбор ресурсов',
    pricing_free_f3: '✓ 7 дней пробного периода',
    pricing_free_cta: 'Начать бесплатно',
    pricing_pro_title: 'Про',
    pricing_pro_price: '$9.99',
    pricing_pro_f1: '✓ Безлимитные фермы',
    pricing_pro_f2: '✓ Продвинутая защита',
    pricing_pro_f3: '✓ Приоритетная поддержка',
    pricing_pro_f4: '✓ Продвинутая панель',
    pricing_pro_cta: 'Подписаться',
    footer_text: '© 2026 VRBOT. Все права защищены.',
  },
  zh: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Viking Rise 智能自动化机器人',
    hero_desc: '管理农场、收集资源、升级账号——全天候自动运行，无需手动操作。',
    cta_early: '🚀 免费开始',
    cta_pricing: '💰 查看价格',
    features_title: '⚡ 为什么选择 VRBOT？',
    f1_title: '🌾 自动农场管理',
    f1_desc: '持续收集资源、升级和收获，无需任何干预。',
    f2_title: '🛡️ 智能保护',
    f2_desc: '高级人类行为模拟，保护您的账号免受封禁。',
    f3_title: '📊 实时仪表板',
    f3_desc: '随时随地实时监控您的农场和资源。',
    f4_title: '🌍 多语言支持',
    f4_desc: '界面支持阿拉伯语、英语、俄语和中文。',
    stats_farms: '活跃农场',
    stats_resources: '已收集资源',
    stats_uptime: '运行时间',
    stats_languages: '种语言',
    how_title: '🎯 如何运作',
    step1_title: '1. 创建账号',
    step1_desc: '免费注册，几分钟内添加您的第一个农场。',
    step2_title: '2. 激活机器人',
    step2_desc: '选择设置，一键启动机器人。',
    step3_title: '3. 享受成果',
    step3_desc: '在仪表板上跟踪进度，机器人为您工作。',
    pricing_title: '💎 价格方案',
    pricing_free_title: '免费版',
    pricing_free_price: '$0',
    pricing_free_f1: '✓ 1个农场',
    pricing_free_f2: '✓ 基础资源收集',
    pricing_free_f3: '✓ 7天试用',
    pricing_free_cta: '免费开始',
    pricing_pro_title: '专业版',
    pricing_pro_price: '$9.99',
    pricing_pro_f1: '✓ 无限农场',
    pricing_pro_f2: '✓ 高级保护',
    pricing_pro_f3: '✓ 优先支持',
    pricing_pro_f4: '✓ 高级仪表板',
    pricing_pro_cta: '立即订阅',
    footer_text: '© 2026 VRBOT. 保留所有权利。',
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && content[saved]) {
      setLang(saved);
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const t = content[lang];
  const isRtl = lang === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: lang === 'ar' ? "'Noto Sans Arabic', 'Segoe UI', sans-serif" : lang === 'zh' ? "'Noto Sans SC', 'PingFang SC', sans-serif" : lang === 'ru' ? "'Noto Sans', 'Segoe UI', sans-serif" : "'Noto Sans', 'Segoe UI', sans-serif" }}>
      
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background particles */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 48, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(0, 212, 255, 0.08) 0%, transparent 50%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '40px 24px',
          maxWidth: '800px',
        }}>
          {/* Logo with glow */}
          <div style={{
            fontSize: '80px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 0 30px rgba(120, 119, 198, 0.6))',
            animation: 'float 3s ease-in-out infinite',
          }}>
            🤖
          </div>
          
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '6px',
            marginBottom: '12px',
            textShadow: '0 0 40px rgba(120, 119, 198, 0.4)',
          }}>
            {t.hero_title}
          </h1>
          
          <p style={{
            fontSize: 'clamp(18px, 3vw, 26px)',
            color: '#c4b5fd',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            {t.hero_subtitle}
          </p>
          
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.8,
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}>
            {t.hero_desc}
          </p>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <a href="/early-access" style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#ffffff',
              padding: '16px 36px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '17px',
              fontWeight: 700,
              boxShadow: '0 4px 24px rgba(124, 58, 237, 0.4)',
              transition: 'all 0.3s',
              display: 'inline-block',
            }}>
              {t.cta_early}
            </a>
            <a href="/pricing" style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              padding: '16px 36px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '17px',
              fontWeight: 700,
              border: '2px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
              display: 'inline-block',
            }}>
              {t.cta_pricing}
            </a>
          </div>
        </div>
        
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </section>

      {/* Stats Bar */}
      <section style={{
        background: 'linear-gradient(90deg, #1e1b4b, #312e81)',
        padding: '32px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: '48px',
        flexWrap: 'wrap',
      }}>
        {[
          { num: '500+', label: t.stats_farms },
          { num: '68M+', label: t.stats_resources },
          { num: '99.9%', label: t.stats_uptime },
          { num: '4', label: t.stats_languages },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#a78bfa',
              marginBottom: '4px',
            }}>{stat.num}</div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{
        background: '#0f0e1a',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '56px',
        }}>
          {t.features_title}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
          {[
            { title: t.f1_title, desc: t.f1_desc, gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))' },
            { title: t.f2_title, desc: t.f2_desc, gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))' },
            { title: t.f3_title, desc: t.f3_desc, gradient: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.03))' },
            { title: t.f4_title, desc: t.f4_desc, gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))' },
          ].map((f, i) => (
            <div key={i} style={{
              background: f.gradient,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '32px',
              transition: 'transform 0.3s, box-shadow 0.3s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '12px',
              }}>{f.title}</h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.7,
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        background: 'linear-gradient(180deg, #0f0e1a, #1a1833)',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '56px',
        }}>
          {t.how_title}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '32px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {[
            { title: t.step1_title, desc: t.step1_desc, icon: '📝' },
            { title: t.step2_title, desc: t.step2_desc, icon: '⚡' },
            { title: t.step3_title, desc: t.step3_desc, icon: '🏆' },
          ].map((step, i) => (
            <div key={i} style={{
              textAlign: 'center',
              padding: '32px 24px',
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 20px',
                boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3)',
              }}>
                {step.icon}
              </div>
              <h3 style={{
                fontSize: '19px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '10px',
              }}>{step.title}</h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.7,
              }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        background: '#0f0e1a',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '56px',
        }}>
          {t.pricing_title}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '28px',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          {/* Free Plan */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '40px 32px',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
              {t.pricing_free_title}
            </h3>
            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '24px',
            }}>
              {t.pricing_free_price}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '32px',
              textAlign: isRtl ? 'right' : 'left',
            }}>
              {[t.pricing_free_f1, t.pricing_free_f2, t.pricing_free_f3].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/signup" style={{
              display: 'block',
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              {t.pricing_free_cta}
            </a>
          </div>
          
          {/* Pro Plan */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))',
            border: '2px solid rgba(124,58,237,0.4)',
            borderRadius: '20px',
            padding: '40px 32px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 8px 40px rgba(124,58,237,0.15)',
          }}>
            <div style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff',
              padding: '4px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
            }}>⭐ POPULAR</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px' }}>
              {t.pricing_pro_title}
            </h3>
            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '4px',
            }}>
              {t.pricing_pro_price}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>
              {lang === 'ar' ? '/ شهرياً' : lang === 'ru' ? '/ месяц' : lang === 'zh' ? '/ 月' : '/ month'}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '32px',
              textAlign: isRtl ? 'right' : 'left',
            }}>
              {[t.pricing_pro_f1, t.pricing_pro_f2, t.pricing_pro_f3, t.pricing_pro_f4].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/billing" style={{
              display: 'block',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
            }}>
              {t.pricing_pro_cta}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#080714',
        padding: '32px 24px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '14px',
        }}>
          {t.footer_text}
        </p>
      </footer>
    </div>
  );
}
