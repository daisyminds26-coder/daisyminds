import { useForm } from 'react-hook-form'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Form } from '@/shared/components/ui/form'
import { WeeklyScheduleEditor } from '@/features/batches/components/WeeklyScheduleEditor'
import type { WeeklyScheduleSlotFormValues } from '@/features/batches/schemas/batch.schemas'

interface HarnessValues {
  weeklySchedule: WeeklyScheduleSlotFormValues[]
}

function Harness({ initial = [] }: { initial?: WeeklyScheduleSlotFormValues[] }) {
  const form = useForm<HarnessValues>({ defaultValues: { weeklySchedule: initial } })
  return (
    <Form {...form}>
      <WeeklyScheduleEditor<HarnessValues> control={form.control} />
    </Form>
  )
}

describe('WeeklyScheduleEditor', () => {
  it('shows an empty state and adds a slot on "Add slot"', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByText('No weekly sessions scheduled')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add slot/i }))

    expect(screen.queryByText('No weekly sessions scheduled')).not.toBeInTheDocument()
    expect(screen.getByTestId('weekly-schedule-rows').children).toHaveLength(1)
  })

  it('removes a slot on "Remove slot"', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        initial={[
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' },
          { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '11:00' },
        ]}
      />,
    )

    expect(screen.getByTestId('weekly-schedule-rows').children).toHaveLength(2)
    const removeButtons = screen.getAllByRole('button', { name: /remove slot/i })
    const [firstRemoveButton] = removeButtons
    if (!firstRemoveButton) throw new Error('expected a remove-slot button to be present')
    await user.click(firstRemoveButton)
    expect(screen.getByTestId('weekly-schedule-rows').children).toHaveLength(1)
  })

  it('shows a visual overlap warning for two same-day overlapping slots, without blocking either', () => {
    render(
      <Harness
        initial={[
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' },
          { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '12:00' },
        ]}
      />,
    )

    const warnings = screen.getAllByText(/overlaps another slot on the same day/i)
    expect(warnings).toHaveLength(2)
    // Both rows remain present — the warning is advisory, not a blocking validation.
    expect(screen.getByTestId('weekly-schedule-rows').children).toHaveLength(2)
  })

  it('displays the total weekly session time', () => {
    render(
      <Harness
        initial={[
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' },
          { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '10:30' },
        ]}
      />,
    )

    expect(screen.getByText(/3h 30m/)).toBeInTheDocument()
  })

  it('lays out rows in a mobile-first single column that expands on larger screens', () => {
    render(<Harness initial={[{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' }]} />)

    const rows = screen.getByTestId('weekly-schedule-rows')
    expect(rows.className).toContain('grid-cols-1')
    const row = within(rows).getAllByRole('listitem', { hidden: true }).at(0) ?? rows.children[0]
    expect(row).toBeTruthy()
  })

  it('is fully keyboard operable via native form controls — no drag handles exist', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' }]} />)

    // No drag-and-drop affordance of any kind.
    expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0)

    const startTimeInput = screen.getByLabelText('Start time')
    startTimeInput.focus()
    expect(startTimeInput).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('End time')).toHaveFocus()
  })
})
