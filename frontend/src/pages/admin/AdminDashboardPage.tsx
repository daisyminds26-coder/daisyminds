import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GraduationCap, RefreshCw, ShieldQuestion, Users } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button } from '@/shared/components/ui/button'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { useAdminDashboard } from '@/features/dashboard/hooks/use-admin-dashboard'
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector'
import {
  DashboardSecondaryStats,
  DashboardStatCards,
} from '@/features/dashboard/components/DashboardStatCards'
import { DistributionCard } from '@/features/dashboard/components/DistributionCard'
import { RecentPeopleCard } from '@/features/dashboard/components/RecentPeopleCard'
import { RecentActivityCard } from '@/features/dashboard/components/RecentActivityCard'
import { AlertsPanel } from '@/features/dashboard/components/AlertsPanel'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { customRangeSchema } from '@/features/dashboard/schemas/dashboard.schemas'
import type { StatusTone } from '@/shared/components/data-display/status-badge'
import type { DashboardRange } from '@/features/dashboard/types'

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const USER_STATUS_TONE: Record<string, StatusTone> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'info',
  SUSPENDED: 'warning',
  LOCKED: 'error',
  DEACTIVATED: 'neutral',
}
const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  SUSPENDED: 'Suspended',
  LOCKED: 'Locked',
  DEACTIVATED: 'Deactivated',
}
const PROFILE_COMPLETION_TONE: Record<string, StatusTone> = {
  COMPLETE: 'success',
  PARTIAL: 'warning',
  INCOMPLETE: 'error',
}
const PROFILE_COMPLETION_LABEL: Record<string, string> = {
  COMPLETE: 'Complete',
  PARTIAL: 'Partial',
  INCOMPLETE: 'Incomplete',
}

export default function AdminDashboardPage() {
  const { data: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  const [range, setRange] = useState<DashboardRange>('LAST_30_DAYS')
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)

  const customRangeResult =
    range === 'CUSTOM' && customStart && customEnd
      ? customRangeSchema.safeParse({ startDate: customStart, endDate: customEnd })
      : undefined
  const customRangeError =
    customRangeResult && !customRangeResult.success
      ? 'Start date must not be after end date'
      : undefined

  const isCustomReady = range !== 'CUSTOM' || customRangeResult?.success === true

  const dashboardQuery = useAdminDashboard(
    {
      range,
      timezone: BROWSER_TIME_ZONE,
      ...(range === 'CUSTOM' && customRangeResult?.success
        ? {
            startDate: customRangeResult.data.startDate.toISOString(),
            endDate: customRangeResult.data.endDate.toISOString(),
          }
        : {}),
    },
    isCustomReady,
  )

  const data = dashboardQuery.data
  const isInitialLoading = dashboardQuery.isLoading

  return (
    <PageContainer
      title="Dashboard"
      description="An operational overview of users, students, and trainers."
      actions={
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <PeriodSelector
              range={range}
              onRangeChange={setRange}
              customStart={customStart}
              customEnd={customEnd}
              onCustomStartChange={setCustomStart}
              onCustomEndChange={setCustomEnd}
              customRangeError={customRangeError}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Refresh dashboard"
              disabled={dashboardQuery.isFetching}
              onClick={() => void dashboardQuery.refetch()}
            >
              <RefreshCw className={dashboardQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </div>
          <p className="text-caption text-muted-foreground" role="status" aria-live="polite">
            {dashboardQuery.isFetching
              ? 'Refreshing…'
              : data
                ? `Updated ${formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}`
                : ''}
          </p>
        </div>
      }
    >
      {dashboardQuery.isError && !data ? (
        <ErrorState
          title="Couldn't load the dashboard"
          description="Try again in a moment."
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : (
        <>
          <DashboardStatCards summary={data?.summary} range={range} isLoading={isInitialLoading} />

          {data && <DashboardSecondaryStats summary={data.summary} />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DistributionCard
              title="User status"
              data={data?.distributions.userStatus ?? []}
              toneForKey={(key) => USER_STATUS_TONE[key] ?? 'neutral'}
              labelForKey={(key) => USER_STATUS_LABEL[key] ?? key}
              emptyIcon={ShieldQuestion}
              emptyMessage="No user accounts yet"
            />
            <DistributionCard
              title="Student profile completion"
              data={data?.distributions.studentProfileCompletion ?? []}
              toneForKey={(key) => PROFILE_COMPLETION_TONE[key] ?? 'neutral'}
              labelForKey={(key) => PROFILE_COMPLETION_LABEL[key] ?? key}
              emptyIcon={GraduationCap}
              emptyMessage="No students yet"
            />
            <DistributionCard
              title="Trainer profile completion"
              data={data?.distributions.trainerProfileCompletion ?? []}
              toneForKey={(key) => PROFILE_COMPLETION_TONE[key] ?? 'neutral'}
              labelForKey={(key) => PROFILE_COMPLETION_LABEL[key] ?? key}
              emptyIcon={Users}
              emptyMessage="No trainers yet"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentPeopleCard
              title="Recent student admissions"
              people={data?.recentStudents}
              isLoading={isInitialLoading}
              isError={dashboardQuery.isError}
              onRetry={() => void dashboardQuery.refetch()}
              emptyIcon={GraduationCap}
              emptyTitle="No students yet"
              emptyDescription="Add your first student to see recent admissions here."
              emptyActionLabel="Add student"
              emptyActionRoute="/admin/students/new"
              viewAllRoute="/admin/students"
            />
            <RecentPeopleCard
              title="Recent trainer onboarding"
              people={data?.recentTrainers}
              isLoading={isInitialLoading}
              isError={dashboardQuery.isError}
              onRetry={() => void dashboardQuery.refetch()}
              emptyIcon={Users}
              emptyTitle="No trainers yet"
              emptyDescription="Add your first trainer to see recent onboarding here."
              emptyActionLabel="Add trainer"
              emptyActionRoute="/admin/trainers/new"
              viewAllRoute="/admin/trainers"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {isSuperAdmin && (
                <RecentActivityCard
                  activity={data?.recentActivity}
                  isLoading={isInitialLoading}
                  isError={dashboardQuery.isError}
                  onRetry={() => void dashboardQuery.refetch()}
                />
              )}
            </div>
            <div className="flex flex-col gap-4">
              <AlertsPanel alerts={data?.alerts} isLoading={isInitialLoading} />
              <QuickActions />
            </div>
          </div>

          {!isCustomReady && !customRangeError && (
            <p className="text-caption text-muted-foreground">
              Pick both a start and an end date to load the custom range.
            </p>
          )}
        </>
      )}
    </PageContainer>
  )
}
