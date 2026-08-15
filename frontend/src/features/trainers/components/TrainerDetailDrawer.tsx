import { useState } from 'react'
import { Calendar, Mail, MapPin, Phone, Sparkles } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Separator } from '@/shared/components/ui/separator'
import { DetailField, DetailSection } from '@/shared/components/data-display/detail-section'
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
          <TabsList className="w-full justify-start overflow-x-auto [&_[data-slot=tabs-trigger]]:flex-none">
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

          <TabsContent value="overview" className="flex flex-col gap-6">
            <DetailSection title="Contact">
              <dl className="grid grid-cols-2 gap-4">
                <DetailField icon={Mail} label="Email" value={trainer.email} />
                <DetailField icon={Phone} label="Phone" value={trainer.phone ?? '—'} />
                <DetailField
                  icon={Phone}
                  label="Alternate phone"
                  value={trainer.alternatePhone ?? '—'}
                />
                <DetailField
                  icon={Calendar}
                  label="Date of birth"
                  value={
                    trainer.dateOfBirth ? new Date(trainer.dateOfBirth).toLocaleDateString() : '—'
                  }
                />
              </dl>
            </DetailSection>

            <Separator />

            <DetailSection title="Address">
              <p className="text-body-sm flex items-start gap-1.5">
                <MapPin className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                {trainer.address
                  ? `${trainer.address.line1}, ${trainer.address.city}, ${trainer.address.state} ${trainer.address.postalCode}, ${trainer.address.country}`
                  : '—'}
              </p>
            </DetailSection>

            {trainer.bio && (
              <>
                <Separator />
                <DetailSection title="Bio">
                  <p className="text-body-sm whitespace-pre-wrap">{trainer.bio}</p>
                </DetailSection>
              </>
            )}

            {(trainer.expertiseAreas.length > 0 || trainer.tags.length > 0) && (
              <>
                <Separator />
                <DetailSection title="Additional details">
                  <dl className="grid grid-cols-2 gap-4">
                    {trainer.expertiseAreas.length > 0 && (
                      <DetailField
                        label="Expertise"
                        value={trainer.expertiseAreas.join(', ')}
                        className="col-span-2"
                      />
                    )}
                    {trainer.tags.length > 0 && (
                      <DetailField
                        label="Tags"
                        value={trainer.tags.join(', ')}
                        className="col-span-2"
                      />
                    )}
                  </dl>
                </DetailSection>
              </>
            )}

            {trainer.emergencyContacts.length > 0 && (
              <>
                <Separator />
                <DetailSection title="Emergency contacts">
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
                </DetailSection>
              </>
            )}
          </TabsContent>

          <TabsContent value="qualifications" className="flex flex-col gap-6">
            <DetailSection title="Qualifications">
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
            </DetailSection>

            <Separator />

            <DetailSection title="Certifications">
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
            </DetailSection>
          </TabsContent>

          <TabsContent value="employment" className="flex flex-col gap-6">
            <DetailSection title="Employment details">
              <dl className="grid grid-cols-2 gap-4">
                <DetailField
                  icon={Calendar}
                  label="Joining date"
                  value={
                    trainer.joiningDate ? new Date(trainer.joiningDate).toLocaleDateString() : '—'
                  }
                />
                <DetailField label="Employment type" value={trainer.employmentType ?? '—'} />
                <DetailField label="Employment status" value={trainer.employmentStatus} />
                <DetailField label="Work location" value={trainer.workLocation ?? '—'} />
                <DetailField label="Employee code" value={trainer.employeeCode ?? '—'} />
              </dl>
            </DetailSection>
          </TabsContent>

          <TabsContent value="availability" className="flex flex-col gap-6">
            <DetailSection title="Weekly availability">
              <p className="text-body-sm text-muted-foreground mb-3">
                Status:{' '}
                <span className="text-foreground font-medium">{trainer.availabilityStatus}</span>
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
            </DetailSection>
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
