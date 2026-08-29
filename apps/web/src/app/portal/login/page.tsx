import { portalLogin } from "./actions"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function PortalLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMessage =
    searchParams.error === 'unauthorized'
      ? 'Access denied. This portal is for clients only.'
      : searchParams.error

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="pb-2">
          <h1 className="text-xl font-semibold text-primary">Fleetman</h1>
          <p className="text-sm text-muted-foreground">Client portal sign in</p>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          <form action={portalLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
