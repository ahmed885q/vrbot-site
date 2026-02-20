'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Language, langConfig, nav } from '@/lib/i18n/translations';

export default function SiteHeader() {
  const { lang, setLang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = nav[lang];

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 shadow-md"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <a href="/" className="text-white no-underline text-xl font-bold flex items-center gap-2">
        🤖 VRBOT
      </a>

      <nav className="flex items-center gap-4">
        <a href="/farms" className="text-white/85 no-underline text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-white/10 transition">{t.farms}</a>
        <a href="/billing" className="text-white/85 no-underline text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-white/10 transition">{t.billing}</a>
        <a href="/download" className="text-white/85 no-underline text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-white/10 transition">{t.download}</a>
        <a href="/viking-rise" className="text-white/85 no-underline text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-white/10 transition">{t.dashboard}</a>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-sm font-semibold cursor-pointer border border-white/30 hover:bg-white/25 transition"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            {langConfig[lang].flag} {langConfig[lang].name} ▾
          </button>

          {menuOpen && (
            <div className="absolute top-11 right-0 bg-white rounded-lg shadow-xl overflow-hidden z-50" style={{ minWidth: '150px' }}>
              {(Object.keys(langConfig) as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 border-none cursor-pointer text-sm text-gray-900 hover:bg-gray-50 text-left"
                  style={{
                    background: lang === l ? '#f0f7ff' : 'transparent',
                    fontWeight: lang === l ? 700 : 400,
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
