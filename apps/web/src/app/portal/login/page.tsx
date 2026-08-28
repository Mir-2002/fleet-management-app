import { portalLogin } from "./actions"

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
      <div className="w-full max-w-sm space-y-6 px-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-blue-600">Fleetman</span>
          </div>
          <p className="text-sm text-slate-500">Client portal sign in</p>
        </div>

        {errorMessage && (
          <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        <form action={portalLogin} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  )
}
