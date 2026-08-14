export const learningPlayerKeys = {
  all: ['learning-player'] as const,
  courseProgress: (courseId: string) => [...learningPlayerKeys.all, 'progress', courseId] as const,
  lesson: (courseId: string, lessonId: string) =>
    [...learningPlayerKeys.all, 'lesson', courseId, lessonId] as const,
}
