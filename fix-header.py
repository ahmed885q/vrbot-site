content = '''\'use client\';

import { useState, useEffect } from \'react\';

type Language = \'ar\' | \'en\' | \'ru\' | \'zh\';
type Theme = \'dark\' | \'light\';

const langConfig: Record<Language, { name: string; flag: string; dir: \'rtl\' | \'ltr\' }> = {
  ar: { name: \'\u0627\u0644\u0639\u0631\u0628\u064a\u0629\', flag: \'\U0001F1F8\U0001F1E6\', dir: \'rtl\' },
  en: { name: \'English\', flag: \'\U0001F1EC\U0001F1E7\', dir: \'ltr\' },
  ru: { name: \'\u0420\u0443\u0441\u0441\u043a\u0438\u0439\', flag: \'\U0001F1F7\U0001F1FA\', dir: \'ltr\' },
  zh: { name: \'\u4e2d\u6587\', flag: \'\U0001F1E8\U0001F1F3\', dir: \'ltr\' },
};

const navText: Record<Language, { farms: string; billing: string; download: string; dashboard: string; chat: string }> = {
  ar: { farms: \'\U0001F33E \u0627\u0644\u0645\u0632\u0627\u0631\u0639\', billing: \'\U0001F4B3 \u0627\u0644\u062f\u0641\u0639\', download: \'\u2b07\ufe0f \u062a\u062d\u0645\u064a\u0644\', dashboard: \'\U0001F3AE \u0627\u0644\u062f\u0627\u0634\u0628\u0648\u0631\u062f\', chat: \'\U0001F4AC \u0627\u0644\u0634\u0627\u062a\' },
  en: { farms: \'\U0001F33E Farms\', billing: \'\U0001F4B3 Billing\', download: \'\u2b07\ufe0f Download\', dashboard: \'\U0001F3AE Dashboard\', chat: \'\U0001F4AC Chat\' },
  ru: { farms: \'\U0001F33E \u0424\u0435\u0440\u043c\u044b\', billing: \'\U0001F4B3 \u041e\u043f\u043b\u0430\u0442\u0430\', download: \'\u2b07\ufe0f \u0421\u043a\u0430\u0447\u0430\u0442\u044c\', dashboard: \'\U0001F3AE \u041f\u0430\u043d\u0435\u043b\u044c\', chat: \'\U0001F4AC \u0427\u0430\u0442\' },
  zh: { farms: \'\U0001F33E \u519c\u573a\', billing: \'\U0001F4B3 \u4ed8\u6b3e\', download: \'\u2b07\ufe0f \u4e0b\u8f7d\', dashboard: \'\U0001F3AE \u9762\u677f\', chat: \'\U0001F4AC \u804a\u5929\' },
};

export default function SiteHeader() {
  const [lang, setLang] = useState<Language>(\'ar\');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(\'dark\');

  useEffect(() => {
    const saved = localStorage.getItem(\'vrbot_lang\') as Language;
    if (saved && langConfig[saved]) {
      setLang(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = langConfig[saved].dir;
    }
    const savedTheme = localStorage.getItem(\'vrbot_theme\') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute(\'data-theme\', savedTheme);
    } else {
      document.documentElement.setAttribute(\'data-theme\', \'dark\');
    }
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem(\'vrbot_lang\', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = langConfig[newLang].dir;
    setMenuOpen(false);
  };

  const toggleTheme = () => {
    const next = theme === \'dark\' ? \'light\' : \'dark\';
    setTheme(next);
    localStorage.setItem(\'vrbot_theme\', next);
    document.documentElement.setAttribute(\'data-theme\', next);
  };

  const t = navText[lang];
  const isDark = theme === \'dark\';

  return (
    <header style={{
      background: isDark
        ? \'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)\'
        : \'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)\',
      padding: \'12px 24px\',
      display: \'flex\',
      justifyContent: \'space-between\',
      alignItems: \'center\',
      boxShadow: isDark ? \'0 2px 8px rgba(0,0,0,0.15)\' : \'0 2px 8px rgba(0,0,0,0.08)\',
      position: \'sticky\',
      top: 0,
      zIndex: 1000,
      borderBottom: isDark ? \'none\' : \'1px solid #dee2e6\',
    }}>
      <a href="/" style={{
        color: isDark ? \'#ffffff\' : \'#1a1a2e\',
        textDecoration: \'none\',
        fontSize: \'22px\',
        fontWeight: 700,
        display: \'flex\',
        alignItems: \'center\',
        gap: \'8px\',
      }}>
        \U0001F916 VRBOT
      </a>

      <nav style={{ display: \'flex\', alignItems: \'center\', gap: \'16px\' }}>
        <a href="/farms"     style={{ ...navLinkBase, color: isDark ? \'rgba(255,255,255,0.85)\' : \'#495057\' }}>{t.farms}</a>
        <a href="/billing"   style={{ ...navLinkBase, color: isDark ? \'rgba(255,255,255,0.85)\' : \'#495057\' }}>{t.billing}</a>
        <a href="/download"  style={{ ...navLinkBase, color: isDark ? \'rgba(255,255,255,0.85)\' : \'#495057\' }}>{t.download}</a>
        <a href="/dashboard" style={{ ...navLinkBase, color: isDark ? \'rgba(255,255,255,0.85)\' : \'#495057\' }}>{t.dashboard}</a>

        {/* Chat Link */}
        <a href="/dashboard/chat" style={{
          ...navLinkBase,
          color: \'#f59e0b\',
          background: isDark ? \'rgba(245,158,11,0.12)\' : \'rgba(245,158,11,0.08)\',
          border: \'1px solid rgba(245,158,11,0.3)\',
        }}>{t.chat}</a>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} title={isDark ? \'Light Mode\' : \'Dark Mode\'} style={{
          background: isDark ? \'rgba(255,255,255,0.12)\' : \'rgba(0,0,0,0.08)\',
          border: isDark ? \'1px solid rgba(255,255,255,0.2)\' : \'1px solid rgba(0,0,0,0.15)\',
          borderRadius: \'8px\', padding: \'6px 10px\', cursor: \'pointer\',
          fontSize: \'18px\', display: \'flex\', alignItems: \'center\', transition: \'all 0.3s\',
        }}>
          {isDark ? \'\u2600\ufe0f\' : \'\U0001F319\'}
        </button>

        {/* Language Switcher */}
        <div style={{ position: \'relative\' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: isDark ? \'rgba(255,255,255,0.15)\' : \'rgba(0,0,0,0.06)\',
            border: isDark ? \'1px solid rgba(255,255,255,0.3)\' : \'1px solid rgba(0,0,0,0.15)\',
            borderRadius: \'8px\', padding: \'6px 14px\',
            color: isDark ? \'#ffffff\' : \'#1a1a2e\',
            cursor: \'pointer\', fontSize: \'14px\', fontWeight: 600,
            display: \'flex\', alignItems: \'center\', gap: \'6px\',
          }}>
            {langConfig[lang].flag} {langConfig[lang].name} \u25bc
          </button>

          {menuOpen && (
            <div style={{
              position: \'absolute\', top: \'42px\', right: 0,
              background: isDark ? \'#1a1a2e\' : \'#ffffff\',
              borderRadius: \'8px\', boxShadow: \'0 4px 16px rgba(0,0,0,0.15)\',
              overflow: \'hidden\', minWidth: \'150px\', zIndex: 9999,
              border: isDark ? \'1px solid #2a2a3a\' : \'1px solid #dee2e6\',
            }}>
              {(Object.keys(langConfig) as Language[]).map((l) => (
                <button key={l} onClick={() => changeLang(l)} style={{
                  display: \'flex\', alignItems: \'center\', gap: \'8px\',
                  width: \'100%\', padding: \'10px 16px\', border: \'none\',
                  background: lang === l ? (isDark ? \'#2a2a3a\' : \'#f0f7ff\') : \'transparent\',
                  cursor: \'pointer\', fontSize: \'14px\',
                  fontWeight: lang === l ? 700 : 400,
                  color: isDark ? \'#e0e0e0\' : \'#1a1a2e\', textAlign: \'left\',
                }}>
                  {langConfig[l].flag} {langConfig[l].name}
                  {lang === l && \' \u2714\'}
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
  textDecoration: \'none\',
  fontSize: \'15px\',
  fontWeight: 600,
  padding: \'6px 12px\',
  borderRadius: \'6px\',
  transition: \'all 0.2s\',
};
'''

with open('components/SiteHeader.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! SiteHeader.tsx fixed and chat link added.")
