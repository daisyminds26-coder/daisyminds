import { useQuery } from '@tanstack/react-query'

import { listRoles } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'

/** Roles catalog rarely changes — cached for the session (`staleTime: Infinity`) rather than refetched per navigation. */
export function useRoles() {
  return useQuery({
    queryKey: usersKeys.roles,
    queryFn: listRoles,
    staleTime: Infinity,
  })
}
