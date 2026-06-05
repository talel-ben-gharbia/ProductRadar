import type { CanonicalSpecs } from "@/utils/types"

/**
 * Professional spec filter groups — organized like real e-commerce sites.
 * Each group has a label, icon, and the canonical spec keys it covers.
 * Only groups with 2+ unique values across the current product set are shown.
 */

export type SpecFilterGroup = {
  id: string
  icon: string
  keys: (keyof CanonicalSpecs)[]
}

export const SPEC_FILTER_GROUPS: SpecFilterGroup[] = [
  {
    id: "performance",
    icon: "⚡",
    keys: ["cpu", "ram", "gpu"],
  },
  {
    id: "storage",
    icon: "💾",
    keys: ["storage"],
  },
  {
    id: "display",
    icon: "🖥️",
    keys: ["screen", "resolution", "panel", "refresh"],
  },
  {
    id: "camera",
    icon: "📷",
    keys: ["camera"],
  },
  {
    id: "power",
    icon: "🔋",
    keys: ["battery"],
  },
  {
    id: "software",
    icon: "📱",
    keys: ["os"],
  },
  {
    id: "physical",
    icon: "📐",
    keys: ["color", "weight", "water"],
  },
]

/**
 * For a given set of products, compute which spec filter groups are
 * relevant (have 2+ unique values) and what values they contain.
 */
export type SpecFilterOption = {
  key: keyof CanonicalSpecs
  values: Array<{ value: string; count: number }>
}

export type RelevantSpecGroup = {
  group: SpecFilterGroup
  options: SpecFilterOption[]
}

export function computeRelevantSpecGroups(
  products: Array<{ canonicalSpecs: CanonicalSpecs }>,
): RelevantSpecGroup[] {
  const result: RelevantSpecGroup[] = []

  for (const group of SPEC_FILTER_GROUPS) {
    const options: SpecFilterOption[] = []

    for (const key of group.keys) {
      const valueCounts = new Map<string, number>()
      for (const product of products) {
        const val = product.canonicalSpecs[key]
        if (val) {
          valueCounts.set(val, (valueCounts.get(val) ?? 0) + 1)
        }
      }

      // Only include if 2+ unique values (a single value isn't useful as a filter)
      if (valueCounts.size >= 2) {
        const sorted = [...valueCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8) // max 8 values per spec key

        options.push({
          key,
          values: sorted.map(([value, count]) => ({ value, count })),
        })
      }
    }

    if (options.length > 0) {
      result.push({ group, options })
    }
  }

  return result
}
