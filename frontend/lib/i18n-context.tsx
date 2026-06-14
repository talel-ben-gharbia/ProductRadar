"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { FR_DICT, EN_DICT } from "@/lib/translations"

type Locale = "fr" | "en"

type TranslationDict = Record<string, string>

const FR: TranslationDict = FR_DICT
const EN: TranslationDict = EN_DICT

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => {},
  t: (key: string) => key,
})

export function I18nProvider({ children, defaultLocale }: { children: React.ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale ?? "fr")

  useEffect(() => {
    try {
      const stored = localStorage.getItem("b2c_locale") as Locale | null
      if (stored === "en" || stored === "fr") {
        setLocaleState(stored)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem("b2c_locale", newLocale)
      document.cookie = `b2c_locale=${newLocale};path=/;SameSite=Lax;max-age=31536000`
    } catch {}
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = locale === "en" ? EN : FR
      let text = dict[key]
      if (text === undefined) {
        text = key
      }
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.replace(`{${paramKey}}`, String(paramValue))
        }
      }
      return text
    },
    [locale],
  )

  const ctxValue = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return (
    <I18nContext.Provider value={ctxValue}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
