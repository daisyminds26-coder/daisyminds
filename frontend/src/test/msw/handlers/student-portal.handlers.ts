import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type {
  CourseProgressSummary,
  ScheduleOccurrence,
  StudentCourseDetail,
  StudentEnrollment,
  StudentModule,
  StudentProfile,
  StudentResource,
} from '@/features/student-portal/types'
import type { LessonDetail, LessonProgress } from '@/features/learning-player/types'

/** Mirrors `backend/src/services/student-portal.service.ts` / `student-learning.service.ts`'s response shapes for the student-portal and learning-player frontend tests. */

function successEnvelope<T>(data: T) {
  return {
    success: true,
    message: 'Request completed successfully',
    data,
    requestId: 'test-request-id',
  }
}

function errorEnvelope(message: string, code: string) {
  return { success: false, message, code, requestId: 'test-request-id' }
}

const COURSE_ID = 'course-1'
const ENROLLMENT_ID = 'enrollment-1'
const MODULE_ID = 'module-1'
const LESSON_1_ID = 'lesson-1'
const LESSON_2_ID = 'lesson-2'
const LOCKED_LESSON_ID = 'lesson-locked'

function baseCourseProgress(): CourseProgressSummary {
  return {
    totalLessons: 2,
    completedLessons: 0,
    mandatoryLessons: 2,
    completedMandatoryLessons: 0,
    percentage: 0,
    isComplete: false,
    lastAccessedLessonId: null,
    lastAccessedAt: null,
    firstLessonId: LESSON_1_ID,
  }
}

function buildEnrollment(overrides: Partial<StudentEnrollment> = {}): StudentEnrollment {
  return {
    id: ENROLLMENT_ID,
    enrollmentCode: 'DM-ENR-2026-000001',
    status: 'ACTIVE',
    accessState: 'ACTIVE',
    hasAccess: true,
    enrollmentDate: '2026-01-01T00:00:00.000Z',
    courseId: COURSE_ID,
    courseTitle: 'Full-Stack Web Development',
    courseCode: 'DM-CRS-2026-000001',
    courseThumbnailUrl: null,
    courseLevel: 'BEGINNER',
    courseDeliveryMode: 'ONLINE',
    certificateEnabled: true,
    batch: {
      id: 'batch-1',
      batchCode: 'DM-BAT-2026-000001',
      name: 'Evening Batch — Jan 2026',
      startDate: '2026-01-05T00:00:00.000Z',
      endDate: '2026-06-05T00:00:00.000Z',
      timezone: 'Asia/Kolkata',
      deliveryMode: 'ONLINE',
    },
    courseProgress: baseCourseProgress(),
    ...overrides,
  }
}

function buildCurriculumModules(): StudentModule[] {
  return [
    {
      id: MODULE_ID,
      title: 'Getting Started',
      description: 'Orientation and setup.',
      order: 0,
      estimatedDurationMinutes: 60,
      lessons: [
        {
          id: LESSON_1_ID,
          title: 'Welcome to the course',
          shortDescription: 'Course overview.',
          order: 0,
          lessonType: 'VIDEO',
          estimatedDurationMinutes: 10,
          isPreview: true,
          isMandatory: true,
          contentStatus: 'READY',
          progressStatus: 'NOT_STARTED',
          locked: false,
          lockReason: null,
        },
        {
          id: LESSON_2_ID,
          title: 'Setting up your environment',
          shortDescription: 'Install the tools you need.',
          order: 1,
          lessonType: 'TEXT',
          estimatedDurationMinutes: 15,
          isPreview: false,
          isMandatory: true,
          contentStatus: 'READY',
          progressStatus: 'NOT_STARTED',
          locked: false,
          lockReason: null,
        },
        {
          id: LOCKED_LESSON_ID,
          title: 'Advanced topics',
          shortDescription: 'Only after the basics.',
          order: 2,
          lessonType: 'TEXT',
          estimatedDurationMinutes: 20,
          isPreview: false,
          isMandatory: true,
          contentStatus: 'READY',
          progressStatus: 'NOT_STARTED',
          locked: true,
          lockReason: 'Complete the required lesson first.',
        },
      ],
    },
  ]
}

let enrollments: StudentEnrollment[] = [buildEnrollment()]
let courseProgress: CourseProgressSummary = baseCourseProgress()

