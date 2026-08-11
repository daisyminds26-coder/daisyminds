import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listUsers } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'
import type { ListUsersParams } from '@/features/users/types'

export function useUsersList(params: ListUsersParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
}
