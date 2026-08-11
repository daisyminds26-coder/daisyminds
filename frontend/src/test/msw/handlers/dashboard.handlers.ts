import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { AdminDashboard } from '@/features/dashboard/types'

/** Mirrors `backend/src/services/dashboard.service.ts`'s response shape for the endpoints the frontend actually calls. */

let includeActivity = true

export function setDashboardMockRole(role: 'SUPER_ADMIN' | 'ADMIN'): void {
  includeActivity = role === 'SUPER_ADMIN'
}

export function resetDashboardMockState(): void {
  includeActivity = true
}

function buildDashboard(overrides: Partial<AdminDashboard> = {}): AdminDashboard {
  const now = new Date().toISOString()
  return {
    summary: {
      activeStudents: 12,
      activeTrainers: 4,
      activeUsers: 18,
      newStudents: 3,
      newTrainers: 1,
      pendingVerificationAccounts: 2,
      lockedAccounts: 1,
      suspendedAccounts: 0,
      incompleteStudentProfiles: 5,
      incompleteTrainerProfiles: 1,
      publishedCourses: 2,
    },
    distributions: {
      userStatus: [
        { key: 'ACTIVE', count: 18 },
        { key: 'PENDING_VERIFICATION', count: 2 },
        { key: 'LOCKED', count: 1 },
      ],
      studentProfileCompletion: [
        { key: 'INCOMPLETE', count: 5 },
        { key: 'PARTIAL', count: 4 },
        { key: 'COMPLETE', count: 3 },
      ],
      trainerProfileCompletion: [
        { key: 'INCOMPLETE', count: 1 },
        { key: 'PARTIAL', count: 2 },
        { key: 'COMPLETE', count: 1 },
      ],
    },
    recentStudents: [
      {
        id: 'student-1',
        displayId: 'DM-STU-2026-000001',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        status: 'ACTIVE',
        profileCompletionStatus: 'PARTIAL',
        createdAt: now,
      },
    ],
    recentTrainers: [
      {
        id: 'trainer-1',
        displayId: 'DM-TRN-2026-000001',
        name: 'Arjun Mehta',
        email: 'arjun@example.com',
        status: 'ACTIVE',
        profileCompletionStatus: 'COMPLETE',
        createdAt: now,
      },
    ],
    recentActivity: includeActivity
      ? [
          {
            id: 'audit-1',
            action: 'student.created',
            entityType: 'student',
            entityLabel: 'Priya Sharma (DM-STU-2026-000001)',
            actorLabel: 'admin@example.com',
            createdAt: now,
          },
        ]
      : null,
    alerts: [
      {
        type: 'PENDING_VERIFICATION',
        severity: 'info',
        title: '2 account(s) awaiting verification',
        description: 'These accounts cannot log in until email verification completes.',
        count: 2,
        actionLabel: 'Review accounts',
        actionRoute: '/admin/users?status=PENDING_VERIFICATION',
      },
    ],
    period: {
      range: 'LAST_30_DAYS',
      startDate: now,
      endDate: now,
      timezone: 'Asia/Kolkata',
    },
    generatedAt: now,
    ...overrides,
  }
}

function successEnvelope<T>(data: T, message = 'Request completed successfully') {
  return { success: true, message, data, requestId: 'test-request-id' }
}

export const dashboardHandlers = [
  http.get(`${TEST_API_BASE_URL}/dashboard/admin`, ({ request }) => {
    const url = new URL(request.url)
    const range = url.searchParams.get('range') ?? 'LAST_30_DAYS'
    const timezone = url.searchParams.get('timezone') ?? 'Asia/Kolkata'

    return HttpResponse.json(
      successEnvelope(
        buildDashboard({
          period: {
            range: range as AdminDashboard['period']['range'],
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            timezone,
          },
        }),
      ),
    )
  }),
]
