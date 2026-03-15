import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-start justify-center gap-5 p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Product Radar</h1>
      <p className="max-w-2xl text-muted-foreground">
        Admin routes live under <code>/admin</code>. Use the actions below to
        open the admin dashboard or sign in.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin">Open Admin</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/login">Admin Login</Link>
        </Button>
      </div>
    </main>
  )
}
