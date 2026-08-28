import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const role = user?.app_metadata?.user_role ?? null

  console.log(`[middleware] ${pathname} | user: ${user?.id ?? 'none'} | role: ${role}`)

  // ── Portal login: public, but redirect already-authed clients away ──
  if (pathname === '/portal/login') {
    if (role === 'CLIENT') {
      return NextResponse.redirect(new URL('/portal/requests', request.url))
    }
    return supabaseResponse
  }

  // ── Portal routes: CLIENT only ──
  if (pathname.startsWith('/portal')) {
    if (!user) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    if (role !== 'CLIENT') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/portal/login?error=unauthorized', request.url))
    }
    return supabaseResponse
  }

  // ── Dispatcher login / auth callbacks: public ──
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (role === 'DISPATCHER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (role === 'CLIENT') {
      return NextResponse.redirect(new URL('/portal/requests', request.url))
    }
    return supabaseResponse
  }

  // ── All other routes: DISPATCHER only ──
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (role !== 'DISPATCHER') {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
