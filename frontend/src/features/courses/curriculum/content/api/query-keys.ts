export const lessonContentKeys = {
  all: (lessonId: string) => ['lesson-content', lessonId] as const,
  detail: (lessonId: string) => [...lessonContentKeys.all(lessonId), 'detail'] as const,
  readiness: (lessonId: string) => [...lessonContentKeys.all(lessonId), 'readiness'] as const,
  resources: (lessonId: string) => [...lessonContentKeys.all(lessonId), 'resources'] as const,
}

export const launchReadinessKeys = {
  detail: (courseId: string) => ['launch-readiness', courseId] as const,
}