let courseDetail: StudentCourseDetail = {
  id: COURSE_ID,
  courseCode: 'DM-CRS-2026-000001',
  title: 'Full-Stack Web Development',
  shortDescription: 'Build production-ready web apps end to end.',
  description: 'A full curriculum covering frontend, backend, and deployment.',
  level: 'BEGINNER',
  language: 'en',
  deliveryMode: 'ONLINE',
  certificateEnabled: true,
  thumbnailUrl: null,
  accessState: 'ACTIVE',
  hasAccess: true,
  enrollmentStatus: 'ACTIVE',
  batch: {
    id: 'batch-1',
    batchCode: 'DM-BAT-2026-000001',
    name: 'Evening Batch — Jan 2026',
    startDate: '2026-01-05T00:00:00.000Z',
    endDate: '2026-06-05T00:00:00.000Z',
    timezone: 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
  },
  trainer: { id: 'trainer-1', name: 'Arjun Mehta', profilePhotoUrl: null },
  modules: buildCurriculumModules(),
  courseProgress: baseCourseProgress(),
}

const lessonProgressById = new Map<string, LessonProgress>()

function buildLessonDetail(lessonId: string): LessonDetail | null {
  const module_ = courseDetail.modules[0]
  const lesson = module_?.lessons.find((item) => item.id === lessonId)
  if (!module_ || !lesson) return null

  const lessonIndex = module_.lessons.findIndex((item) => item.id === lessonId)
  const previousLessonId = lessonIndex > 0 ? (module_.lessons[lessonIndex - 1]?.id ?? null) : null
  const nextLessonId =
    lessonIndex >= 0 && lessonIndex < module_.lessons.length - 1
      ? (module_.lessons[lessonIndex + 1]?.id ?? null)
      : null

  return {
    id: lesson.id,
    courseId: COURSE_ID,
    moduleId: module_.id,
    moduleTitle: module_.title,
    title: lesson.title,
    shortDescription: lesson.shortDescription,
    lessonType: lesson.lessonType,
    order: lesson.order,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes,
    isMandatory: lesson.isMandatory,
    isPreview: lesson.isPreview,
    accessState: 'ACTIVE',
    hasAccess: true,
    locked: lesson.locked,
    lockReason: lesson.lockReason,
    progress: lessonProgressById.get(lessonId) ?? null,
    navigation: { previousLessonId, nextLessonId },
    textContent: lesson.locked
      ? null
      : lesson.lessonType === 'TEXT'
        ? '<p>Lesson content.</p>'
        : null,
    video:
      !lesson.locked && lesson.lessonType === 'VIDEO'
        ? { status: 'READY', durationSeconds: 100 }
        : null,
    document: null,
    externalLink: null,
    resources: lesson.locked
      ? []
      : [
          {
            id: 'resource-1',
            title: 'Setup guide.pdf',
            resourceType: 'PDF',
            format: 'pdf',
            bytes: 204_800,
            isDownloadable: true,
          },
        ],
  }
}

let schedule: ScheduleOccurrence[] = [
  {
    date: '2026-08-13',
    dayOfWeek: 'THURSDAY',
    startTime: '18:00',
    endTime: '20:00',
    sessionLabel: null,
    deliveryMode: 'ONLINE',
    batchName: 'Evening Batch — Jan 2026',
    courseTitle: 'Full-Stack Web Development',
  },
]

let resources: StudentResource[] = [
  {
    id: 'resource-1',
    title: 'Setup guide.pdf',
    description: null,
    resourceType: 'PDF',
    format: 'pdf',
    bytes: 204_800,
    isDownloadable: true,
    lessonId: LESSON_1_ID,
    lessonTitle: 'Welcome to the course',
    courseId: COURSE_ID,
    courseTitle: 'Full-Stack Web Development',
  },
]

let profile: StudentProfile = {
  studentId: 'DM-STU-2026-000001',
  firstName: 'Priya',
  lastName: 'Sharma',
  middleName: null,
  displayName: null,
  email: 'priya@example.com',
  phone: '+91 98765 43210',
  alternatePhone: null,
  address: {
    line1: '221B Baker Street',
    line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
  },
  emergencyContacts: [
    {
      name: 'Rahul Sharma',
      phone: '+91 98765 00000',
      relationship: 'Father',
      alternatePhone: null,
      email: null,
    },
  ],
  profilePhotoUrl: null,
  profileCompletionPercentage: 80,
  profileCompletionStatus: 'PARTIAL',
}

/** Drives the "no active course" empty-state scenario. */
export function setStudentPortalEmptyState(): void {
  enrollments = []
}

export function resetStudentPortalMockState(): void {
  enrollments = [buildEnrollment()]
  courseProgress = baseCourseProgress()
  courseDetail = {
    ...courseDetail,
    modules: buildCurriculumModules(),
    courseProgress: baseCourseProgress(),
  }
  lessonProgressById.clear()
  schedule = [
    {
      date: '2026-08-13',
      dayOfWeek: 'THURSDAY',
      startTime: '18:00',
      endTime: '20:00',
      sessionLabel: null,
      deliveryMode: 'ONLINE',
      batchName: 'Evening Batch — Jan 2026',
      courseTitle: 'Full-Stack Web Development',
    },
  ]
  resources = [
    {
      id: 'resource-1',
      title: 'Setup guide.pdf',
      description: null,
      resourceType: 'PDF',
      format: 'pdf',
      bytes: 204_800,
      isDownloadable: true,
      lessonId: LESSON_1_ID,
      lessonTitle: 'Welcome to the course',
      courseId: COURSE_ID,
      courseTitle: 'Full-Stack Web Development',
    },
  ]
  profile = {
    ...profile,
    phone: '+91 98765 43210',
    profileCompletionPercentage: 80,
    profileCompletionStatus: 'PARTIAL',
  }
}

