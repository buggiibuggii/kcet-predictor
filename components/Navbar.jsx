'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GraduationCap, Moon, Sun, ShieldCheck } from 'lucide-react'
import AuthBar from '@/components/AuthBar'

export default function Navbar() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])
  function toggleTheme() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
    setIsDark(next)
  }
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg">
            KCET <span className="text-primary">Predictor</span>
            <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">2026</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline px-2">Predict</Link>
          <Link href="/faq" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline px-2">FAQ</Link>
          <Link href="/about" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline px-2">About</Link>
          <Link href="/contact" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline px-2">Contact</Link>
          <Link href="/admin" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">
            <span className="inline-flex items-center gap-1 px-2"><ShieldCheck className="h-4 w-4" /> Admin</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <AuthBar />
        </nav>
      </div>
    </header>
  )
}
