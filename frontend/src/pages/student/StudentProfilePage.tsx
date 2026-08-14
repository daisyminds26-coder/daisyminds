import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Progress } from '@/shared/components/ui/progress'
import { UserAvatar } from '@/shared/components/data-display/user-avatar'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { CardSkeleton } from '@/shared/components/feedback/skeletons'
import { TextField } from '@/shared/components/forms/text-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useStudentProfile, useUpdateStudentProfile } from '@/features/student-portal'
import {
  studentProfileFormSchema,
  type StudentProfileFormValues,
} from '@/features/student-portal/schemas/student-profile.schemas'

const COMPLETION_LABELS: Record<string, string> = {
  COMPLETE: 'Profile complete',
  PARTIAL: 'Profile partially complete',
  INCOMPLETE: 'Profile incomplete',
}

export default function StudentProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useStudentProfile()
  const updateProfile = useUpdateStudentProfile()

  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileFormSchema),
    defaultValues: {
      phone: '',
      alternatePhone: '',
      address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' },
      emergencyContact: { name: '', phone: '', relationship: '' },
    },
  })

  useEffect(() => {
    if (!profile) return
    const contact = profile.emergencyContacts[0]
    form.reset({
      phone: profile.phone ?? '',
      alternatePhone: profile.alternatePhone ?? '',
      address: {
        line1: profile.address?.line1 ?? '',
        line2: profile.address?.line2 ?? '',
        city: profile.address?.city ?? '',
        state: profile.address?.state ?? '',
        postalCode: profile.address?.postalCode ?? '',
        country: profile.address?.country ?? '',
      },
      emergencyContact: {
        name: contact?.name ?? '',
        phone: contact?.phone ?? '',
        relationship: contact?.relationship ?? '',
      },
    })
  }, [profile, form])

  function onSubmit(values: StudentProfileFormValues) {
    updateProfile.mutate(
      {
        phone: values.phone,
        alternatePhone: values.alternatePhone === '' ? undefined : values.alternatePhone,
        address: values.address,
        emergencyContacts: [
          {
            name: values.emergencyContact.name,
            phone: values.emergencyContact.phone,
            relationship: values.emergencyContact.relationship,
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success('Profile updated')
        },
        onError: (error) => {
          toast.error('Could not update profile', getSafeErrorMessage(error))
        },
      },
    )
  }

  if (isLoading) {
    return (
      <PageContainer title="Profile">
        <CardSkeleton />
      </PageContainer>
    )
  }

  if (isError || !profile) {
    return (
      <PageContainer title="Profile">
        <ErrorState title="Couldn't load your profile" onRetry={() => void refetch()} />
      </PageContainer>
    )
  }

  const fullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <PageContainer title="Profile" description="Your details on file with Daisy Minds.">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <UserAvatar name={fullName} avatarUrl={profile.profilePhotoUrl ?? undefined} size="lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <p className="text-h3 font-semibold">{fullName}</p>
            <p className="text-body-sm text-muted-foreground">{profile.email}</p>
            <p className="text-caption text-muted-foreground">Student ID: {profile.studentId}</p>
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-48">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-muted-foreground">
                {COMPLETION_LABELS[profile.profileCompletionStatus]}
              </span>
              <Badge variant="outline">{profile.profileCompletionPercentage}%</Badge>
            </div>
            <Progress value={profile.profileCompletionPercentage} />
          </div>
        </CardContent>
      </Card>

      <SectionContainer
        title="Contact details"
        description="Keep these up to date so we can reach you."
      >
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
                className="flex flex-col gap-6"
                noValidate
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField control={form.control} name="phone" label="Phone" type="tel" />
                  <TextField
                    control={form.control}
                    name="alternatePhone"
                    label="Alternate phone"
                    type="tel"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-body-sm font-semibold">Address</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField control={form.control} name="address.line1" label="Address line 1" />
                    <TextField
                      control={form.control}
                      name="address.line2"
                      label="Address line 2 (optional)"
                    />
                    <TextField control={form.control} name="address.city" label="City" />
                    <TextField control={form.control} name="address.state" label="State" />
                    <TextField
                      control={form.control}
                      name="address.postalCode"
                      label="Postal code"
                    />
                    <TextField control={form.control} name="address.country" label="Country" />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-body-sm font-semibold">Emergency contact</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <TextField control={form.control} name="emergencyContact.name" label="Name" />
                    <TextField
                      control={form.control}
                      name="emergencyContact.phone"
                      label="Phone"
                      type="tel"
                    />
                    <TextField
                      control={form.control}
                      name="emergencyContact.relationship"
                      label="Relationship"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={updateProfile.isPending} className="self-start">
                  {updateProfile.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </SectionContainer>
    </PageContainer>
  )
}
