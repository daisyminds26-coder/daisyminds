import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'

import { env } from './config/env'
import { generateOpenApiDocument } from './config/swagger'
import { errorHandler } from './middlewares/error-handler.middleware'
import { notFoundHandler } from './middlewares/not-found.middleware'
import { globalRateLimiter } from './middlewares/rate-limit.middleware'
import { requestId } from './middlewares/request-id.middleware'
import { requestLogger } from './middlewares/request-logger.middleware'
import { authRouter } from './routes/auth.routes'
import { batchRouter } from './routes/batch.routes'
import { courseRouter } from './routes/course.routes'
import { curriculumRouter } from './routes/curriculum.routes'
import { dashboardRouter } from './routes/dashboard.routes'
import { enrollmentRouter } from './routes/enrollment.routes'
import { healthRouter } from './routes/health.routes'
import { lessonContentRouter } from './routes/lesson-content.routes'
import { roleRouter } from './routes/role.routes'
import { studentRouter } from './routes/student.routes'
import { studentPortalRouter } from './routes/student-portal.routes'
import { studentLearningRouter } from './routes/student-learning.routes'
import { studentLiveClassRouter } from './routes/student-live-class.routes'
import { trainerRouter } from './routes/trainer.routes'
import { trainerLiveClassRouter } from './routes/trainer-live-class.routes'
import { liveClassRouter } from './routes/live-class.routes'
import { attendanceRouter } from './routes/attendance.routes'
import { assignmentRouter } from './routes/assignment.routes'
import { studentAssignmentRouter } from './routes/student-assignment.routes'
import { trainerAssignmentRouter } from './routes/trainer-assignment.routes'
import { questionRouter } from './routes/question.routes'
import { assessmentRouter } from './routes/assessment.routes'
import { studentAssessmentRouter } from './routes/student-assessment.routes'
import { trainerAssessmentRouter } from './routes/trainer-assessment.routes'
import { userRouter } from './routes/user.routes'

import './docs'

const JSON_BODY_LIMIT = '1mb'
const URLENCODED_BODY_LIMIT = '1mb'

export function createApp(): Express {
  const app = express()

  // Nginx sits directly in front of this process (DEPLOYMENT.md §4) — trust
  // exactly the configured number of hops so `req.ip` / rate limiting see
  // the real client IP without trusting arbitrary spoofed X-Forwarded-For values.
  app.set('trust proxy', env.trustProxy)

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  )
  app.use(compression())
  app.use(express.json({ limit: JSON_BODY_LIMIT }))
  app.use(express.urlencoded({ extended: true, limit: URLENCODED_BODY_LIMIT }))
  app.use(cookieParser())

  app.use(requestId)
  app.use(requestLogger)

  app.use(globalRateLimiter)

  if (env.swaggerEnabled) {
    const openApiDocument = generateOpenApiDocument()
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))
  }

  app.use(`${env.API_PREFIX}/health`, healthRouter)
  app.use(`${env.API_PREFIX}/auth`, authRouter)
  app.use(`${env.API_PREFIX}/users`, userRouter)
  app.use(`${env.API_PREFIX}/roles`, roleRouter)
  app.use(`${env.API_PREFIX}/students`, studentRouter)
  app.use(`${env.API_PREFIX}/trainers`, trainerRouter)
  app.use(`${env.API_PREFIX}/dashboard`, dashboardRouter)
  app.use(`${env.API_PREFIX}/courses`, courseRouter)
  app.use(`${env.API_PREFIX}/courses`, curriculumRouter)
  app.use(`${env.API_PREFIX}/courses`, lessonContentRouter)
  app.use(`${env.API_PREFIX}/batches`, batchRouter)
  app.use(`${env.API_PREFIX}/enrollments`, enrollmentRouter)
  app.use(`${env.API_PREFIX}/student`, studentPortalRouter)
  app.use(`${env.API_PREFIX}/student`, studentLearningRouter)
  app.use(`${env.API_PREFIX}/student`, studentLiveClassRouter)
  app.use(`${env.API_PREFIX}/trainer`, trainerLiveClassRouter)
  app.use(`${env.API_PREFIX}/live-classes`, liveClassRouter)
  app.use(`${env.API_PREFIX}/attendance`, attendanceRouter)
  app.use(`${env.API_PREFIX}/assignments`, assignmentRouter)
  app.use(`${env.API_PREFIX}/student`, studentAssignmentRouter)
  app.use(`${env.API_PREFIX}/trainer`, trainerAssignmentRouter)
  app.use(`${env.API_PREFIX}/questions`, questionRouter)
  app.use(`${env.API_PREFIX}/assessments`, assessmentRouter)
  app.use(`${env.API_PREFIX}/student`, studentAssessmentRouter)
  app.use(`${env.API_PREFIX}/trainer`, trainerAssessmentRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export const app = createApp()
