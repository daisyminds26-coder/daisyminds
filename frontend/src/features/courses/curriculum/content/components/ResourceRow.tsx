import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Download,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { Form } from '@/shared/components/ui/form'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import {
  useDeleteResource,
  useResourceDeliveryUrl,
  useUpdateResourceMetadata,
} from '@/features/courses/curriculum/content/hooks/use-lesson-resources'
import {
  resourceMetadataFormSchema,
  type ResourceMetadataFormValues,
} from '@/features/courses/curriculum/content/schemas/content.schemas'
import type { LessonResource } from '@/features/courses/curriculum/content/types'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ResourceRowProps extends LessonContentParams {
  resource: LessonResource
  index: number
  isFirst: boolean
  isLast: boolean
  disabled: boolean
  onMoveUp: (resource: LessonResource) => void
  onMoveDown: (resource: LessonResource) => void
}

export function ResourceRow({
  resource,
  index,
  isFirst,
  isLast,
  disabled,
  onMoveUp,
  onMoveDown,
  ...params
}: ResourceRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: resource.id,
    disabled,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMetadata = useUpdateResourceMetadata(params)
  const deleteResource = useDeleteResource(params)
  const deliveryUrl = useResourceDeliveryUrl(params)

  const form = useForm<ResourceMetadataFormValues>({
    resolver: zodResolver(resourceMetadataFormSchema),
    defaultValues: {
      title: resource.title,
      description: resource.description ?? '',
      isDownloadable: resource.isDownloadable,
    },
  })

  function handleDownload() {
    deliveryUrl.mutate(resource.id, {
      onSuccess: (result) => {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      },
      onError: (error) => toast.error('Could not open resource', getSafeErrorMessage(error)),
    })
  }

  function onSubmitEdit(values: ResourceMetadataFormValues) {
    updateMetadata.mutate(
      {
        resourceId: resource.id,
        payload: {
          title: values.title,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- '' (not just null/undefined) must also become undefined so an empty description omits the field entirely
          description: values.description || undefined,
          isDownloadable: values.isDownloadable,
        },
      },
      {
        onSuccess: () => {
          toast.success('Resource updated')
          setEditOpen(false)
        },
        onError: (error) => toast.error('Could not update resource', getSafeErrorMessage(error)),
      },
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="border-border bg-background flex items-center gap-2 rounded-md border p-2 data-dragging:opacity-50"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Move resource ${String(index + 1)}: ${resource.title}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="text-caption text-muted-foreground w-5 shrink-0 text-center font-mono">
        {index + 1}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-sm truncate font-medium">{resource.title}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-caption">
            {resource.resourceType}
          </Badge>
          <span className="text-caption text-muted-foreground uppercase">{resource.format}</span>
          <span className="text-caption text-muted-foreground">{formatBytes(resource.bytes)}</span>
          {!resource.isDownloadable && (
            <Badge variant="outline" className="text-caption">
              Not downloadable
            </Badge>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for resource ${resource.title}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              onMoveUp(resource)
            }}
            disabled={isFirst}
          >
            <ArrowUpToLine />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onMoveDown(resource)
            }}
            disabled={isLast}
          >
            <ArrowDownToLine />
            Move down
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDownload}>
            <Download />
            Preview / download
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setEditOpen(true)
            }}
          >
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setConfirmDelete(true)
            }}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit resource</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              id={`resource-edit-${resource.id}`}
              onSubmit={(event) => void form.handleSubmit(onSubmitEdit)(event)}
              className="flex flex-col gap-4"
              noValidate
            >
              <TextField control={form.control} name="title" label="Title" />
              <TextareaField
                control={form.control}
                name="description"
                label="Description"
                rows={3}
              />
              <CheckboxField
                control={form.control}
                name="isDownloadable"
                label="Downloadable"
                description="Whether students will be able to download this file."
              />
            </form>
          </Form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={`resource-edit-${resource.id}`}
              disabled={updateMetadata.isPending}
            >
              {updateMetadata.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this resource?"
        description={`"${resource.title}" will be removed from this lesson. This cannot be undone.`}
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={deleteResource.isPending}
        onConfirm={() => {
          deleteResource.mutate(resource.id, {
            onSuccess: () => {
              toast.success('Resource deleted')
              setConfirmDelete(false)
            },
            onError: (error) => {
              toast.error('Could not delete resource', getSafeErrorMessage(error))
              setConfirmDelete(false)
            },
          })
        }}
      />
    </div>
  )
}
