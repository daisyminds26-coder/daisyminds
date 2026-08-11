type DurationUnit = 's' | 'm' | 'h' | 'd'

function isDurationUnit(value: string): value is DurationUnit {
  return value === 's' || value === 'm' || value === 'h' || value === 'd'
}

function unitToMultiplierMs(unit: DurationUnit): number {
  switch (unit) {
    case 's':
      return 1000
    case 'm':
      return 60_000
    case 'h':
      return 3_600_000
    case 'd':
      return 86_400_000
  }
}

/**
 * Parses the constrained `\d+[smhd]` format enforced by env.schema.ts
 * (JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN) — not a general-purpose
 * duration parser, deliberately narrow to match what's actually validated.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration)
  const valueText = match?.[1]
  const unitText = match?.[2]

  if (!valueText || !unitText || !isDurationUnit(unitText)) {
    throw new Error(`Invalid duration format: "${duration}"`)
  }

  return Number(valueText) * unitToMultiplierMs(unitText)
}

export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000)
}
