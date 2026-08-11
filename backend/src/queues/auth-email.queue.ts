import { createQueue } from './queue.factory'

export type AuthEmailJobName = 'email-verification' | 'password-reset'

export interface AuthEmailJobData {
  email: string
  link: string
}

const authEmailQueue = createQueue<AuthEmailJobData>('auth-emails')

export async function enqueueAuthEmail(
  name: AuthEmailJobName,
  data: AuthEmailJobData,
): Promise<void> {
  await authEmailQueue.add(name, data)
}
