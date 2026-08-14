import { setupServer } from 'msw/node'

import { authHandlers } from '@/test/msw/handlers/auth.handlers'
import { usersHandlers } from '@/test/msw/handlers/users.handlers'
import { studentsHandlers } from '@/test/msw/handlers/students.handlers'
import { trainersHandlers } from '@/test/msw/handlers/trainers.handlers'
import { dashboardHandlers } from '@/test/msw/handlers/dashboard.handlers'
import { coursesHandlers } from '@/test/msw/handlers/courses.handlers'
import { curriculumHandlers } from '@/test/msw/handlers/curriculum.handlers'
import { lessonContentHandlers } from '@/test/msw/handlers/lesson-content.handlers'
import { batchesHandlers } from '@/test/msw/handlers/batches.handlers'
import { enrollmentsHandlers } from '@/test/msw/handlers/enrollments.handlers'
import { studentPortalHandlers } from '@/test/msw/handlers/student-portal.handlers'
import { liveClassesHandlers } from '@/test/msw/handlers/live-classes.handlers'

export const server = setupServer(
  ...authHandlers,
  ...usersHandlers,
  ...studentsHandlers,
  ...trainersHandlers,
  ...dashboardHandlers,
  ...coursesHandlers,
  ...curriculumHandlers,
  ...lessonContentHandlers,
  ...batchesHandlers,
  ...enrollmentsHandlers,
  ...studentPortalHandlers,
  ...liveClassesHandlers,
)
