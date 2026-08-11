import { BatchModel, type BatchDocument, type BatchStatus } from '../../src/models/batch.model'
import { RoleModel } from '../../src/models/role.model'
import { StudentModel, type StudentDocument } from '../../src/models/student.model'
import { UserModel, type UserStatus } from '../../src/models/user.model'
import { hashPassword } from '../../src/services/password.service'

let sequence = 0
function nextSequence(): number {
  sequence += 1
  return sequence
}

/** Direct (User, Student) pair — mirrors `batch-fixtures.ts#createActiveTrainerFixture`'s reasoning: enrollment tests need a referentially-valid student, not the full `student-management.service.ts` create flow. */
export async function createStudentFixture(
  overrides: { userStatus?: UserStatus } = {},
): Promise<StudentDocument> {
  const n = nextSequence()

  const role = await RoleModel.findOneAndUpdate(
    { name: 'STUDENT' },
    {
      $setOnInsert: {
        name: 'STUDENT',
        permissions: [],
        isSystem: true,
        description: 'STUDENT role',
      },
    },
    { upsert: true, new: true },
  )

  const user = await UserModel.create({
    email: `fixture-student-${String(n)}@example.com`,
    passwordHash: await hashPassword('correct-horse-1'),
    roleId: role._id,
    status: overrides.userStatus ?? 'ACTIVE',
    emailVerifiedAt: new Date(),
  })

  return StudentModel.create({
    userId: user._id,
    studentId: `DM-STU-2026-${String(n).padStart(6, '0')}`,
    firstName: 'Fixture',
    lastName: `Student${String(n)}`,
  })
}

/** Direct `BatchModel` document — bypasses `batch-management.service.ts` entirely, since enrollment tests exercise enrollment logic against a known-good batch shape, not batch creation itself. Defaults to a small `maxStudents` (2) so capacity/waitlist scenarios don't need many fixture students. */
export async function createBatchFixture(
  courseId: string,
  overrides: {
    status?: BatchStatus
    maxStudents?: number
    waitlistEnabled?: boolean
    primaryTrainerId?: string
  } = {},
): Promise<BatchDocument> {
  const n = nextSequence()
  return BatchModel.create({
    batchCode: `DM-BAT-2026-${String(n).padStart(6, '0')}`,
    courseId,
    name: `Fixture Batch ${String(n)}`,
    timezone: 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
    status: overrides.status ?? 'SCHEDULED',
    maxStudents: overrides.maxStudents ?? 2,
    waitlistEnabled: overrides.waitlistEnabled ?? false,
    primaryTrainerId: overrides.primaryTrainerId ?? null,
  })
}
