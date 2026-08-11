import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Globe } from 'lucide-react'

import { Form } from '@/shared/components/ui/form'
import { Button } from '@/shared/components/ui/button'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useUpdateExternalLink } from '@/features/courses/curriculum/content/hooks/use-lesson-content'
import {
  externalLinkFormSchema,
  type ExternalLinkFormValues,
} from '@/features/courses/curriculum/content/schemas/content.schemas'
import type { ExternalLinkContent } from '@/features/courses/curriculum/content/types'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

interface ExternalLinkEditorProps extends LessonContentParams {
  externalLink: ExternalLinkContent | null
}

function safeDomain(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export function ExternalLinkEditor({ externalLink, ...params }: ExternalLinkEditorProps) {
  const updateExternalLink = useUpdateExternalLink(params)

  const defaultValues: ExternalLinkFormValues = {
    url: externalLink?.url ?? '',
    label: externalLink?.label ?? '',
    description: externalLink?.description ?? '',
    openInNewTab: externalLink?.openInNewTab ?? true,
  }

  const form = useForm<ExternalLinkFormValues>({
    resolver: zodResolver(externalLinkFormSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when the server value itself changes
  }, [externalLink])

  // eslint-disable-next-line react-hooks/incompatible-library -- `watch()` is RHF's documented API for conditionally rendering based on another field's live value; the React Compiler's memoization skip is expected and harmless here (this whole form already re-renders on every keystroke via RHF's own subscription model)
  const watchedUrl = form.watch('url')
  const domain = watchedUrl ? safeDomain(watchedUrl) : null

  function onSubmit(values: ExternalLinkFormValues) {
    updateExternalLink.mutate(
      {
        url: values.url,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- '' (not just null/undefined) must also become undefined so an empty field omits itself entirely
        label: values.label || undefined,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- same as above
        description: values.description || undefined,
        openInNewTab: values.openInNewTab,
      },
      {
        onSuccess: () => toast.success('External link saved'),
        onError: (error) => toast.error('Could not save external link', getSafeErrorMessage(error)),
      },
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          control={form.control}
          name="url"
          label="URL"
          placeholder="https://example.com/resource"
          disabled={updateExternalLink.isPending}
        />
        {domain && (
          <p className="text-caption text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3.5" aria-hidden="true" />
            Links to <span className="font-medium">{domain}</span>
          </p>
        )}
        <TextField
          control={form.control}
          name="label"
          label="Label"
          description="Optional — shown as the link's display text."
          disabled={updateExternalLink.isPending}
        />
        <TextareaField
          control={form.control}
          name="description"
          label="Description"
          rows={3}
          description="Optional — a short note about what the link contains."
          disabled={updateExternalLink.isPending}
        />
        <CheckboxField
          control={form.control}
          name="openInNewTab"
          label="Open in a new tab"
          description="Recommended so students don't lose their place in the course."
          disabled={updateExternalLink.isPending}
        />
        <Button
          type="submit"
          disabled={!form.formState.isDirty || updateExternalLink.isPending}
          className="w-fit"
        >
          {updateExternalLink.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
