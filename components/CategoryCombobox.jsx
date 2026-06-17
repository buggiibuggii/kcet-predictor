'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CATEGORY_GROUPS, findCategory, formatCategoryLabel } from '@/lib/categories'

export default function CategoryCombobox({ value, onChange, className }) {
  const [open, setOpen] = useState(false)
  const selected = findCategory(value) || findCategory('GM')

  const groups = useMemo(() => CATEGORY_GROUPS, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-11 w-full justify-between font-normal', className)}
        >
          <span className="truncate text-left">
            {selected ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
                <span className="mx-1.5 text-muted-foreground">—</span>
                <span>{selected.name}</span>
              </>
            ) : 'Select category'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue is what we set on CommandItem's value prop
            const v = String(itemValue || '').toLowerCase()
            const q = String(search || '').toLowerCase().trim()
            if (!q) return 1
            return v.includes(q) ? 1 : 0
          }}
        >
          <CommandInput placeholder="Search by code or name…" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No categories found.</CommandEmpty>
            {groups.map((g, gi) => (
              <div key={g.group}>
                <CommandGroup heading={g.group}>
                  {g.options.map((o) => {
                    const isSelected = selected?.code === o.code
                    return (
                      <CommandItem
                        key={o.code}
                        // Encode searchable string into value so search by code or name works
                        value={`${o.code} ${o.name} ${g.group}`}
                        onSelect={() => {
                          onChange?.(o.code)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                        <span className="font-mono text-xs text-muted-foreground w-12">{o.code}</span>
                        <span className="ml-2">{o.name}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {gi < groups.length - 1 && <CommandSeparator />}
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { formatCategoryLabel }
