"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Globe } from "lucide-react"

import { useGoogleTranslate } from "@/components/google-translate-provider"
import { useI18n } from "@/lib/i18n-context"

/* ------------------------------------------------------------------ */
/*  Language selector component                                        */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
] as const

type LangCode = (typeof LANGUAGES)[number]["code"]

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n()
  const { translateTo } = useGoogleTranslate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLang =
    LANGUAGES.find((l) => l.code === locale) ??
    LANGUAGES[0]

  /* ---------- Close on outside click ---------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  /* ---------- Close on Escape ---------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const handleSelect = useCallback(
    (langCode: string) => {
      setLocale(langCode as LangCode)
      translateTo(langCode)
      setOpen(false)
    },
    [setLocale, translateTo]
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          notranslate
          flex items-center gap-1.5 rounded-full border border-transparent
          bg-transparent px-2.5 py-1.5 text-sm font-medium
          text-muted-foreground transition-all duration-200
          hover:border-slate-200 hover:bg-slate-50 hover:text-foreground
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${open ? "border-slate-200 bg-slate-50 text-foreground" : ""}
          ${compact ? "h-8 px-2" : "h-9"}
        `}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4" />
        {!compact && (
          <>
            <span className="notranslate text-xs font-semibold uppercase tracking-wide">
              {currentLang.flag} {currentLang.code.toUpperCase()}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            notranslate
            absolute right-0 z-[9999] mt-2 w-64
            overflow-hidden rounded-2xl border border-slate-200
            bg-white shadow-xl shadow-black/8
            animate-in fade-in slide-in-from-top-2 duration-200
          "
          role="listbox"
          aria-label="Languages"
        >
          <div className="max-h-[320px] overflow-y-auto overscroll-contain py-1">
            {LANGUAGES.map((lang) => {
              const isActive = locale === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    flex w-full items-center gap-3 px-4 py-2.5
                    text-left text-sm transition-colors duration-150
                    ${
                      isActive
                        ? "bg-slate-50 font-semibold text-foreground"
                        : "text-slate-600 hover:bg-slate-50 hover:text-foreground"
                    }
                  `}
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span className="flex-1">
                    <span className="block text-sm leading-tight">
                      {lang.nativeName}
                    </span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">
                      {lang.name}
                    </span>
                  </span>
                  {isActive && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile language selector (for the slide-down menu)                 */
/* ------------------------------------------------------------------ */

export function MobileLanguageSelector({
  onClose,
}: {
  onClose?: () => void
}) {
  const { locale, setLocale } = useI18n()
  const { translateTo } = useGoogleTranslate()

  const handleSelect = useCallback(
    (langCode: string) => {
      setLocale(langCode as LangCode)
      translateTo(langCode)
      onClose?.()
    },
    [setLocale, translateTo, onClose]
  )

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        🌍 Language
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
                    : "text-muted-foreground hover:bg-slate-50"
                }
              `}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="truncate">{lang.nativeName}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
