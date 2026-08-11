import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { TrainerStatusBadge } from '@/features/trainers/components/TrainerStatusBadge'
import { ProfileCompletionBadge } from '@/features/trainers/components/ProfileCompletionBadge'
import { TrainerPhotoUpload } from '@/features/trainers/components/TrainerPhotoUpload'
import { TrainerSessionsPanel } from '@/features/trainers/components/TrainerSessionsPanel'
import { TrainerAuditTimeline } from '@/features/trainers/components/TrainerAuditTimeline'
import type { AdminTrainer } from '@/features/trainers/types'

const FUTURE_MODULE_TABS = [
  { id: 'courses', label: 'Courses' },
  { id: 'batches', label: 'Batches' },
  { id: 'live-classes', label: 'Live Classes' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'performance', label: 'Performance' },
] as const

interface TrainerDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainer: AdminTrainer | undefined
}

export function TrainerDetailDrawer({ open, onOpenChange, trainer }: TrainerDetailDrawerProps) {
  const { data: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const [auditPage, setAuditPage] = useState(1)

  if (!trainer) return null

  const name = trainer.displayName ?? `${trainer.firstName} ${trainer.lastName}`

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={name} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <TrainerPhotoUpload trainer={trainer} />
          <div className="flex flex-col items-end gap-2">
            <span className="text-body-sm text-muted-foreground font-mono">
              {trainer.trainerId}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TrainerStatusBadge status={trainer.status} />
              <ProfileCompletionBadge
                status={trainer.profileCompletionStatus}
                percentage={trainer.profileCompletionPercentage}
              />
              {trainer.isDeleted && (
                <span className="text-caption text-destructive font-medium">Deleted</span>
              )}
            </div>
            {trainer.designation && (
              <span className="text-body-sm text-muted-foreground">
                {trainer.designation}
                {trainer.department ? ` · ${trainer.department}` : ''}
              </span>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="activity">Activity</TabsTrigger>}
            {FUTURE_MODULE_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-caption text-muted-foreground">Email</dt>
                <dd className="text-body-sm">{trainer.email}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Phone</dt>
                <dd className="text-body-sm">{trainer.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Alternate phone</dt>
                <dd className="text-body-sm">{trainer.alternatePhone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Date of birth</dt>
                <dd className="text-body-sm">
                  {trainer.dateOfBirth ? new Date(trainer.dateOfBirth).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-caption text-muted-foreground">Address</dt>
                <dd className="text-body-sm">
                  {trainer.address
                    ? `${trainer.address.line1}, ${trainer.address.city}, ${trainer.address.state} ${trainer.address.postalCode}, ${trainer.address.country}`
                    : '—'}
                </dd>
              </div>
              {trainer.bio && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Bio</dt>
                  <dd className="text-body-sm whitespace-pre-wrap">{trainer.bio}</dd>
                </div>
              )}
              {trainer.expertiseAreas.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Expertise</dt>
                  <dd className="text-body-sm">{trainer.expertiseAreas.join(', ')}</dd>
                </div>
              )}
              {trainer.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Tags</dt>
                  <dd className="text-body-sm">{trainer.tags.join(', ')}</dd>
                </div>
              )}
            </dl>

            {trainer.emergencyContacts.length > 0 && (
              <div>
                <h4 className="text-body-sm mb-2 font-semibold">Emergency contacts</h4>
                <div className="flex flex-col gap-2">
                  {trainer.emergencyContacts.map((contact) => (
                    <div
                      key={`${contact.name}-${contact.phone}`}
                      className="border-border rounded-lg border p-3"
                    >
                      <p className="text-body-sm font-medium">
                        {contact.name}{' '}
                        <span className="text-muted-foreground">({contact.relationship})</span>
                      </p>
                      <p className="text-caption text-muted-foreground">{contact.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="qualifications" className="flex flex-col gap-4">
            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Qualifications</h4>
              {trainer.qualifications.length === 0 ? (
                <EmptyState icon={Sparkles} title="No qualifications on file" />
              ) : (
                <div className="flex flex-col gap-2">
                  {trainer.qualifications.map((qualification) => (
                    <div
                      key={`${qualification.degree}-${qualification.institution}`}
                      className="border-border rounded-lg border p-3"
                    >
                      <p className="text-body-sm font-medium">
                        {qualification.degree} — {qualification.institution}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        Completed {String(qualification.yearOfCompletion)}
                        {qualification.gradeValue ? ` · ${qualification.gradeValue}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Certifications</h4>
              {trainer.certifications.length === 0 ? (
                <EmptyState icon={Sparkles} title="No certifications on file" />
              ) : (
                <div className="flex flex-col gap-2">
                  {trainer.certifications.map((certification) => (
                    <div
                      key={`${certification.name}-${certification.issuingOrganization}`}
                      className="border-border rounded-lg border p-3"
                    >
                      <p className="text-body-sm font-medium">{certification.name}</p>
                      <p className="text-caption text-muted-foreground">
                        {certification.issuingOrganization} · Issued{' '}
                        {new Date(certification.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="employment" className="flex flex-col gap-2 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-caption text-muted-foreground">Joining date</dt>
                <dd className="text-body-sm">
                  {trainer.joiningDate ? new Date(trainer.joiningDate).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Employment type</dt>
                <dd className="text-body-sm">{trainer.employmentType ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Employment status</dt>
                <dd className="text-body-sm">{trainer.employmentStatus}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Work location</dt>
                <dd className="text-body-sm">{trainer.workLocation ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Employee code</dt>
                <dd className="text-body-sm">{trainer.employeeCode ?? '—'}</dd>
              </div>
            </dl>
          </TabsContent>

          <TabsContent value="availability" className="flex flex-col gap-3">
            <p className="text-body-sm text-muted-foreground">
              Status: <span className="font-medium">{trainer.availabilityStatus}</span>
              {trainer.maxWeeklyTeachingHours !== null &&
                ` · Max ${String(trainer.maxWeeklyTeachingHours)} hrs/week`}
            </p>
            {trainer.availability.length === 0 ? (
              <EmptyState icon={Sparkles} title="No weekly availability set" />
            ) : (
              <div className="flex flex-col gap-2">
                {trainer.availability.map((slot) => (
                  <div
                    key={`${slot.dayOfWeek}-${slot.startTime}-${slot.type}`}
                    className="border-border rounded-lg border p-3"
                  >
                    <p className="text-body-sm font-medium">
                      {slot.dayOfWeek} {slot.startTime}–{slot.endTime} ({slot.timeZone})
                    </p>
                    <p className="text-caption text-muted-foreground">{slot.type}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="sessions">
              <TrainerSessionsPanel trainerId={trainer.id} name={name} />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="activity">
              <TrainerAuditTimeline
                trainerId={trainer.id}
                page={auditPage}
                onPageChange={setAuditPage}
              />
            </TabsContent>
          )}

          {FUTURE_MODULE_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <EmptyState
                icon={Sparkles}
                title={`${tab.label} is available in a later phase`}
                description="This module is on the roadmap and isn't built yet."
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Drawer>
  )
}
