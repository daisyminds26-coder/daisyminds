import { connectDatabase, disconnectDatabase } from '../src/config/database'
import { logger } from '../src/config/logger'
import { PermissionModel } from '../src/models/permission.model'
import { RoleModel, SYSTEM_ROLE_NAMES, type SystemRoleName } from '../src/models/role.model'
import { UserModel } from '../src/models/user.model'
import { hashPassword } from '../src/services/password.service'

interface SeedPermission {
  key: string
  description: string
  category: string
}

const BASE_PERMISSIONS: SeedPermission[] = [
  { key: 'users:read', description: 'View user accounts', category: 'Users' },
  {
    key: 'users:manage',
    description: 'Create, update, deactivate user accounts',
    category: 'Users',
  },
  { key: 'roles:manage', description: 'Manage roles and permissions', category: 'Users' },
  { key: 'audit-logs:read', description: 'View audit logs', category: 'Platform' },
  { key: 'settings:manage', description: 'Manage system configuration', category: 'Platform' },
  { key: 'students:read', description: 'View student records', category: 'Students' },
  {
    key: 'students:manage',
    description: 'Create, update, and change the lifecycle state of student records',
    category: 'Students',
  },
  { key: 'students:export', description: 'Export student records to CSV', category: 'Students' },
  { key: 'trainers:read', description: 'View trainer records', category: 'Trainers' },
  {
    key: 'trainers:manage',
    description: 'Create, update, and change the lifecycle state of trainer records',
    category: 'Trainers',
  },
  { key: 'trainers:export', description: 'Export trainer records to CSV', category: 'Trainers' },
  {
    key: 'dashboard:read',
    description: 'View the admin operational dashboard',
    category: 'Platform',
  },
  { key: 'courses:read', description: 'View course records', category: 'Courses' },
  {
    key: 'courses:manage',
    description: 'Create, update, archive, restore, and delete course records',
    category: 'Courses',
  },
  {
    key: 'courses:publish',
    description: 'Publish and unpublish courses',
    category: 'Courses',
  },
  { key: 'courses:export', description: 'Export course records to CSV', category: 'Courses' },
  { key: 'batches:read', description: 'View batch records', category: 'Batches' },
  {
    key: 'batches:manage',
    description:
      'Create, update, and change the lifecycle state of batch records (schedule, activate, complete, cancel, archive, restore, delete)',
    category: 'Batches',
  },
  { key: 'batches:export', description: 'Export batch records to CSV', category: 'Batches' },
  {
    key: 'enrollments:read',
    description: 'View student enrollment records',
    category: 'Enrollments',
  },
  {
    key: 'enrollments:manage',
    description:
      'Create, transfer, and change the lifecycle state of enrollment records (confirm, activate, suspend, resume, complete, cancel, drop)',
    category: 'Enrollments',
  },
  {
    key: 'enrollments:export',
    description: 'Export enrollment records to CSV',
    category: 'Enrollments',
  },
  { key: 'live_classes:read', description: 'View live class sessions', category: 'Live Classes' },
  {
    key: 'live_classes:manage',
    description:
      'Create, update, generate from timetable, and change the lifecycle state of live class sessions (schedule, start, complete, cancel)',
    category: 'Live Classes',
  },
  {
    key: 'attendance:read',
    description: 'View attendance records and reports',
    category: 'Attendance',
  },
  {
    key: 'attendance:manage',
    description: 'Mark, finalize, and reopen session attendance',
    category: 'Attendance',
  },
  {
    key: 'attendance:export',
    description: 'Export attendance reports to CSV',
    category: 'Attendance',
  },
  {
    key: 'assignments:read',
    description: 'View assignments and submissions',
    category: 'Assignments',
  },
  {
    key: 'assignments:manage',
    description:
      'Create, update, and change the lifecycle state of assignments (publish, close, cancel, archive)',
    category: 'Assignments',
  },
  {
    key: 'assignments:grade',
    description: 'Grade and return student assignment submissions',
    category: 'Assignments',
  },
  {
    key: 'assignments:export',
    description: 'Export assignment submission summaries to CSV',
    category: 'Assignments',
  },
  {
    key: 'questions:read',
    description: 'View the question bank',
    category: 'Assessments',
  },
  {
    key: 'questions:manage',
    description: 'Create, update, archive, and duplicate questions in the question bank',
    category: 'Assessments',
  },
  {
    key: 'assessments:read',
    description: 'View quizzes, examinations, and attempts',
    category: 'Assessments',
  },
  {
    key: 'assessments:manage',
    description:
      'Create, update, and change the lifecycle state of quizzes/examinations (publish, close, publish results, archive, cancel)',
    category: 'Assessments',
  },
  {
    key: 'assessments:grade',
    description: 'Manually grade subjective questions on student attempts',
    category: 'Assessments',
  },
  {
    key: 'assessments:export',
    description: 'Export assessment result summaries to CSV',
    category: 'Assessments',
  },
]

