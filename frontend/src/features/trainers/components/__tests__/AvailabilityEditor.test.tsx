import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Form } from '@/shared/components/ui/form'
import { AvailabilityEditor } from '@/features/trainers/components/AvailabilityEditor'
import {
  updateTrainerSchema,
  type UpdateTrainerFormValues,
} from '@/features/trainers/schemas/trainer.schemas'

/** Minimal, schema-valid defaults for every field `trainerProfileSchema` requires, so only `availability` drives validation outcomes in these tests. */
function validDefaults(): UpdateTrainerFormValues {
  return {
    firstName: 'Kabir',
    middleName: '',
    lastName: 'Singh',
    displayName: '',
    preferredLanguage: '',
    bio: '',
    phone: '+91 90000 00000',
    alternatePhone: '',
    emergencyContacts: [],
    designation: '',
    department: '',
    totalYearsExperience: '',
    teachingYearsExperience: '',
    industryYearsExperience: '',
    expertiseAreas: [],
    secondaryExpertise: [],
    skills: [],
    technologies: [],
    specializations: [],
    linkedinUrl: '',
    portfolioUrl: '',
    githubUrl: '',
    websiteUrl: '',
    qualifications: [],
    certifications: [],
    employmentStatus: 'ACTIVE',
    employeeCode: '',
    workLocation: '',
    noticePeriodDays: '',
    preferredTeachingModes: [],
    preferredTimeSlots: [],
    maxConcurrentBatches: '',
    maxWeeklyTeachingHours: '',
    availabilityStatus: 'AVAILABLE',
    availabilityNotes: '',
    languagesOfInstruction: [],
    qualifiedToTeachSubjects: [],
    availability: [],
    notes: '',
    tags: [],
  }
}

function Harness() {
  const form = useForm<UpdateTrainerFormValues>({
    resolver: zodResolver(updateTrainerSchema),
    defaultValues: validDefaults(),
  })

  function onSubmit() {
    /* no-op: this harness only cares about validation state */
  }

  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
        <AvailabilityEditor control={form.control} />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

describe('AvailabilityEditor', () => {
  it('adds and removes an availability slot', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByText('No weekly availability set')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add availability slot/i }))
    expect(screen.getAllByRole('button', { name: /remove slot/i })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /add availability slot/i }))
    expect(screen.getAllByRole('button', { name: /remove slot/i })).toHaveLength(2)

    const [firstRemoveButton] = screen.getAllByRole('button', { name: /remove slot/i })
    if (!firstRemoveButton) throw new Error('expected a "Remove slot" button to be rendered')
    await user.click(firstRemoveButton)
    expect(screen.getAllByRole('button', { name: /remove slot/i })).toHaveLength(1)
  })

  it('shows an overlap error when two slots share the same day, type, and time range', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    // Both default to Monday / AVAILABLE / 09:00-11:00, so two appended slots overlap immediately.
    await user.click(screen.getByRole('button', { name: /add availability slot/i }))
    await user.click(screen.getByRole('button', { name: /add availability slot/i }))
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByText(/Overlapping AVAILABLE slots on MONDAY/i)).toBeInTheDocument()
  })
})
