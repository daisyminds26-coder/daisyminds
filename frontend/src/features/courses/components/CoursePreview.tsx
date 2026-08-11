import { Award, BookOpen, Clock, Globe } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import type { AdminCourse } from '@/features/courses/types'

/**
 * An admin-only preview of what the future student-facing course card/page
 * will show, built entirely from current course metadata — never modules,
 * lessons, or any curriculum content (out of scope this phase).
 */
export function CoursePreview({ course }: { course: AdminCourse }) {
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden">
        {course.bannerUrl ? (
          <img src={course.bannerUrl} alt="" className="size-full object-cover" />
        ) : course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          <BookOpen className="text-muted-foreground size-10" />
        )}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{course.category}</Badge>
          <Badge variant="outline">{course.level.replace(/_/g, ' ')}</Badge>
          {course.certificateEnabled && (
            <Badge variant="secondary" className="gap-1">
              <Award className="size-3" />
              Certificate
            </Badge>
          )}
        </div>
        <h2 className="text-h2 font-semibold">{course.title}</h2>
        {course.shortDescription && (
          <p className="text-body-sm text-muted-foreground">{course.shortDescription}</p>
        )}
        <div className="text-body-sm text-muted-foreground flex flex-wrap items-center gap-4">
          {course.durationValue && course.durationUnit && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {course.durationValue} {course.durationUnit.toLowerCase()}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Globe className="size-3.5" />
            {course.language.toUpperCase()}
          </span>
        </div>
        <p className="text-h3 font-semibold">
          {course.pricing.pricingType === 'FREE'
            ? 'Free'
            : `${course.pricing.currency} ${course.pricing.displayPrice.toLocaleString()}`}
          {course.pricing.discountPrice !== null && course.pricing.pricingType === 'PAID' && (
            <span className="text-body-sm text-muted-foreground ml-2 font-normal line-through">
              {course.pricing.currency} {course.pricing.basePrice.toLocaleString()}
            </span>
          )}
        </p>
        {course.learningOutcomes.length > 0 && (
          <div>
            <h3 className="text-body-sm mb-1.5 font-semibold">What you'll learn</h3>
            <ul className="text-body-sm text-muted-foreground list-inside list-disc">
              {course.learningOutcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
          </div>
        )}
        {course.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
