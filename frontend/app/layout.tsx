import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthDialogProvider } from "@/lib/auth-dialog-context"
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
      <body suppressHydrationWarning>
        <Script id="remove-injected-dom-attrs" strategy="afterInteractive">
          {`
            (function () {
              var attrs = ["bis_skin_checked", "data-new-gr-c-s-check-loaded", "data-gr-ext-installed"];
              function clean(node) {
                for (var i = 0; i < attrs.length; i += 1) {
                  node.removeAttribute(attrs[i]);
                }
              }
              function cleanAll() {
                clean(document.documentElement);
                clean(document.body);
                var elements = document.querySelectorAll("*[bis_skin_checked], *[data-new-gr-c-s-check-loaded], *[data-gr-ext-installed]");
                for (var i = 0; i < elements.length; i += 1) {
                  clean(elements[i]);
                }
              }
              cleanAll();
              var observer = new MutationObserver(cleanAll);
              observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
              setTimeout(function () {
                observer.disconnect();
              }, 3000);
            })();
          `}
        </Script>
        <ThemeProvider forcedTheme="light" enableSystem={false}>
          <AuthDialogProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-center" closeButton />
            </TooltipProvider>
          </AuthDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
