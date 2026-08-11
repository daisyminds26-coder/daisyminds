import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { useRoles } from '@/features/users/hooks/use-roles'
import { useCreateUser } from '@/features/users/hooks/use-create-user'
import { useUpdateUser } from '@/features/users/hooks/use-update-user'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
} from '@/features/users/schemas/user.schemas'
import type { AdminUser } from '@/features/users/types'

interface UserFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit mode; absent → create mode. */
  user?: AdminUser
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const rolesQuery = useRoles()
  const createUser = useCreateUser()
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', roleId: '', sendVerificationEmail: true },
  })

  function onSubmit(values: CreateUserFormValues) {
    createUser.mutate(values, {
      onSuccess: () => {
        toast.success('User created')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not create user', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Form {...form}>
      <form
        id="user-form"
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Temporary password"
          autoComplete="new-password"
        />
        <SelectField
          control={form.control}
          name="roleId"
          label="Role"
          options={(rolesQuery.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
        />
        <CheckboxField
          control={form.control}
          name="sendVerificationEmail"
          label="Send verification email"
          description="If unchecked, the account is created as ACTIVE immediately."
        />
      </form>
    </Form>
  )
}

function EditUserForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const updateUser = useUpdateUser(user.id)
  const form = useForm<{ email: string }>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { email: user.email },
  })

  useEffect(() => {
    form.reset({ email: user.email })
  }, [user.id, user.email, form])

  function onSubmit(values: { email: string }) {
    updateUser.mutate(values.email, {
      onSuccess: () => {
        toast.success('User updated')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not update user', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Form {...form}>
      <form
        id="user-form"
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
        />
      </form>
    </Form>
  )
}

export function UserFormDrawer({ open, onOpenChange, user }: UserFormDrawerProps) {
  const isEdit = !!user

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit user' : 'Create user'}
      description={
        isEdit ? undefined : 'The user receives sign-in instructions based on your choice below.'
      }
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
          <Button type="submit" form="user-form">
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      {isEdit ? (
        <EditUserForm
          user={user}
          onDone={() => {
            onOpenChange(false)
          }}
        />
      ) : (
        <CreateUserForm
          onDone={() => {
            onOpenChange(false)
          }}
        />
      )}
    </Drawer>
  )
}
