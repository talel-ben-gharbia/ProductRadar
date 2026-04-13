"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const PLANS = [
  {
    id: "freemium",
    name: "Freemium",
    description: "Perfect for casual shoppers",
    price: "Free",
    billing: "Forever",
    features: [
      { label: "Favorite limit", value: 5 },
      { label: "Alerts limit", value: 3 },
      { label: "Price history access", value: 1 },
    ],
    current: true,
    highlighted: false,
    cta: "Your Current Plan",
    ctaVariant: "outline" as const,
  },
  {
    id: "premium_monthly",
    name: "Premium",
    description: "Best for regular buyers",
    price: "50",
    oldPrice: "65",
    currency: "DT",
    billing: "Per month",
    discount: "-23%",
    features: [
      { label: "Favorite limit", value: 999 },
      { label: "Alerts limit", value: 20 },
      { label: "Price history access", value: 6 },
    ],
    current: false,
    highlighted: true,
    cta: "Upgrade to Premium",
    ctaVariant: "default" as const,
  },
  {
    id: "premium_yearly",
    name: "Premium yearly",
    description: "Save 30% with annual billing",
    price: "420",
    oldPrice: "600",
    currency: "DT",
    billing: "Per year",
    monthlyEquivalent: "35 DT/month",
    savings: "Save 30%",
    discount: "-30%",
    features: [
      { label: "Favorite limit", value: 999 },
      { label: "Alerts limit", value: 20 },
      { label: "Price history access", value: 6 },
    ],
    current: false,
    highlighted: false,
    cta: "Upgrade to Premium Yearly",
    ctaVariant: "default" as const,
  },
]

export function ProfilePricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-base text-muted-foreground">
          Choose the perfect plan for your needs. Upgrade anytime to unlock more features.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className="relative">
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                  BEST VALUE
                </div>
              </div>
            )}

            <Card
              className={`relative overflow-hidden transition-all duration-300 ${
                plan.highlighted
                  ? "border-primary/50 shadow-xl scale-105 lg:scale-110 bg-linear-to-br from-slate-50 to-white"
                  : plan.current
                    ? "border-green-200 bg-linear-to-br from-green-50/50 to-white shadow-md"
                    : "shadow-md hover:shadow-lg hover:border-primary/30 transition-all"
              }`}
            >
              <div className="p-8 space-y-6">
                {/* Discount Badge */}
                {plan.discount && !plan.current && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold">
                      {plan.discount}
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="space-y-2 pb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    {plan.currency && (
                      <span className="text-xl font-semibold text-muted-foreground">{plan.currency}</span>
                    )}
                    {plan.oldPrice && (
                      <span className="text-lg text-red-600 line-through font-semibold ml-auto">
                        {plan.oldPrice} {plan.currency}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{plan.billing}</p>
                  {plan.monthlyEquivalent && (
                    <p className="text-sm text-muted-foreground pt-1 bg-blue-50 px-3 py-2 rounded-lg inline-block">
                      <span className="font-semibold text-blue-900">{plan.monthlyEquivalent}</span>
                    </p>
                  )}
                  {plan.savings && (
                    <p className="text-sm font-bold text-green-600 pt-1">✓ {plan.savings}</p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full font-semibold py-6 text-base ${plan.ctaVariant === "default" ? "bg-black hover:bg-black/90 shadow-lg" : ""}`}
                  variant={plan.ctaVariant}
                  disabled={plan.current}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.cta}
                </Button>

                {/* Features List */}
                <div className="pt-6 border-t space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature.label} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">{feature.label}</p>
                        <p className="font-bold text-lg text-foreground">{feature.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Current Plan Badge */}
                {plan.current && (
                  <div className="pt-4 bg-green-100 px-4 py-3 rounded-lg text-center">
                    <p className="text-sm font-bold text-green-700">✓ YOUR CURRENT PLAN</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <Card className="bg-blue-50/30 border-blue-200/50 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Plan Details</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Favorites limit:</strong> Maximum number of products you can save
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Alerts limit:</strong> Number of price alerts you can set up
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Price history access:</strong> How many months of price history you can view
              </span>
            </li>
          </ul>
        </div>
      </Card>

      {/* FAQ Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Can I cancel anytime?</p>
              <p>Yes! You can cancel your subscription at any time and return to your Freemium plan.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">What happens when I upgrade?</p>
              <p>Your limits will increase immediately and you&apos;ll have access to all premium features right away.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Do you offer refunds?</p>
              <p>Full refunds are available within 7 days of purchase. Contact support for more information.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Can I switch between plans?</p>
              <p>Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
