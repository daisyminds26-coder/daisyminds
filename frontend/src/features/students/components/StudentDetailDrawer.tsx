import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
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
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="guardian">Guardian</TabsTrigger>
            <TabsTrigger value="enrolments">Enrolments</TabsTrigger>
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
                <dd className="text-body-sm">{student.email}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Phone</dt>
                <dd className="text-body-sm">{student.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Alternate phone</dt>
                <dd className="text-body-sm">{student.alternatePhone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Date of birth</dt>
                <dd className="text-body-sm">
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Gender</dt>
                <dd className="text-body-sm">{student.gender ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Admission date</dt>
                <dd className="text-body-sm">
                  {student.admissionDate
                    ? new Date(student.admissionDate).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Source</dt>
                <dd className="text-body-sm">{student.source ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-caption text-muted-foreground">Address</dt>
                <dd className="text-body-sm">
                  {student.address
                    ? `${student.address.line1}, ${student.address.city}, ${student.address.state} ${student.address.postalCode}, ${student.address.country}`
                    : '—'}
                </dd>
              </div>
              {student.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Tags</dt>
                  <dd className="text-body-sm">{student.tags.join(', ')}</dd>
                </div>
              )}
              {student.notes && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Notes</dt>
                  <dd className="text-body-sm whitespace-pre-wrap">{student.notes}</dd>
                </div>
              )}
            </dl>

            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Emergency contacts</h4>
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
            </div>
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

          <TabsContent value="guardian" className="flex flex-col gap-2 text-sm">
            {student.guardianName ? (
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-caption text-muted-foreground">Name</dt>
                  <dd className="text-body-sm">{student.guardianName}</dd>
                </div>
                <div>
                  <dt className="text-caption text-muted-foreground">Relationship</dt>
                  <dd className="text-body-sm">{student.guardianRelationship ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-caption text-muted-foreground">Phone</dt>
                  <dd className="text-body-sm">{student.guardianPhone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-caption text-muted-foreground">Email</dt>
                  <dd className="text-body-sm">{student.guardianEmail ?? '—'}</dd>
                </div>
              </dl>
            ) : (
              <EmptyState icon={Sparkles} title="No guardian details on file" />
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
