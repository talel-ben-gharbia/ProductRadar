const SESSION_SECRET =
  process.env.B2C_SESSION_SECRET || "dev-b2c-session-secret-change-in-production"
const COOKIE_NAME = "b2c_session"
const SESSION_DURATION = 8 * 60 * 60

export type B2CSession = {
  id: number
  email: string
  firebase_uid: string
  type: "customer" | "b2b_company" | "b2b_market"
  exp: number
}

const encoder = new TextEncoder()

let cachedKey: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  cachedKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
  return cachedKey
}

function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function createB2CSessionToken(payload: {
  id: number
  email: string
  firebase_uid: string
  type: "customer" | "b2b_company" | "b2b_market"
}): Promise<string> {
  const sessionPayload: B2CSession = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  }

  const encoded = btoa(JSON.stringify(sessionPayload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const key = await getKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded))

  return `${encoded}.${toBase64Url(signature)}`
}

export async function verifyB2CSessionToken(token: string): Promise<B2CSession | null> {
  try {
    const dotIndex = token.indexOf(".")
    if (dotIndex === -1) return null

    const encoded = token.substring(0, dotIndex)
    const signature = token.substring(dotIndex + 1)

    const key = await getKey()
    const sigBytes = fromBase64Url(signature)
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      encoder.encode(encoded),
    )

    if (!valid) return null

    const payloadStr = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))
    const payload = JSON.parse(payloadStr) as B2CSession

    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export { COOKIE_NAME, SESSION_DURATION }
