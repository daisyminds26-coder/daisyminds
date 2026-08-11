import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  useCreateModule,
  useUpdateModule,
} from '@/features/courses/curriculum/hooks/use-module-mutations'
import {
  moduleFormSchema,
  type ModuleFormValues,
} from '@/features/courses/curriculum/schemas/curriculum.schemas'
import type { CurriculumModule } from '@/features/courses/curriculum/types'

interface ModuleFormDrawerProps {
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit mode; absent → create mode. */
  module?: CurriculumModule
}

const DEFAULT_VALUES: ModuleFormValues = {
  title: '',
  description: '',
  estimatedDurationMinutes: '',
}

/** Backend always appends a new module to the end — no position field is ever shown here (task's own "do not ask admin for position" rule). */
export function ModuleFormDrawer({ courseId, open, onOpenChange, module }: ModuleFormDrawerProps) {
  const isEdit = !!module
  const createModule = useCreateModule(courseId)
  const updateModule = useUpdateModule(courseId)
  const isPending = createModule.isPending || updateModule.isPending

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      module
        ? {
            title: module.title,
            description: module.description,
            estimatedDurationMinutes: module.estimatedDurationMinutes
              ? String(module.estimatedDurationMinutes)
              : '',
          }
        : DEFAULT_VALUES,
    )
  }, [open, module, form])

  function close() {
    onOpenChange(false)
  }

  function onSubmit(values: ModuleFormValues) {
    const payload = {
      title: values.title,
      description: values.description,
      estimatedDurationMinutes: values.estimatedDurationMinutes
        ? Number(values.estimatedDurationMinutes)
        : undefined,
    }

    if (isEdit) {
      updateModule.mutate(
        { moduleId: module.id, payload },
        {
          onSuccess: () => {
            toast.success('Module updated')
            close()
          },
          onError: (error) => toast.error('Could not update module', getSafeErrorMessage(error)),
        },
      )
    } else {
      createModule.mutate(payload, {
        onSuccess: () => {
          toast.success('Module added')
          close()
        },
        onError: (error) => toast.error('Could not create module', getSafeErrorMessage(error)),
      })
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit module' : 'Add module'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="module-form" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add module'}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="module-form"
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextField control={form.control} name="title" label="Title" />
          <TextareaField control={form.control} name="description" label="Description" rows={4} />
          <TextField
            control={form.control}
            name="estimatedDurationMinutes"
            label="Estimated duration (minutes)"
            description="Optional — a rough estimate for admins, not shown to students yet."
          />
        </form>
      </Form>
    </Drawer>
  )
}
