"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"

/* ------------------------------------------------------------------ */
/*  Supported languages                                                */
/* ------------------------------------------------------------------ */

export type SupportedLanguage = {
  code: string
  name: string
  nativeName: string
  flag: string
}

/**
 * SOURCE_LANGUAGE = The language the database content is written in (French).
 * DEFAULT_LANGUAGE = The language the user sees by default (English).
 *
 * Google Translate needs to know the SOURCE so it can translate accurately.
 * The cookie format is: googtrans=/SOURCE/TARGET
 */
export const SOURCE_LANGUAGE = "fr"
export const DEFAULT_LANGUAGE = "en"

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "zh-CN", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
]

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type GoogleTranslateContextValue = {
  currentLanguage: string
  translateTo: (langCode: string) => void
  retranslate: () => void
  isReady: boolean
}

const GoogleTranslateContext = createContext<GoogleTranslateContextValue>({
  currentLanguage: DEFAULT_LANGUAGE,
  translateTo: () => {},
  retranslate: () => {},
  isReady: false,
})

export function useGoogleTranslate() {
  return useContext(GoogleTranslateContext)
}

/* ------------------------------------------------------------------ */
/*  Helper: nuke any Google Translate UI from the DOM                   */
/* ------------------------------------------------------------------ */

function hideGoogleTranslateUI() {
  // Reset body/html positioning that Google Translate forcibly changes
  document.body.style.top = "0px"
  document.body.style.position = ""
  document.documentElement.style.top = "0px"

  // Aggressively hide ALL known Google Translate selectors
  const killSelectors = [
    ".goog-te-banner-frame",
    "iframe.goog-te-banner-frame",
    "#goog-gt-tt",
    ".goog-te-balloon-frame",
    "iframe.goog-te-menu-frame",
    ".jfk-bubble",
    ".goog-te-spinner-pos",
    ".goog-te-spinner-pos div",
    "div[data-goog-te-banner]",
    "div.goog-te-banner-frame",
    ".goog-te-gadget",
    ".goog-te-gadget-simple",
    ".goog-te-gadget-icon",
    ".goog-te-menu-value",
    ".goog-te-menu2",
    ".skiptranslate",
  ]
  for (const sel of killSelectors) {
    const els = document.querySelectorAll<HTMLElement>(sel)
    for (const el of els) {
      el.style.setProperty("display", "none", "important")
      el.style.setProperty("visibility", "hidden", "important")
      el.style.setProperty("height", "0", "important")
      el.style.setProperty("overflow", "hidden", "important")
      el.style.setProperty("position", "absolute", "important")
      el.style.setProperty("top", "-9999px", "important")
      el.style.setProperty("left", "-9999px", "important")
      el.style.setProperty("pointer-events", "none", "important")
    }
  }

  // Hide .skiptranslate wrappers (but NOT our #google_translate_element container)
  const skipEls = document.querySelectorAll<HTMLElement>(".skiptranslate")
  for (const el of skipEls) {
    if (el.id === "google_translate_element") continue
    el.style.setProperty("display", "none", "important")
    el.style.setProperty("visibility", "hidden", "important")
    el.style.setProperty("height", "0", "important")
    el.style.setProperty("max-height", "0", "important")
    el.style.setProperty("overflow", "hidden", "important")
    el.style.setProperty("position", "absolute", "important")
    el.style.setProperty("top", "-9999px", "important")
    el.style.setProperty("left", "-9999px", "important")
  }

  // Catch ALL iframes from Google Translate domains
  const allIframes = document.querySelectorAll<HTMLIFrameElement>("iframe")
  for (const iframe of allIframes) {
    const src = iframe.src || ""
    if (src.includes("translate.google") || src.includes("translate.googleapis")) {
      iframe.style.setProperty("display", "none", "important")
      iframe.style.setProperty("visibility", "hidden", "important")
      iframe.style.setProperty("height", "0", "important")
      iframe.style.setProperty("width", "0", "important")
      iframe.style.setProperty("position", "absolute", "important")
      iframe.style.setProperty("top", "-9999px", "important")
      iframe.style.setProperty("left", "-9999px", "important")
      iframe.style.setProperty("pointer-events", "none", "important")
    }
  }

  // Catch any element with id starting with "goog"
  const googEls = document.querySelectorAll<HTMLElement>("div[id^='goog'], span[id^='goog']")
  for (const el of googEls) {
    if (el.id === "google_translate_element") continue
    el.style.setProperty("display", "none", "important")
    el.style.setProperty("visibility", "hidden", "important")
    el.style.setProperty("position", "absolute", "important")
    el.style.setProperty("top", "-9999px", "important")
    el.style.setProperty("pointer-events", "none", "important")
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: {
          InlineLayout?: { HORIZONTAL: number }
          new (opts: Record<string, unknown>, containerId: string): void
        }
      }
    }
    googleTranslateElementInit?: () => void
  }
}

