import type { CanonicalSpecs } from "@/utils/types"

export const SPEC_KEY_MAP: Record<string, keyof CanonicalSpecs> = {
  'mémoire ram': 'ram', 'memoire ram': 'ram', 'mémoire vive': 'ram', 'capacité mémoire': 'ram', 'mémoire': 'ram', 'memoire': 'ram', 'ram': 'ram', 'memory': 'ram',
  'capacité du disque dur': 'storage', 'disque dur': 'storage', 'stockage': 'storage', 'capacité de stockage': 'storage', 'capacité': 'storage', 'storage': 'storage', 'rom': 'storage',
  "taille de l'écran": 'screen', "taille d'écran": 'screen', 'ecran taille': 'screen', 'taille du boitier': 'screen', 'diagonale': 'screen', 'taille': 'screen', 'display': 'screen',
  "résolution d'écrans": 'resolution', "résolution d'écran": 'resolution', 'résolution': 'resolution', 'resolution': 'resolution', 'définition': 'resolution',
  "types de dalles": 'panel', "type d'écran": 'panel', 'norme hd': 'panel', 'dalle': 'panel', 'panneau': 'panel', 'ecran': 'panel', 'écran': 'panel',
  'taux de rafraîchissement': 'refresh', 'fréquence': 'refresh', 'hz': 'refresh',
  'appareil photo frontale': 'camera', 'caméra arrière': 'camera', 'appareil photo': 'camera', 'capteur photo': 'camera', 'caméra': 'camera', 'camera': 'camera',
  'référence processeur': 'cpu', 'modèle processeur': 'cpu', 'processeur modèle': 'cpu', 'processeur': 'cpu', 'chipset': 'cpu', 'cpu': 'cpu',
  'réf carte graphique': 'gpu', 'carte graphique': 'gpu', 'chipset graphique': 'gpu', 'graphique': 'gpu', 'gpu': 'gpu', 'vga': 'gpu',
  "système d'exploitation": 'os', 'compatibilité os': 'os', 'operating system': 'os', 'systeme': 'os', 'os': 'os',
  'capacité de la batterie': 'battery', 'capacité de batterie': 'battery', 'autonomie batterie': 'battery', 'autonomie': 'battery', 'batterie': 'battery', 'mah': 'battery',
  'couleur': 'color', 'colour': 'color', 'colors': 'color',
  'poids': 'weight', 'masse': 'weight',
  "etanche à l'eau et à la poussière": 'water', "etanche à l'eau": 'water', "résistance à l'eau": 'water', 'étanchéité': 'water', 'indice ip': 'water',
}

const SORTED_SPEC_KEYS = Object.entries(SPEC_KEY_MAP).sort((a, b) => b[0].length - a[0].length)

export function normalizeSpecs(rawSpecs: Record<string, string> | null | undefined): CanonicalSpecs {
  const canonical: CanonicalSpecs = {}
  if (!rawSpecs) return canonical

  for (const [key, value] of Object.entries(rawSpecs)) {
    if (!key || !value) continue

    const cleanKey = key.toLowerCase().trim()
    let mappedKey: keyof CanonicalSpecs | null = null

    for (const [mapK, mapV] of SORTED_SPEC_KEYS) {
      if (cleanKey.includes(mapK)) {
        mappedKey = mapV
        break
      }
    }

    if (!mappedKey) continue

    let cleanVal = String(value).toLowerCase().replace(/[^a-z0-9.\- ]/g, '').replace(/\s+/g, ' ').trim()
    cleanVal = cleanVal.replace(/\bgo\b/g, 'gb').replace(/\bto\b/g, 'tb')
    cleanVal = cleanVal.replace(/pouces|inch/g, '"').replace(/\s+"/g, '"')

    const cmMatch = cleanVal.match(/^(\d+(?:\.\d+)?)\s*cm$/)
    if (cmMatch) {
      const inches = (parseFloat(cmMatch[1]) / 2.54).toFixed(1)
      cleanVal = `${inches}"`
    }

    if (!canonical[mappedKey]) {
      canonical[mappedKey] = cleanVal
    }
  }

  if (canonical.ram) {
    const isTb = canonical.ram.includes('tb')
    const hasGb = canonical.ram.includes('gb')
    const ramNum = parseInt(canonical.ram.replace(/[^0-9]/g, '')) || 0

    if (isTb || (hasGb && ramNum > 32 && !canonical.storage)) {
      canonical.storage = canonical.ram
      delete canonical.ram
    }
  }

  return canonical
}
