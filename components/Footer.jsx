import Link from 'next/link'
import AdSlot from '@/components/AdSlot'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/disclaimer', label: 'Disclaimer' },
]

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60">
      <div className="container py-8 text-sm text-muted-foreground">
        <div className="mb-4">
          <AdSlot label="Advertisement — Footer Banner" />
        </div>

        <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          {LINKS.map((l, i) => (
            <span key={l.href} className="flex items-center gap-4">
              <Link href={l.href} className="hover:text-foreground hover:underline underline-offset-4">
                {l.label}
              </Link>
              {i < LINKS.length - 1 && <span aria-hidden className="hidden text-border sm:inline">|</span>}
            </span>
          ))}
        </nav>

        <p className="text-center text-xs">
          © {new Date().getFullYear()} KCET Predictor 2026. Cutoff data is for guidance only. Not affiliated with KEA, the Government of Karnataka, VTU, or any college. Always verify with KEA.
        </p>
      </div>
    </footer>
  )
}