const ROLE_PERMISSIONS: Record<SystemRoleName, string[]> = {
  SUPER_ADMIN: BASE_PERMISSIONS.map((permission) => permission.key),
  ADMIN: [
    'users:read',
    'users:manage',
    'audit-logs:read',
    'students:read',
    'students:manage',
    'students:export',
    'trainers:read',
    'trainers:manage',
    'trainers:export',
    'dashboard:read',
    'courses:read',
    'courses:manage',
    'courses:publish',
    'courses:export',
    'batches:read',
    'batches:manage',
    'batches:export',
    'enrollments:read',
    'enrollments:manage',
    'enrollments:export',
    'live_classes:read',
    'live_classes:manage',
    'attendance:read',
    'attendance:manage',
    'attendance:export',
    'assignments:read',
    'assignments:manage',
    'assignments:grade',
    'assignments:export',
    'questions:read',
    'questions:manage',
    'assessments:read',
    'assessments:manage',
    'assessments:grade',
    'assessments:export',
  ],
  TRAINER: ['users:read'],
  STUDENT: [],
}

async function seedPermissions(): Promise<void> {
  for (const permission of BASE_PERMISSIONS) {
    await PermissionModel.updateOne(
      { key: permission.key },
      { $setOnInsert: { ...permission, isSystem: true } },
      { upsert: true },
    )
  }
  logger.info({ count: BASE_PERMISSIONS.length }, 'Permission catalog seeded')
}

async function seedRoles(): Promise<void> {
  for (const name of SYSTEM_ROLE_NAMES) {
    await RoleModel.updateOne(
      { name },
      {
        $setOnInsert: { name, description: `${name} system role`, isSystem: true },
        $set: { permissions: ROLE_PERMISSIONS[name] },
      },
      { upsert: true },
    )
  }
  logger.info({ roles: SYSTEM_ROLE_NAMES }, 'System roles seeded')
}

/**
 * Optional — reads directly from `process.env` rather than the app's typed
 * env schema, since these are one-off bootstrap credentials for this script
 * only, not something the running server ever reads.
 */
async function seedSuperAdmin(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD

  if (!email || !password) {
    logger.warn(
      'SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD not set — skipping bootstrap admin creation',
    )
    return
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() })
  if (existing) {
    logger.info({ email }, 'Bootstrap SUPER_ADMIN already exists — skipping')
    return
  }

  const role = await RoleModel.findOne({ name: 'SUPER_ADMIN' })
  if (!role) {
    throw new Error('SUPER_ADMIN role not found — seed roles before seeding the admin user')
  }

  await UserModel.create({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    roleId: role._id,
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
  })

  logger.info({ email }, 'Bootstrap SUPER_ADMIN created')
}

async function main(): Promise<void> {
  await connectDatabase()
  await seedPermissions()
  await seedRoles()
  await seedSuperAdmin()
  await disconnectDatabase()
  logger.info('Seeding complete')
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Seeding failed')
  process.exit(1)
})
