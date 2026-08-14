export const studentPortalKeys = {
  all: ['student-portal'] as const,
  dashboard: () => [...studentPortalKeys.all, 'dashboard'] as const,
  enrollments: () => [...studentPortalKeys.all, 'enrollments'] as const,
  enrollment: (id: string) => [...studentPortalKeys.all, 'enrollments', id] as const,
  courses: () => [...studentPortalKeys.all, 'courses'] as const,
  course: (courseId: string) => [...studentPortalKeys.all, 'courses', courseId] as const,
  schedule: () => [...studentPortalKeys.all, 'schedule'] as const,
  resources: () => [...studentPortalKeys.all, 'resources'] as const,
  profile: () => [...studentPortalKeys.all, 'profile'] as const,
}
