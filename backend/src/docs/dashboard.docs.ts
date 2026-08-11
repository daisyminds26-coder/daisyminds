import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { DASHBOARD_RANGES } from '../utils/date-range'

const TAGS = ['Dashboard']

function errorResponses(
  ...statusCodes: number[]
): Record<number, { description: string; content: unknown }> {
  return Object.fromEntries(
    statusCodes.map((code) => [
      code,
      { description: 'Error', content: { 'application/json': { schema: errorResponseSchema } } },
    ]),
  )
}

const security = [{ [bearerAuth.name]: [] }]

const countByKeySchema = z.object({ key: z.string(), count: z.number() })

const recentPersonSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  name: z.string(),
  email: z.email(),
  status: z.string(),
  profileCompletionStatus: z.string(),
  createdAt: z.iso.datetime(),
})

const recentActivitySchema = z.object({
  id: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityLabel: z.string(),
  actorLabel: z.string(),
  createdAt: z.iso.datetime(),
})

const alertSchema = z.object({
  type: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  description: z.string(),
  count: z.number(),
  actionLabel: z.string(),
  actionRoute: z.string(),
})

const adminDashboardResponseSchema = z.object({
  summary: z.object({
    activeStudents: z.number(),
    activeTrainers: z.number(),
    activeUsers: z.number(),
    newStudents: z.number(),
    newTrainers: z.number(),
    pendingVerificationAccounts: z.number(),
    lockedAccounts: z.number(),
    suspendedAccounts: z.number(),
    incompleteStudentProfiles: z.number(),
    incompleteTrainerProfiles: z.number(),
  }),
  distributions: z.object({
    userStatus: z.array(countByKeySchema),
    studentProfileCompletion: z.array(countByKeySchema),
    trainerProfileCompletion: z.array(countByKeySchema),
  }),
  recentStudents: z.array(recentPersonSchema),
  recentTrainers: z.array(recentPersonSchema),
  recentActivity: z.array(recentActivitySchema).nullable(),
  alerts: z.array(alertSchema),
  period: z.object({
    range: z.enum(DASHBOARD_RANGES),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    timezone: z.string(),
  }),
  generatedAt: z.iso.datetime(),
})

registry.registerPath({
  method: 'get',
  path: '/dashboard/admin',
  tags: TAGS,
  summary: 'Admin operational dashboard summary',
  description:
    'Users/students/trainers-derived operational metrics only — no course, batch, attendance, payment, certificate, or placement analytics (those modules do not exist yet). `recentActivity` is `null` for `ADMIN`; only `SUPER_ADMIN` receives the audit-derived activity feed (permission-aware response shaping, same carve-out as sessions/audit-log elsewhere).',
  security,
  request: {
    query: z.object({
      range: z.enum(DASHBOARD_RANGES).optional(),
      startDate: z.iso.datetime().optional(),
      endDate: z.iso.datetime().optional(),
      timezone: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Admin dashboard summary',
      content: {
        'application/json': { schema: successResponseSchema(adminDashboardResponseSchema) },
      },
    },
    ...errorResponses(400, 401, 403),
  },
})
