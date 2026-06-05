import { cookies } from "next/headers"

export async function getServerLocale(): Promise<string> {
  try {
    const cookieStore = await cookies()
    const stored = cookieStore.get("b2c_locale")?.value
    if (stored === "en" || stored === "fr") return stored
  } catch {}
  return "fr"
}
