/**
 * Single import point for every Mongoose model. Importing this module (once,
 * from `server.ts` after `connectDatabase()`) registers every schema with
 * Mongoose — individual modules should import the specific model file they
 * need (e.g. `./student.model`), not this barrel, to keep module boundaries
 * visible (ARCHITECTURE.md §3).
 */

export { AuditLogModel, type IAuditLog, type AuditLogDocument } from './audit-log.model'
export { CounterModel, type ICounter, type CounterDocument } from './counter.model'
export { PermissionModel, type IPermission, type PermissionDocument } from './permission.model'
export {
  RoleModel,
  type IRole,
  type RoleDocument,
  SYSTEM_ROLE_NAMES,
  type SystemRoleName,
} from './role.model'
export {
  UserModel,
  type IUser,
  type UserDocument,
  USER_STATUSES,
  type UserStatus,
} from './user.model'
export { UserSessionModel, type IUserSession, type UserSessionDocument } from './user-session.model'

export {
  StudentModel,
  type IStudent,
  type StudentDocument,
  GENDERS,
  type Gender,
} from './student.model'
export { TrainerModel, type ITrainer, type TrainerDocument } from './trainer.model'

export {
  CourseModel,
  type ICourse,
  type CourseDocument,
  COURSE_LEVELS,
  type CourseLevel,
} from './course.model'
export {
  CourseModuleModel,
  type ICourseModule,
  type CourseModuleDocument,
} from './course-module.model'
export {
  LessonModel,
  type ILesson,
  type LessonDocument,
  LESSON_TYPES,
  type LessonType,
  CONTENT_STATUSES,
  type ContentStatus,
  MEDIA_ASSET_STATUSES,
  type MediaAssetStatus,
  type IVideoAsset,
  type IDocumentAsset,
  type IExternalLink,
} from './lesson.model'
export {
  LessonResourceModel,
  type ILessonResource,
  type LessonResourceDocument,
  LESSON_RESOURCE_TYPES,
  type LessonResourceType,
} from './lesson-resource.model'
export {
  BatchModel,
  type IBatch,
  type BatchDocument,
  BATCH_STATUSES,
  type BatchStatus,
  BATCH_DELIVERY_MODES,
  type BatchDeliveryMode,
  MEETING_PROVIDERS,
  type MeetingProvider,
  DAYS_OF_WEEK as BATCH_DAYS_OF_WEEK,
  type DayOfWeek as BatchDayOfWeek,
  CALENDAR_EXCEPTION_TYPES,
  type CalendarExceptionType,
  type IWeeklyScheduleSlot,
  type ICalendarException,
  type IBatchLocation,
} from './batch.model'

export {
  EnrollmentModel,
  type IEnrollment,
  type EnrollmentDocument,
  ENROLLMENT_STATUSES,
  type EnrollmentStatus,
  ENROLLMENT_SOURCES,
  type EnrollmentSource,
} from './enrollment.model'
export {
  LessonProgressModel,
  type ILessonProgress,
  type LessonProgressDocument,
  LESSON_PROGRESS_STATUSES,
  type LessonProgressStatus,
  PROGRESS_COMPLETION_SOURCES,
  type ProgressCompletionSource,
} from './lesson-progress.model'
export {
  LiveClassModel,
  type ILiveClass,
  type LiveClassDocument,
  LIVE_CLASS_STATUSES,
  type LiveClassStatus,
  LIVE_CLASS_DELIVERY_MODES,
  type LiveClassDeliveryMode,
  LIVE_CLASS_PROVIDERS,
  type LiveClassProvider,
  LIVE_CLASS_SOURCES,
  type LiveClassSource,
  ATTENDANCE_SESSION_STATUSES,
  type AttendanceSessionStatus,
  type ILiveClassVenue,
} from './live-class.model'

export {
  AttendanceModel,
  type IAttendance,
  type AttendanceDocument,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  ATTENDANCE_SOURCES,
  type AttendanceSource,
} from './attendance.model'
export {
  AssignmentModel,
  type IAssignment,
  type AssignmentDocument,
  ASSIGNMENT_STATUSES,
  type AssignmentStatus,
  ASSIGNMENT_SUBMISSION_TYPES,
  type AssignmentSubmissionType,
} from './assignment.model'
export {
  AssignmentSubmissionModel,
  type IAssignmentSubmission,
  type AssignmentSubmissionDocument,
  ASSIGNMENT_SUBMISSION_STATUSES,
  type AssignmentSubmissionStatus,
} from './assignment-submission.model'
export { type IAssignmentAttachment } from './shared/assignment-attachment.schema'
export {
  QuestionModel,
  type IQuestion,
  type QuestionDocument,
  QUESTION_TYPES,
  type QuestionType,
  QUESTION_DIFFICULTIES,
  type QuestionDifficulty,
  QUESTION_STATUSES,
  type QuestionStatus,
} from './question.model'
export { type IQuestionOption } from './shared/question-option.schema'
export {
  AssessmentModel,
  type IAssessment,
  type AssessmentDocument,
  ASSESSMENT_TYPES,
  type AssessmentType,
  ASSESSMENT_STATUSES,
  type AssessmentStatus,
  MAX_QUESTIONS_PER_ASSESSMENT,
} from './assessment.model'
export { type IAssessmentSection } from './shared/assessment-section.schema'
export {
  AssessmentAttemptModel,
  type IAssessmentAttempt,
  type AssessmentAttemptDocument,
  ASSESSMENT_ATTEMPT_STATUSES,
  type AssessmentAttemptStatus,
  SUBMISSION_METHODS,
  type SubmissionMethod,
  PASS_STATUSES,
  type PassStatus,
} from './assessment-attempt.model'
export {
  type IAssessmentAttemptQuestionSnapshot,
  type IAssessmentAttemptAnswer,
} from './assessment-attempt.model'

export {
  PaymentModel,
  type IPayment,
  type PaymentDocument,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from './payment.model'
export {
  InvoiceModel,
  type IInvoice,
  type InvoiceDocument,
  INVOICE_STATUSES,
  type InvoiceStatus,
} from './invoice.model'

export {
  CertificateModel,
  type ICertificate,
  type CertificateDocument,
  CERTIFICATE_STATUSES,
  type CertificateStatus,
} from './certificate.model'
export {
  NotificationModel,
  type INotification,
  type NotificationDocument,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  NOTIFICATION_STATUSES,
  type NotificationStatus,
} from './notification.model'

export {
  PlacementProfileModel,
  type IPlacementProfile,
  type PlacementProfileDocument,
} from './placement-profile.model'
export { CompanyModel, type ICompany, type CompanyDocument } from './company.model'
export {
  InterviewModel,
  type IInterview,
  type InterviewDocument,
  INTERVIEW_STATUSES,
  type InterviewStatus,
} from './interview.model'

export {
  ReportModel,
  type IReport,
  type ReportDocument,
  REPORT_STATUSES,
  type ReportStatus,
} from './report.model'
export {
  ApplicationSettingModel,
  type IApplicationSetting,
  type ApplicationSettingDocument,
} from './application-setting.model'
