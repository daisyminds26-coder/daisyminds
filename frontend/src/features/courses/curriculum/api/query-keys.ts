export const curriculumKeys = {
  all: (courseId: string) => ['curriculum', courseId] as const,
  tree: (courseId: string) => [...curriculumKeys.all(courseId), 'tree'] as const,
  readiness: (courseId: string) => [...curriculumKeys.all(courseId), 'readiness'] as const,
}
