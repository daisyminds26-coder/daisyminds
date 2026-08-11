import type { Request, Response } from 'express'

import { sendSuccess } from '../utils/api-response'
import { roleRepository } from '../repositories/role.repository'

/**
 * Read-only role lookup — exists so the User Management UI can populate a
 * role picker (create user / assign role) with valid `roleId`s. Full role
 * CRUD / permission-set editing is deliberately out of scope for this
 * module (see ARCHITECTURE.md's User Management notes) — this is the one
 * minimal read this UI genuinely can't function without.
 */
export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await roleRepository.listAll()
  sendSuccess(res, {
    data: roles.map((role) => ({ id: role._id.toString(), name: role.name })),
  })
}
