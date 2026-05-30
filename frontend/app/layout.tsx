import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthDialogProvider } from "@/lib/auth-dialog-context"
import { CompareProvider } from "@/lib/compare-context"
import { I18nProvider } from "@/lib/i18n-context"
import { cn } from "@/lib/utils";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <head />
      <body suppressHydrationWarning>

        <ThemeProvider forcedTheme="light" enableSystem={false}>
          <AuthDialogProvider>
            <TooltipProvider>
              <I18nProvider>
                <CompareProvider>
                  {children}
                </CompareProvider>
              </I18nProvider>
              <Toaster position="top-center" closeButton />
            </TooltipProvider>
          </AuthDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
