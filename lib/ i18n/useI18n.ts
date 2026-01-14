'use client'

import { useEffect, useState } from 'react'
import { dictionaries, defaultLocale, Locale } from './index'

function getLocaleFromCookie(): Locale {
  const m = document.cookie.match(/locale=(en|ar)/)
  return (m?.[1] as Locale) || defaultLocale
}

export function setLocale(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000`
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const l = getLocaleFromCookie()
    setLocaleState(l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  }, [])

  function t(key: string) {
    return dictionaries[locale][key] || key
  }

  return {
    t,
    locale,
    changeLocale: (l: Locale) => {
      setLocale(l)
      setLocaleState(l)
    },
  }
}
