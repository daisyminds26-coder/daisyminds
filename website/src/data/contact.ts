export interface ContactRequestPayload {
  name: string
  email: string
  phone: string
  programSlug: string
  serviceSlug: string
  message: string
}

/** Placeholder for the eventual `POST /api/v1/public/contact-requests` — simulates network latency so the UI's pending state is real, not skipped. Never touches an authenticated LMS admin endpoint. */
export async function submitContactRequest(_payload: ContactRequestPayload): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600))
}
