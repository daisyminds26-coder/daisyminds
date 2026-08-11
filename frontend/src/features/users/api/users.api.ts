import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type {
  AdminUser,
  AdminUserSession,
  AuditLogEntry,
  BulkAction,
  BulkActionResult,
  ListUsersParams,
  RoleOption,
} from '@/features/users/types'

/**
 * Every field/endpoint here mirrors `backend/src/routes/user.routes.ts` and
 * `backend/src/validators/user.validator.ts` exactly. No component calls
 * `apiClient`/`apiGet`/etc. directly.
 */

export function listUsers(params: ListUsersParams): Promise<{ data: AdminUser[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminUser>('/users', { params })
}

export function getUser(id: string): Promise<AdminUser> {
  return apiGet<AdminUser>(`/users/${id}`)
}

export interface CreateUserPayload {
  email: string
  password: string
  roleId: string
  sendVerificationEmail: boolean
}

export function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  return apiPost<AdminUser>('/users', payload)
}

export function updateUser(id: string, email: string): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/users/${id}`, { email })
}

export function activateUser(id: string): Promise<AdminUser> {
  return apiPost<AdminUser>(`/users/${id}/activate`)
}

export function deactivateUser(id: string): Promise<AdminUser> {
  return apiPost<AdminUser>(`/users/${id}/deactivate`)
}

export function softDeleteUser(id: string): Promise<null> {
  return apiDelete<null>(`/users/${id}`)
}

export function restoreUser(id: string): Promise<AdminUser> {
  return apiPost<AdminUser>(`/users/${id}/restore`)
}

export function assignRole(id: string, roleId: string): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/users/${id}/role`, { roleId })
}

export function triggerPasswordReset(id: string): Promise<null> {
  return apiPost<null>(`/users/${id}/reset-password`)
}

export function resendVerification(id: string): Promise<null> {
  return apiPost<null>(`/users/${id}/resend-verification`)
}

export function getUserSessions(id: string): Promise<AdminUserSession[]> {
  return apiGet<AdminUserSession[]>(`/users/${id}/sessions`)
}

export function forceLogoutSession(id: string, sessionId: string): Promise<null> {
  return apiDelete<null>(`/users/${id}/sessions/${sessionId}`)
}

export function forceLogoutAll(id: string): Promise<null> {
  return apiPost<null>(`/users/${id}/logout-all`)
}

export function bulkAction(action: BulkAction, userIds: string[]): Promise<BulkActionResult> {
  return apiPost<BulkActionResult>('/users/bulk', { action, userIds })
}

export function getAuditLog(
  id: string,
  page: number,
  limit = 20,
): Promise<{ data: AuditLogEntry[]; meta: ApiMeta }> {
  return apiGetPaginated<AuditLogEntry>(`/users/${id}/audit-log`, { params: { page, limit } })
}

export function listRoles(): Promise<RoleOption[]> {
  return apiGet<RoleOption[]>('/roles')
}

export async function exportUsersCsv(
  params: Omit<ListUsersParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/users/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}
