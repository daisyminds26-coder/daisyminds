import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../../src/services/password.service'

describe('password.service', () => {
  it('hashes a password into an argon2id string', async () => {
    const hash = await hashPassword('correct-horse-battery-1')
    expect(hash).toMatch(/^\$argon2id\$/)
  })

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct-horse-battery-1')
    await expect(verifyPassword(hash, 'correct-horse-battery-1')).resolves.toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-1')
    await expect(verifyPassword(hash, 'wrong-password-1')).resolves.toBe(false)
  })

  it('produces a different hash each time (random salt)', async () => {
    const hash1 = await hashPassword('same-password-1')
    const hash2 = await hashPassword('same-password-1')
    expect(hash1).not.toBe(hash2)
  })
})
