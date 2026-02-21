'use client';

import { useState, useEffect } from 'react';

type Language = 'ar' | 'en' | 'ru' | 'zh';

const langConfig: Record<Language, { name: string; flag: string; dir: 'rtl' | 'ltr' }> = {
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
  ru: { name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  zh: { name: '中文', flag: '🇨🇳', dir: 'ltr' },
};

const navText: Record<Language, { farms: string; billing: string; download: string; dashboard: string }> = {
  ar: { farms: '🌾 المزارع', billing: '💳 الدفع', download: '⬇️ تحميل', dashboard: '🎮 الداشبورد' },
  en: { farms: '🌾 Farms', billing: '💳 Billing', download: '⬇️ Download', dashboard: '🎮 Dashboard' },
  ru: { farms: '🌾 Фермы', billing: '💳 Оплата', download: '⬇️ Скачать', dashboard: '🎮 Панель' },
  zh: { farms: '🌾 农场', billing: '💳 付款', download: '⬇️ 下载', dashboard: '🎮 面板' },
};

export default function SiteHeader() {
  const [lang, setLang] = useState<Language>('ar');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && langConfig[saved]) {
      setLang(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = langConfig[saved].dir;
    }
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('vrbot_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = langConfig[newLang].dir;
    setMenuOpen(false);
  };

  const t = navText[lang];

  return (
    <header style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      {/* Logo */}
      <a href="/" style={{
        color: '#ffffff',
        textDecoration: 'none',
        fontSize: '22px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🤖 VRBOT
      </a>

      {/* Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <a href="/dashboard" style={navLinkStyle}>{t.farms}</a>
        <a href="/billing" style={navLinkStyle}>{t.billing}</a>
        <a href="/download" style={navLinkStyle}>{t.download}</a>
        <a href="/dashboard" style={navLinkStyle}>{t.dashboard}</a>

        {/* Language Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {langConfig[lang].flag} {langConfig[lang].name} ▾
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              background: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              minWidth: '150px',
              zIndex: 9999,
            }}>
              {(Object.keys(langConfig) as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => changeLang(l)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: lang === l ? '#f0f7ff' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: lang === l ? 700 : 400,
                    color: '#1a1a2e',
                    textAlign: 'left',
                  }}
                >
                  {langConfig[l].flag} {langConfig[l].name}
                  {lang === l && ' ✓'}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.85)',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: '6px',
  transition: 'all 0.2s',
};
