"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Flame,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Percent,
  Shield,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useApiUrl } from "@/lib/use-api-url"
import { useI18n } from "@/lib/i18n-context"
import { B2CNavbar } from "@/components/B2C/b2c-navbar"

type CustomerSession = {
  id: number
  email: string
  name?: string
}

const SUBJECTS = [
  "Service client",
  "Aide",
  "Marques",
  "Promotions",
  "Paiement",
]

const LOGO_DEV_PUBLIC_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY || 'pk_RNnnRFTeTLerEF502SvlPg'

const BRAND_DOMAIN_MAP: Record<string, string> = {
  msi: "msi.com",
  apple: "apple.com",
  lenovo: "lenovo.com",
  asus: "asus.com",
  samsung: "samsung.com",
  hp: "hp.com",
  dell: "dell.com",
  xiaomi: "xiaomi.com",
  jbl: "jbl.com",
  redragon: "redragon.com",
  gigabyte: "gigabyte.com",
  infinix: "infinixmobiles.com",
}

const BRANDS = [
  { name: "MSI", product_count: 1205 },
  { name: "Apple", product_count: 782 },
  { name: "Lenovo", product_count: 694 },
  { name: "ASUS", product_count: 631 },
  { name: "Samsung", product_count: 527 },
  { name: "HP", product_count: 513 },
  { name: "Dell", product_count: 498 },
  { name: "Xiaomi", product_count: 472 },
  { name: "JBL", product_count: 264 },
  { name: "Redragon", product_count: 236 },
  { name: "GIGABYTE", product_count: 221 },
  { name: "Infinix", product_count: 205 },
]

