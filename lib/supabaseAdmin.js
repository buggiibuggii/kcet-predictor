import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server-side admin client. Uses service role if available (for writes/admin ops),
// falls back to anon key for reads.
export function getAdminClient() {
  if (!supabaseUrl) return null
  const key = serviceKey || anonKey
  if (!key) return null
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function hasServiceRole() {
  return !!serviceKey
}
