import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { Form } from '@/shared/components/ui/form'
import { DateTimePickerField } from '@/shared/components/forms/date-time-picker-field'

function Harness({ onSubmit }: { onSubmit: (value: string) => void }) {
  const form = useForm<{ dueDateTime: string }>({ defaultValues: { dueDateTime: '' } })
  return (
    <Form {...form}>
      <form
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            onSubmit(values.dueDateTime)
          })(event)
        }
      >
        <DateTimePickerField control={form.control} name="dueDateTime" label="Due date" />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

describe('DateTimePickerField', () => {
  it('produces a YYYY-MM-DDTHH:mm string matching what zonedWallTimeToUtc expects, from picking a date then a time', async () => {
    const user = userEvent.setup()
    let submitted = ''
    render(<Harness onSubmit={(value) => (submitted = value)} />)

    await user.click(screen.getByRole('button', { name: 'Due date' }))
    // Pick day 15 of whatever month is showing (deterministic enough — just needs *a* date selected)
    const dayButtons = screen.getAllByRole('gridcell').map((cell) => cell.querySelector('button'))
    const day15 = dayButtons.find((button) => button?.textContent === '15')
    if (!day15) throw new Error('Day 15 button not found in the calendar grid')
    await user.click(day15)

    const timeInput = screen.getByDisplayValue('00:00')
    await user.clear(timeInput)
    await user.type(timeInput, '14:30')

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(submitted).toMatch(/^\d{4}-\d{2}-15T14:30$/)
  })
})
