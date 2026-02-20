export type Language = 'ar' | 'en' | 'ru' | 'zh'

export const langConfig: Record<Language, { name: string; flag: string; dir: 'rtl' | 'ltr' }> = {
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
  ru: { name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  zh: { name: '中文', flag: '🇨🇳', dir: 'ltr' },
}

export const nav: Record<Language, { farms: string; billing: string; download: string; dashboard: string }> = {
  ar: { farms: '🌾 المزارع', billing: '💳 الدفع', download: '⬇️ تحميل', dashboard: '🎮 الداشبورد' },
  en: { farms: '🌾 Farms', billing: '💳 Billing', download: '⬇️ Download', dashboard: '🎮 Dashboard' },
  ru: { farms: '🌾 Фермы', billing: '💳 Оплата', download: '⬇️ Скачать', dashboard: '🎮 Панель' },
  zh: { farms: '🌾 农场', billing: '💳 付款', download: '⬇️ 下载', dashboard: '🎮 面板' },
}

export function getLang(): Language {
  if (typeof window === 'undefined') return 'ar'
  const saved = localStorage.getItem('vrbot_lang') as Language
  return saved && langConfig[saved] ? saved : 'ar'
}

export function setLang(lang: Language) {
  localStorage.setItem('vrbot_lang', lang)
  document.documentElement.lang = lang
  document.documentElement.dir = langConfig[lang].dir
}
