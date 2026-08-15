import { useState } from 'react'
import { Calendar, Mail, MapPin, Phone, Sparkles } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Separator } from '@/shared/components/ui/separator'
import { DetailField, DetailSection } from '@/shared/components/data-display/detail-section'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { StudentStatusBadge } from '@/features/students/components/StudentStatusBadge'
import { ProfileCompletionBadge } from '@/features/students/components/ProfileCompletionBadge'
import { StudentPhotoUpload } from '@/features/students/components/StudentPhotoUpload'
import { StudentSessionsPanel } from '@/features/students/components/StudentSessionsPanel'
import { StudentAuditTimeline } from '@/features/students/components/StudentAuditTimeline'
import { StudentEnrollmentHistory } from '@/features/enrollments/components/StudentEnrollmentHistory'
import type { AdminStudent } from '@/features/students/types'

const FUTURE_MODULE_TABS = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'fees', label: 'Fees' },
  { id: 'certificates', label: 'Certificates' },
] as const

interface StudentDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: AdminStudent | undefined
}

export function StudentDetailDrawer({ open, onOpenChange, student }: StudentDetailDrawerProps) {
  const { data: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const [auditPage, setAuditPage] = useState(1)
  const [activeTab, setActiveTab] = useState('overview')

  if (!student) return null

  const name = student.displayName ?? `${student.firstName} ${student.lastName}`

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={name} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <StudentPhotoUpload student={student} />
          <div className="flex flex-col items-end gap-2">
            <span className="text-body-sm text-muted-foreground font-mono">
              {student.studentId}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StudentStatusBadge status={student.status} />
              <ProfileCompletionBadge
                status={student.profileCompletionStatus}
                percentage={student.profileCompletionPercentage}
              />
              {student.isDeleted && (
                <span className="text-caption text-destructive font-medium">Deleted</span>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto [&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="enrolments">Enrolments</TabsTrigger>
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
                <DetailField icon={Mail} label="Email" value={student.email} />
                <DetailField icon={Phone} label="Phone" value={student.phone ?? '—'} />
                <DetailField
                  icon={Phone}
                  label="Alternate phone"
                  value={student.alternatePhone ?? '—'}
                />
                <DetailField
                  icon={Calendar}
                  label="Date of birth"
                  value={
                    student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'
                  }
                />
                <DetailField label="Gender" value={student.gender ?? '—'} />
              </dl>
            </DetailSection>

            <Separator />

            <DetailSection title="Enrollment">
              <dl className="grid grid-cols-2 gap-4">
                <DetailField
                  icon={Calendar}
                  label="Admission date"
                  value={
                    student.admissionDate
                      ? new Date(student.admissionDate).toLocaleDateString()
                      : '—'
                  }
                />
                <DetailField label="Source" value={student.source ?? '—'} />
              </dl>
            </DetailSection>

            <Separator />

            <DetailSection title="Address">
              <p className="text-body-sm flex items-start gap-1.5">
                <MapPin className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                {student.address
                  ? `${student.address.line1}, ${student.address.city}, ${student.address.state} ${student.address.postalCode}, ${student.address.country}`
                  : '—'}
              </p>
            </DetailSection>

            {(student.tags.length > 0 || student.notes) && (
              <>
                <Separator />
                <DetailSection title="Additional details">
                  <dl className="grid grid-cols-2 gap-4">
                    {student.tags.length > 0 && (
                      <DetailField
                        label="Tags"
                        value={student.tags.join(', ')}
                        className="col-span-2"
                      />
                    )}
                    {student.notes && (
                      <DetailField
                        label="Notes"
                        value={<span className="whitespace-pre-wrap">{student.notes}</span>}
                        className="col-span-2"
                      />
                    )}
                  </dl>
                </DetailSection>
              </>
            )}

            {student.emergencyContacts.length > 0 && (
              <>
                <Separator />
                <DetailSection title="Emergency contacts">
                  <div className="flex flex-col gap-2">
                    {student.emergencyContacts.map((contact) => (
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

          <TabsContent value="academic" className="flex flex-col gap-3">
            {student.educationRecords.length === 0 ? (
              <EmptyState icon={Sparkles} title="No academic records yet" />
            ) : (
              student.educationRecords.map((record) => (
                <div
                  key={`${record.degree}-${record.institution}-${String(record.yearOfCompletion)}`}
                  className="border-border rounded-lg border p-3"
                >
                  <p className="text-body-sm font-medium">
                    {record.degree} — {record.institution}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {record.fieldOfStudy ? `${record.fieldOfStudy} · ` : ''}
                    Completed {String(record.yearOfCompletion)}
                    {record.gradeValue ? ` · ${record.gradeValue}` : ''}
                  </p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="enrolments">
            {activeTab === 'enrolments' && <StudentEnrollmentHistory studentId={student.id} />}
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="sessions">
              <StudentSessionsPanel studentId={student.id} name={name} />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="activity">
              <StudentAuditTimeline
                studentId={student.id}
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