const STORAGE_KEY = "gt_language"

export function GoogleTranslateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE)
  const [isReady, setIsReady] = useState(false)
  const initAttempted = useRef(false)
  const observerRef = useRef<MutationObserver | null>(null)
  const pathname = usePathname()

  /* =================================================================
     1. CALLBACKS FIRST
     ================================================================= */

  const triggerTranslation = useCallback((langCode: string) => {
    const selectEl = document.querySelector<HTMLSelectElement>(".goog-te-combo")
    if (selectEl) {
      // "Jog" — reset to source first, then set target.
      // This forces Google Translate to re-scan ALL text nodes.
      selectEl.value = ""
      selectEl.dispatchEvent(new Event("change", { bubbles: true }))
      setTimeout(() => {
        selectEl.value = langCode
        selectEl.dispatchEvent(new Event("change", { bubbles: true }))
        requestAnimationFrame(hideGoogleTranslateUI)
      }, 80)
      return
    }
    const frame = document.querySelector<HTMLIFrameElement>(
      "iframe.goog-te-menu-frame"
    )
    if (frame?.contentDocument) {
      const links = frame.contentDocument.querySelectorAll<HTMLAnchorElement>(
        ".goog-te-menu2-item a, a.goog-te-menu2-item"
      )
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || ""
        const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode)
        if (
          lang &&
          (text.includes(lang.name.toLowerCase()) ||
            text.includes(lang.nativeName.toLowerCase()))
        ) {
          link.click()
          requestAnimationFrame(hideGoogleTranslateUI)
          return
        }
      }
    }
  }, [])

  const translateTo = useCallback(
    (langCode: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, langCode)
      } catch {}

      setCurrentLanguage(langCode)

      if (langCode === SOURCE_LANGUAGE) {
        // Restore to original French (source) — clear cookie and reload
        document.cookie =
          "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        document.cookie =
          "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
          window.location.hostname +
          ";"
        const selectEl = document.querySelector<HTMLSelectElement>(
          ".goog-te-combo"
        )
        if (selectEl) {
          selectEl.value = ""
          selectEl.dispatchEvent(new Event("change", { bubbles: true }))
        }
        setTimeout(() => window.location.reload(), 50)
        return
      }

      // Cookie: /SOURCE/TARGET — Google translates FROM source TO target
      document.cookie = `googtrans=/${SOURCE_LANGUAGE}/${langCode}; path=/; SameSite=Lax`

      if (isReady) {
        triggerTranslation(langCode)
        setTimeout(hideGoogleTranslateUI, 100)
        setTimeout(hideGoogleTranslateUI, 500)
      } else {
        window.location.reload()
      }
    },
    [isReady, triggerTranslation]
  )

  /* =================================================================
     2. EFFECTS
     ================================================================= */

  /** Load persisted language on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        setCurrentLanguage(stored)
      }
    } catch {}
  }, [])

  /** Pre-set googtrans cookie for instant translation on load */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // If no stored preference, default to English (translate from French)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        if (!document.cookie.includes(`googtrans=/${SOURCE_LANGUAGE}/${target}`)) {
          document.cookie = `googtrans=/${SOURCE_LANGUAGE}/${target}; path=/; SameSite=Lax`
        }
      }
    } catch {}
  }, [])

  /** MutationObserver — watch for Google Translate DOM injections and hide them */
  useEffect(() => {
    let rafId: number | null = null
    let lastHide = 0
    const debouncedHide = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        const now = Date.now()
        if (now - lastHide > 100) {
          hideGoogleTranslateUI()
          lastHide = now
        }
        rafId = null
      })
    }

    // Observe only direct children of body (where Google injects elements)
    // and attribute changes on those children — not full subtree
    observerRef.current = new MutationObserver(debouncedHide)
    observerRef.current.observe(document.body, {
      childList: true,
    })

    hideGoogleTranslateUI()

    // Lightweight periodic fallback to catch any late injections
    const intervalId = setInterval(hideGoogleTranslateUI, 3000)

    const timers = [
      setTimeout(hideGoogleTranslateUI, 200),
      setTimeout(hideGoogleTranslateUI, 500),
      setTimeout(hideGoogleTranslateUI, 1000),
      setTimeout(hideGoogleTranslateUI, 2500),
    ]

    return () => {
      observerRef.current?.disconnect()
      clearInterval(intervalId)
      timers.forEach(clearTimeout)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  /** Inject Google Translate script — load IMMEDIATELY */
  useEffect(() => {
    if (initAttempted.current) return
    initAttempted.current = true

    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div")
      div.id = "google_translate_element"
      div.style.cssText =
        "position:absolute!important;top:-9999px!important;left:-9999px!important;height:0!important;width:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;"
      document.body.appendChild(div)
    }

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            // SOURCE language = French (the actual language of the text)
            pageLanguage: SOURCE_LANGUAGE,
            autoDisplay: false,
            includedLanguages: SUPPORTED_LANGUAGES.map((l) => l.code).join(","),
          },
          "google_translate_element"
        )
        setIsReady(true)
        hideGoogleTranslateUI()
      }
    }

    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement("script")
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      script.onerror = () => {
        console.warn("Google Translate failed to load")
      }
      document.body.appendChild(script)
    }
  }, [])

  /** Apply stored language once Google Translate is ready */
  useEffect(() => {
    if (!isReady) return

    hideGoogleTranslateUI()

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        requestAnimationFrame(() => {
          triggerTranslation(target)
          setTimeout(hideGoogleTranslateUI, 200)
        })
      }
    } catch {}
  }, [isReady, triggerTranslation])

  /** Re-translate + hide widget on EVERY page navigation */
  useEffect(() => {
    hideGoogleTranslateUI()

    if (!isReady) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        const t1 = setTimeout(() => {
          triggerTranslation(target)
          hideGoogleTranslateUI()
        }, 50)
        const t2 = setTimeout(hideGoogleTranslateUI, 200)
        const t3 = setTimeout(hideGoogleTranslateUI, 500)
        return () => {
          clearTimeout(t1)
          clearTimeout(t2)
          clearTimeout(t3)
        }
      }
    } catch {}
  }, [pathname, isReady, triggerTranslation])

  /* ================================================================= */

  const retranslate = useCallback(() => {
    if (!isReady) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        requestAnimationFrame(() => {
          triggerTranslation(target)
          setTimeout(hideGoogleTranslateUI, 200)
        })
      }
    } catch {}
  }, [isReady, triggerTranslation])

  return (
    <GoogleTranslateContext.Provider
      value={{ currentLanguage, translateTo, retranslate, isReady }}
    >
      {children}
    </GoogleTranslateContext.Provider>
  )
}
