import { login } from "./actions"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMessage =
    searchParams.error === 'unauthorized'
      ? 'Access denied. Dispatcher accounts only.'
      : searchParams.error

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div>
          <h1 className="text-2xl font-bold">FleetMan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dispatcher sign in</p>
        </div>

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        <form action={login} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  )
}
