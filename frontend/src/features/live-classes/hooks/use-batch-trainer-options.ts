import { useQueries } from '@tanstack/react-query'

import { getTrainer } from '@/features/trainers/api/trainers.api'

/** Trainer options scoped to a single batch's own assigned trainers (primary + assistants) — a live-class session's trainer is always one of the people already teaching that batch, so this deliberately avoids a global trainer-search combobox. */
export function useBatchTrainerOptions(
  primaryTrainerId: string | null,
  assistantTrainerIds: string[],
) {
  const ids = [
    ...new Set([...(primaryTrainerId ? [primaryTrainerId] : []), ...assistantTrainerIds]),
  ]

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['trainers', 'detail-lite', id],
      queryFn: () => getTrainer(id),
    })),
  })

  const options = queries
    .map((query, index) => {
      const id = ids[index]
      if (!id || !query.data) return null
      return { value: id, label: `${query.data.firstName} ${query.data.lastName}`.trim() }
    })
    .filter((option): option is { value: string; label: string } => option !== null)

  return { options, isLoading: queries.some((query) => query.isLoading) }
}
