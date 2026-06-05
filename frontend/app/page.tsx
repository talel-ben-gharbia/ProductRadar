import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import ClientHomePage from "@/components/B2C/client-home-page"

export default function Page() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-slate-50 to-[#f0f3f8]">
      <B2CNavbar title="Products radar" />
      <ClientHomePage />
    </div>
  )
}
