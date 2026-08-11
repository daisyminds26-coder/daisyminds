import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { SelectField } from '@/shared/components/forms/select-field'
import { useRoles } from '@/features/users/hooks/use-roles'
import { useAssignRole } from '@/features/users/hooks/use-assign-role'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import { assignRoleSchema, type AssignRoleFormValues } from '@/features/users/schemas/user.schemas'
import type { AdminUser } from '@/features/users/types'

interface AssignRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser | undefined
}

export function AssignRoleDialog({ open, onOpenChange, user }: AssignRoleDialogProps) {
  const rolesQuery = useRoles()
  const assignRole = useAssignRole(user?.id ?? '')
  const form = useForm<AssignRoleFormValues>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: { roleId: user?.roleId ?? '' },
    values: { roleId: user?.roleId ?? '' },
  })

  function onSubmit(values: AssignRoleFormValues) {
    assignRole.mutate(values.roleId, {
      onSuccess: () => {
        toast.success('Role updated')
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error('Could not update role', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign role"
      description={user ? `Change the role for ${user.email}.` : undefined}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="assign-role-form" disabled={assignRole.isPending}>
            {assignRole.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="assign-role-form"
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          noValidate
        >
          <SelectField
            control={form.control}
            name="roleId"
            label="Role"
            options={(rolesQuery.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
          />
        </form>
      </Form>
    </Modal>
  )
}
