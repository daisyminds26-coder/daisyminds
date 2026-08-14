import { ApiError } from '../utils/api-error'
import { trainerRepository } from '../repositories/trainer.repository'
import type { TrainerDocument } from '../models/trainer.model'

/** Every self-scoped trainer route resolves identity through here — never from a client-supplied `trainerId`. Mirrors `student-identity.util.ts#resolveStudentForUser`. */
export async function resolveTrainerForUser(userId: string): Promise<TrainerDocument> {
  const trainer = await trainerRepository.findByUserId(userId)
  if (!trainer) throw ApiError.forbidden('No trainer profile linked to this account')
  return trainer
}
