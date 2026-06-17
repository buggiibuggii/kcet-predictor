export default function AdSlot({ label = 'Advertisement', className = '' }) {
  return (
    <div
      className={
        'flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground ' +
        className
      }
    >
      {label}
    </div>
  )
}
