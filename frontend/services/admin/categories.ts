import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import type { CategoryWithParent } from "@/utils/types"

export type CategoryRaw = {
	id: number
	name: string
	parentId: number | null
}

type CategoryApiItem = CategoryRaw

async function fetchCategoriesFromApi(): Promise<CategoryApiItem[]> {
	try {
		const endpoint =
			typeof window === "undefined"
				? `${BACKEND_URL}/categories`
				: "/api/categories"

		const categories = await cachedFetch<CategoryApiItem[]>(endpoint, {
			cacheKey: "categories:all",
			cacheTtl: 300,
		})
		return categories
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown categories fetch error"
		throw new Error(`Unable to load categories from backend. ${message}`)
	}
}

export async function getCategoriesWithParents(): Promise<CategoryWithParent[]> {
	try {
		const categories = await fetchCategoriesFromApi()

		const categoryById = new Map<number, CategoryApiItem>()
		categories.forEach((category) => {
			categoryById.set(category.id, category)
		})

		function getAncestors(current: CategoryApiItem): CategoryApiItem[] {
			const chain: CategoryApiItem[] = [current]
			const visited = new Set<number>([current.id])

			let parentId = current.parentId
			while (parentId !== null) {
				const parent = categoryById.get(parentId)
				if (!parent || visited.has(parent.id)) {
					break
				}

				chain.push(parent)
				visited.add(parent.id)
				parentId = parent.parentId
			}

			return chain
		}

		const rows = categories.map((category) => {
			const chain = getAncestors(category)
			const root = chain.at(-1) ?? null
			const sub = chain.length >= 2 ? (chain.at(-2) ?? null) : null
			const child = chain.length >= 3 ? (chain.at(-3) ?? null) : null

			return {
				id: category.id,
				name: category.name,
				childCategory: child?.name ?? null,
				subCategory: sub?.name ?? null,
				category: root?.name ?? null,
			}
		})

		return rows
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith("Unable to load categories from backend.")) {
				throw error
			}

			throw new Error(`Unable to load categories from backend. ${error.message}`)
		}

		throw new Error(
			"Unable to load categories from backend. Unknown categories transform error"
		)
	}
}

export async function getRawCategories(): Promise<CategoryRaw[]> {
	return fetchCategoriesFromApi()
}
