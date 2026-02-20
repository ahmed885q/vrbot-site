'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, langConfig, getLang, setLang as saveLang } from './translations'

type I18nContextType = {
  lang: Language
  setLang: (lang: Language) => void
  isRtl: boolean
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  setLang: () => {},
  isRtl: true,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('ar')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = getLang()
    setLangState(saved)
    document.documentElement.lang = saved
    document.documentElement.dir = langConfig[saved].dir
    setMounted(true)
  }, [])

  const changeLang = (newLang: Language) => {
    setLangState(newLang)
    saveLang(newLang)
  }

  if (!mounted) return null

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, isRtl: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
