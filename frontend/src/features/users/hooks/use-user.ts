import { useQuery } from '@tanstack/react-query'

import { getUser } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: usersKeys.detail(id ?? ''),
    queryFn: () => getUser(id ?? ''),
    enabled: !!id,
  })
}
