import Link from "next/link"
import {
  ArrowUpRight,
  Download,
  Eye,
  History,
  Shuffle,
  UserCog,
} from "lucide-react"

const TOOLS = [
  {
    title: "Admin Management",
    description:
      "View, create, and delete administrator accounts. Manage who has access to the back office.",
    href: "/admin/admins",
    icon: UserCog,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    ring: "ring-indigo-500/20",
  },
  {
    title: "Manage Roles",
    description:
      "Assign or change roles between Super Admin and Sub Admin. Includes safeguards against removing the last Super Admin.",
    href: "/admin/admins/roles",
    icon: Shuffle,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    ring: "ring-violet-500/20",
  },
  {
    title: "Activity Log",
    description:
      "Immutable audit trail of all admin actions — account creation, role changes, deletions, and more.",
    href: "/admin/activity-log",
    icon: History,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-500/20",
  },
  {
    title: "System Health",
    description:
      "Live monitoring of core backend services, scraping success rates, source health, and endpoint latency.",
    href: "/admin/system-health",
    icon: Eye,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    ring: "ring-emerald-500/20",
  },
  {
    title: "Export Data",
    description:
      "Download catalogue datasets — products, listings, categories, and sellers — as CSV or JSON files.",
    href: "/admin/export",
    icon: Download,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    ring: "ring-sky-500/20",
  },
]

export default function AdministrationHubPage() {
  return (
    <section className="w-full max-w-none space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Super Admin tools for managing administrator accounts, reviewing the immutable audit trail, monitoring system
          health, and exporting catalogue data.
        </p>
      </div>

      {/* Tools grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon

          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs hover:shadow-md hover:border-border/100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* Icon */}
              <div
                className={`mb-4 flex size-11 items-center justify-center rounded-xl ${tool.bg} ring-1 ${tool.ring} ring-inset`}
              >
                <Icon className={`size-5 ${tool.color}`} />
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {tool.title}
              </h3>

              {/* Description */}
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tool.description}
              </p>

              {/* Arrow indicator */}
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground/70 transition-colors group-hover:text-primary">
                <span>Open</span>
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
