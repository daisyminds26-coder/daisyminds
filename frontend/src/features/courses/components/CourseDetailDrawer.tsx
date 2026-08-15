import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Globe, LayoutList, Sparkles } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { DetailField, DetailSection } from '@/shared/components/data-display/detail-section'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { cn, formatEnumLabel } from '@/shared/lib/utils'
import { CourseStatusBadge } from '@/features/courses/components/CourseStatusBadge'
import { VisibilityBadge } from '@/features/courses/components/VisibilityBadge'
import { ReadinessPanel } from '@/features/courses/components/ReadinessPanel'
import { CourseMediaUpload } from '@/features/courses/components/CourseMediaUpload'
import { CoursePreview } from '@/features/courses/components/CoursePreview'
import { CourseAuditTimeline } from '@/features/courses/components/CourseAuditTimeline'
import { CurriculumReadinessPanel } from '@/features/courses/curriculum/components/CurriculumReadinessPanel'
import { useCurriculumReadiness } from '@/features/courses/curriculum/hooks/use-curriculum'
import { useCourseReadiness } from '@/features/courses/hooks/use-course-readiness'
import {
  useRemoveCourseBanner,
  useRemoveCourseThumbnail,
  useUploadCourseBanner,
  useUploadCourseThumbnail,
} from '@/features/courses/hooks/use-course-media'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import type { AdminCourse } from '@/features/courses/types'

const FUTURE_MODULE_TABS = [
  { id: 'batches', label: 'Batches' },
  { id: 'enrolments', label: 'Enrolments' },
  { id: 'analytics', label: 'Learning Analytics' },
] as const

interface CourseDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: AdminCourse | undefined
}

