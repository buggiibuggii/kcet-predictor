export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <div className="mb-2 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs">
          Advertisement Slot — Google AdSense (footer)
        </div>
        <p>© {new Date().getFullYear()} KCET Predictor. Cutoff data is for guidance only. Always verify with KEA.</p>
      </div>
    </footer>
  )
}
