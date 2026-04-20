const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "dev-session-secret-change-in-production"
const COOKIE_NAME = "admin_session"
const SESSION_DURATION = 8 * 60 * 60 // 8 hours in seconds
const REFRESH_THRESHOLD = 30 * 60 // refresh when < 30 min remaining

export type AdminSession = {
  id: number
  email: string
  role: string
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const BASE64_LOOKUP = (() => {
  const map = new Map<string, number>()
  for (let i = 0; i < BASE64_ALPHABET.length; i++) {
    map.set(BASE64_ALPHABET[i], i)
  }
  return map
})()

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
  return encodeBase64(new Uint8Array(buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  return decodeBase64(base64 + padding)
}

function decodeBase64Url(str: string): string {
  const bytes = fromBase64Url(str)
  return decoder.decode(bytes)
}

function encodeBase64(bytes: Uint8Array): string {
  let output = ""

  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i]
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0

    const triplet = (byte1 << 16) | (byte2 << 8) | byte3

    output += BASE64_ALPHABET[(triplet >> 18) & 0x3f]
    output += BASE64_ALPHABET[(triplet >> 12) & 0x3f]
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(triplet >> 6) & 0x3f] : "="
    output += i + 2 < bytes.length ? BASE64_ALPHABET[triplet & 0x3f] : "="
  }

  return output
}

function decodeBase64(base64: string): Uint8Array {
  if (base64.length % 4 !== 0) {
    throw new Error("Invalid base64 input")
  }

  let padding = 0
  if (base64.endsWith("==")) {
    padding = 2
  } else if (base64.endsWith("=")) {
    padding = 1
  }

  const byteLength = (base64.length / 4) * 3 - padding
  const bytes = new Uint8Array(byteLength)
  let byteIndex = 0

  for (let i = 0; i < base64.length; i += 4) {
    const c1 = base64[i]
    const c2 = base64[i + 1]
    const c3 = base64[i + 2]
    const c4 = base64[i + 3]

    const v1 = BASE64_LOOKUP.get(c1)
    const v2 = BASE64_LOOKUP.get(c2)
    const v3 = c3 === "=" ? 0 : BASE64_LOOKUP.get(c3)
    const v4 = c4 === "=" ? 0 : BASE64_LOOKUP.get(c4)

    if (v1 === undefined || v2 === undefined || v3 === undefined || v4 === undefined) {
      throw new Error("Invalid base64 characters")
    }

    const triplet = (v1 << 18) | (v2 << 12) | (v3 << 6) | v4

    if (byteIndex < byteLength) bytes[byteIndex++] = (triplet >> 16) & 0xff
    if (byteIndex < byteLength) bytes[byteIndex++] = (triplet >> 8) & 0xff
    if (byteIndex < byteLength) bytes[byteIndex++] = triplet & 0xff
  }

  return bytes
}

export async function createSessionToken(admin: {
  id: number
  email: string
  role: string
}): Promise<string> {
  const payload: AdminSession = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  }

  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)).buffer)

  const key = await getKey()
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encoded),
  )

  return `${encoded}.${toBase64Url(signature)}`
}

export async function verifySessionToken(
  token: string,
): Promise<AdminSession | null> {
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

    const payloadStr = decodeBase64Url(encoded)
    const payload = JSON.parse(payloadStr) as AdminSession

    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export function shouldRefreshSession(session: AdminSession): boolean {
  return session.exp - Math.floor(Date.now() / 1000) < REFRESH_THRESHOLD
}

export { COOKIE_NAME, SESSION_DURATION }