export function CourseDetailDrawer({ open, onOpenChange, course }: CourseDetailDrawerProps) {
  const [auditPage, setAuditPage] = useState(1)
  const readinessQuery = useCourseReadiness(course?.id)
  const curriculumReadinessQuery = useCurriculumReadiness(course?.id)

  const uploadThumbnail = useUploadCourseThumbnail(course?.id ?? '')
  const removeThumbnail = useRemoveCourseThumbnail(course?.id ?? '')
  const uploadBanner = useUploadCourseBanner(course?.id ?? '')
  const removeBanner = useRemoveCourseBanner(course?.id ?? '')

  if (!course) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={course.title} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-body-sm text-muted-foreground font-mono">
              {course.courseCode}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <CourseStatusBadge status={course.status} />
              <VisibilityBadge visibility={course.visibility} />
              {course.isFeatured && <Badge variant="secondary">Featured</Badge>}
              {course.isDeleted && (
                <span className="text-caption text-destructive font-medium">Deleted</span>
              )}
            </div>
          </div>
        </div>

        <ReadinessPanel readiness={readinessQuery.data} isLoading={readinessQuery.isLoading} />

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto [&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="trainers">Trainers</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            {FUTURE_MODULE_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-6">
            <DetailSection title="Details">
              <dl className="grid grid-cols-2 gap-4">
                <DetailField label="Category" value={course.category} />
                <DetailField label="Subcategory" value={course.subcategory ?? '—'} />
                <DetailField label="Level" value={formatEnumLabel(course.level)} />
                <DetailField label="Delivery mode" value={formatEnumLabel(course.deliveryMode)} />
                <DetailField
                  icon={Clock}
                  label="Duration"
                  value={
                    course.durationValue && course.durationUnit
                      ? `${String(course.durationValue)} ${course.durationUnit.toLowerCase()}`
                      : '—'
                  }
                />
                <DetailField icon={Globe} label="Language" value={course.language} />
              </dl>
            </DetailSection>

            {course.description && (
              <>
                <Separator />
                <DetailSection title="Description">
                  <p className="text-body-sm whitespace-pre-wrap">{course.description}</p>
                </DetailSection>
              </>
            )}

            {course.tags.length > 0 && (
              <>
                <Separator />
                <DetailSection title="Tags">
                  <p className="text-body-sm">{course.tags.join(', ')}</p>
                </DetailSection>
              </>
            )}
          </TabsContent>

          <TabsContent value="learning" className="flex flex-col gap-6">
            <DetailSection title="Learning outcomes">
              {course.learningOutcomes.length === 0 ? (
                <EmptyState icon={Sparkles} title="No learning outcomes on file" />
              ) : (
                <ul className="text-body-sm list-inside list-disc">
                  {course.learningOutcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              )}
            </DetailSection>

            <Separator />

            <DetailSection title="Skills gained">
              <p className="text-body-sm text-muted-foreground">
                {course.skills.join(', ') || '—'}
              </p>
            </DetailSection>

            <Separator />

            <DetailSection title="Prerequisites">
              <p className="text-body-sm text-muted-foreground">
                {course.prerequisites.join(', ') || '—'}
              </p>
            </DetailSection>

            <Separator />

            <DetailSection title="Target audience">
              <p className="text-body-sm text-muted-foreground">{course.targetAudience ?? '—'}</p>
            </DetailSection>
          </TabsContent>

          <TabsContent value="pricing" className="flex flex-col gap-6">
            <DetailSection title="Pricing">
              <dl className="grid grid-cols-2 gap-4">
                <DetailField
                  label="Pricing type"
                  value={formatEnumLabel(course.pricing.pricingType)}
                />
                <DetailField
                  label="Display price"
                  value={`${course.pricing.currency} ${course.pricing.displayPrice.toLocaleString()}`}
                />
                {course.pricing.pricingType === 'PAID' && (
                  <>
                    <DetailField
                      label="Base price"
                      value={`${course.pricing.currency} ${course.pricing.basePrice.toLocaleString()}`}
                    />
                    <DetailField
                      label="Discount price"
                      value={
                        course.pricing.discountPrice !== null
                          ? `${course.pricing.currency} ${course.pricing.discountPrice.toLocaleString()}`
                          : '—'
                      }
                    />
                  </>
                )}
                <DetailField
                  label="Certificate eligible"
                  value={course.certificateEnabled ? 'Yes' : 'No'}
                />
                <DetailField
                  label="Max capacity"
                  value={course.maxStudentCapacity ?? 'Unlimited'}
                />
              </dl>
            </DetailSection>
          </TabsContent>

          <TabsContent value="media">
            <CourseMediaUpload
              course={course}
              uploadThumbnail={(file) => {
                uploadThumbnail.mutate(file, {
                  onSuccess: () => toast.success('Thumbnail updated'),
                  onError: (error) =>
                    toast.error('Could not upload thumbnail', getSafeErrorMessage(error)),
                })
              }}
              removeThumbnail={() => {
                removeThumbnail.mutate(undefined, {
                  onSuccess: () => toast.success('Thumbnail removed'),
                  onError: (error) =>
                    toast.error('Could not remove thumbnail', getSafeErrorMessage(error)),
                })
              }}
              isUploadingThumbnail={uploadThumbnail.isPending}
              isRemovingThumbnail={removeThumbnail.isPending}
              uploadBanner={(file) => {
                uploadBanner.mutate(file, {
                  onSuccess: () => toast.success('Banner updated'),
                  onError: (error) =>
                    toast.error('Could not upload banner', getSafeErrorMessage(error)),
                })
              }}
              removeBanner={() => {
                removeBanner.mutate(undefined, {
                  onSuccess: () => toast.success('Banner removed'),
                  onError: (error) =>
                    toast.error('Could not remove banner', getSafeErrorMessage(error)),
                })
              }}
              isUploadingBanner={uploadBanner.isPending}
              isRemovingBanner={removeBanner.isPending}
            />
          </TabsContent>

          <TabsContent value="trainers">
            {course.eligibleTrainerIds.length === 0 ? (
              <EmptyState icon={Sparkles} title="No eligible trainers set" />
            ) : (
              <p className="text-body-sm text-muted-foreground">
                {course.eligibleTrainerIds.length} trainer(s) marked eligible to teach this course.
                Edit the course to change this list.
              </p>
            )}
          </TabsContent>

          <TabsContent value="seo" className="flex flex-col gap-6">
            <DetailSection title="SEO">
              <dl className="flex flex-col gap-4">
                <DetailField
                  label="Slug"
                  value={<span className="font-mono">{course.slug}</span>}
                />
                <DetailField label="Meta title" value={course.metaTitle ?? '—'} />
                <DetailField label="Meta description" value={course.metaDescription ?? '—'} />
                <DetailField label="Canonical URL" value={course.canonicalUrl ?? '—'} />
              </dl>
            </DetailSection>
          </TabsContent>

          <TabsContent value="preview">
            <CoursePreview course={course} />
          </TabsContent>

          <TabsContent value="activity">
            <CourseAuditTimeline
              courseId={course.id}
              page={auditPage}
              onPageChange={setAuditPage}
            />
          </TabsContent>

          <TabsContent value="curriculum" className="flex flex-col gap-4">
            <CurriculumReadinessPanel
              readiness={curriculumReadinessQuery.data}
              isLoading={curriculumReadinessQuery.isLoading}
            />
            <Link
              to={`/admin/courses/${course.id}/curriculum`}
              className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 self-start')}
            >
              <LayoutList className="size-3.5" />
              Open Curriculum Builder
            </Link>
          </TabsContent>

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
