'use client';

import { useState, useEffect } from 'react';

type Language = 'ar' | 'en' | 'ru' | 'zh';
type Theme = 'dark' | 'light';

const langConfig: Record<Language, { name: string; flag: string; dir: 'rtl' | 'ltr' }> = {
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
  ru: { name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  zh: { name: '中文', flag: '🇨🇳', dir: 'ltr' },
};

const navText: Record<Language, { farms: string; billing: string; download: string; dashboard: string; live: string; notifications: string; chat: string; cloud: string }> = {
  ar: { farms: '🌾 المزارع', billing: '💳 الدفع', download: '⬇️ تحميل', dashboard: '🎮 الداشبورد', live: '📺 Live', notifications: '🔔 إشعارات', chat: '💬 الشات', cloud: '☁️ Cloud' },
  en: { farms: '🌾 Farms', billing: '💳 Billing', download: '⬇️ Download', dashboard: '🎮 Dashboard', live: '📺 Live', notifications: '🔔 Notifications', chat: '💬 Chat', cloud: '☁️ Cloud' },
  ru: { farms: '🌾 Фермы', billing: '💳 Оплата', download: '⬇️ Скачать', dashboard: '🎮 Панель', live: '📺 Live', notifications: '🔔 Уведомления', chat: '💬 Чат', cloud: '☁️ Cloud' },
  zh: { farms: '🌾 农场', billing: '💳 付款', download: '⬇️ 下载', dashboard: '🎮 面板', live: '📺 Live', notifications: '🔔 通知', chat: '💬 聊天', cloud: '☁️ Cloud' },
};

export default function SiteHeader() {
  const [lang, setLang] = useState<Language>('ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && langConfig[saved]) {
      setLang(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = langConfig[saved].dir;
    }
    const savedTheme = localStorage.getItem('vrbot_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('vrbot_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = langConfig[newLang].dir;
    setMenuOpen(false);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('vrbot_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const t = navText[lang];
  const isDark = theme === 'dark';

  return (
    <header style={{
      background: isDark
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: isDark ? 'none' : '1px solid #dee2e6',
    }}>
      <a href="/" style={{
        color: isDark ? '#ffffff' : '#1a1a2e',
        textDecoration: 'none',
        fontSize: '22px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🤖 VRBOT
      </a>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/farms"     style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.farms}</a>
        <a href="/billing"   style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.billing}</a>
        <a href="/download"  style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.download}</a>
        <a href="/dashboard" style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.dashboard}</a>
        <a href="/dashboard/live" style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.live}</a>
        <a href="/dashboard/notifications" style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.notifications}</a>

          <a href="https://cloud.vrbot.me" target="_blank" rel="noopener noreferrer" style={{ ...navLinkBase, color: isDark ? 'rgba(255,255,255,0.85)' : '#495057' }}>{t.cloud}</a>

        {/* Chat Link */}
        <a href="/dashboard/chat" style={{
          ...navLinkBase,
          color: '#f59e0b',
          background: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
        }}>{t.chat}</a>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} title={isDark ? 'Light Mode' : 'Dark Mode'} style={{
          background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)',
          borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
          fontSize: '18px', display: 'flex', alignItems: 'center', transition: 'all 0.3s',
        }}>
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Language Switcher */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
            border: isDark ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.15)',
            borderRadius: '8px', padding: '6px 14px',
            color: isDark ? '#ffffff' : '#1a1a2e',
            cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {langConfig[lang].flag} {langConfig[lang].name} ▼
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: '42px', right: 0,
              background: isDark ? '#1a1a2e' : '#ffffff',
              borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              overflow: 'hidden', minWidth: '150px', zIndex: 9999,
              border: isDark ? '1px solid #2a2a3a' : '1px solid #dee2e6',
            }}>
              {(Object.keys(langConfig) as Language[]).map((l) => (
                <button key={l} onClick={() => changeLang(l)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '10px 16px', border: 'none',
                  background: lang === l ? (isDark ? '#2a2a3a' : '#f0f7ff') : 'transparent',
                  cursor: 'pointer', fontSize: '14px',
                  fontWeight: lang === l ? 700 : 400,
                  color: isDark ? '#e0e0e0' : '#1a1a2e', textAlign: 'left',
                }}>
                  {langConfig[l].flag} {langConfig[l].name}
                  {lang === l && ' ✔'}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

const navLinkBase: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: '6px',
  transition: 'all 0.2s',
};
