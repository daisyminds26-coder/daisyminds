import { Search, X } from 'lucide-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/components/ui/input-group'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Controlled search input for list toolbars — the caller owns debouncing/query-syncing once wired to real data. */
export function SearchBox({ value, onChange, placeholder = 'Search…', className }: SearchBoxProps) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        aria-label={placeholder}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => {
              onChange('')
            }}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
