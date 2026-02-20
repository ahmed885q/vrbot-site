import { useState, useEffect } from 'react';

export type Language = 'ar' | 'en' | 'ru' | 'zh';

export function useLanguage() {
  const [lang, setLangState] = useState<Language>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && ['ar', 'en', 'ru', 'zh'].includes(saved)) {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  return { lang, mounted, isRtl: lang === 'ar' };
}
