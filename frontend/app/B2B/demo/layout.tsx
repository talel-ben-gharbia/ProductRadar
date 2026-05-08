import type { ReactNode } from "react"
import B2BDemoLayoutClient from "./layout-client"

export default function B2BDemoLayout({ children }: { children: ReactNode }) {
  return <B2BDemoLayoutClient>{children}</B2BDemoLayoutClient>
}
