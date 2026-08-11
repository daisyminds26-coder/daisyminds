import { LayoutList } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'

export function CurriculumEmptyState({ onAddModule }: { onAddModule: () => void }) {
  return (
    <EmptyState
      icon={LayoutList}
      title="Start building your curriculum by adding the first module."
      description="Modules group related lessons together — you can reorder and rename them at any time."
      action={
        <Button type="button" onClick={onAddModule}>
          Add module
        </Button>
      }
    />
  )
}
