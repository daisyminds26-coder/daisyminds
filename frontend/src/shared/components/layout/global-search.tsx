import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/shared/components/ui/command'
import { Button } from '@/shared/components/ui/button'

/**
 * Global search trigger + command palette. Placeholder for this phase — no
 * search index or API is wired up yet (explicitly excluded: "DO NOT connect
 * APIs yet"). The empty state is the real, permanent state until a search
 * backend exists; it is not simulated data.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground w-full max-w-sm justify-start gap-2 md:w-64"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Search className="size-4" />
        <span className="text-body-sm">Search…</span>
        <kbd className="bg-muted text-muted-foreground border-border text-caption ml-auto hidden rounded border px-1.5 py-0.5 sm:inline-block">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Daisy Minds"
        description="Search students, courses, batches, and more"
      >
        <CommandInput placeholder="Search students, courses, batches…" />
        <CommandList>
          <CommandEmpty>Search is not connected yet.</CommandEmpty>
        </CommandList>
      </CommandDialog>
    </>
  )
}
