import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerSupabase() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        try { return cookieStore.getAll() } catch { return [] }
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options)
          }
        } catch (e) { /* called from a server component without setable cookies */ }
      },
    },
  })
}

export async function getCurrentUser() {
  const sb = await getServerSupabase()
  if (!sb) return null
  const { data: { user } } = await sb.auth.getUser()
  return user || null
}

export function isAdminEmail(email) {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (list.length === 0) return true // permissive default until ADMIN_EMAILS configured
  return list.includes(email.toLowerCase())
}

export function adminWhitelistConfigured() {
  return !!(process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.trim())
}
