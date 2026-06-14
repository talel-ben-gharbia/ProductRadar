const BRAND_SVGS: Record<string, string> = {
  apple: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>`,

  samsung: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm2 2h10v6H7V9z" fill="currentColor"/></svg>`,

  xiaomi: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 3L3 12.5V21h8.5V12.5L11.5 3zm1 0L21 12.5V21h-8.5V12.5L12.5 3z" fill="currentColor"/></svg>`,

  msi: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h20v3H2V4zm0 5h20v3H2V9zm0 5h20v3H2v-3zm0 5h20v3H2v-3z" fill="currentColor"/></svg>`,

  lenovo: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 9h6v6H9V9z" fill="currentColor"/></svg>`,

  asus: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h20v4H2V4zm0 6h20v4H2v-4zm0 6h20v4H2v-4z" fill="currentColor"/></svg>`,

  hp: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 8h3l2 4 2-4h3v8h-2v-5l-2 4h-2l-2-4v5H8V8z" fill="currentColor"/></svg>`,

  dell: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h20v3H2V4zm0 5h20v3H2V9zm0 5h20v3H2v-3zm0 5h20v3H2v-3z" fill="currentColor"/></svg>`,

  jbl: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,

  redragon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,

  gigabyte: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 8h8v8H8V8z" fill="currentColor"/></svg>`,

  nike: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 18c3.5-2.5 7-5 14-10L1 18z" fill="currentColor"/></svg>`,

  adidas: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 18l6-10 2 3.5L5 18H2zm7 0l6-10 2 3.5L12 18H9zm7 0l6-10 2 3.5L19 18h-3z" fill="currentColor"/></svg>`,

  sony: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,

  lg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 7v10" stroke="currentColor" stroke-width="2"/><path d="M7 12h5" stroke="currentColor" stroke-width="2"/></svg>`,

  "l'oreal": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="8" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="10" r="2" fill="currentColor"/></svg>`,

  "procter & gamble": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,

  tunisianet: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/></svg>`,

  infinix: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v16H4V4zm3 3h10v10H7V7z" fill="currentColor"/></svg>`,

  "d-link": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2"/></svg>`,

  havit: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v18H3V3zm3 3v12h12V6H6z" fill="currentColor"/></svg>`,
}

export function brandSvg(name: string): string | null {
  const key = name.toLowerCase().trim()
  return BRAND_SVGS[key] ?? null
}

export function isPopularBrand(name: string): boolean {
  const key = name.toLowerCase().trim()
  return !!BRAND_SVGS[key]
}
