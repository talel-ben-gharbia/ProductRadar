/**
 * Category name translations: FR name → EN name.
 *
 * The database sometimes returns garbled accented characters (e.g. "tlphonie"
 * instead of "téléphonie"). We store BOTH proper French AND garbled forms as
 * keys so that any encoding variation will match.
 *
 * For robustness, all lookups are normalized: lowercase, strip diacritics,
 * remove special chars, collapse whitespace.
 */

/* ---------- Normalization ---------- */

function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents
}

function normalizeKey(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9 &|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/* ---------- Translation map ---------- */

const EN_MAP: Record<string, string> = {
  // ── Root categories ──────────────────────────────
  informatique: "Computing",
  téléphonie: "Telephony",
  "tv | photo & son": "TV, Photo & Audio",

  // ── Under informatique ───────────────────────────
  "composants informatique": "Computer Components",
  logiciels: "Software",
  "ordinateur de bureau": "Desktop Computers",
  "ordinateur portable": "Laptops",
  "périphériques & accessoires": "Peripherals & Accessories",
  serveurs: "Servers",
  stockage: "Storage",
  "tablettes tactiles": "Tablets",

  // ── Under téléphonie ─────────────────────────────
  "smartphone et mobile": "Smartphones & Mobile",
  smartwatch: "Smartwatch",
  "téléphone fixe": "Landline Phone",

  // ── Under tv | photo & son ───────────────────────
  "console et jeux": "Consoles & Games",
  projection: "Projection",
  "recepteur et box": "Receivers & Boxes",
  son: "Audio",
  tv: "TV",

  // ── Composants informatique children ─────────────
  "afficheur pc portable": "Laptop Display",
  "barrette mémoire": "RAM Stick",
  "barrettes mémoire": "RAM Sticks",
  "batterie pc portable": "Laptop Battery",
  "bloc d'alimentation": "Power Supply",
  boîtier: "Case",
  "carte graphique": "Graphics Card",
  "carte mémoire": "Memory Card",
  "carte mère": "Motherboard",
  "chargeur pc portable": "Laptop Charger",
  divers: "Miscellaneous",
  "graveurs et lecteurs": "Drives & Readers",
  processeur: "Processor",
  "ventilateur processeur": "CPU Fan",

  // ── Périphériques & accessoires children ─────────
  "clavier et tapis et souris": "Keyboard, Mouse & Pad",
  "power bank pc portable": "Laptop Power Bank",
  "refroidisseurs pc portable": "Laptop Coolers",
  "sac et sacoche": "Bags & Cases",
  "station d'accueil": "Docking Station",
  "support ecran": "Monitor Stand",
  "support pc portable": "Laptop Stand",
  webcam: "Webcam",

  // ── Stockage children ────────────────────────────
  "accessoires de stockage": "Storage Accessories",
  "cd/dvd": "CD/DVD",
  "clé usb": "USB Drive",
  "disque dur": "Hard Drive",

  // ── Ordinateur de bureau children ────────────────
  "ordinateur gamer": "Gaming PC",
  "pc de bureau": "Desktop PC",
  "pc tout en un": "All-in-One PC",

  // ── Ordinateur portable children ─────────────────
  "pc portable": "Laptop",

  // ── Logiciels children ───────────────────────────
  microsoft: "Microsoft",
  sécurité: "Security",

  // ── Smartphone et mobile children ────────────────
  smartphone: "Smartphone",
  "telephone portable": "Mobile Phone",

  // ── Tablettes tactiles children ──────────────────
  ipad: "iPad",
  tablette: "Tablet",

  // ── TV children ──────────────────────────────────
  smart: "Smart TV",
  "non smart": "Non-Smart TV",

  // ── Son children ─────────────────────────────────
  "casque et ecouteur": "Headphones & Earbuds",
  "haut-parleur": "Speaker",
  microphone: "Microphone",
  "radio réveil": "Radio Alarm Clock",
  ecran: "Monitor",
  imac: "iMac",
  iphone: "iPhone",
  mac: "Mac",
  console: "Console",
  "accessoires divers": "Misc. Accessories",

  // ── Console et jeux children ─────────────────────
  accessoires: "Accessories",

  // ── Projection children ──────────────────────────
  "video projecteur": "Video Projecteur",
  box: "Box",

  // ── Recepteur et box children ────────────────────
  recepteur: "Receiver",

  // ── Accessoires téléphonie children ──────────────
  "accessoires téléphonie": "Phone Accessories",
  chargeur: "Charger",
  "divers pour telephone": "Phone Misc",
  "power bank": "Power Bank",
  protection: "Protection",
}

/**
 * Build a normalized lookup map from the EN_MAP.
 * Each key is the normalized form of a French name → English translation.
 */
const _normalizedLookup = new Map<string, string>()
for (const [rawKey, enValue] of Object.entries(EN_MAP)) {
  _normalizedLookup.set(normalizeKey(rawKey), enValue)
}

/**
 * Translate a category name from French to English.
 * Uses accent-stripped normalization so garbled DB encoding still matches.
 * Falls back to the original name if no mapping exists.
 */
export function translateCategoryName(
  locale: string,
  name: string,
): string {
  if (locale === "en") {
    // 1) Try normalized lookup (handles both proper French & garbled DB forms)
    const normalized = normalizeKey(name)
    const result = _normalizedLookup.get(normalized)
    if (result) return result

    // 2) No match found — return original
    return name
  }
  // For non-English locales, return the original (French) name from DB
  return name
}
