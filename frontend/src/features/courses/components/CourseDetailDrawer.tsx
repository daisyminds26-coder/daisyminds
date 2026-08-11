import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutList, Sparkles } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { cn } from '@/shared/lib/utils'
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
          <TabsList className="flex-wrap">
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

          <TabsContent value="overview" className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-caption text-muted-foreground">Category</dt>
                <dd className="text-body-sm">{course.category}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Subcategory</dt>
                <dd className="text-body-sm">{course.subcategory ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Level</dt>
                <dd className="text-body-sm">{course.level.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Delivery mode</dt>
                <dd className="text-body-sm">{course.deliveryMode.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Duration</dt>
                <dd className="text-body-sm">
                  {course.durationValue && course.durationUnit
                    ? `${String(course.durationValue)} ${course.durationUnit.toLowerCase()}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Language</dt>
                <dd className="text-body-sm">{course.language}</dd>
              </div>
              {course.description && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Description</dt>
                  <dd className="text-body-sm whitespace-pre-wrap">{course.description}</dd>
                </div>
              )}
              {course.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Tags</dt>
                  <dd className="text-body-sm">{course.tags.join(', ')}</dd>
                </div>
              )}
            </dl>
          </TabsContent>

          <TabsContent value="learning" className="flex flex-col gap-4">
            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Learning outcomes</h4>
              {course.learningOutcomes.length === 0 ? (
                <EmptyState icon={Sparkles} title="No learning outcomes on file" />
              ) : (
                <ul className="text-body-sm list-inside list-disc">
                  {course.learningOutcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Skills gained</h4>
              <p className="text-body-sm text-muted-foreground">
                {course.skills.join(', ') || '—'}
              </p>
            </div>
            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Prerequisites</h4>
              <p className="text-body-sm text-muted-foreground">
                {course.prerequisites.join(', ') || '—'}
              </p>
            </div>
            <div>
              <h4 className="text-body-sm mb-2 font-semibold">Target audience</h4>
              <p className="text-body-sm text-muted-foreground">{course.targetAudience ?? '—'}</p>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="flex flex-col gap-2 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-caption text-muted-foreground">Pricing type</dt>
                <dd className="text-body-sm">{course.pricing.pricingType}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Display price</dt>
                <dd className="text-body-sm">
                  {course.pricing.currency} {course.pricing.displayPrice.toLocaleString()}
                </dd>
              </div>
              {course.pricing.pricingType === 'PAID' && (
                <>
                  <div>
                    <dt className="text-caption text-muted-foreground">Base price</dt>
                    <dd className="text-body-sm">
                      {course.pricing.currency} {course.pricing.basePrice.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">Discount price</dt>
                    <dd className="text-body-sm">
                      {course.pricing.discountPrice !== null
                        ? `${course.pricing.currency} ${course.pricing.discountPrice.toLocaleString()}`
                        : '—'}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-caption text-muted-foreground">Certificate eligible</dt>
                <dd className="text-body-sm">{course.certificateEnabled ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Max capacity</dt>
                <dd className="text-body-sm">{course.maxStudentCapacity ?? 'Unlimited'}</dd>
              </div>
            </dl>
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

          <TabsContent value="seo" className="flex flex-col gap-2 text-sm">
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-caption text-muted-foreground">Slug</dt>
                <dd className="text-body-sm font-mono">{course.slug}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Meta title</dt>
                <dd className="text-body-sm">{course.metaTitle ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Meta description</dt>
                <dd className="text-body-sm">{course.metaDescription ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Canonical URL</dt>
                <dd className="text-body-sm">{course.canonicalUrl ?? '—'}</dd>
              </div>
            </dl>
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