export const studentPortalHandlers = [
  http.get(`${TEST_API_BASE_URL}/student/dashboard`, () => {
    const active = enrollments.find((enrollment) => enrollment.hasAccess) ?? null
    return HttpResponse.json(
      successEnvelope({
        continueLearning: active,
        courses: enrollments,
        upcomingSchedule: active ? schedule : [],
      }),
    )
  }),

  http.get(`${TEST_API_BASE_URL}/student/enrollments`, () =>
    HttpResponse.json(successEnvelope(enrollments)),
  ),

  http.get(`${TEST_API_BASE_URL}/student/courses`, () =>
    HttpResponse.json(successEnvelope(enrollments)),
  ),

  http.get(`${TEST_API_BASE_URL}/student/courses/:courseId`, ({ params }) => {
    if (params.courseId !== COURSE_ID) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(courseDetail))
  }),

  http.get(`${TEST_API_BASE_URL}/student/schedule`, () =>
    HttpResponse.json(successEnvelope(enrollments.some((e) => e.hasAccess) ? schedule : [])),
  ),

  http.get(`${TEST_API_BASE_URL}/student/resources`, () =>
    HttpResponse.json(successEnvelope(enrollments.some((e) => e.hasAccess) ? resources : [])),
  ),

  http.get(`${TEST_API_BASE_URL}/student/resources/:resourceId/delivery-url`, () =>
    HttpResponse.json(
      successEnvelope({
        url: 'https://cdn.example.com/signed/setup-guide.pdf',
        expiresInSeconds: 300,
      }),
    ),
  ),

  http.get(`${TEST_API_BASE_URL}/student/profile`, () =>
    HttpResponse.json(successEnvelope(profile)),
  ),

  http.patch(`${TEST_API_BASE_URL}/student/profile`, async ({ request }) => {
    const body = (await request.json()) as Partial<StudentProfile>
    profile = { ...profile, ...body }
    return HttpResponse.json(successEnvelope(profile))
  }),

  // ---- Learning Player ----

  http.get(`${TEST_API_BASE_URL}/student/courses/:courseId/progress`, ({ params }) => {
    if (params.courseId !== COURSE_ID) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(courseProgress))
  }),

  http.get(`${TEST_API_BASE_URL}/student/courses/:courseId/lessons/:lessonId`, ({ params }) => {
    const lessonId = params.lessonId as string
    const detail = buildLessonDetail(lessonId)
    if (params.courseId !== COURSE_ID || !detail) {
      return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(detail))
  }),

  http.get(`${TEST_API_BASE_URL}/student/courses/:courseId/lessons/:lessonId/media`, () =>
    HttpResponse.json(
      successEnvelope({ url: 'https://cdn.example.com/signed/video.mp4', expiresInSeconds: 300 }),
    ),
  ),

  http.patch(
    `${TEST_API_BASE_URL}/student/courses/:courseId/lessons/:lessonId/progress`,
    async ({ params, request }) => {
      const lessonId = params.lessonId as string
      const body = (await request.json()) as { positionSeconds: number }
      const progress: LessonProgress = {
        status: body.positionSeconds >= 90 ? 'COMPLETED' : 'IN_PROGRESS',
        videoPositionSeconds: body.positionSeconds,
        startedAt: '2026-08-01T00:00:00.000Z',
        lastAccessedAt: '2026-08-01T00:00:00.000Z',
        completedAt: body.positionSeconds >= 90 ? '2026-08-01T00:00:00.000Z' : null,
      }
      lessonProgressById.set(lessonId, progress)
      return HttpResponse.json(successEnvelope(progress))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/student/courses/:courseId/lessons/:lessonId/complete`,
    ({ params }) => {
      const lessonId = params.lessonId as string
      const progress: LessonProgress = {
        status: 'COMPLETED',
        videoPositionSeconds: 0,
        startedAt: '2026-08-01T00:00:00.000Z',
        lastAccessedAt: '2026-08-01T00:00:00.000Z',
        completedAt: '2026-08-01T00:00:00.000Z',
      }
      lessonProgressById.set(lessonId, progress)
      return HttpResponse.json(successEnvelope(progress))
    },
  ),
]
