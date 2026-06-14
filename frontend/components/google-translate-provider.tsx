"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"


/* ------------------------------------------------------------------ */
/*  Monkey-patch React's DOM Unmount to survive Google Translate       */
/* ------------------------------------------------------------------ */
if (typeof window !== "undefined" && typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // Google Translate or another extension moved/removed the node
      return child
    }
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      // Google Translate or another extension moved the reference node
      return newNode
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}

/* ------------------------------------------------------------------ */
/*  Supported languages                                                */
/* ------------------------------------------------------------------ */

export type SupportedLanguage = {
  code: string
  name: string
  nativeName: string
  flag: string
}

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

/* ------------------------------------------------------------------ */
/*  ANTI-BLINK: Capture & disconnect Google's MutationObservers        */
/*  Patch MutationObserver.prototype.observe BEFORE Google loads.      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  ANTI-BLINK (AGGRESSIVE): Permanently block Google Translate from    */
/*  creating MutationObservers that watch the DOM. Google uses these   */
/*  to re-inject <font> wrappers around translated text. When React    */
/*  re-renders (on hover, scroll, state change), it strips the <font>  */
/*  elements, Google's observer detects this and re-injects them —     */
/*  causing a visible blink. By making observe() a silent no-op,       */
/*  Google can never watch for DOM changes and never re-injects.       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Anti-blink                                                         */
/* ------------------------------------------------------------------ */

// We do NOT patch MutationObserver.prototype.observe globally —
// that breaks Next.js HMR/DevTools which rely on DOM observers.
// Instead we use:
//   1. CSS to hide Google Translate injected elements (layout.tsx)
//   2. `notranslate` class on components Google Translate breaks
//   3. Periodic cleanup of injected <font> tags via a lightweight interval

export function GoogleTranslateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE)
  const [isReady, setIsReady] = useState(false)
  const initAttempted = useRef(false)

  /* =================================================================
     1. TRANSLATION FUNCTION — uses Google's combo box, NO page reload
     ================================================================= */

  const triggerTranslation = useCallback((langCode: string) => {
    // Try the hidden Google combo select element
    const selectEl = document.querySelector<HTMLSelectElement>(".goog-te-combo")
    if (selectEl) {
      selectEl.value = langCode
      selectEl.dispatchEvent(new Event("change", { bubbles: true }))
      return
    }

    // Fallback: try clicking inside the hidden iframe
    const frame = document.querySelector<HTMLIFrameElement>("iframe.goog-te-menu-frame")
    if (frame?.contentDocument) {
      const links = frame.contentDocument.querySelectorAll<HTMLAnchorElement>(
        ".goog-te-menu2-item a, a.goog-te-menu2-item"
      )
      const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode)
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || ""
        if (lang && (text.includes(lang.name.toLowerCase()) || text.includes(lang.nativeName.toLowerCase()))) {
          link.click()
          return
        }
      }
    }
  }, [])

  const translateTo = useCallback(
    (langCode: string) => {
      try { localStorage.setItem(STORAGE_KEY, langCode) } catch {}
      setCurrentLanguage(langCode)

      // Set the cookie for server-side Google Translate
      document.cookie = `googtrans=/auto/${langCode}; path=/; SameSite=Lax`

      // For translation to work, Google's TranslateElement internally
      // calls its own translation mechanism. The cookie-based approach
      // (googtrans cookie) already handles the initial translation.
      // We do NOT need to let Google re-observe — the cookie is sufficient.
      triggerTranslation(langCode)
    },
    [triggerTranslation]
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

  /** Pre-set googtrans cookie so Google translates on first paint */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        if (!document.cookie.includes(`googtrans=/auto/${target}`)) {
          document.cookie = `googtrans=/auto/${target}; path=/; SameSite=Lax`
        }
      }
    } catch {}
  }, [])

  /** Inject Google Translate script — only once */
  useEffect(() => {
    if (initAttempted.current) return
    initAttempted.current = true

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "auto",
            autoDisplay: false,
            includedLanguages: SUPPORTED_LANGUAGES.map((l) => l.code).join(","),
          },
          "google_translate_element"
        )
        setIsReady(true)
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
      document.head.appendChild(script)
    }
  }, [])

  /** Once Google is ready, apply stored language */
  useEffect(() => {
    if (!isReady) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        requestAnimationFrame(() => triggerTranslation(target))
      }
    } catch {}
  }, [isReady, triggerTranslation])

  /** Periodic cleanup disabled to prevent React DOM tracking interference */
  useEffect(() => {
    // Disabled interval
  }, [isReady])

  /** Add 'translating' class to body when language differs from source */
  useEffect(() => {
    if (currentLanguage !== SOURCE_LANGUAGE) {
      document.body.classList.add("translating")
    } else {
      document.body.classList.remove("translating")
    }
    return () => document.body.classList.remove("translating")
  }, [currentLanguage])

  /* -- Hover tooltip / hovercard elements are handled by CSS in layout.tsx -- */

  /* ================================================================= */

  const retranslate = useCallback(() => {
    if (!isReady) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const target = stored || DEFAULT_LANGUAGE
      if (target !== SOURCE_LANGUAGE) {
        requestAnimationFrame(() => triggerTranslation(target))
      }
    } catch {}
  }, [isReady, triggerTranslation])

  return (
    <GoogleTranslateContext.Provider
      value={{ currentLanguage, translateTo, retranslate, isReady }}
    >
      <div 
        id="google_translate_element" 
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          height: "0",
          width: "0",
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none"
        }} 
      />
      {children}
    </GoogleTranslateContext.Provider>
  )
}
