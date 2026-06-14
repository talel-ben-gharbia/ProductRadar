import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"

import "./globals.css"
import { GoogleTranslateProvider } from "@/components/google-translate-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthDialogProvider } from "@/lib/auth-dialog-context"
import { CompareProvider } from "@/lib/compare-context"
import { I18nProvider } from "@/lib/i18n-context"
import { getServerLocale } from "@/lib/get-server-locale"
import { cn } from "@/lib/utils";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getServerLocale()
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"} />
        <style>{`.goog-te-banner-frame,.goog-te-gadget-icon,.goog-te-gadget-simple,.goog-te-gadget img,.goog-logo-link,#goog-gt-tt,.goog-te-balloon-frame,.goog-te-spinner-pos,.goog-te-spinner,[class*=VIpgJd],.goog-te-gadget span:not(.goog-te-combo),.skiptranslate+.skiptranslate,iframe#goog-te-banner,iframe.goog-te-banner-frame{display:none!important}body{top:0!important}.goog-te-bubble,.goog-te-bubble-frame,.goog-te-menu-frame,.goog-te-menu2,.goog-te-menu-value,.goog-te-balloon,.goog-te-tooltip,.goog-te-hovercard,iframe[src*=\\"translate.googleapis.com\\"][style*=\\"position:absolute\\"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;width:0!important;height:0!important;position:fixed!important;top:-99999px!important;left:-99999px!important;z-index:-2147483648!important}`}</style>
      </head>
      <body suppressHydrationWarning>
        <div id="__next">
          <ThemeProvider forcedTheme="light" enableSystem={false}>
            <AuthDialogProvider>
              <TooltipProvider>
                <I18nProvider defaultLocale={locale as "fr" | "en"}>
                  <GoogleTranslateProvider>
                    <CompareProvider>
                      {children}
                    </CompareProvider>
                  </GoogleTranslateProvider>
                </I18nProvider>
                <Toaster position="top-center" closeButton />
              </TooltipProvider>
            </AuthDialogProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
