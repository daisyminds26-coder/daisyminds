import { Router } from 'express'

import * as roleController from '../controllers/role.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { asyncHandler } from '../utils/async-handler'

export const roleRouter = Router()

roleRouter.use(requireAuth)

roleRouter.get('/', requirePermission('users:manage'), asyncHandler(roleController.listRoles))
