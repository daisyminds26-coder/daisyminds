/** Renders one `<script type="application/ld+json">` block. `data` must always come from `utils/structured-data.ts` builders fed by our own static content — never from unescaped user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
