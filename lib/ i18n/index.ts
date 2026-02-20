import en from './en.json'
import ar from './ar.json'

export type Locale = 'en' | 'ar'

export const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  ar,
}

export const defaultLocale: Locale = 'en'
