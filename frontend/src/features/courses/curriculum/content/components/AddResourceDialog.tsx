import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Progress } from '@/shared/components/ui/progress'
import { Form } from '@/shared/components/ui/form'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { MediaUploadZone } from '@/features/courses/curriculum/content/components/MediaUploadZone'
import { useAddResource } from '@/features/courses/curriculum/content/hooks/use-lesson-resources'
import {
  resourceMetadataFormSchema,
  type ResourceMetadataFormValues,
} from '@/features/courses/curriculum/content/schemas/content.schemas'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.webp'

interface AddResourceDialogProps extends LessonContentParams {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddResourceDialog({ open, onOpenChange, ...params }: AddResourceDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const addResource = useAddResource(params)

  const form = useForm<ResourceMetadataFormValues>({
    resolver: zodResolver(resourceMetadataFormSchema),
    defaultValues: { title: '', description: '', isDownloadable: true },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedFile(null)
      form.reset({ title: '', description: '', isDownloadable: true })
    }
    onOpenChange(next)
  }

  function onSubmit(values: ResourceMetadataFormValues) {
    if (!selectedFile) {
      toast.error('Select a file first')
      return
    }
    addResource.mutate(
      {
        file: selectedFile,
        title: values.title,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- '' (not just null/undefined) must also become undefined so an empty description omits the field entirely
        description: values.description || undefined,
        isDownloadable: values.isDownloadable,
      },
      {
        onSuccess: () => {
          toast.success('Resource added')
          handleOpenChange(false)
        },
        onError: (error) => toast.error('Could not add resource', getSafeErrorMessage(error)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <MediaUploadZone
            accept={ACCEPT}
            selectedFile={selectedFile}
            onSelectFile={(file) => {
              setSelectedFile(file)
              if (file && !form.getValues('title')) {
                form.setValue('title', file.name.replace(/\.[^./]+$/, ''))
              }
            }}
            disabled={addResource.isPending}
            helperText="PDF, Word, PowerPoint, Excel, ZIP, or image"
          />
          {addResource.isPending && (
            <div className="flex flex-col gap-1.5">
              <Progress value={addResource.progress} />
              <p className="text-caption text-muted-foreground">
                Uploading… {addResource.progress.toString()}%
              </p>
            </div>
          )}
          <Form {...form}>
            <form
              id="add-resource-form"
              onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
              className="flex flex-col gap-4"
              noValidate
            >
              <TextField
                control={form.control}
                name="title"
                label="Title"
                disabled={addResource.isPending}
              />
              <TextareaField
                control={form.control}
                name="description"
                label="Description"
                rows={3}
                disabled={addResource.isPending}
              />
              <CheckboxField
                control={form.control}
                name="isDownloadable"
                label="Downloadable"
                description="Whether students will be able to download this file."
                disabled={addResource.isPending}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-resource-form"
            disabled={!selectedFile || addResource.isPending}
          >
            {addResource.isPending ? 'Uploading…' : 'Add resource'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
