import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Form } from '@/shared/components/ui/form'
import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { RichTextField } from '@/shared/components/forms/rich-text-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useUpdateTextContent } from '@/features/courses/curriculum/content/hooks/use-lesson-content'
import { useUnsavedChangesGuard } from '@/features/courses/curriculum/content/hooks/use-unsaved-changes-guard'
import {
  textContentFormSchema,
  type TextContentFormValues,
} from '@/features/courses/curriculum/content/schemas/content.schemas'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

interface TextContentEditorProps extends LessonContentParams {
  textContent: string | null
}

/**
 * Explicit save only — no autosave. A lesson body is real authored content;
 * silently saving partial/broken drafts as the admin types would be worse
 * than requiring a deliberate "Save" click (task's own V1 UX requirement).
 */
export function TextContentEditor({ textContent, ...params }: TextContentEditorProps) {
  const updateTextContent = useUpdateTextContent(params)

  const form = useForm<TextContentFormValues>({
    resolver: zodResolver(textContentFormSchema),
    defaultValues: { textContent: textContent ?? '' },
  })

  useEffect(() => {
    form.reset({ textContent: textContent ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when the server value itself changes, not on every render
  }, [textContent])

  const blocker = useUnsavedChangesGuard(form.formState.isDirty)

  function onSubmit(values: TextContentFormValues) {
    updateTextContent.mutate(values.textContent, {
      onSuccess: (updated) => {
        toast.success('Text content saved')
        form.reset({ textContent: updated.textContent ?? '' })
      },
      onError: (error) => toast.error('Could not save text content', getSafeErrorMessage(error)),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
        noValidate
      >
        <RichTextField
          control={form.control}
          name="textContent"
          label="Lesson body"
          placeholder="Write the lesson content…"
          disabled={updateTextContent.isPending}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption text-muted-foreground">
            {form.formState.isDirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <Button
            type="submit"
            disabled={!form.formState.isDirty || updateTextContent.isPending}
            className="w-fit"
          >
            {updateTextContent.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset()
        }}
        title="Leave without saving?"
        description="You have unsaved changes to this lesson's text content. Leaving now will discard them."
        confirmLabel="Leave without saving"
        tone="destructive"
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </Form>
  )
}
