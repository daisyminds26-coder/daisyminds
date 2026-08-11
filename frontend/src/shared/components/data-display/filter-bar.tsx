import { useState } from 'react'
import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { Drawer } from '@/shared/components/overlays/drawer'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterDef {
  id: string
  label: string
  options: readonly FilterOption[]
  value: string | undefined
  onChange: (value: string | undefined) => void
}

interface FilterBarProps {
  filters: readonly FilterDef[]
  onClearAll?: () => void
  /** Extra controls (e.g. a "Show deleted" toggle) rendered inside the drawer alongside the filters. */
  children?: ReactNode
}

/**
 * Explicit per-resource filter controls (API-STANDARDS.md §4 — no
 * free-form filter DSL, one control per whitelisted, indexed field).
 *
 * Always collapsed behind a single "Filters" button that opens a `Drawer`
 * — a row of 4-5 native `<Select>` triggers inline next to the search box
 * and table toolbar ate too much width and looked cluttered even on wide
 * screens, so this isn't just a small-screen concession.
 */
export function FilterBar({ filters, onClearAll, children }: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeCount = filters.filter((filter) => filter.value !== undefined).length
  const hasActiveFilters = activeCount > 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          setDrawerOpen(true)
        }}
      >
        <SlidersHorizontal className="size-3.5" />
        Filters
        {hasActiveFilters && (
          <span className="bg-primary text-primary-foreground flex size-4.5 items-center justify-center rounded-full text-[11px] font-medium">
            {activeCount}
          </span>
        )}
      </Button>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Filters"
        className="sm:max-w-sm"
        footer={
          <>
            {hasActiveFilters && onClearAll && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClearAll()
                }}
              >
                Clear all
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                setDrawerOpen(false)
              }}
            >
              Done
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {filters.map((filter) => (
            <div key={filter.id} className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">{filter.label}</span>
              <Select
                value={filter.value}
                onValueChange={(value) => {
                  filter.onChange(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {children && <div className="flex flex-col gap-2">{children}</div>}
        </div>
      </Drawer>
    </>
  )
}
