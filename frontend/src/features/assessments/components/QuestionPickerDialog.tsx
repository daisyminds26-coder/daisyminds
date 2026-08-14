import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useQuestionsList } from '@/features/question-bank/hooks/use-questions-list'
import { QuestionTypeBadge } from '@/features/question-bank/components/QuestionTypeBadge'
import type { AdminQuestion } from '@/features/question-bank/types'

interface QuestionPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  excludeIds: string[]
  onConfirm: (questions: AdminQuestion[]) => void
}

export function QuestionPickerDialog({
  open,
  onOpenChange,
  courseId,
  excludeIds,
  onConfirm,
}: QuestionPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, AdminQuestion>>(new Map())

  const questionsQuery = useQuestionsList({
    page: 1,
    limit: 100,
    courseId,
    status: 'ACTIVE',
    search: search || undefined,
  })
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])
  const available = (questionsQuery.data?.data ?? []).filter(
    (question) => !excludeSet.has(question.id),
  )

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(new Map())
        onOpenChange(next)
      }}
      title="Add questions"
      description="Only ACTIVE questions from this assessment's course are shown."
      className="sm:max-w-2xl"
    >
      <div className="flex max-h-[60vh] flex-col gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search question bank…" />
        <div className="border-border flex-1 overflow-y-auto rounded-lg border">
          {questionsQuery.isLoading ? (
            <div className="p-3">
              <ListSkeleton rows={4} />
            </div>
          ) : available.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No questions found"
              description="Try a different search, or add questions to the bank first."
            />
          ) : (
            available.map((question) => {
              const checked = selected.has(question.id)
              return (
                <label
                  key={question.id}
                  className="border-border flex items-start gap-3 border-b p-3 last:border-b-0"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSelected((prev) => {
                        const next = new Map(prev)
                        if (value) next.set(question.id, question)
                        else next.delete(question.id)
                        return next
                      })
                    }}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-body-sm line-clamp-2">{question.questionText}</span>
                    <div className="flex items-center gap-2">
                      <QuestionTypeBadge type={question.questionType} />
                      <span className="text-caption text-muted-foreground">
                        {question.marks} marks · {question.questionCode}
                      </span>
                    </div>
                  </div>
                </label>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selected.size === 0}
              onClick={() => {
                onConfirm([...selected.values()])
                setSelected(new Map())
                onOpenChange(false)
              }}
            >
              Add {selected.size > 0 ? selected.size : ''} question{selected.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
