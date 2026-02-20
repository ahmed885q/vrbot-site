'use client';

import { useI18n, languageNames, languageFlags, Language } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  const languages: Language[] = ['ar', 'en', 'ru', 'zh'];

  return (
    <div className="lang-switcher">
      {languages.map((l) => (
        <button
          key={l}
          className={`lang-btn ${lang === l ? 'active' : ''}`}
          onClick={() => setLang(l)}
          title={languageNames[l]}
        >
          {languageFlags[l]} {languageNames[l]}
        </button>
      ))}
    </div>
  );
}
