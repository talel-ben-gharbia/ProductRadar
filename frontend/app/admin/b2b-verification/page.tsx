import B2BVerificationTable from "@/components/admin/b2b-verification-table"

export default function B2BVerificationPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">B2B Verification Queue</h1>
      <p className="text-sm text-muted-foreground">
        Review pending professional accounts and approve or reject onboarding requests.
      </p>
      <B2BVerificationTable />
    </section>
  )
}
