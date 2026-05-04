import { Lock, Crown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function B2BPlanGate({ featureName }: { featureName: string }) {
  return (
    <Card className="mx-auto max-w-2xl mt-12 border-border/50 shadow-sm text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500 shadow-sm">
          <Crown className="size-8" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Upgrade to Gold Plan</CardTitle>
        <CardDescription className="text-base mt-2">
          The <strong className="text-foreground">{featureName}</strong> feature is restricted to the Gold subscription plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2 mb-2">
            <Lock className="size-4" /> This workspace section is locked.
          </p>
          <p>
            Gold members get access to advanced analytics, competitor tracking, API exports, priority support, and much more. 
            Contact your account manager to upgrade your subscription.
          </p>
        </div>
        <Button className="w-full sm:w-auto px-8 font-medium">Contact Sales</Button>
      </CardContent>
    </Card>
  )
}
