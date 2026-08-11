import request from 'supertest'

import { app } from '../../src/app'
import type { LessonType } from '../../src/models/lesson.model'
import { loginAs, type LoggedInActor } from './auth'
import { validCreateCoursePayload } from './course-fixtures'
import { validCreateLessonPayload, validCreateModulePayload } from './curriculum-fixtures'

export interface LessonFixture {
  admin: LoggedInActor
  courseId: string
  moduleId: string
  lessonId: string
}

/** Creates a course + module + lesson of the given type via the real API, ready for content-endpoint tests. */
export async function setupLessonForType(
  email: string,
  lessonType: LessonType,
): Promise<LessonFixture> {
  const admin = await loginAs({ email, role: 'ADMIN' })

  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send(validCreateCoursePayload())
  const courseId = courseRes.body.data.id as string

  const moduleRes = await request(app)
    .post(`/api/v1/courses/${courseId}/modules`)
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send(validCreateModulePayload())
  const moduleId = moduleRes.body.data.id as string

  const lessonRes = await request(app)
    .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`)
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send(validCreateLessonPayload({ lessonType }))
  const lessonId = lessonRes.body.data.id as string

  return { admin, courseId, moduleId, lessonId }
}

export function contentPath(fixture: LessonFixture, suffix = ''): string {
  return `/api/v1/courses/${fixture.courseId}/modules/${fixture.moduleId}/lessons/${fixture.lessonId}/content${suffix}`
}

export function resourcesPath(fixture: LessonFixture, suffix = ''): string {
  return `/api/v1/courses/${fixture.courseId}/modules/${fixture.moduleId}/lessons/${fixture.lessonId}/resources${suffix}`
}
