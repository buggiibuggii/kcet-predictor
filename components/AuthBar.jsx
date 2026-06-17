'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogIn, LogOut, User } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useRouter } from 'next/navigation'

export default function AuthBar() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const sb = getBrowserSupabase()
    if (!sb) { setReady(true); return }
    let mounted = true
    sb.auth.getUser().then(({ data }) => { if (mounted) { setUser(data.user); setReady(true) } })
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user || null)
    })
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  async function logout() {
    const sb = getBrowserSupabase()
    if (!sb) return
    await sb.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  if (!ready) return null
  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href="/login"><LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Login</span></Link>
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {(user.email || '?')[0].toUpperCase()}
          </div>
          <span className="hidden sm:inline max-w-[160px] truncate">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/admin">Admin Dashboard</Link></DropdownMenuItem>
        <DropdownMenuItem onClick={logout} className="text-red-600"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
