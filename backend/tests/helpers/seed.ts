import { RoleModel, type SystemRoleName } from '../../src/models/role.model'
import { UserModel, type UserDocument, type UserStatus } from '../../src/models/user.model'
import { hashPassword } from '../../src/services/password.service'

export async function createTestRole(name: SystemRoleName, permissions: string[] = []) {
  return RoleModel.create({ name, permissions, isSystem: true, description: `${name} role` })
}

/**
 * Idempotent variant of `createTestRole` — upserts instead of always
 * inserting, so a test can seed a role it depends on (e.g. the STUDENT
 * role, needed by every `POST /students` call) without caring whether
 * another `loginAs()`/`createTestRole()` call in the same test already
 * created it (which `createTestRole` alone would violate the unique index
 * on `roles.name` for).
 */
export async function ensureTestRole(name: SystemRoleName, permissions: string[] = []) {
  return RoleModel.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, permissions, isSystem: true, description: `${name} role` } },
    { upsert: true, new: true },
  )
}

export async function createTestUser(options: {
  email: string
  password: string
  roleId: string
  status?: UserStatus
}): Promise<UserDocument> {
  const status = options.status ?? 'ACTIVE'

  return UserModel.create({
    email: options.email,
    passwordHash: await hashPassword(options.password),
    roleId: options.roleId,
    status,
    emailVerifiedAt: status === 'PENDING_VERIFICATION' ? null : new Date(),
  })
}
