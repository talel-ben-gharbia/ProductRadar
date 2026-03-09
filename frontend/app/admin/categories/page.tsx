"use client"

import { useEffect, useState } from "react"
import CategoriesDataTable from "@/components/admin/categories-data-table"
import { getCategoriesWithParents } from "@/services/admin/categories"

export default function CategoriesPage() {
	const [categories, setCategories] = useState<
		Awaited<ReturnType<typeof getCategoriesWithParents>>
	>([])
	const [fetchError, setFetchError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

	const handleFetchCategory = async () => {
		try {
			setLoading(true)
			setFetchError(null)
			const data = await getCategoriesWithParents()
			setCategories(data)
		} catch (error) {
			setFetchError(
				error instanceof Error
					? error.message
					: "Unable to load categories from backend"
			)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void handleFetchCategory()
	}, [])

	return (
		<section className="w-full max-w-none space-y-4">
			<h1 className="text-2xl font-bold">Categories</h1>

			<CategoriesDataTable
				categories={categories}
				loading={loading}
				fetchError={fetchError}
			/>
		</section>
	)
}
