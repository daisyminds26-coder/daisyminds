import { formatDistanceToNow } from 'date-fns'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { ErrorState } from '@/shared/components/feedback/error-state'
import type { RecentPerson } from '@/features/dashboard/types'

interface RecentPeopleCardProps {
  title: string
  people: RecentPerson[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  emptyIcon: ComponentType<{ className?: string }>
  emptyTitle: string
  emptyDescription: string
  emptyActionLabel: string
  emptyActionRoute: string
  viewAllRoute: string
}

export function RecentPeopleCard({
  title,
  people,
  isLoading,
  isError,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionRoute,
  viewAllRoute,
}: RecentPeopleCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-h3 font-semibold">{title}</CardTitle>
        {people && people.length > 0 && (
          <Link to={viewAllRoute} className="text-body-sm text-primary font-medium hover:underline">
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load this list"
            description="Try again, or check the full list from the management page."
            onRetry={onRetry}
          />
        ) : !people || people.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Link
                to={emptyActionRoute}
                className="text-body-sm text-primary font-medium hover:underline"
              >
                {emptyActionLabel}
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {people.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{person.name}</span>
                  <span className="text-caption text-muted-foreground truncate">
                    {person.displayId}
                  </span>
                </div>
                <span className="text-caption text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(person.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
