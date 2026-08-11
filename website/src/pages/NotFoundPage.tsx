import { ArrowLeft } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page Not Found" description="This page could not be found." path="/404" noIndex />
      <Section
        spacing="none"
        className="flex min-h-[70vh] flex-col items-center justify-center gap-5 pt-36 text-center"
      >
        <Container className="flex flex-col items-center gap-5">
          <p className="text-primary-dark font-display text-6xl font-bold">404</p>
          <h1 className="font-display text-display-sm text-ink">This page took a wrong turn.</h1>
          <p className="text-ink-muted max-w-sm">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <Button href="/" variant="ghost" icon={<ArrowLeft className="size-4" />}>
            Back to home
          </Button>
        </Container>
      </Section>
    </>
  )
}
