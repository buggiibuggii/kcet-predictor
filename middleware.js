import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request) {
  const response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          response.cookies.set({ name, value, ...options })
        }
      },
    },
  })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  // Guard /admin (page) and /api/admin (server) routes
  const pathname = request.nextUrl.pathname
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminApi = pathname.startsWith('/api/admin/')
  if (isAdminPage || isAdminApi) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (isAdminApi) {
        return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        })
      }
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    // Check admin whitelist
    const adminList = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    if (adminList.length > 0 && !adminList.includes((user.email || '').toLowerCase())) {
      if (isAdminApi) {
        return new NextResponse(JSON.stringify({ error: 'Forbidden: admin only' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        })
      }
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('error', 'not_admin')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
