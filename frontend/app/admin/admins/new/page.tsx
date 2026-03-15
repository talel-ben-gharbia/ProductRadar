import { redirect } from "next/navigation"

export default function NewAdminPage() {
  redirect("/admin/admins?add=1")
}