function CompanyLogo({
  name, domain, fallbackGradient = "from-slate-600 to-slate-700", size = "h-14 w-14", bgSize = "p-2"
}: {
  name: string
  domain?: string
  fallbackGradient?: string
  size?: string
  bgSize?: string
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`flex ${size} items-center justify-center rounded-2xl shadow-sm overflow-hidden ${domain && !imgError ? `bg-white ${bgSize}` : `bg-gradient-to-br ${fallbackGradient}`}`}>
      {domain && !imgError ? (
        <img
          src={`https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`}
          alt={name}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

const PLANS = [
  {
    name: "Starter",
    price: "Gratuit",
    period: "",
    features: [
      "10 recherches par jour",
      "Alertes de prix de base",
      "Comparaison de 3 produits",
    ],
    popular: false,
    color: "from-slate-500 to-slate-600",
  },
  {
    name: "Premium",
    price: "9.99 DT",
    period: "/mois",
    features: [
      "Recherches illimitées",
      "Alertes de prix en temps réel",
      "Historique des prix détaillé",
      "Notifications personnalisées",
      "Comparaison de 20 produits",
    ],
    popular: true,
    color: "from-orange-500 to-amber-500",
  },
  {
    name: "Privilège",
    price: "19.99 DT",
    period: "/mois",
    features: [
      "Tout ce qui est inclus dans Premium",
      "Recommandations basées sur IA",
      "Support prioritaire 24/7",
      "Export de données CSV/PDF",
      "API d'accès aux données",
    ],
    popular: false,
    color: "from-purple-600 to-indigo-600",
  },
]

export default function ContactUsPage() {
  const apiUrl = useApiUrl()
  const { t } = useI18n()
  const section = useSearchParams().get("section")

  const [customer, setCustomer] = useState<CustomerSession | null>(null)
  const [customerLoading, setCustomerLoading] = useState(true)

  const [subject, setSubject] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const [activeSection, setActiveSection] = useState<string | null>(section)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch("/api/b2c/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { customer: CustomerSession | null }) => {
        setCustomer(data.customer)
        if (data.customer?.email) setEmail(data.customer.email)
      })
      .catch(() => setCustomer(null))
      .finally(() => setCustomerLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !message || !subject) {
      setError("Veuillez remplir tous les champs obligatoires.")
      return
    }
    setSending(true)
    setError("")
    const fd = new FormData()
    fd.append("subject", subject)
    fd.append("email", email)
    fd.append("message", message)
    if (attachment) fd.append("attachment", attachment)
    try {
      const res = await fetch("/api/b2c/contact", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError("Erreur lors de l'envoi. Veuillez réessayer.")
    }
    setSending(false)
  }

  if (mounted && section === "marques") {
    return (
      <div className="min-h-svh bg-gradient-to-b from-slate-50 to-[#f0f3f8]">
        <B2CNavbar title="Products radar" backHref="/B2C/contact-us" backLabel="Contact" />
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-10">
          <h1 className="text-3xl font-bold tracking-tight">Marques populaires</h1>
          <p className="text-muted-foreground">Découvrez les marques les plus suivies sur ProductRadar.</p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {BRANDS.map((brand) => {
              const domain = BRAND_DOMAIN_MAP[brand.name.toLowerCase().trim()]
              return (
                <Link
                  key={brand.name}
                  href={`/B2C/products?search=${encodeURIComponent(brand.name)}`}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
                >
                  <CompanyLogo
                    name={brand.name}
                    domain={domain}
                    fallbackGradient="from-orange-500 to-amber-600"
                    size="h-14 w-14"
                    bgSize="p-2"
                  />
                  <span className="line-clamp-1 text-center text-xs font-medium text-slate-700 group-hover:text-orange-600">{brand.name}</span>
                  <span className="text-[10px] text-muted-foreground">{brand.product_count.toLocaleString("en-US")} produits</span>
                </Link>
              )
            })}
          </div>
        </main>
      </div>
    )
  }

  if (mounted && section === "promotions") {
    return (
      <div className="min-h-svh bg-gradient-to-b from-slate-50 to-[#f0f3f8]">
        <B2CNavbar title="Products radar" backHref="/B2C/contact-us" backLabel="Contact" />
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-10">
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">Trouvez les meilleures offres et réductions sur ProductRadar.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/B2C/products?sort=discount"
              className="group rounded-xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <Percent className="mb-3 h-8 w-8 text-orange-500" />
              <h3 className="font-semibold">Meilleures offres</h3>
              <p className="mt-1 text-sm text-muted-foreground">Produits avec les plus grandes réductions</p>
            </Link>
            <Link
              href="/B2C/products?sort=trending"
              className="group rounded-xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <Flame className="mb-3 h-8 w-8 text-red-500" />
              <h3 className="font-semibold">Tendances</h3>
              <p className="mt-1 text-sm text-muted-foreground">Produits les plus populaires du moment</p>
            </Link>
            <Link
              href="/B2C/products"
              className="group rounded-xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <ShoppingBag className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="font-semibold">Tous les produits</h3>
              <p className="mt-1 text-sm text-muted-foreground">Parcourez tous les produits disponibles</p>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (mounted && section === "paiement") {
    return (
      <div className="min-h-svh bg-gradient-to-b from-slate-50 to-[#f0f3f8]">
        <B2CNavbar title="Products radar" backHref="/B2C/contact-us" backLabel="Contact" />
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-10">
          <h1 className="text-3xl font-bold tracking-tight">Paiement et Abonnements</h1>
          <p className="text-muted-foreground">
            ProductRadar prend en charge Stripe pour les paiements sécurisés. Choisissez le plan qui vous convient.
          </p>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative border bg-white shadow-sm ${plan.popular ? "ring-2 ring-orange-400" : ""}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                    Plus populaire
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`mt-6 w-full rounded-full bg-gradient-to-r ${plan.color} text-white shadow-sm hover:opacity-90`}
                  >
                    <Link href="/B2C/profile/plans">Choisir {plan.name}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-semibold">Paiement sécurisé par Stripe</p>
                <p className="text-sm text-muted-foreground">
                  Nous utilisons Stripe pour traiter les paiements de manière sécurisée. Nous ne stockons pas vos informations bancaires.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-svh bg-gradient-to-b from-slate-50 to-[#f0f3f8]">
        <B2CNavbar title="Products radar" />
        <main className="mx-auto max-w-lg px-4 py-20 text-center sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">Message envoyé !</h1>
          <p className="mt-3 text-muted-foreground">
            Merci de nous avoir contactés. Nous vous répondrons dans les plus brefs délais.
          </p>
          <Button asChild className="mt-8 rounded-full">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-slate-50 to-[#f0f3f8]">
      <B2CNavbar title="Products radar" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-10">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Accueil</Link>
          <ChevronDown className="h-3 w-3 -rotate-90" />
          <span className="font-medium text-foreground">Contactez-nous</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          {/* Info Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contactez-nous</h1>
              <p className="mt-2 text-muted-foreground">
                Une question, une suggestion ou besoin d'aide ? Notre équipe est là pour vous.
              </p>
            </div>

            {/* Service client */}
            <Link
              href="#"
              onClick={(e) => { e.preventDefault(); setSubject("Service client") }}
              className="flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-orange-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <HelpCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Service client</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Besoin d&apos;aide ? Contactez notre équipe pour toute question.
                </p>
              </div>
            </Link>

            {/* Aide */}
            <details className="group rounded-xl border bg-white shadow-sm transition-all">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                  </div>
                  Aide
                </div>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t px-4 pb-4 pt-3 text-sm text-muted-foreground space-y-2">
                <p><strong>Comment comparer les prix ?</strong><br/>Utilisez notre barre de recherche pour trouver un produit, puis comparez les offres de différents vendeurs.</p>
                <p><strong>Comment créer une alerte ?</strong><br/>Connectez-vous à votre compte, accédez à un produit et cliquez sur &quot;Créer une alerte&quot; pour être notifié des changements de prix.</p>
                <p><strong>Comment passer en Premium ?</strong><br/>Rendez-vous dans la section <Link href="/B2C/profile/plans" className="text-orange-600 underline">Abonnements</Link> pour découvrir nos offres.</p>
              </div>
            </details>

            {/* Marques */}
            <Link
              href="/B2C/contact-us?section=marques"
              className="flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-orange-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Store className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Marques</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Découvrez les marques populaires suivies sur ProductRadar.
                </p>
              </div>
            </Link>

            {/* Promotions */}
            <Link
              href="/B2C/contact-us?section=promotions"
              className="flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-orange-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Promotions</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Trouvez les meilleures offres et réductions disponibles.
                </p>
              </div>
            </Link>

            {/* Paiement */}
            <Link
              href="/B2C/contact-us?section=paiement"
              className="flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-orange-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold">Paiement</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Informations sur les abonnements et les modes de paiement acceptés.
                </p>
              </div>
            </Link>
          </div>

          {/* Contact Form */}
          <Card className="border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Nous écrire</CardTitle>
              <CardDescription>
                Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un sujet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Sujets</SelectLabel>
                        {SUBJECTS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachment">Document joint</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="attachment"
                      type="file"
                      className="cursor-pointer"
                      onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                    />
                    {attachment && (
                      <button type="button" onClick={() => setAttachment(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Comment pouvons-nous vous aider ?"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
